
-- ===== f35: split one receipt with a whole table, 2 to 6 people (Dominic, Oct 17 2026 16:25-16:26 HKT voice notes) =====
-- Additive only: two new tables, one new setting, new functions; four existing functions replaced with small edits marked f35
-- (lf_split_json, staff_splits, family_split_offer, owner_save_setting). Nothing dropped, no data deleted.
-- f34's one-friend offers (loyalty_split_offers) keep working and stay readable; the guest app now sends every split,
-- including the 2-person one, as a group (loyalty_split_groups + one loyalty_split_invites row per friend).
--
-- THE RULES (exact):
--  * People = the scanner + 1..5 friends (2..6 in total, setting split_max_people, default 6). Each friend must be a member,
--    no friend twice, never the scanner. The receipt must be approved, the scanner's own scan, not split yet, inside the scan
--    window (receipt_max_age_hours), with at least as many points as people.
--  * Shares are fixed when the scanner sends: each friend's share = floor(points / N) points and floor(bill / N) to the cent in HK$.
--    The scanner's share = whatever is left (the remainder points and cents stay with the scanner).
--  * Each friend answers on their own. Yes = their share moves to them at that moment and stays theirs.
--    No / no answer within split_offer_hours (12) / the scanner cancels = that share simply never leaves the scanner.
--  * Final result = scanner keeps points - k x share (k = friends who said yes); each friend who said yes has share. Same for HK$,
--    so the scanner's row plus the friends' rows always add up to the bill exactly (staff and owner totals stay right).
--  * When every invite is answered / timed out / cancelled the group closes. If nobody said yes the receipt can be split again;
--    once at least one friend said yes the split is final (no re-inviting for the leftover seats).
--  * A friend's yes is refused if the scanner has already spent the points it would take (split_points_spent).
--  * The scanner keeps the gold free highball, the scratch card and the passport dishes (one per bill); each friend's share inherits
--    the gold 2x (it's inside the points), gets a visit stamp, and counts for bring-a-friend (HK$388 judged on the friend's own
--    HK$ share) and the +88 come-back bonus exactly like any receipt of theirs.
--  * One scan per receipt and the 'already scanned, ask your friend to split it with you' block are unchanged (lf_submit_receipt_core).

insert into public.loyalty_settings (key, value) values ('split_max_people', '6') on conflict (key) do nothing;

create table if not exists public.loyalty_split_groups (
  id bigserial primary key,
  receipt_id bigint not null references public.loyalty_receipts(id),
  receipt_key text not null,
  from_phone text not null,                 -- the guest who scanned the receipt
  people int not null check (people between 2 and 6),   -- how many people share the bill, the scanner included
  bill_hkd numeric not null,                -- the whole bill when the split was sent
  points_total int not null,                -- what the scan earned when the split was sent
  share_points int not null,                -- each friend's share: floor(points_total / people)
  share_hkd numeric not null,               -- each friend's share of the bill: floor(bill / people) to the cent
  status text not null default 'open' check (status in ('open','closed')),
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  closed_at timestamptz
);
create unique index if not exists loyalty_split_groups_one_open on public.loyalty_split_groups (receipt_id) where status = 'open';
create index if not exists loyalty_split_groups_from_idx on public.loyalty_split_groups (from_phone, created_at desc);
alter table public.loyalty_split_groups enable row level security;

create table if not exists public.loyalty_split_invites (
  id bigserial primary key,
  group_id bigint not null references public.loyalty_split_groups(id),
  seat int not null,                        -- 1..5, the box the scanner typed them in
  to_phone text not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','expired','cancelled')),
  points_to int, hkd_to numeric,            -- filled in when the friend says yes
  share_receipt_id bigint references public.loyalty_receipts(id),
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  decided_at timestamptz,
  -- where the WhatsApp ping plugs in later: WhatsApp only (approved utility template from the shop number), no SMS. Not built yet; stays null.
  notified_at timestamptz, notify_channel text,
  unique (group_id, to_phone)
);
create index if not exists loyalty_split_invites_to_idx on public.loyalty_split_invites (to_phone, status);
alter table public.loyalty_split_invites enable row level security;

-- pending invites past their time become 'expired'; a group with nothing pending closes
create or replace function public.lf_split_group_expire() returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  update public.loyalty_split_invites set status = 'expired', decided_at = now() where status = 'pending' and expires_at <= now();
  update public.loyalty_split_groups g set status = 'closed', closed_at = now()
   where g.status = 'open' and not exists (select 1 from public.loyalty_split_invites i where i.group_id = g.id and i.status = 'pending');
end $$;

-- a friend from what the scanner typed: member code first, then phone number. null = not a member.
create or replace function public.lf_split_find(p_friend text) returns text language plpgsql stable security definer set search_path = public, extensions as $$
declare q text := upper(regexp_replace(coalesce(p_friend, ''), '[^0-9A-Za-z]', '', 'g')); fr text;
begin
  if q = '' then return null; end if;
  select phone into fr from public.loyalty_members where member_code = q;
  if fr is null then
    begin fr := public.lf_norm_phone(p_friend); exception when others then fr := null; end;
    if fr is not null and not exists (select 1 from public.loyalty_members where phone = fr) then fr := null; end if;
  end if;
  return fr;
end $$;

-- checks every box the scanner filled: [{i, ok, who | err}] with err = empty | not_member | self | duplicate
create or replace function public.lf_split_boxes(p_phone text, p_friends text[]) returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare out jsonb := '[]'::jsonb; seen text[] := '{}'; i int; fr text; raw text;
begin
  for i in 1 .. coalesce(array_length(p_friends, 1), 0) loop
    raw := coalesce(p_friends[i], '');
    if regexp_replace(raw, '[^0-9A-Za-z]', '', 'g') = '' then out := out || jsonb_build_object('i', i, 'ok', false, 'err', 'empty'); continue; end if;
    fr := public.lf_split_find(raw);
    if fr is null then out := out || jsonb_build_object('i', i, 'ok', false, 'err', 'not_member');
    elsif fr = p_phone then out := out || jsonb_build_object('i', i, 'ok', false, 'err', 'self');
    elsif fr = any(seen) then out := out || jsonb_build_object('i', i, 'ok', false, 'err', 'duplicate');
    else seen := seen || fr; out := out || jsonb_build_object('i', i, 'ok', true, 'who', public.lf_split_who(fr));
    end if;
  end loop;
  return out;
end $$;

-- the guest app checks the boxes as they're typed (nothing is sent)
create or replace function public.family_split_check(p_token uuid, p_friends text[]) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token);
begin
  if coalesce(array_length(p_friends, 1), 0) > 5 then raise exception 'split_too_many' using errcode = 'P0001'; end if;
  return jsonb_build_object('ok', true, 'boxes', public.lf_split_boxes(ph, p_friends));
end $$;

-- the scanner sends the split: p_people = everyone sharing (2..6, the scanner included), p_friends = one entry per friend
create or replace function public.family_split_group_offer(p_token uuid, p_receipt_id bigint, p_people int, p_friends text[]) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token); r public.loyalty_receipts; boxes jsonb; gid bigint; i int; fr text; sp int; sh numeric; test boolean;
        hrs int := coalesce((public.lf_setting('split_offer_hours'))::int, 12); perday int := coalesce((public.lf_setting('split_offers_per_day'))::int, 5);
        maxage int := coalesce((public.lf_setting('receipt_max_age_hours'))::int, 72); maxp int := least(6, greatest(2, coalesce((public.lf_setting('split_max_people'))::int, 6)));
begin
  perform public.lf_split_expire(); perform public.lf_split_group_expire();
  if p_people is null or p_people < 2 or p_people > maxp then raise exception 'split_people_range' using errcode = 'P0001'; end if;
  if coalesce(array_length(p_friends, 1), 0) <> p_people - 1 then raise exception 'split_boxes_mismatch' using errcode = 'P0001'; end if;
  select * into r from public.loyalty_receipts where id = p_receipt_id and phone = ph for update;
  if r.id is null then raise exception 'split_not_found' using errcode = 'P0001'; end if;
  if r.status = 'pending' then raise exception 'split_wait_approval' using errcode = 'P0001'; end if;
  if r.status <> 'approved' then raise exception 'split_not_found' using errcode = 'P0001'; end if;
  if r.base_key is not null or r.source in ('split', 'staff_split') then raise exception 'split_already' using errcode = 'P0001'; end if;
  if coalesce(r.receipt_at, r.created_at) < now() - make_interval(hours => maxage) then raise exception 'split_too_late' using errcode = 'P0001'; end if;
  if r.points < p_people then raise exception 'split_too_small' using errcode = 'P0001'; end if;
  if exists (select 1 from public.loyalty_split_offers o where o.receipt_id = r.id and o.status = 'pending' and o.expires_at > now())
     or exists (select 1 from public.loyalty_split_groups g where g.receipt_id = r.id and g.status = 'open') then raise exception 'split_already_offered' using errcode = 'P0001'; end if;
  if exists (select 1 from public.loyalty_split_offers o where o.receipt_id = r.id and o.status = 'accepted') then raise exception 'split_already' using errcode = 'P0001'; end if;
  if (select count(*) from public.loyalty_split_offers o where o.from_phone = ph and o.created_at > now() - interval '24 hours')
     + (select count(*) from public.loyalty_split_groups g where g.from_phone = ph and g.created_at > now() - interval '24 hours') >= perday then raise exception 'split_daily_limit' using errcode = 'P0001'; end if;
  boxes := public.lf_split_boxes(ph, p_friends);
  if exists (select 1 from jsonb_array_elements(boxes) b where not (b->>'ok')::boolean) then
    return jsonb_build_object('ok', false, 'error', 'split_boxes', 'boxes', boxes);
  end if;
  sp := floor(r.points::numeric / p_people)::int;
  sh := floor(r.total_hkd * 100 / p_people) / 100;
  test := public.lf_setting('env') <> 'live' or r.is_test or exists (select 1 from public.loyalty_members m where m.phone = ph and m.is_test);
  insert into public.loyalty_split_groups (receipt_id, receipt_key, from_phone, people, bill_hkd, points_total, share_points, share_hkd, is_test, expires_at)
    values (r.id, r.receipt_key, ph, p_people, r.total_hkd, r.points, sp, sh, test, now() + make_interval(hours => hrs)) returning id into gid;
  for i in 1 .. p_people - 1 loop
    fr := public.lf_split_find(p_friends[i]);
    insert into public.loyalty_split_invites (group_id, seat, to_phone, is_test, expires_at)
      values (gid, i, fr, test or exists (select 1 from public.loyalty_members m where m.phone = fr and m.is_test), now() + make_interval(hours => hrs));
    -- WHATSAPP PING (later): WhatsApp only (approved utility template from the shop number), no SMS fallback (Dominic 16:31).
    -- Queue it here for fr and set notified_at / notify_channel = 'whatsapp' when Meta accepts it. Not built: no sender yet.
  end loop;
  if test then update public.loyalty_split_groups set is_test = true where id = gid; end if;
  return jsonb_build_object('ok', true, 'group_id', gid, 'people', p_people, 'share', sp, 'share_hkd', sh, 'you', r.points - sp * (p_people - 1),
                            'expires_at', now() + make_interval(hours => hrs), 'boxes', boxes, 'member', public.lf_member_json(ph));
end $$;

-- a friend answers in their own app. Yes = their fixed share moves to them now (and stays theirs).
create or replace function public.family_split_group_answer(p_token uuid, p_invite_id bigint, p_yes boolean) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token); iv public.loyalty_split_invites; g public.loyalty_split_groups; r public.loyalty_receipts;
        pt int; ht numeric; newh numeric; rid bigint; got int; bal int; acc int; test boolean;
begin
  perform public.lf_split_group_expire();
  select * into iv from public.loyalty_split_invites where id = p_invite_id and to_phone = ph for update;
  if iv.id is null then raise exception 'split_not_found' using errcode = 'P0001'; end if;
  if iv.status = 'expired' then raise exception 'split_expired' using errcode = 'P0001'; end if;
  if iv.status = 'cancelled' then raise exception 'split_cancelled' using errcode = 'P0001'; end if;
  if iv.status <> 'pending' then raise exception 'already_reviewed' using errcode = 'P0001'; end if;
  select * into g from public.loyalty_split_groups where id = iv.group_id for update;
  if not p_yes then
    update public.loyalty_split_invites set status = 'declined', decided_at = now() where id = iv.id;
    perform public.lf_split_group_expire();
    return jsonb_build_object('ok', true, 'status', 'declined', 'member', public.lf_member_json(ph));
  end if;
  select * into r from public.loyalty_receipts where id = g.receipt_id for update;
  if r.id is null or r.status <> 'approved' or (r.base_key is not null and r.base_key <> r.receipt_key) then raise exception 'split_not_available' using errcode = 'P0001'; end if;
  if exists (select 1 from public.loyalty_receipts x where x.phone = ph and coalesce(x.base_key, x.receipt_key) = r.receipt_key and x.status <> 'rejected') then raise exception 'receipt_already_used' using errcode = 'P0001'; end if;
  pt := g.share_points; ht := g.share_hkd;
  if r.points < pt or r.total_hkd < ht then raise exception 'split_not_available' using errcode = 'P0001'; end if;
  select shari_balance into bal from public.loyalty_members where phone = r.phone for update;
  if coalesce(bal, 0) < pt then raise exception 'split_points_spent' using errcode = 'P0001'; end if;
  acc := 1 + (select count(*) from public.loyalty_split_invites i where i.group_id = g.id and i.status = 'accepted') + 1;   -- people actually sharing after this yes
  newh := r.total_hkd - ht;
  -- scanner's side: their row shrinks by exactly one share
  update public.loyalty_receipts set total_hkd = newh, points = r.points - pt, base_key = r.receipt_key, split_n = acc where id = r.id;
  update public.loyalty_members set shari_balance = shari_balance - pt, points = greatest(0, points - pt),
         lifetime_spend_hkd = greatest(0, lifetime_spend_hkd - (round(r.total_hkd)::int - round(newh)::int)) where phone = r.phone;
  update public.loyalty_members set tier = public.lf_status(r.phone) where phone = r.phone;
  -- friend's side: their own linked share of the same receipt
  test := public.lf_setting('env') <> 'live' or iv.is_test or g.is_test;
  insert into public.loyalty_receipts (phone, shop_id, receipt_no, receipt_key, base_key, split_n, total_hkd, receipt_at, status, source, reason, is_test)
    values (ph, r.shop_id, r.receipt_no, r.receipt_key || '#G' || g.id || '-' || iv.seat, r.receipt_key, acc, ht, r.receipt_at, 'approved', 'split',
            'split ' || g.people || ' ways with the scanner (group ' || g.id || ', seat ' || iv.seat || ')', test)
    returning id into rid;
  perform public.lf_credit_receipt(rid);            -- visit stamp, bring-a-friend check (on this share's HK$), come-back +88, tier spend, gold 2x inherited
  select points into got from public.loyalty_receipts where id = rid;
  update public.loyalty_receipts set points = pt, multiplier = 1 where id = rid;   -- the fixed equal share, not the friend's own tier rate
  update public.loyalty_members set shari_balance = greatest(0, shari_balance + (pt - got)), points = greatest(0, points + (pt - got)) where phone = ph;
  update public.loyalty_members set tier = public.lf_status(ph) where phone = ph;
  -- every row of this bill shows how many people share it now
  update public.loyalty_receipts set split_n = acc where status = 'approved' and (receipt_key = r.receipt_key or base_key = r.receipt_key);
  update public.loyalty_split_invites set status = 'accepted', decided_at = now(), points_to = pt, hkd_to = ht, share_receipt_id = rid where id = iv.id;
  perform public.lf_split_group_expire();
  return jsonb_build_object('ok', true, 'status', 'accepted', 'points', pt, 'hkd', ht, 'people', g.people, 'from', public.lf_split_who(r.phone),
                            'visit', (select visit_result from public.loyalty_receipts where id = rid), 'member', public.lf_member_json(ph));
end $$;

-- the scanner takes back invites nobody has answered yet: one (p_invite_id) or all of the group's pending ones (null)
create or replace function public.family_split_group_cancel(p_token uuid, p_group_id bigint, p_invite_id bigint default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token); n int;
begin
  perform public.lf_split_group_expire();
  if not exists (select 1 from public.loyalty_split_groups where id = p_group_id and from_phone = ph) then raise exception 'split_not_found' using errcode = 'P0001'; end if;
  update public.loyalty_split_invites set status = 'cancelled', decided_at = now()
   where group_id = p_group_id and status = 'pending' and (p_invite_id is null or id = p_invite_id);
  get diagnostics n = row_count;
  if n = 0 then raise exception 'already_reviewed' using errcode = 'P0001'; end if;
  perform public.lf_split_group_expire();
  return jsonb_build_object('ok', true, 'cancelled', n, 'member', public.lf_member_json(ph));
end $$;

-- one split as the guest app / staff / owner see it (a pending invite past its time reads as expired)
create or replace function public.lf_split_group_json(p_group_id bigint, p_names boolean default false) returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object('id', g.id, 'kind', 'group', 'receipt_id', g.receipt_id, 'receipt_no', r.receipt_no, 'people', g.people, 'bill', g.bill_hkd, 'points_total', g.points_total,
    'share', g.share_points, 'share_hkd', g.share_hkd, 'created_at', g.created_at, 'expires_at', g.expires_at, 'is_test', g.is_test, 'shop', r.shop_id,
    'open', exists (select 1 from public.loyalty_split_invites i where i.group_id = g.id and i.status = 'pending' and i.expires_at > now()),
    'accepted', (select count(*) from public.loyalty_split_invites i where i.group_id = g.id and i.status = 'accepted'),
    'scanner', case when p_names then coalesce(nullif(fm.name, ''), public.lf_mask_phone(fm.phone)) else public.lf_split_who(g.from_phone) end,
    'scanner_points', g.points_total - g.share_points * (select count(*) from public.loyalty_split_invites i where i.group_id = g.id and i.status = 'accepted'),
    'scanner_hkd', g.bill_hkd - g.share_hkd * (select count(*) from public.loyalty_split_invites i where i.group_id = g.id and i.status = 'accepted'),
    'invites', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'seat', i.seat,
                   'who', case when p_names then coalesce(nullif(m.name, ''), public.lf_mask_phone(m.phone)) else public.lf_split_who(i.to_phone) end,
                   'status', case when i.status = 'pending' and i.expires_at <= now() then 'expired' else i.status end,
                   'points', case when i.status = 'accepted' then i.points_to else g.share_points end, 'hkd', case when i.status = 'accepted' then i.hkd_to else g.share_hkd end,
                   'decided_at', i.decided_at) order by i.seat), '[]'::jsonb)
                from public.loyalty_split_invites i join public.loyalty_members m on m.phone = i.to_phone where i.group_id = g.id))
  from public.loyalty_split_groups g join public.loyalty_receipts r on r.id = g.receipt_id join public.loyalty_members fm on fm.phone = g.from_phone
  where g.id = p_group_id
$$;

-- ===== replaced functions (small edits, marked f35) =====
create or replace function public.lf_split_json(p_phone text) returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare hrs int := coalesce((public.lf_setting('split_offer_hours'))::int, 12); maxage int := coalesce((public.lf_setting('receipt_max_age_hours'))::int, 72);
begin
  return jsonb_build_object('split', jsonb_build_object(
    'hours', hrs, 'per_day', coalesce((public.lf_setting('split_offers_per_day'))::int, 5),
    'max_people', least(6, greatest(2, coalesce((public.lf_setting('split_max_people'))::int, 6))),   -- f35
    -- f35: group splits. gin = invites waiting for MY answer (the in-app notification), gout = splits I sent (last 7 days)
    'gin', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'group_id', g.id, 'from', public.lf_split_who(g.from_phone), 'receipt_no', r.receipt_no, 'bill', g.bill_hkd,
              'people', g.people, 'points_you', g.share_points, 'hkd_you', g.share_hkd, 'expires_at', i.expires_at, 'at', coalesce(r.receipt_at, r.created_at),
              'others', (select coalesce(jsonb_agg(public.lf_split_who(i2.to_phone) order by i2.seat), '[]'::jsonb) from public.loyalty_split_invites i2 where i2.group_id = g.id and i2.id <> i.id)) order by i.created_at), '[]'::jsonb)
           from public.loyalty_split_invites i join public.loyalty_split_groups g on g.id = i.group_id join public.loyalty_receipts r on r.id = g.receipt_id
           where i.to_phone = p_phone and i.status = 'pending' and i.expires_at > now()),
    'gout', (select coalesce(jsonb_agg(public.lf_split_group_json(g.id) order by g.created_at desc), '[]'::jsonb)
           from public.loyalty_split_groups g where g.from_phone = p_phone and g.created_at > now() - interval '7 days'),
    'in', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'from', public.lf_split_who(o.from_phone), 'receipt_no', r.receipt_no, 'bill', o.bill_hkd,
              'points_you', floor(r.points / 2.0)::int, 'expires_at', o.expires_at, 'at', coalesce(r.receipt_at, r.created_at)) order by o.created_at), '[]'::jsonb)
           from public.loyalty_split_offers o join public.loyalty_receipts r on r.id = o.receipt_id
           where o.to_phone = p_phone and o.status = 'pending' and o.expires_at > now()),
    'out', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'receipt_id', o.receipt_id, 'receipt_no', r.receipt_no, 'to', public.lf_split_who(o.to_phone),
              'status', case when o.status = 'pending' and o.expires_at <= now() then 'expired' else o.status end,
              'points_you', coalesce(o.points_from, o.points_total - floor(o.points_total / 2.0)::int), 'points_friend', coalesce(o.points_to, floor(o.points_total / 2.0)::int),
              'expires_at', o.expires_at, 'created_at', o.created_at, 'decided_at', o.decided_at) order by o.created_at desc), '[]'::jsonb)
           from public.loyalty_split_offers o join public.loyalty_receipts r on r.id = o.receipt_id
           where o.from_phone = p_phone and o.created_at > now() - interval '7 days'),
    -- receipts this guest can still split: their own approved scan, not shared yet, no open offer, inside the scan window, 2+ points
    'can', (select coalesce(jsonb_agg(r.id), '[]'::jsonb) from public.loyalty_receipts r
            where r.phone = p_phone and r.status = 'approved' and r.base_key is null and r.source not in ('split', 'staff_split') and r.points >= 2
              and coalesce(r.receipt_at, r.created_at) > now() - make_interval(hours => maxage)
              and not exists (select 1 from public.loyalty_split_offers o where o.receipt_id = r.id and (o.status = 'accepted' or (o.status = 'pending' and o.expires_at > now())))
              and not exists (select 1 from public.loyalty_split_groups g join public.loyalty_split_invites i on i.group_id = g.id
                              where g.receipt_id = r.id and (i.status = 'accepted' or (i.status = 'pending' and i.expires_at > now())))),
    -- every shared receipt of this guest (last 90 days): who with, and their side
    'shared', (select coalesce(jsonb_object_agg(r.id::text, jsonb_build_object('role', case when r.source = 'split' then 'friend' when r.source = 'staff_split' then 'staff' else 'scanner' end, 'n', r.split_n,
              'with', (select string_agg(public.lf_split_who(r2.phone), ', ' order by r2.id) from public.loyalty_receipts r2
                       where r2.id <> r.id and r2.status = 'approved' and coalesce(r2.base_key, r2.receipt_key) = r.base_key))), '{}'::jsonb)
           from public.loyalty_receipts r where r.phone = p_phone and r.base_key is not null and r.status = 'approved' and r.created_at > now() - interval '90 days')
  ));
end $$;


create or replace function public.family_split_offer(p_token uuid, p_receipt_id bigint, p_friend text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token); r public.loyalty_receipts; fr text; q text; oid bigint;
        hrs int := coalesce((public.lf_setting('split_offer_hours'))::int, 12); perday int := coalesce((public.lf_setting('split_offers_per_day'))::int, 5);
        maxage int := coalesce((public.lf_setting('receipt_max_age_hours'))::int, 72);
begin
  perform public.lf_split_expire();
  select * into r from public.loyalty_receipts where id = p_receipt_id and phone = ph for update;
  if r.id is null then raise exception 'split_not_found' using errcode = 'P0001'; end if;
  if r.status = 'pending' then raise exception 'split_wait_approval' using errcode = 'P0001'; end if;
  if r.status <> 'approved' then raise exception 'split_not_found' using errcode = 'P0001'; end if;
  if r.base_key is not null or r.source in ('split', 'staff_split') then raise exception 'split_already' using errcode = 'P0001'; end if;
  if coalesce(r.receipt_at, r.created_at) < now() - make_interval(hours => maxage) then raise exception 'split_too_late' using errcode = 'P0001'; end if;
  if r.points < 2 then raise exception 'split_too_small' using errcode = 'P0001'; end if;
  if exists (select 1 from public.loyalty_split_offers o where o.receipt_id = r.id and o.status = 'pending') then raise exception 'split_already_offered' using errcode = 'P0001'; end if;
  -- f35: not while a group split of this receipt is open
  perform public.lf_split_group_expire();
  if exists (select 1 from public.loyalty_split_groups g where g.receipt_id = r.id and g.status = 'open') then raise exception 'split_already_offered' using errcode = 'P0001'; end if;
  if exists (select 1 from public.loyalty_split_offers o where o.receipt_id = r.id and o.status = 'accepted') then raise exception 'split_already' using errcode = 'P0001'; end if;
  if (select count(*) from public.loyalty_split_offers o where o.from_phone = ph and o.created_at > now() - interval '24 hours') >= perday then raise exception 'split_daily_limit' using errcode = 'P0001'; end if;
  -- the friend: member code first, then phone number
  q := upper(regexp_replace(coalesce(p_friend, ''), '[^0-9A-Za-z]', '', 'g'));
  if q = '' then raise exception 'split_friend_not_found' using errcode = 'P0001'; end if;
  select phone into fr from public.loyalty_members where member_code = q;
  if fr is null then
    begin fr := public.lf_norm_phone(p_friend); exception when others then fr := null; end;
    if fr is not null and not exists (select 1 from public.loyalty_members where phone = fr) then fr := null; end if;
  end if;
  if fr is null then raise exception 'split_friend_not_found' using errcode = 'P0001'; end if;
  if fr = ph then raise exception 'split_not_yourself' using errcode = 'P0001'; end if;
  insert into public.loyalty_split_offers (receipt_id, receipt_key, from_phone, to_phone, bill_hkd, points_total, expires_at, is_test)
    values (r.id, r.receipt_key, ph, fr, r.total_hkd, r.points, now() + make_interval(hours => hrs),
            public.lf_setting('env') <> 'live' or r.is_test or exists (select 1 from public.loyalty_members m where m.phone in (ph, fr) and m.is_test))
    returning id into oid;
  return jsonb_build_object('ok', true, 'offer_id', oid, 'to', public.lf_split_who(fr), 'points_you', r.points - floor(r.points / 2.0)::int, 'points_friend', floor(r.points / 2.0)::int,
                            'expires_at', now() + make_interval(hours => hrs), 'member', public.lf_member_json(ph));
end $$;


-- staff iPad + owner: split receipts (staff see up to 3 days, the owner up to 90). f35: + 'groups' = every split as one row with
-- each person's share (f34 one-friend offers appear as a 2-way group), and the counts include group invites.
create or replace function public.staff_splits(p_token uuid, p_days int default 1) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); d int := greatest(1, least(coalesce(p_days, 1), case when s.role = 'owner' then 90 else 3 end));
begin
  return jsonb_build_object('days', d,
    'offers', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'at', o.created_at, 'decided_at', o.decided_at, 'receipt_no', r.receipt_no, 'bill', o.bill_hkd,
                 'status', case when o.status = 'pending' and o.expires_at <= now() then 'expired' else o.status end, 'expires_at', o.expires_at,
                 'scanner', coalesce(nullif(fm.name, ''), public.lf_mask_phone(fm.phone)), 'friend', coalesce(nullif(tm.name, ''), public.lf_mask_phone(tm.phone)),
                 'points_scanner', coalesce(o.points_from, o.points_total), 'points_friend', coalesce(o.points_to, 0), 'hkd_scanner', o.hkd_from, 'hkd_friend', o.hkd_to,
                 'shop', r.shop_id, 'is_test', o.is_test) order by o.created_at desc), '[]'::jsonb)
               from public.loyalty_split_offers o join public.loyalty_receipts r on r.id = o.receipt_id
               join public.loyalty_members fm on fm.phone = o.from_phone join public.loyalty_members tm on tm.phone = o.to_phone
               where o.created_at > now() - make_interval(days => d)),
    'groups', (select coalesce(jsonb_agg(x.j order by x.at desc), '[]'::jsonb) from (
        select g.created_at at, public.lf_split_group_json(g.id, true) j from public.loyalty_split_groups g where g.created_at > now() - make_interval(days => d)
        union all
        select o.created_at, jsonb_build_object('id', o.id, 'kind', 'offer', 'receipt_no', r.receipt_no, 'people', 2, 'bill', o.bill_hkd, 'points_total', o.points_total,
                 'created_at', o.created_at, 'expires_at', o.expires_at, 'is_test', o.is_test, 'shop', r.shop_id,
                 'open', o.status = 'pending' and o.expires_at > now(), 'accepted', case when o.status = 'accepted' then 1 else 0 end,
                 'scanner', coalesce(nullif(fm.name, ''), public.lf_mask_phone(fm.phone)),
                 'scanner_points', coalesce(o.points_from, o.points_total), 'scanner_hkd', coalesce(o.hkd_from, o.bill_hkd),
                 'invites', jsonb_build_array(jsonb_build_object('id', o.id, 'seat', 1, 'who', coalesce(nullif(tm.name, ''), public.lf_mask_phone(tm.phone)),
                   'status', case when o.status = 'pending' and o.expires_at <= now() then 'expired' else o.status end,
                   'points', coalesce(o.points_to, floor(o.points_total / 2.0)::int), 'hkd', coalesce(o.hkd_to, floor(o.bill_hkd * 100 / 2) / 100), 'decided_at', o.decided_at)))
          from public.loyalty_split_offers o join public.loyalty_receipts r on r.id = o.receipt_id
          join public.loyalty_members fm on fm.phone = o.from_phone join public.loyalty_members tm on tm.phone = o.to_phone
          where o.created_at > now() - make_interval(days => d)) x),
    'counts', (select jsonb_build_object('accepted', count(*) filter (where status = 'accepted'), 'pending', count(*) filter (where status = 'pending' and expires_at > now()),
                 'declined', count(*) filter (where status = 'declined'), 'expired', count(*) filter (where status = 'expired' or (status = 'pending' and expires_at <= now())),
                 'cancelled', count(*) filter (where status = 'cancelled'), 'points_moved', coalesce(sum(points_to) filter (where status = 'accepted'), 0))
               from (select status, expires_at, points_to from public.loyalty_split_offers where created_at > now() - make_interval(days => d)
                     union all select status, expires_at, points_to from public.loyalty_split_invites where created_at > now() - make_interval(days => d)) c),
    'bills', (select count(*) from public.loyalty_split_groups g where g.created_at > now() - make_interval(days => d))
            + (select count(*) from public.loyalty_split_offers o where o.created_at > now() - make_interval(days => d)));
end $$;

CREATE OR REPLACE FUNCTION public.owner_save_setting(p_token uuid, p_key text, p_value text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true); v numeric; lo numeric; hi numeric;
begin
  case p_key
    when 'rolls_per_plate' then lo := 2; hi := 20;
    when 'points_per_hkd' then lo := 0; hi := 100;
    when 'tier_gohan_hkd', 'tier_tobiko_hkd', 'kama_eligible_hkd' then lo := 0; hi := 10000000;
    when 'tier_mult_nori', 'tier_mult_gohan', 'tier_mult_tobiko', 'tier_mult_kama', 'gold_receipt_mult' then lo := 0; hi := 10;
    when 'tier_window_months' then lo := 1; hi := 60;
    when 'receipts_per_day' then lo := 1; hi := 20;
    when 'approve_over_hkd' then lo := 1; hi := 100000;
    when 'receipt_max_age_hours' then lo := 1; hi := 720;
    when 'gold_roll_chance', 'upgrade_chance', 'gold_receipt_odds' then lo := 0; hi := 1;
    when 'referral_bonus_points' then lo := 0; hi := 100000;
    when 'referral_cap_per_year' then lo := 0; hi := 1000;
    when 'birthday_window_days' then lo := 0; hi := 15;
    when 'birthday_min_days' then lo := 0; hi := 365;
    when 'roru_day_points_mult' then lo := 0; hi := 10;
    when 'hook_mon_on', 'hook_tue_on', 'hook_wed_on' then lo := 0; hi := 1;
    when 'hook_mon_stamps' then lo := 1; hi := 5;
    when 'hook_tue_bonus_mult' then lo := 0; hi := 10;
    when 'hook_wed_gold_odds' then lo := 0; hi := 1;
    when 'referral_min_spend' then lo := 0; hi := 100000;
    when 'rejoin_cooloff_days' then lo := 15; hi := 30;
    when 'kama_dinner_passes' then lo := 0; hi := 12;
    when 'upgrade_on', 'upgrade_slow_on', 'upgrade_lapsed_on' then lo := 0; hi := 1;
    when 'upgrade_slow_chance', 'upgrade_lapsed_chance', 'upgrade_both_chance' then lo := 0; hi := 1;
    when 'upgrade_lapsed_days' then lo := 7; hi := 365;
    when 'suggest_card_on', 'suggest_items_on' then lo := 0; hi := 1;
    when 'staff_card_timeout_s' then lo := 30; hi := 120;
    when 'split_offer_hours' then lo := 1; hi := 72;
    when 'referral_visit2_points' then lo := 0; hi := 100000;
    when 'referral_visit2_days' then lo := 1; hi := 365;
    when 'roru_day_max_point_rewards' then lo := 0; hi := 10;
    when 'split_offers_per_day' then lo := 1; hi := 20;
    when 'split_max_people' then lo := 2; hi := 6;   -- f35
    else raise exception 'setting_not_editable' using errcode = 'P0001';
  end case;
  begin v := trim(p_value)::numeric; exception when others then raise exception 'bad_value' using errcode = 'P0001'; end;
  if v < lo or v > hi then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key = 'rejoin_cooloff_days' and v not in (15, 30) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('hook_mon_on','hook_tue_on','hook_wed_on','upgrade_on','upgrade_slow_on','upgrade_lapsed_on','suggest_card_on','suggest_items_on') and v not in (0, 1) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('rolls_per_plate','tier_gohan_hkd','tier_tobiko_hkd','kama_eligible_hkd','tier_window_months','receipts_per_day','receipt_max_age_hours','referral_bonus_points','referral_cap_per_year','birthday_window_days','birthday_min_days','hook_mon_stamps','referral_min_spend','kama_dinner_passes','upgrade_lapsed_days','split_offer_hours','split_offers_per_day','split_max_people','referral_visit2_points','referral_visit2_days','roru_day_max_point_rewards') and v <> round(v) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key = 'staff_card_timeout_s' and v not in (30, 60, 90, 120) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  update public.loyalty_settings set value = trim(p_value), updated_at = now() where key = p_key;
  return jsonb_build_object('ok', true, 'key', p_key, 'value', trim(p_value));
end $function$;

grant execute on function public.family_split_check(uuid, text[]), public.family_split_group_offer(uuid, bigint, int, text[]), public.family_split_group_answer(uuid, bigint, boolean), public.family_split_group_cancel(uuid, bigint, bigint) to anon, authenticated;
revoke execute on function public.lf_split_group_expire(), public.lf_split_find(text), public.lf_split_boxes(text, text[]), public.lf_split_group_json(bigint, boolean) from public, anon, authenticated;
