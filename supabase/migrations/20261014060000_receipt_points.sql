-- Roru Family v1b: spend points via receipts (Dominic, Oct 14 2026 13:42). Additive. Rolls objects from v1a stay (unused by the UI).
insert into public.loyalty_settings (key, value) values
  ('points_per_hkd', '1'),            -- 1 point per HK$1 (placeholder, Dominic's call)
  ('receipt_max_age_hours', '48'),    -- receipt must be from the last 48 h
  ('receipts_per_day', '3'),          -- per phone per day
  ('approve_over_hkd', '1500'),       -- bigger bills wait for staff approval
  ('ocr_min_confidence', '60'),       -- below this the receipt goes to the queue
  ('upgrade_chance', '0.10'),         -- scratch reveal: chance the reward is upgraded to the next on the ladder
  ('tier_gohan_hkd', '1000'), ('tier_tobiko_hkd', '5000')   -- drafts from Dominic's Layer 2 note
on conflict (key) do nothing;

alter table public.loyalty_rewards add column if not exists points_cost int not null default 0;
alter table public.loyalty_rewards drop constraint if exists loyalty_rewards_kind_check;
alter table public.loyalty_rewards add constraint loyalty_rewards_kind_check check (kind in ('plate','gold','bonus','ladder'));
insert into public.loyalty_rewards (code, name_en, name_zh, detail_en, detail_zh, kind, weight, points_cost, sort) values
  ('L1', 'Reward A (TBC)', '獎賞 A（待定）', 'Placeholder — e.g. a free hand roll', '佔位 — 例如一個免費手卷', 'ladder', 0, 300, 11),
  ('L2', 'Reward B (TBC)', '獎賞 B（待定）', 'Placeholder — e.g. premium roll upgrade', '佔位 — 例如升級高級手卷', 'ladder', 0, 600, 12),
  ('L3', 'Reward C (TBC)', '獎賞 C（待定）', 'Placeholder — e.g. HK$100 off', '佔位 — 例如 HK$100 折扣', 'ladder', 0, 1200, 13),
  ('L4', 'Reward D (TBC)', '獎賞 D（待定）', 'Placeholder — e.g. chef''s counter seat priority', '佔位 — 例如板前優先座', 'ladder', 0, 2500, 14)
on conflict (code) do nothing;
update public.loyalty_rewards set active = false where kind in ('plate','gold') and active;   -- v1a plate rewards off

create table if not exists public.loyalty_receipts (
  id bigserial primary key,
  phone text not null references public.loyalty_members(phone) on delete cascade,
  shop_id text references public.loyalty_shops(id),
  receipt_no text not null,
  receipt_key text not null,                  -- normalised receipt number (dedupe)
  total_hkd numeric(10,2) not null check (total_hkd > 0),
  receipt_at timestamptz,
  points int not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  source text not null default 'ocr' check (source in ('ocr','manual','staff')),
  ocr_confidence int,
  ocr_text text,
  reason text,
  reviewed_by int,
  reviewed_at timestamptz,
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists loyalty_receipts_key_uniq on public.loyalty_receipts (receipt_key) where status <> 'rejected';
create index if not exists loyalty_receipts_phone_idx on public.loyalty_receipts (phone, created_at desc);
create index if not exists loyalty_receipts_status_idx on public.loyalty_receipts (status, created_at);
alter table public.loyalty_receipts enable row level security;
revoke all on public.loyalty_receipts from anon, authenticated;
alter table public.loyalty_redemptions add column if not exists points_spent int not null default 0;
alter table public.loyalty_redemptions add column if not exists upgraded boolean not null default false;

create or replace function public.lf_tier_spend(p_spend int) returns text
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if p_spend >= coalesce((public.lf_setting('tier_tobiko_hkd'))::int, 5000) then return 'tobiko'; end if;
  if p_spend >= coalesce((public.lf_setting('tier_gohan_hkd'))::int, 1000) then return 'gohan'; end if;
  return 'nori';
end $$;

-- credit an approved receipt to the member (internal)
create or replace function public.lf_credit_receipt(p_id bigint) returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
declare r public.loyalty_receipts; pts int;
begin
  select * into r from public.loyalty_receipts where id = p_id for update;
  if r.status <> 'approved' or r.points > 0 then return; end if;
  pts := floor(r.total_hkd * coalesce((public.lf_setting('points_per_hkd'))::numeric, 1));
  update public.loyalty_receipts set points = pts where id = p_id;
  update public.loyalty_members set shari_balance = shari_balance + pts, points = points + pts,
    lifetime_spend_hkd = lifetime_spend_hkd + round(r.total_hkd)::int, last_visit_at = coalesce(r.receipt_at, now()),
    tier = case when tier = 'kama' then 'kama' else public.lf_tier_spend(lifetime_spend_hkd + round(r.total_hkd)::int) end
    where phone = r.phone;
end $$;

-- member json v1b (points, tiers by spend, receipts, ladder)
create or replace function public.lf_member_json(p_phone text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare m record; rewards jsonb; receipts jsonb; ladder jsonb; gohan int := coalesce((public.lf_setting('tier_gohan_hkd'))::int,1000); tobiko int := coalesce((public.lf_setting('tier_tobiko_hkd'))::int,5000);
begin
  select * into m from public.loyalty_members where phone = p_phone;
  if not found then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'status', r.status, 'code', r.reward_code, 'points_spent', r.points_spent, 'upgraded', r.upgraded,
           'name_en', w.name_en, 'name_zh', w.name_zh, 'detail_en', w.detail_en, 'detail_zh', w.detail_zh, 'kind', w.kind,
           'earned_at', r.earned_at, 'redeemed_at', r.redeemed_at) order by r.earned_at desc), '[]'::jsonb)
    into rewards from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id where r.phone = p_phone and r.status <> 'void';
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'receipt_no', x.receipt_no, 'total_hkd', x.total_hkd, 'points', x.points, 'status', x.status, 'source', x.source, 'at', coalesce(x.receipt_at, x.created_at), 'shop', s.name_en, 'shop_zh', s.name_zh, 'reason', x.reason) order by x.created_at desc), '[]'::jsonb)
    into receipts from (select * from public.loyalty_receipts where phone = p_phone order by created_at desc limit 15) x left join public.loyalty_shops s on s.id = x.shop_id;
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'code', code, 'name_en', name_en, 'name_zh', name_zh, 'detail_en', detail_en, 'detail_zh', detail_zh, 'points_cost', points_cost) order by points_cost), '[]'::jsonb)
    into ladder from public.loyalty_rewards where active and kind = 'ladder';
  return jsonb_build_object(
    'phone_masked', public.lf_mask_phone(m.phone), 'name', m.name, 'lang', m.lang, 'member_code', m.member_code,
    'points', m.shari_balance, 'points_lifetime', m.points, 'spend_lifetime', m.lifetime_spend_hkd,
    'tier', coalesce(m.tier,'nori'), 'tier_next', case when coalesce(m.tier,'nori') = 'nori' then jsonb_build_object('name','gohan','at',gohan) when m.tier = 'gohan' then jsonb_build_object('name','tobiko','at',tobiko) else null end,
    'points_per_hkd', public.lf_setting('points_per_hkd'), 'pending_receipts', (select count(*) from public.loyalty_receipts where phone = p_phone and status = 'pending'),
    'last_visit_at', m.last_visit_at, 'member_since', m.created_at,
    'rewards', rewards, 'receipts', receipts, 'ladder', ladder
  );
end $$;

-- guest submits a receipt (OCR-read or typed). Returns the receipt row's status.
create or replace function public.family_submit_receipt(p_token uuid, p_receipt_no text, p_total_hkd numeric, p_receipt_at timestamptz default null, p_shop text default null, p_source text default 'ocr', p_ocr_confidence int default null, p_ocr_text text default null) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token); k text; n int; st text := 'approved'; why text := null; rid bigint; test boolean := public.lf_setting('env') <> 'live';
        maxage int := coalesce((public.lf_setting('receipt_max_age_hours'))::int, 48); perday int := coalesce((public.lf_setting('receipts_per_day'))::int, 3);
        approve_over numeric := coalesce((public.lf_setting('approve_over_hkd'))::numeric, 1500); minconf int := coalesce((public.lf_setting('ocr_min_confidence'))::int, 60);
begin
  k := upper(regexp_replace(coalesce(p_receipt_no,''), '[^0-9A-Za-z]', '', 'g'));
  if length(k) < 3 then raise exception 'receipt_no_required' using errcode = 'P0001'; end if;
  if p_total_hkd is null or p_total_hkd <= 0 or p_total_hkd > 100000 then raise exception 'bad_total' using errcode = 'P0001'; end if;
  if exists (select 1 from public.loyalty_receipts where receipt_key = k and status <> 'rejected') then raise exception 'receipt_already_used' using errcode = 'P0001'; end if;
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
  return jsonb_build_object('ok', true, 'id', rid, 'status', st, 'reason', why, 'points', (select points from public.loyalty_receipts where id = rid), 'member', public.lf_member_json(ph));
end $$;

-- guest spends points on a ladder reward; scratch reveal may upgrade it
create or replace function public.family_claim_reward(p_token uuid, p_reward_id int) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token); m public.loyalty_members; rw public.loyalty_rewards; up public.loyalty_rewards; rd_code text; test boolean := public.lf_setting('env') <> 'live'; upgraded boolean := false;
begin
  select * into m from public.loyalty_members where phone = ph for update;
  select * into rw from public.loyalty_rewards where id = p_reward_id and active and kind = 'ladder';
  if rw.id is null then raise exception 'reward_not_found' using errcode = 'P0001'; end if;
  if m.shari_balance < rw.points_cost then raise exception 'not_enough_points' using errcode = 'P0001'; end if;
  if random() < coalesce((public.lf_setting('upgrade_chance'))::numeric, 0.1) then
    select * into up from public.loyalty_rewards where active and kind = 'ladder' and points_cost > rw.points_cost order by points_cost limit 1;
    if up.id is not null then upgraded := true; end if;
  end if;
  rd_code := 'R' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 7));
  insert into public.loyalty_redemptions (phone, reward_id, reward_code, is_test, points_spent, upgraded) values (ph, case when upgraded then up.id else rw.id end, rd_code, test, rw.points_cost, upgraded);
  update public.loyalty_members set shari_balance = shari_balance - rw.points_cost where phone = ph;
  return jsonb_build_object('ok', true, 'code', rd_code, 'member', public.lf_member_json(ph));
end $$;

-- staff: approval queue, review, manual award
create or replace function public.staff_queue(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token);
begin
  return (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'receipt_no', r.receipt_no, 'total_hkd', r.total_hkd, 'at', r.receipt_at, 'created_at', r.created_at, 'source', r.source, 'reason', r.reason, 'ocr_confidence', r.ocr_confidence, 'ocr_text', left(r.ocr_text, 400),
           'who', coalesce(m.name, public.lf_mask_phone(m.phone)), 'phone_masked', public.lf_mask_phone(m.phone), 'shop', r.shop_id) order by r.created_at), '[]'::jsonb)
          from public.loyalty_receipts r join public.loyalty_members m on m.phone = r.phone where r.status = 'pending');
end $$;

create or replace function public.staff_review(p_token uuid, p_receipt_id bigint, p_approve boolean, p_total_hkd numeric default null) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); r public.loyalty_receipts;
begin
  select * into r from public.loyalty_receipts where id = p_receipt_id for update;
  if r.id is null then raise exception 'receipt_not_found' using errcode = 'P0001'; end if;
  if r.status <> 'pending' then raise exception 'already_reviewed' using errcode = 'P0001'; end if;
  if p_approve then
    update public.loyalty_receipts set status = 'approved', total_hkd = coalesce(p_total_hkd, total_hkd), receipt_at = coalesce(receipt_at, now()), reviewed_by = s.id, reviewed_at = now() where id = r.id;
    perform public.lf_credit_receipt(r.id);
  else
    update public.loyalty_receipts set status = 'rejected', reviewed_by = s.id, reviewed_at = now() where id = r.id;
  end if;
  return jsonb_build_object('ok', true, 'status', case when p_approve then 'approved' else 'rejected' end, 'points', (select points from public.loyalty_receipts where id = r.id));
end $$;

create or replace function public.staff_award(p_token uuid, p_who text, p_total_hkd numeric, p_receipt_no text default null, p_shop text default null) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); m public.loyalty_members; q text; k text; shop text; rid bigint; test boolean := public.lf_setting('env') <> 'live';
begin
  q := upper(regexp_replace(coalesce(p_who,''), '[^0-9A-Za-z+]', '', 'g'));
  select * into m from public.loyalty_members where member_code = q;
  if m.phone is null then begin select * into m from public.loyalty_members where phone = public.lf_norm_phone(q); exception when others then null; end; end if;
  if m.phone is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  if p_total_hkd is null or p_total_hkd <= 0 or p_total_hkd > 100000 then raise exception 'bad_total' using errcode = 'P0001'; end if;
  select coalesce(p_shop, se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  k := upper(regexp_replace(coalesce(p_receipt_no,''), '[^0-9A-Za-z]', '', 'g'));
  if k = '' then k := 'STAFF-' || s.id || '-' || to_char(now(), 'YYYYMMDDHH24MISSMS'); end if;
  if exists (select 1 from public.loyalty_receipts where receipt_key = k and status <> 'rejected') then raise exception 'receipt_already_used' using errcode = 'P0001'; end if;
  insert into public.loyalty_receipts (phone, shop_id, receipt_no, receipt_key, total_hkd, receipt_at, status, source, reviewed_by, reviewed_at, is_test)
    values (m.phone, shop, coalesce(nullif(trim(p_receipt_no),''), k), k, round(p_total_hkd,2), now(), 'approved', 'staff', s.id, now(), test) returning id into rid;
  perform public.lf_credit_receipt(rid);
  return jsonb_build_object('ok', true, 'points', (select points from public.loyalty_receipts where id = rid), 'member', public.lf_member_json(m.phone));
end $$;

-- staff today log v1b
create or replace function public.staff_today(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); shop text; today date := public.lf_hk_today();
begin
  select coalesce(se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  return jsonb_build_object('shop', shop, 'day', today,
    'receipts', (select count(*) from public.loyalty_receipts where status = 'approved' and (coalesce(reviewed_at, created_at) at time zone 'Asia/Hong_Kong')::date = today),
    'points', (select coalesce(sum(points),0) from public.loyalty_receipts where status = 'approved' and (coalesce(reviewed_at, created_at) at time zone 'Asia/Hong_Kong')::date = today),
    'pending', (select count(*) from public.loyalty_receipts where status = 'pending'),
    'redeemed', (select count(*) from public.loyalty_redemptions where (redeemed_at at time zone 'Asia/Hong_Kong')::date = today),
    'log', (select coalesce(jsonb_agg(x order by x->>'at' desc), '[]'::jsonb) from (
        select jsonb_build_object('at', coalesce(r.reviewed_at, r.created_at), 'type', case when r.status='approved' then 'points' else r.status end, 'who', coalesce(m.name, public.lf_mask_phone(m.phone)), 'by', st.name, 'amount', r.total_hkd, 'points', r.points, 'source', r.source) x
          from public.loyalty_receipts r join public.loyalty_members m on m.phone = r.phone left join public.loyalty_staff st on st.id = r.reviewed_by
          where (coalesce(r.reviewed_at, r.created_at) at time zone 'Asia/Hong_Kong')::date = today
        union all
        select jsonb_build_object('at', r.redeemed_at, 'type', 'redeem', 'who', coalesce(m.name, public.lf_mask_phone(m.phone)), 'by', st.name, 'reward', w.name_en) x
          from public.loyalty_redemptions r join public.loyalty_members m on m.phone = r.phone join public.loyalty_rewards w on w.id = r.reward_id left join public.loyalty_staff st on st.id = r.redeemed_staff
          where (r.redeemed_at at time zone 'Asia/Hong_Kong')::date = today
      ) t));
end $$;

-- staff lookup v1b (points instead of rolls)
create or replace function public.staff_lookup(p_token uuid, p_query text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); q text; rows jsonb;
begin
  q := upper(regexp_replace(coalesce(p_query,''), '[^0-9A-Za-z+]', '', 'g'));
  if q = '' then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object('phone_masked', public.lf_mask_phone(m.phone), 'phone', m.phone, 'name', m.name, 'member_code', m.member_code,
      'points', m.shari_balance, 'spend', m.lifetime_spend_hkd, 'tier', m.tier,
      'pending_rewards', (select count(*) from public.loyalty_redemptions r where r.phone = m.phone and r.status in ('earned','revealed')),
      'pending_receipts', (select count(*) from public.loyalty_receipts r where r.phone = m.phone and r.status = 'pending')
    ) order by m.last_visit_at desc nulls last), '[]'::jsonb) into rows
  from (select * from public.loyalty_members m where m.member_code = q or regexp_replace(m.phone, '[^0-9]', '', 'g') like '%' || regexp_replace(q, '[^0-9]', '', 'g') limit 8) m
  where length(regexp_replace(q, '[^0-9]', '', 'g')) >= 4 or m.member_code = q;
  return rows;
end $$;

-- owner stats v1b
create or replace function public.owner_stats(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true); today date := public.lf_hk_today();
begin
  return jsonb_build_object(
    'day', today,
    'members', (select count(*) from public.loyalty_members),
    'members_7d', (select count(*) from public.loyalty_members where created_at > now() - interval '7 days'),
    'receipts_today', (select count(*) from public.loyalty_receipts where status='approved' and (coalesce(reviewed_at,created_at) at time zone 'Asia/Hong_Kong')::date = today),
    'receipts_all', (select count(*) from public.loyalty_receipts where status='approved'),
    'pending', (select count(*) from public.loyalty_receipts where status='pending'),
    'rejected', (select count(*) from public.loyalty_receipts where status='rejected'),
    'spend_all', (select coalesce(sum(total_hkd),0) from public.loyalty_receipts where status='approved'),
    'spend_7d', (select coalesce(sum(total_hkd),0) from public.loyalty_receipts where status='approved' and coalesce(reviewed_at,created_at) > now() - interval '7 days'),
    'points_issued', (select coalesce(sum(points),0) from public.loyalty_receipts where status='approved'),
    'points_outstanding', (select coalesce(sum(shari_balance),0) from public.loyalty_members),
    'rewards_earned', (select count(*) from public.loyalty_redemptions where status in ('earned','revealed')),
    'rewards_redeemed', (select count(*) from public.loyalty_redemptions where status = 'redeemed'),
    'per_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'shop', shop_id, 'receipts', c, 'spend', sp) order by d desc, shop_id), '[]'::jsonb)
                from (select (coalesce(reviewed_at,created_at) at time zone 'Asia/Hong_Kong')::date d, coalesce(shop_id,'?') shop_id, count(*) c, sum(total_hkd) sp from public.loyalty_receipts where status='approved' and created_at > now() - interval '30 days' group by 1,2) t),
    'per_shop', (select coalesce(jsonb_agg(jsonb_build_object('shop', sh.name_en, 'shop_zh', sh.name_zh, 'receipts', (select count(*) from public.loyalty_receipts r where r.shop_id = sh.id and r.status='approved'), 'spend', (select coalesce(sum(total_hkd),0) from public.loyalty_receipts r where r.shop_id = sh.id and r.status='approved'),
                 'redeemed', (select count(*) from public.loyalty_redemptions r where r.redeemed_shop = sh.id)) order by sh.sort), '[]'::jsonb) from public.loyalty_shops sh),
    'top', (select coalesce(jsonb_agg(jsonb_build_object('name', m.name, 'phone_masked', public.lf_mask_phone(m.phone), 'spend', m.lifetime_spend_hkd, 'points', m.shari_balance, 'receipts', (select count(*) from public.loyalty_receipts r where r.phone = m.phone and r.status='approved'), 'tier', m.tier, 'last', m.last_visit_at) order by m.lifetime_spend_hkd desc), '[]'::jsonb)
            from (select * from public.loyalty_members order by lifetime_spend_hkd desc limit 10) m),
    'tiers', (select coalesce(jsonb_object_agg(tier, c), '{}'::jsonb) from (select coalesce(tier,'nori') tier, count(*) c from public.loyalty_members group by 1) t),
    'rewards', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'code', code, 'name_en', name_en, 'name_zh', name_zh, 'detail_en', detail_en, 'detail_zh', detail_zh, 'kind', kind, 'weight', weight, 'points_cost', points_cost, 'active', active) order by sort, id), '[]'::jsonb) from public.loyalty_rewards where kind = 'ladder'),
    'staff', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'role', role, 'shop', shop_id, 'active', active) order by id), '[]'::jsonb) from public.loyalty_staff),
    'settings', (select jsonb_object_agg(key, value) from public.loyalty_settings)
  );
end $$;

create or replace function public.owner_export(p_token uuid, p_kind text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true);
begin
  if p_kind = 'members' then
    return (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) from (
      select phone, name, lang, tier, shari_balance points_balance, points points_lifetime, lifetime_spend_hkd, is_test, consent_at, created_at, last_visit_at,
             (select count(*) from public.loyalty_receipts r where r.phone = m.phone and r.status='approved') receipts from public.loyalty_members m) t);
  elsif p_kind = 'receipts' then
    return (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) from (
      select r.id, r.created_at, r.receipt_at, r.shop_id, r.receipt_no, r.total_hkd, r.points, r.status, r.source, r.ocr_confidence, r.reason, r.is_test, r.phone, m.name, st.name reviewed_by
      from public.loyalty_receipts r join public.loyalty_members m on m.phone = r.phone left join public.loyalty_staff st on st.id = r.reviewed_by) t);
  elsif p_kind = 'rewards' then
    return (select coalesce(jsonb_agg(to_jsonb(t) order by t.earned_at), '[]'::jsonb) from (
      select r.id, r.reward_code, w.code reward, w.name_en, r.points_spent, r.upgraded, r.status, r.earned_at, r.revealed_at, r.redeemed_at, r.redeemed_shop, r.is_test, r.phone, m.name
      from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id join public.loyalty_members m on m.phone = r.phone) t);
  end if;
  raise exception 'bad_kind' using errcode = 'P0001';
end $$;

create or replace function public.owner_save_reward(p_token uuid, p_id int, p_name_en text, p_name_zh text, p_detail_en text, p_detail_zh text, p_weight int, p_active boolean, p_points_cost int default null) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true);
begin
  update public.loyalty_rewards set name_en = coalesce(nullif(trim(p_name_en),''), name_en), name_zh = coalesce(nullif(trim(p_name_zh),''), name_zh),
    detail_en = p_detail_en, detail_zh = p_detail_zh, weight = greatest(0, coalesce(p_weight, weight)), points_cost = greatest(0, coalesce(p_points_cost, points_cost)), active = coalesce(p_active, active), updated_at = now()
    where id = p_id;
  return jsonb_build_object('ok', true);
end $$;
drop function if exists public.owner_save_reward(uuid, int, text, text, text, text, int, boolean);

create or replace function public.family_config() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object(
    'env', public.lf_setting('env'), 'test_mode', public.lf_setting('otp_test_mode') = 'true',
    'points_per_hkd', (public.lf_setting('points_per_hkd'))::numeric, 'receipt_max_age_hours', (public.lf_setting('receipt_max_age_hours'))::int,
    'receipts_per_day', (public.lf_setting('receipts_per_day'))::int, 'approve_over_hkd', (public.lf_setting('approve_over_hkd'))::numeric,
    'tier_gohan_hkd', (public.lf_setting('tier_gohan_hkd'))::int, 'tier_tobiko_hkd', (public.lf_setting('tier_tobiko_hkd'))::int,
    'shops', (select jsonb_agg(jsonb_build_object('id', id, 'name_en', name_en, 'name_zh', name_zh) order by sort) from public.loyalty_shops where active))
$$;

revoke execute on function public.lf_tier_spend(int), public.lf_credit_receipt(bigint) from public, anon, authenticated;
grant execute on function public.family_submit_receipt(uuid, text, numeric, timestamptz, text, text, int, text), public.family_claim_reward(uuid, int),
  public.staff_queue(uuid), public.staff_review(uuid, bigint, boolean, numeric), public.staff_award(uuid, text, numeric, text, text),
  public.owner_save_reward(uuid, int, text, text, text, text, int, boolean, int) to anon, authenticated;
