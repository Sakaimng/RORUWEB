
-- ===== f34: pre-scan pop-up + "split the receipt with a friend" (Dominic, Oct 17 2026 15:02 HKT) =====
-- Additive only: one new table, new settings rows, new functions; four existing functions replaced with small edits
-- (lf_submit_receipt_core, lf_member_json, staff_today, owner_save_setting). Nothing dropped, no data deleted.
-- Plus the "numbers end in 88" rule (Dominic 15:03): referral_min_spend 200 -> 388, referral_bonus_points 100 -> 188,
-- scratch prize C6 +100 -> +88 points.

create table if not exists public.loyalty_split_offers (
  id bigserial primary key,
  receipt_id bigint not null references public.loyalty_receipts(id),
  receipt_key text not null,
  from_phone text not null,                 -- the guest who scanned the receipt
  to_phone text not null,                   -- the friend they asked
  status text not null default 'pending' check (status in ('pending','accepted','declined','expired','cancelled')),
  bill_hkd numeric not null,                -- the whole bill when the offer was made
  points_total int not null,                -- what the scan earned when the offer was made
  points_from int, points_to int, hkd_from numeric, hkd_to numeric,   -- filled in when the friend says yes
  share_receipt_id bigint references public.loyalty_receipts(id),
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  decided_at timestamptz
);
create unique index if not exists loyalty_split_offers_one_open on public.loyalty_split_offers (receipt_id) where status in ('pending','accepted');
create index if not exists loyalty_split_offers_to_idx on public.loyalty_split_offers (to_phone, status);
create index if not exists loyalty_split_offers_from_idx on public.loyalty_split_offers (from_phone, created_at desc);
alter table public.loyalty_split_offers enable row level security;

insert into public.loyalty_settings (key, value) values ('split_offer_hours', '12'), ('split_offers_per_day', '5') on conflict (key) do nothing;

-- the 88 rule
update public.loyalty_settings set value = '388', updated_at = now() where key = 'referral_min_spend' and value = '200';
-- bring-a-friend bonus 100 -> 188 (Dominic confirmed Oct 17 15:24; one value, owner Settings)
update public.loyalty_settings set value = '188', updated_at = now() where key = 'referral_bonus_points' and value in ('100', '88');
update public.loyalty_scratch_prizes set points = 88, name_en = '+88 bonus points', name_zh = '88 積分', line_en = '+88 bonus points, straight to your card.', line_zh = '即送 88 積分到你的卡。', updated_at = now()
 where code = 'C6' and points = 100;

-- pending offers past their time lapse; the points simply stay with the scanner
create or replace function public.lf_split_expire() returns void language sql security definer set search_path = public, extensions as $$
  update public.loyalty_split_offers set status = 'expired', decided_at = now() where status = 'pending' and expires_at <= now();
$$;

create or replace function public.lf_split_who(p_phone text) returns text language sql stable security definer set search_path = public, extensions as $$
  select coalesce(nullif(trim(m.name), '') || ' ', '') || '••' || right(p_phone, 2) from public.loyalty_members m where m.phone = p_phone
$$;

-- what the guest page needs about splits (read only: a pending offer past its time shows as expired)
create or replace function public.lf_split_json(p_phone text) returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare hrs int := coalesce((public.lf_setting('split_offer_hours'))::int, 12); maxage int := coalesce((public.lf_setting('receipt_max_age_hours'))::int, 72);
begin
  return jsonb_build_object('split', jsonb_build_object(
    'hours', hrs, 'per_day', coalesce((public.lf_setting('split_offers_per_day'))::int, 5),
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
              and not exists (select 1 from public.loyalty_split_offers o where o.receipt_id = r.id and (o.status = 'accepted' or (o.status = 'pending' and o.expires_at > now())))),
    -- every shared receipt of this guest (last 90 days): who with, and their side
    'shared', (select coalesce(jsonb_object_agg(r.id::text, jsonb_build_object('role', case when r.source = 'split' then 'friend' when r.source = 'staff_split' then 'staff' else 'scanner' end, 'n', r.split_n,
              'with', (select string_agg(public.lf_split_who(r2.phone), ', ' order by r2.id) from public.loyalty_receipts r2
                       where r2.id <> r.id and r2.status = 'approved' and coalesce(r2.base_key, r2.receipt_key) = r.base_key))), '{}'::jsonb)
           from public.loyalty_receipts r where r.phone = p_phone and r.base_key is not null and r.status = 'approved' and r.created_at > now() - interval '90 days')
  ));
end $$;

-- the scanner asks a friend (phone number or member code) to split one receipt 50/50
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

-- the friend answers in their own app. Yes = the receipt's points and spend are split 50/50 right now.
create or replace function public.family_split_answer(p_token uuid, p_offer_id bigint, p_yes boolean) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token); o public.loyalty_split_offers; r public.loyalty_receipts; s public.loyalty_receipts;
        p int; pt int; pf int; ht numeric; hf numeric; rid bigint; got int; bal int; test boolean;
begin
  perform public.lf_split_expire();
  select * into o from public.loyalty_split_offers where id = p_offer_id and to_phone = ph for update;
  if o.id is null then raise exception 'split_not_found' using errcode = 'P0001'; end if;
  if o.status = 'expired' then raise exception 'split_expired' using errcode = 'P0001'; end if;
  if o.status <> 'pending' then raise exception 'already_reviewed' using errcode = 'P0001'; end if;
  if not p_yes then
    update public.loyalty_split_offers set status = 'declined', decided_at = now() where id = o.id;
    return jsonb_build_object('ok', true, 'status', 'declined', 'member', public.lf_member_json(ph));
  end if;
  select * into r from public.loyalty_receipts where id = o.receipt_id for update;
  if r.id is null or r.status <> 'approved' or r.base_key is not null then raise exception 'split_not_available' using errcode = 'P0001'; end if;
  if exists (select 1 from public.loyalty_receipts x where x.phone = ph and coalesce(x.base_key, x.receipt_key) = r.receipt_key and x.status <> 'rejected') then raise exception 'receipt_already_used' using errcode = 'P0001'; end if;
  -- 50/50: the friend gets half the points rounded down, the scanner keeps the rest (so an odd point stays with the scanner).
  -- Spend splits the same way to the cent. Points are the ones the scan actually earned (tier, gold, Roru Day included).
  p := r.points; pt := floor(p / 2.0)::int; pf := p - pt;
  ht := floor(r.total_hkd * 100 / 2) / 100; hf := r.total_hkd - ht;
  select shari_balance into bal from public.loyalty_members where phone = r.phone for update;
  if coalesce(bal, 0) < pt then raise exception 'split_points_spent' using errcode = 'P0001'; end if;
  -- scanner's side
  update public.loyalty_receipts set total_hkd = hf, points = pf, base_key = r.receipt_key, split_n = 2 where id = r.id;
  update public.loyalty_members set shari_balance = shari_balance - pt, points = greatest(0, points - pt),
         lifetime_spend_hkd = greatest(0, lifetime_spend_hkd - (round(r.total_hkd)::int - round(hf)::int)) where phone = r.phone;
  update public.loyalty_members set tier = public.lf_status(r.phone) where phone = r.phone;
  -- friend's side: their own linked share of the same receipt (one scan row per receipt; the share points at it via base_key)
  test := public.lf_setting('env') <> 'live' or o.is_test;
  insert into public.loyalty_receipts (phone, shop_id, receipt_no, receipt_key, base_key, split_n, total_hkd, receipt_at, status, source, reason, is_test)
    values (ph, r.shop_id, r.receipt_no, r.receipt_key || '#F' || o.id, r.receipt_key, 2, ht, r.receipt_at, 'approved', 'split', 'split 50/50 with the scanner (offer ' || o.id || ')', test)
    returning id into rid;
  perform public.lf_credit_receipt(rid);            -- visit stamp, bring-a-friend check, tier spend
  select points into got from public.loyalty_receipts where id = rid;
  update public.loyalty_receipts set points = pt, multiplier = 1 where id = rid;   -- equal points, not the friend's own tier rate
  update public.loyalty_members set shari_balance = greatest(0, shari_balance + (pt - got)), points = greatest(0, points + (pt - got)) where phone = ph;
  update public.loyalty_members set tier = public.lf_status(ph) where phone = ph;
  update public.loyalty_split_offers set status = 'accepted', decided_at = now(), points_from = pf, points_to = pt, hkd_from = hf, hkd_to = ht, share_receipt_id = rid where id = o.id;
  return jsonb_build_object('ok', true, 'status', 'accepted', 'points', pt, 'points_scanner', pf, 'hkd', ht, 'from', public.lf_split_who(r.phone),
                            'visit', (select visit_result from public.loyalty_receipts where id = rid), 'member', public.lf_member_json(ph));
end $$;

-- the scanner takes back an offer the friend hasn't answered yet
create or replace function public.family_split_cancel(p_token uuid, p_offer_id bigint) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token);
begin
  update public.loyalty_split_offers set status = 'cancelled', decided_at = now() where id = p_offer_id and from_phone = ph and status = 'pending';
  if not found then raise exception 'already_reviewed' using errcode = 'P0001'; end if;
  return jsonb_build_object('ok', true, 'member', public.lf_member_json(ph));
end $$;

-- staff iPad + owner: split receipts (staff see up to 3 days, the owner up to 90)
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
    'counts', (select jsonb_build_object('accepted', count(*) filter (where status = 'accepted'), 'pending', count(*) filter (where status = 'pending' and expires_at > now()),
                 'declined', count(*) filter (where status = 'declined'), 'expired', count(*) filter (where status = 'expired' or (status = 'pending' and expires_at <= now())),
                 'cancelled', count(*) filter (where status = 'cancelled'), 'points_moved', coalesce(sum(points_to) filter (where status = 'accepted'), 0))
               from public.loyalty_split_offers where created_at > now() - make_interval(days => d)));
end $$;

grant execute on function public.family_split_offer(uuid, bigint, text), public.family_split_answer(uuid, bigint, boolean), public.family_split_cancel(uuid, bigint), public.staff_splits(uuid, int) to anon, authenticated;
revoke execute on function public.lf_split_expire(), public.lf_split_json(text), public.lf_split_who(text) from public, anon, authenticated;

-- ===== f34b: Dominic's 3:24 PM approvals =====
-- 1. bring-a-friend: 188 points each (referral_bonus_points), min first bill HK$388 (referral_min_spend) — set above.
-- 2. visit-2 bonus: +88 for the friend if they come back within 30 days of their first visit.
create table if not exists public.loyalty_visit2_bonuses (
  id bigserial primary key,
  phone text not null unique references public.loyalty_members(phone) on delete cascade,   -- once per friend
  points int not null,
  referrer_phone text,
  receipt_id bigint references public.loyalty_receipts(id),
  first_visit_day date, visit_day date,
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.loyalty_visit2_bonuses enable row level security;
insert into public.loyalty_settings (key, value) values ('referral_visit2_points', '88'), ('referral_visit2_days', '30') on conflict (key) do nothing;
-- 3. Roru Day: free first drink + a points reward can stack, max 1 points reward per guest per Roru Day (= per bill).
insert into public.loyalty_settings (key, value) values ('roru_day_max_point_rewards', '1') on conflict (key) do nothing;

create or replace function public.lf_visit2_json(p_phone text) returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare m public.loyalty_members; pts int := coalesce((public.lf_setting('referral_visit2_points'))::int, 0); days int := coalesce((public.lf_setting('referral_visit2_days'))::int, 30); fd date; paid public.loyalty_visit2_bonuses;
begin
  select * into m from public.loyalty_members where phone = p_phone;
  select * into paid from public.loyalty_visit2_bonuses where phone = p_phone;
  select min((coalesce(x.receipt_at, x.created_at) at time zone 'Asia/Hong_Kong')::date) into fd from public.loyalty_receipts x where x.phone = p_phone and x.status = 'approved';
  return jsonb_build_object('visit2', jsonb_build_object('points', pts, 'days', days, 'paid', paid.id is not null, 'paid_points', paid.points,
    'until', case when pts > 0 and m.referred_by is not null and m.referral_flag is null and paid.id is null and fd is not null and fd + days >= public.lf_hk_today() then fd + days end,
    'invited', m.referred_by is not null));
end $$;
revoke execute on function public.lf_visit2_json(text) from public, anon, authenticated;

-- ===== replaced functions (small edits, marked f34) =====
CREATE OR REPLACE FUNCTION public.lf_submit_receipt_core(p_token uuid, p_receipt_no text, p_total_hkd numeric, p_receipt_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_shop text DEFAULT NULL::text, p_source text DEFAULT 'ocr'::text, p_ocr_confidence integer DEFAULT NULL::integer, p_ocr_text text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare ph text := public.lf_member_session(p_token); o public.loyalty_receipts; k text; n int; st text := 'approved'; why text := null; rid bigint; test boolean := public.lf_setting('env') <> 'live';
        maxage int := coalesce((public.lf_setting('receipt_max_age_hours'))::int, 48); perday int := coalesce((public.lf_setting('receipts_per_day'))::int, 3);
        approve_over numeric := coalesce((public.lf_setting('approve_over_hkd'))::numeric, 1500); minconf int := coalesce((public.lf_setting('ocr_min_confidence'))::int, 60);
begin
  k := upper(regexp_replace(coalesce(p_receipt_no,''), '[^0-9A-Za-z]', '', 'g'));
  if length(k) < 3 then raise exception 'receipt_no_required' using errcode = 'P0001'; end if;
  if p_total_hkd is null or p_total_hkd <= 0 or p_total_hkd > 100000 then raise exception 'bad_total' using errcode = 'P0001'; end if;
  if public.lf_receipt_used(k) then
    select * into o from public.loyalty_receipts where receipt_key = k and status <> 'rejected';
    -- f34 (Dominic Oct 17): one scan per receipt. The same guest again = already used; anyone else is stopped and told to ask the
    -- guest who scanned it to split it with them (family_split_offer). No more automatic split requests from a second scan.
    if o.id is null or o.phone = ph
       or exists (select 1 from public.loyalty_receipts x where x.base_key = k and x.phone = ph and x.status <> 'rejected') then
      raise exception 'receipt_already_used' using errcode = 'P0001';
    end if;
    raise exception 'receipt_scanned_by_friend' using errcode = 'P0001';
  end if;
  if p_receipt_at is not null and p_receipt_at < now() - make_interval(hours => maxage) then raise exception 'receipt_too_old' using errcode = 'P0001'; end if;
  if p_receipt_at is not null and p_receipt_at > now() + interval '1 hour' then raise exception 'receipt_in_future' using errcode = 'P0001'; end if;
  select count(*) into n from public.loyalty_receipts where phone = ph and created_at > now() - interval '24 hours' and status <> 'rejected';
  if n >= perday then raise exception 'daily_receipt_limit' using errcode = 'P0001'; end if;
  if p_source <> 'ocr' then st := 'pending'; why := 'typed by guest'; end if;
  if p_source = 'ocr' and (p_ocr_confidence is null or p_ocr_confidence < minconf) then st := 'pending'; why := 'low OCR confidence'; end if;
  if p_total_hkd >= approve_over then st := 'pending'; why := coalesce(why || '; ', '') || 'over HK$' || approve_over::int; end if;
  if p_receipt_at is null then st := 'pending'; why := coalesce(why || '; ', '') || 'no date read'; end if;
  insert into public.loyalty_receipts (phone, shop_id, receipt_no, receipt_key, total_hkd, receipt_at, status, source, ocr_confidence, ocr_text, reason, is_test)
    values (ph, p_shop, trim(p_receipt_no), k, round(p_total_hkd, 2), p_receipt_at, st, p_source, p_ocr_confidence, left(p_ocr_text, 2000), why, test) returning id into rid;
  if st = 'approved' then perform public.lf_credit_receipt(rid); end if;
  return jsonb_build_object('ok', true, 'id', rid, 'status', st, 'reason', why, 'points', (select points from public.loyalty_receipts where id = rid), 'visit', (select visit_result from public.loyalty_receipts where id = rid), 'member', public.lf_member_json(ph));
end $function$;

CREATE OR REPLACE FUNCTION public.lf_member_json(p_phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare base jsonb := public.lf_member_core(p_phone); m public.loyalty_members; ref record; bday_claimed boolean; min_days int := coalesce((public.lf_setting('birthday_min_days'))::int, 30);
        in_win boolean; days_left int;
begin
  if base is null then return null; end if;
  select * into m from public.loyalty_members where phone = p_phone;
  select name into ref from public.loyalty_members where phone = m.referred_by;
  select exists (select 1 from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id where r.phone = p_phone and w.kind = 'birthday'
                   and r.status <> 'void' and r.earned_at > now() - interval '300 days') into bday_claimed;
  in_win := public.lf_bday_in_window(m.birthday_md);
  days_left := case when m.birthday_set_at is null then null else greatest(0, min_days - (now()::date - m.birthday_set_at::date)) end;
  return base || public.lf_split_json(p_phone) || public.lf_visit2_json(p_phone) || jsonb_build_object(
    'split_inbox', (select coalesce(jsonb_agg(jsonb_build_object('id', sr.id, 'who', '••••' || right(sr.requester_phone, 2), 'name', rq.name, 'receipt_no', o.receipt_no, 'bill', (select sum(total_hkd) from public.loyalty_receipts x where (x.receipt_key = sr.receipt_key or x.base_key = sr.receipt_key) and x.status = 'approved'),
                       'people_after', (select count(*) + 1 from public.loyalty_receipts x where (x.receipt_key = sr.receipt_key or x.base_key = sr.receipt_key) and x.status = 'approved'), 'expires_at', sr.expires_at) order by sr.created_at), '[]'::jsonb)
                    from public.loyalty_split_requests sr join public.loyalty_members rq on rq.phone = sr.requester_phone left join public.loyalty_receipts o on o.receipt_key = sr.receipt_key and o.status <> 'rejected'
                    where sr.first_phone = p_phone and sr.status = 'pending' and sr.expires_at > now()),
    'split_outbox', (select coalesce(jsonb_agg(jsonb_build_object('id', sr.id, 'receipt_no', o.receipt_no, 'status', case when sr.status = 'pending' and sr.expires_at <= now() then 'expired' else sr.status end,
                       'points', (select points from public.loyalty_receipts x where x.id = sr.receipt_id), 'created_at', sr.created_at) order by sr.created_at desc), '[]'::jsonb)
                    from public.loyalty_split_requests sr left join public.loyalty_receipts o on o.receipt_key = sr.receipt_key and o.status <> 'rejected'
                    where sr.requester_phone = p_phone and sr.created_at > now() - interval '7 days'),
    'perks', public.lf_perks_json(p_phone), 'kama_dinner', public.lf_kama_dinner(p_phone),
    'hook_today', public.lf_hook(public.lf_hk_today()), 'taste', public.lf_taste(p_phone), 'suggest', public.lf_suggest_from(base || jsonb_build_object('taste', public.lf_taste(p_phone))),
    'consents', jsonb_build_object('terms_version', m.terms_version, 'terms_at', m.terms_at, 'whatsapp', m.mkt_whatsapp, 'whatsapp_at', m.mkt_whatsapp_at, 'push', m.mkt_push, 'push_at', m.mkt_push_at,
             'current_version', public.lf_setting('terms_version')),
    'gold', jsonb_build_object('on', public.lf_feature_on('gold_receipt'), 'mult', (public.lf_setting('gold_receipt_mult'))::numeric, 'odds', (public.lf_setting('gold_receipt_odds'))::numeric,
             'count', (select count(*) from public.loyalty_receipts where phone = p_phone and gold)),
    'referral', jsonb_build_object('on', public.lf_feature_on('bring_friend'), 'code', m.member_code, 'bonus', (public.lf_setting('referral_bonus_points'))::int, 'cap', (public.lf_setting('referral_cap_per_year'))::int,
             'joined', (select count(*) from public.loyalty_members f where f.referred_by = p_phone), 'pending', (select count(*) from public.loyalty_members f where f.referred_by = p_phone and f.referral_bonus_at is null) + (select count(*) from public.loyalty_bonuses b where b.phone = p_phone and b.kind = 'referral_member' and b.status = 'pending'), 'min_spend', (public.lf_setting('referral_min_spend'))::numeric,
             'rewarded', (select count(*) from public.loyalty_bonuses b where b.phone = p_phone and b.kind = 'referral_member' and b.status = 'paid'),
             'points_earned', (select coalesce(sum(points),0) from public.loyalty_bonuses b where b.phone = p_phone and b.status = 'paid'),
             'invited_by', case when m.referred_by is null then null else coalesce(ref.name, public.lf_mask_phone(m.referred_by)) end,
             'my_bonus_pending', (m.referred_by is not null and m.referral_bonus_at is null)),
    'birthday', jsonb_build_object('on', public.lf_feature_on('birthday_roll'), 'md', m.birthday_md, 'in_window', in_win, 'claimed', bday_claimed,
             'days_until_eligible', days_left,
             'claimable', public.lf_feature_on('birthday_roll') and in_win and not bday_claimed and days_left = 0 and public.lf_tier_rank(public.lf_status(p_phone)) >= 2,
             'tier_ok', public.lf_tier_rank(public.lf_status(p_phone)) >= 2, 'min_tier', 'gohan'),
    'perk_status', public.lf_perk_status(p_phone)
  );
end $function$;

CREATE OR REPLACE FUNCTION public.staff_today(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token); shop text; today date := public.lf_hk_today();
begin
  select coalesce(se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  return jsonb_build_object('shop', shop, 'day', today,
    'receipts', (select count(*) from public.loyalty_receipts where status = 'approved' and (coalesce(reviewed_at, created_at) at time zone 'Asia/Hong_Kong')::date = today),
    'points', (select coalesce(sum(points),0) from public.loyalty_receipts where status = 'approved' and (coalesce(reviewed_at, created_at) at time zone 'Asia/Hong_Kong')::date = today),
    'visits', (select count(*) from public.loyalty_visits where kind = 'visit' and visit_day = today),
    'pending', (select count(*) from public.loyalty_receipts where status = 'pending'), 'pending_bonuses', (select count(*) from public.loyalty_bonuses where status = 'pending' and kind = 'referral_friend'),
    'redeemed', (select count(*) from public.loyalty_redemptions where (redeemed_at at time zone 'Asia/Hong_Kong')::date = today),
    'log', (select coalesce(jsonb_agg(x order by x->>'at' desc), '[]'::jsonb) from (
        select jsonb_build_object('at', coalesce(r.reviewed_at, r.created_at), 'type', case when r.status='approved' then 'points' else r.status end, 'who', coalesce(m.name, public.lf_mask_phone(m.phone)), 'by', st.name, 'amount', r.total_hkd, 'points', r.points, 'source', r.source, 'split_n', r.split_n,
               'split_role', case when r.base_key is null then null when r.source = 'split' then 'friend' when r.source = 'staff_split' then 'staff' else 'scanner' end,
               'split_with', case when r.base_key is null then null else (select string_agg(coalesce(nullif(m2.name, ''), public.lf_mask_phone(m2.phone)), ', ' order by r2.id) from public.loyalty_receipts r2 join public.loyalty_members m2 on m2.phone = r2.phone
                              where r2.id <> r.id and r2.status = 'approved' and coalesce(r2.base_key, r2.receipt_key) = r.base_key) end,
               'stamped', coalesce((r.visit_result->>'added')::boolean, false)) x
          from public.loyalty_receipts r join public.loyalty_members m on m.phone = r.phone left join public.loyalty_staff st on st.id = r.reviewed_by
          where (coalesce(r.reviewed_at, r.created_at) at time zone 'Asia/Hong_Kong')::date = today
        union all
        select jsonb_build_object('at', v.created_at, 'type', 'visit', 'who', coalesce(m.name, public.lf_mask_phone(m.phone)), 'by', st.name) x
          from public.loyalty_visits v join public.loyalty_members m on m.phone = v.phone left join public.loyalty_staff st on st.id = v.staff_id
          where v.kind = 'visit' and v.source = 'visit_only' and (v.created_at at time zone 'Asia/Hong_Kong')::date = today
        union all
        select jsonb_build_object('at', r.redeemed_at, 'type', 'redeem', 'who', coalesce(m.name, public.lf_mask_phone(m.phone)), 'by', st.name, 'reward', w.name_en, 'reward_zh', w.name_zh) x
          from public.loyalty_redemptions r join public.loyalty_members m on m.phone = r.phone join public.loyalty_rewards w on w.id = r.reward_id left join public.loyalty_staff st on st.id = r.redeemed_staff
          where (r.redeemed_at at time zone 'Asia/Hong_Kong')::date = today
      ) t));
end $function$;

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
    else raise exception 'setting_not_editable' using errcode = 'P0001';
  end case;
  begin v := trim(p_value)::numeric; exception when others then raise exception 'bad_value' using errcode = 'P0001'; end;
  if v < lo or v > hi then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key = 'rejoin_cooloff_days' and v not in (15, 30) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('hook_mon_on','hook_tue_on','hook_wed_on','upgrade_on','upgrade_slow_on','upgrade_lapsed_on','suggest_card_on','suggest_items_on') and v not in (0, 1) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('rolls_per_plate','tier_gohan_hkd','tier_tobiko_hkd','kama_eligible_hkd','tier_window_months','receipts_per_day','receipt_max_age_hours','referral_bonus_points','referral_cap_per_year','birthday_window_days','birthday_min_days','hook_mon_stamps','referral_min_spend','kama_dinner_passes','upgrade_lapsed_days','split_offer_hours','split_offers_per_day','referral_visit2_points','referral_visit2_days','roru_day_max_point_rewards') and v <> round(v) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key = 'staff_card_timeout_s' and v not in (30, 60, 90, 120) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  update public.loyalty_settings set value = trim(p_value), updated_at = now() where key = p_key;
  return jsonb_build_object('ok', true, 'key', p_key, 'value', trim(p_value));
end $function$;

CREATE OR REPLACE FUNCTION public.lf_credit_receipt(p_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare r public.loyalty_receipts; m public.loyalty_members; pts int; mult numeric; st text; vr jsonb; vday date; is_gold boolean := false;
        bonus int := coalesce((public.lf_setting('referral_bonus_points'))::int, 100); minspend numeric := coalesce((public.lf_setting('referral_min_spend'))::numeric, 200); odds numeric; hk text; bst text; ref_shared boolean; cap int := coalesce((public.lf_setting('referral_cap_per_year'))::int, 10); test boolean := public.lf_setting('env') <> 'live'; gw public.loyalty_rewards; gcode text;
        v2pts int := coalesce((public.lf_setting('referral_visit2_points'))::int, 0); v2days int := coalesce((public.lf_setting('referral_visit2_days'))::int, 30); first_day date;
begin
  select * into r from public.loyalty_receipts where id = p_id for update;
  if r.status <> 'approved' or r.points > 0 then return; end if;
  select * into m from public.loyalty_members where phone = r.phone for update;
  st := case when m.tier = 'kama' then 'kama' else public.lf_tier_spend(public.lf_year_spend(r.phone) - round(r.total_hkd)::int) end;
  mult := public.lf_tier_mult(st);
  vday := coalesce((r.receipt_at at time zone 'Asia/Hong_Kong')::date, public.lf_hk_today());
  if vday > public.lf_hk_today() then vday := public.lf_hk_today(); end if;
  hk := public.lf_hook(vday);
  odds := coalesce((public.lf_setting('gold_receipt_odds'))::numeric, 0.05);
  if hk = 'wed_gold' then odds := greatest(odds, coalesce((public.lf_setting('hook_wed_gold_odds'))::numeric, 0.2)); end if;
  is_gold := public.lf_feature_on('gold_receipt') and random() < odds;
  -- a guest split share never re-rolls gold: it inherits the original claim's result (no 'split to re-roll')
  if r.source = 'split' then
    select coalesce(bool_or(x.gold), false) into is_gold from public.loyalty_receipts x
     where x.id <> r.id and x.source <> 'split' and x.status = 'approved' and coalesce(x.base_key, x.receipt_key) = coalesce(r.base_key, r.receipt_key);
  end if;
  pts := floor(r.total_hkd * coalesce((public.lf_setting('points_per_hkd'))::numeric, 1) * mult * (case when is_gold then coalesce((public.lf_setting('gold_receipt_mult'))::numeric, 2) else 1 end));
  update public.loyalty_members set shari_balance = shari_balance + pts, points = points + pts,
    lifetime_spend_hkd = lifetime_spend_hkd + round(r.total_hkd)::int, last_visit_at = greatest(coalesce(last_visit_at, r.receipt_at, now()), coalesce(r.receipt_at, now()))
    where phone = r.phone;
  update public.loyalty_members set tier = public.lf_status(r.phone) where phone = r.phone;
  vr := public.lf_add_visit(r.phone, coalesce(r.shop_id, 'wanchai'), r.reviewed_by, vday, r.id, case when r.source in ('staff','staff_split') then 'staff_award' else 'receipt' end, false);
  -- bring a friend: paid once, on the friend's first approved receipt (or split share) of at least referral_min_spend.
  -- A receipt the referrer also claimed doesn't count, unless staff split it at the table. Flagged links wait for staff (status pending).
  ref_shared := r.source not in ('staff_split','split') and exists (select 1 from public.loyalty_receipts x where x.phone = m.referred_by and coalesce(x.base_key, x.receipt_key) = coalesce(r.base_key, r.receipt_key));
  if public.lf_feature_on('bring_friend') and m.referred_by is not null and m.referral_bonus_at is null and coalesce(m.phone_was_new, true)
     and r.total_hkd >= minspend and not ref_shared then
    if hk = 'tue_friends' then bonus := round(bonus * coalesce((public.lf_setting('hook_tue_bonus_mult'))::numeric, 2)); end if;
    bst := case when m.referral_flag is null then 'paid' else 'pending' end;
    update public.loyalty_members set referral_bonus_at = now() where phone = r.phone;
    insert into public.loyalty_bonuses (phone, kind, points, related_phone, receipt_id, is_test, status, reason) values (r.phone, 'referral_friend', bonus, m.referred_by, r.id, test, bst, m.referral_flag);
    if bst = 'paid' then update public.loyalty_members set shari_balance = shari_balance + bonus, points = points + bonus where phone = r.phone; end if;
    if (select count(*) from public.loyalty_bonuses b where b.phone = m.referred_by and b.kind = 'referral_member' and b.status <> 'rejected' and b.created_at > now() - interval '365 days') < cap then
      insert into public.loyalty_bonuses (phone, kind, points, related_phone, receipt_id, is_test, status, reason) values (m.referred_by, 'referral_member', bonus, r.phone, r.id, test, bst, m.referral_flag);
      if bst = 'paid' then update public.loyalty_members set shari_balance = shari_balance + bonus, points = points + bonus where phone = m.referred_by; end if;
    end if;
    vr := vr || jsonb_build_object('referral_bonus', bonus, 'referral_status', bst);
  end if;
  -- f34 visit-2 bonus (Dominic Oct 17 15:24): a friend who joined through a member's link gets +referral_visit2_points when they
  -- come back on a later day within referral_visit2_days of their first visit. Once per friend; 0 points = off; flagged links don't get it.
  if v2pts > 0 and public.lf_feature_on('bring_friend') and m.referred_by is not null and coalesce(m.phone_was_new, true) and m.referral_flag is null
     and not exists (select 1 from public.loyalty_visit2_bonuses b where b.phone = r.phone) then
    select min((coalesce(x.receipt_at, x.created_at) at time zone 'Asia/Hong_Kong')::date) into first_day from public.loyalty_receipts x
     where x.phone = r.phone and x.status = 'approved' and x.id <> r.id;
    if first_day is not null and vday > first_day and vday <= first_day + v2days then
      insert into public.loyalty_visit2_bonuses (phone, points, referrer_phone, receipt_id, first_visit_day, visit_day, is_test) values (r.phone, v2pts, m.referred_by, r.id, first_day, vday, test);
      update public.loyalty_members set shari_balance = shari_balance + v2pts, points = points + v2pts where phone = r.phone;
      vr := vr || jsonb_build_object('visit2_bonus', v2pts);
    end if;
  end if;
  -- v48: a gold receipt also wins a free highball (one per bill: a guest split share inherits the 2x but not a second drink)
  if is_gold and r.source <> 'split' then
    select * into gw from public.loyalty_rewards where code = 'GOLD' and active;
    if gw.id is not null and not exists (select 1 from public.loyalty_redemptions x where x.source_receipt_id = r.id) then
      gcode := 'R' || translate(upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 7)), '4', 'K');
      insert into public.loyalty_redemptions (phone, reward_id, reward_code, is_test, status, revealed_at, points_spent, source_receipt_id)
        values (r.phone, gw.id, gcode, test, 'revealed', now(), 0, r.id);
      vr := vr || jsonb_build_object('gold_reward', jsonb_build_object('code', gcode, 'name_en', gw.name_en, 'name_zh', gw.name_zh));
    end if;
  end if;
  update public.loyalty_receipts set points = pts, multiplier = mult, gold = is_gold, visit_result = vr || jsonb_build_object('gold', is_gold, 'hook', hk) where id = p_id;
end $function$;

CREATE OR REPLACE FUNCTION public.staff_redeem(p_token uuid, p_reward_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token); r record; shop text; rc text;
begin
  rc := upper(regexp_replace(coalesce(p_reward_code,''), '[^0-9A-Za-z]', '', 'g'));
  select rd.*, w.name_en, w.name_zh into r from public.loyalty_redemptions rd join public.loyalty_rewards w on w.id = rd.reward_id where rd.reward_code = rc;
  if r.id is null then raise exception 'reward_not_found' using errcode = 'P0001'; end if;
  if r.status = 'redeemed' then raise exception 'already_redeemed' using errcode = 'P0001'; end if;
  if r.status = 'void' then raise exception 'reward_void' using errcode = 'P0001'; end if;
  -- f34 Roru Day guardrail (Dominic Oct 17 15:24): the free first drink and a points reward can stack, but at most
  -- roru_day_max_point_rewards points rewards (default 1) per guest per Roru Day, i.e. one per bill. 0 = no cap.
  if coalesce(r.points_spent, 0) > 0 and coalesce((public.lf_setting('roru_day_max_point_rewards'))::int, 1) > 0 and (public.lf_scratch_today()->>'day') is not null
     and (select count(*) from public.loyalty_redemptions x where x.phone = r.phone and x.status = 'redeemed' and coalesce(x.points_spent, 0) > 0
            and (x.redeemed_at at time zone 'Asia/Hong_Kong')::date = public.lf_hk_today()) >= coalesce((public.lf_setting('roru_day_max_point_rewards'))::int, 1) then
    raise exception 'roru_day_one_points_reward' using errcode = 'P0001';
  end if;
  select coalesce(se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  update public.loyalty_redemptions set status = 'redeemed', redeemed_at = now(), redeemed_shop = shop, redeemed_staff = s.id where id = r.id;
  return jsonb_build_object('ok', true, 'reward', jsonb_build_object('code', rc, 'name_en', r.name_en, 'name_zh', r.name_zh, 'phone_masked', public.lf_mask_phone(r.phone)),
                            'pos', public.lf_pos_item_json(r.id), 'member', public.lf_member_staff_json(r.phone));
end $function$;
