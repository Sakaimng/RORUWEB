-- Roru Family v1c: spend AND visits (Dominic, Oct 14 2026 14:06-14:09 HKT). Additive only.
-- Every approved receipt / staff award = points for spend (x tier multiplier) AND +1 visit stamp (max 1 per phone per HK day).
-- 5 stamps (rolls_per_plate) fill the plate -> a visit reward to scratch. Spend drives status (tiers by lifetime spend).
insert into public.loyalty_settings (key, value) values
  ('tier_mult_nori', '1'), ('tier_mult_gohan', '1.25'), ('tier_mult_tobiko', '1.5'), ('tier_mult_kama', '2')   -- placeholders, Dominic's call
on conflict (key) do nothing;
-- Dominic 14:08-14:09: status = spend in the last 12 months (rolling year). Gohan HK$5,000/yr, Tobiko HK$15,000/yr (automatic);
-- Kama stays invite only, a guest becomes ELIGIBLE at HK$25,000+/yr and the owner invites them.
update public.loyalty_settings set value = '5000', updated_at = now() where key = 'tier_gohan_hkd' and value in ('1000','2500');
update public.loyalty_settings set value = '15000', updated_at = now() where key = 'tier_tobiko_hkd' and value in ('5000','8000');
insert into public.loyalty_settings (key, value) values ('kama_eligible_hkd', '25000'), ('tier_window_months', '12') on conflict (key) do nothing;

alter table public.loyalty_visits add column if not exists receipt_id bigint;
alter table public.loyalty_visits add column if not exists source text;            -- 'receipt' | 'staff_award' | 'visit_only'
alter table public.loyalty_receipts add column if not exists multiplier numeric(4,2);
alter table public.loyalty_receipts add column if not exists visit_result jsonb;

insert into public.loyalty_rewards (code, name_en, name_zh, detail_en, detail_zh, kind, weight, points_cost, sort, active) values
  ('V1', 'Visit reward (TBC)', '到訪獎賞（待定）', 'Placeholder — e.g. a free hand roll', '佔位 — 例如一個免費手卷', 'plate', 1, 0, 1, true)
on conflict (code) do nothing;

create or replace function public.lf_tier_mult(p_tier text) returns numeric
language sql stable security definer set search_path = public, extensions as $$
  select coalesce((public.lf_setting('tier_mult_' || coalesce(p_tier,'nori')))::numeric, 1)
$$;

-- approved spend in the rolling status window (default 12 months)
create or replace function public.lf_year_spend(p_phone text) returns int
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(round(sum(total_hkd)),0)::int from public.loyalty_receipts
   where phone = p_phone and status = 'approved'
     and coalesce(receipt_at, created_at) > now() - make_interval(months => coalesce((public.lf_setting('tier_window_months'))::int, 12))
$$;
-- current status: kama sticks (owner invite), else by rolling-year spend
create or replace function public.lf_status(p_phone text) returns text
language sql stable security definer set search_path = public, extensions as $$
  select case when (select tier from public.loyalty_members where phone = p_phone) = 'kama' then 'kama' else public.lf_tier_spend(public.lf_year_spend(p_phone)) end
$$;

-- add one visit stamp (internal). Never raises for "already today": returns added=false instead.
create or replace function public.lf_add_visit(p_phone text, p_shop text, p_staff int, p_day date, p_receipt bigint, p_source text, p_demo boolean default false) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare m public.loyalty_members; vday date := coalesce(p_day, public.lf_hk_today()); test boolean := public.lf_setting('env') <> 'live';
        per_plate int := greatest(1, coalesce((public.lf_setting('rolls_per_plate'))::int, 5)); gold boolean; plate_full boolean := false;
        rw public.loyalty_rewards; rd_code text; reward jsonb := null; vid bigint; demo_day boolean := false;
begin
  if exists (select 1 from public.loyalty_visits where phone = p_phone and kind = 'visit' and visit_day = vday) then
    if p_demo and test then
      select max(g.d)::date into vday from generate_series(vday - 90, vday, interval '1 day') g(d)
        where not exists (select 1 from public.loyalty_visits v where v.phone = p_phone and v.kind = 'visit' and v.visit_day = g.d::date);
      if vday is null then return jsonb_build_object('added', false, 'reason', 'already_today'); end if;
      demo_day := true;
    else
      return jsonb_build_object('added', false, 'reason', 'already_today', 'day', vday);
    end if;
  end if;
  gold := random() < coalesce((public.lf_setting('gold_roll_chance'))::numeric, 0.1);
  insert into public.loyalty_visits (phone, shop_id, staff_id, kind, visit_day, gold, is_test, receipt_id, source)
    values (p_phone, coalesce(p_shop, 'wanchai'), p_staff, 'visit', vday, gold, test or demo_day, p_receipt, p_source)
    on conflict (phone, visit_day) where kind = 'visit' do nothing returning id into vid;
  if vid is null then return jsonb_build_object('added', false, 'reason', 'already_today', 'day', vday); end if;
  update public.loyalty_members set rolls_on_plate = rolls_on_plate + 1, gold_rolls = gold_rolls + (case when gold then 1 else 0 end),
    last_visit_at = greatest(coalesce(last_visit_at, now()), now()) where phone = p_phone returning * into m;
  while m.rolls_on_plate >= per_plate loop
    plate_full := true;
    select r.* into rw from public.loyalty_rewards r where r.active and r.kind = 'plate' and r.weight > 0 order by -ln(random()) / r.weight limit 1;
    exit when rw.id is null;
    rd_code := 'R' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 7));
    insert into public.loyalty_redemptions (phone, reward_id, reward_code, is_test) values (p_phone, rw.id, rd_code, test);
    update public.loyalty_members set rolls_on_plate = rolls_on_plate - per_plate, plates_completed = plates_completed + 1 where phone = p_phone returning * into m;
    reward := jsonb_build_object('code', rd_code, 'name_en', rw.name_en, 'name_zh', rw.name_zh);
  end loop;
  return jsonb_build_object('added', true, 'day', vday, 'demo_day', demo_day, 'gold', gold, 'stamps', m.rolls_on_plate, 'per_plate', per_plate, 'plate_full', plate_full, 'reward', reward);
end $$;

-- credit an approved receipt: points (spend x tier multiplier) + one visit stamp for the receipt's HK day
create or replace function public.lf_credit_receipt(p_id bigint) returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
declare r public.loyalty_receipts; m public.loyalty_members; pts int; mult numeric; st text; vr jsonb; vday date;
begin
  select * into r from public.loyalty_receipts where id = p_id for update;
  if r.status <> 'approved' or r.points > 0 then return; end if;
  select * into m from public.loyalty_members where phone = r.phone for update;
  -- status held BEFORE this bill: rolling-year spend without this receipt (kama sticks)
  st := case when m.tier = 'kama' then 'kama' else public.lf_tier_spend(public.lf_year_spend(r.phone) - round(r.total_hkd)::int) end;
  mult := public.lf_tier_mult(st);
  pts := floor(r.total_hkd * coalesce((public.lf_setting('points_per_hkd'))::numeric, 1) * mult);
  update public.loyalty_members set shari_balance = shari_balance + pts, points = points + pts,
    lifetime_spend_hkd = lifetime_spend_hkd + round(r.total_hkd)::int, last_visit_at = greatest(coalesce(last_visit_at, r.receipt_at, now()), coalesce(r.receipt_at, now()))
    where phone = r.phone;
  update public.loyalty_members set tier = public.lf_status(r.phone) where phone = r.phone;
  vday := coalesce((r.receipt_at at time zone 'Asia/Hong_Kong')::date, public.lf_hk_today());
  if vday > public.lf_hk_today() then vday := public.lf_hk_today(); end if;
  vr := public.lf_add_visit(r.phone, coalesce(r.shop_id, 'wanchai'), r.reviewed_by, vday, r.id, case when r.source = 'staff' then 'staff_award' else 'receipt' end, false);
  update public.loyalty_receipts set points = pts, multiplier = mult, visit_result = vr where id = p_id;
end $$;

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
  return jsonb_build_object('ok', true, 'id', rid, 'status', st, 'reason', why, 'points', (select points from public.loyalty_receipts where id = rid), 'visit', (select visit_result from public.loyalty_receipts where id = rid), 'member', public.lf_member_json(ph));
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
  return jsonb_build_object('ok', true, 'points', (select points from public.loyalty_receipts where id = rid), 'multiplier', (select multiplier from public.loyalty_receipts where id = rid), 'visit', (select visit_result from public.loyalty_receipts where id = rid), 'member', public.lf_member_json(m.phone));
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
  return jsonb_build_object('ok', true, 'status', case when p_approve then 'approved' else 'rejected' end, 'points', (select points from public.loyalty_receipts where id = r.id), 'visit', (select visit_result from public.loyalty_receipts where id = r.id));
end $$;

-- staff: visit only (no bill), e.g. a guest who forgot their receipt. p_demo (preview only) books the nearest free earlier day.
create or replace function public.staff_visit(p_token uuid, p_who text, p_shop text default null, p_demo boolean default false) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); m public.loyalty_members; q text; shop text; vr jsonb;
begin
  q := upper(regexp_replace(coalesce(p_who,''), '[^0-9A-Za-z+]', '', 'g'));
  select * into m from public.loyalty_members where member_code = q;
  if m.phone is null then begin select * into m from public.loyalty_members where phone = public.lf_norm_phone(q); exception when others then null; end; end if;
  if m.phone is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  select coalesce(p_shop, se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  vr := public.lf_add_visit(m.phone, shop, s.id, public.lf_hk_today(), null, 'visit_only', coalesce(p_demo, false));
  return jsonb_build_object('ok', true, 'visit', vr, 'member', public.lf_member_json(m.phone));
end $$;

-- member json v1c: points + status (rolling-year spend) + visit plate
create or replace function public.lf_member_json(p_phone text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare m record; rewards jsonb; receipts jsonb; ladder jsonb; plate jsonb; today date := public.lf_hk_today();
        gohan int := coalesce((public.lf_setting('tier_gohan_hkd'))::int, 5000); tobiko int := coalesce((public.lf_setting('tier_tobiko_hkd'))::int, 15000);
        kama int := coalesce((public.lf_setting('kama_eligible_hkd'))::int, 25000); ys int; st text; nxt jsonb; per_plate int := greatest(1, coalesce((public.lf_setting('rolls_per_plate'))::int, 5));
        vreward record;
begin
  select * into m from public.loyalty_members where phone = p_phone;
  if not found then return null; end if;
  ys := public.lf_year_spend(p_phone);
  st := case when m.tier = 'kama' then 'kama' else public.lf_tier_spend(ys) end;
  nxt := case when st = 'nori' then jsonb_build_object('name','gohan','at',gohan,'more',greatest(0,gohan-ys))
              when st = 'gohan' then jsonb_build_object('name','tobiko','at',tobiko,'more',greatest(0,tobiko-ys))
              when st = 'tobiko' then jsonb_build_object('name','kama','at',kama,'more',greatest(0,kama-ys),'invite_only',true)
              else null end;
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'status', r.status, 'code', r.reward_code, 'points_spent', r.points_spent, 'upgraded', r.upgraded,
           'name_en', w.name_en, 'name_zh', w.name_zh, 'detail_en', w.detail_en, 'detail_zh', w.detail_zh, 'kind', w.kind,
           'earned_at', r.earned_at, 'redeemed_at', r.redeemed_at) order by r.earned_at desc), '[]'::jsonb)
    into rewards from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id where r.phone = p_phone and r.status <> 'void';
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'receipt_no', x.receipt_no, 'total_hkd', x.total_hkd, 'points', x.points, 'multiplier', x.multiplier, 'status', x.status, 'source', x.source,
           'stamped', coalesce((x.visit_result->>'added')::boolean, false), 'at', coalesce(x.receipt_at, x.created_at), 'shop', s.name_en, 'shop_zh', s.name_zh, 'reason', x.reason) order by x.created_at desc), '[]'::jsonb)
    into receipts from (select * from public.loyalty_receipts where phone = p_phone order by created_at desc limit 15) x left join public.loyalty_shops s on s.id = x.shop_id;
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'code', code, 'name_en', name_en, 'name_zh', name_zh, 'detail_en', detail_en, 'detail_zh', detail_zh, 'points_cost', points_cost) order by points_cost), '[]'::jsonb)
    into ladder from public.loyalty_rewards where active and kind = 'ladder';
  -- the stamps currently on the plate (newest m.rolls_on_plate visits), oldest first
  select coalesce(jsonb_agg(jsonb_build_object('day', v.visit_day, 'gold', v.gold) order by v.visit_day), '[]'::jsonb) into plate
    from (select * from public.loyalty_visits where phone = p_phone and kind = 'visit' order by visit_day desc, id desc limit greatest(0, least(m.rolls_on_plate, per_plate))) v;
  select name_en, name_zh, detail_en, detail_zh into vreward from public.loyalty_rewards where active and kind = 'plate' and weight > 0 order by sort, id limit 1;
  return jsonb_build_object(
    'phone_masked', public.lf_mask_phone(m.phone), 'name', m.name, 'lang', m.lang, 'member_code', m.member_code,
    'points', m.shari_balance, 'points_lifetime', m.points, 'spend_lifetime', m.lifetime_spend_hkd,
    'tier', st, 'year_spend', ys, 'tier_next', nxt, 'kama_eligible', (st <> 'kama' and ys >= kama),
    'multiplier', public.lf_tier_mult(st),
    'mults', jsonb_build_object('nori', public.lf_tier_mult('nori'), 'gohan', public.lf_tier_mult('gohan'), 'tobiko', public.lf_tier_mult('tobiko'), 'kama', public.lf_tier_mult('kama')),
    'tiers_at', jsonb_build_object('gohan', gohan, 'tobiko', tobiko, 'kama', kama),
    'points_per_hkd', public.lf_setting('points_per_hkd'), 'pending_receipts', (select count(*) from public.loyalty_receipts where phone = p_phone and status = 'pending'),
    'stamps', least(m.rolls_on_plate, per_plate), 'per_plate', per_plate, 'plate', plate, 'plates_done', m.plates_completed,
    'visits_total', (select count(*) from public.loyalty_visits where phone = p_phone and kind = 'visit'),
    'visited_today', exists(select 1 from public.loyalty_visits where phone = p_phone and kind = 'visit' and visit_day = today),
    'visit_reward', case when vreward.name_en is null then null else jsonb_build_object('name_en', vreward.name_en, 'name_zh', vreward.name_zh, 'detail_en', vreward.detail_en, 'detail_zh', vreward.detail_zh) end,
    'last_visit_at', m.last_visit_at, 'member_since', m.created_at,
    'rewards', rewards, 'receipts', receipts, 'ladder', ladder
  );
end $$;

-- staff lookup v1c: + status, stamps, visited today
create or replace function public.staff_lookup(p_token uuid, p_query text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); q text; rows jsonb; per_plate int := greatest(1, coalesce((public.lf_setting('rolls_per_plate'))::int, 5));
begin
  q := upper(regexp_replace(coalesce(p_query,''), '[^0-9A-Za-z+]', '', 'g'));
  if q = '' then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object('phone_masked', public.lf_mask_phone(m.phone), 'phone', m.phone, 'name', m.name, 'member_code', m.member_code,
      'points', m.shari_balance, 'spend', m.lifetime_spend_hkd, 'year_spend', public.lf_year_spend(m.phone), 'tier', public.lf_status(m.phone), 'multiplier', public.lf_tier_mult(public.lf_status(m.phone)),
      'stamps', least(m.rolls_on_plate, per_plate), 'per_plate', per_plate,
      'visited_today', exists(select 1 from public.loyalty_visits v where v.phone = m.phone and v.kind = 'visit' and v.visit_day = public.lf_hk_today()),
      'pending_rewards', (select count(*) from public.loyalty_redemptions r where r.phone = m.phone and r.status in ('earned','revealed')),
      'pending_receipts', (select count(*) from public.loyalty_receipts r where r.phone = m.phone and r.status = 'pending')
    ) order by m.last_visit_at desc nulls last), '[]'::jsonb) into rows
  from (select * from public.loyalty_members m where m.member_code = q or regexp_replace(m.phone, '[^0-9]', '', 'g') like '%' || regexp_replace(q, '[^0-9]', '', 'g') limit 8) m
  where length(regexp_replace(q, '[^0-9]', '', 'g')) >= 4 or m.member_code = q;
  return rows;
end $$;

-- staff today v1c: + visits
create or replace function public.staff_today(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); shop text; today date := public.lf_hk_today();
begin
  select coalesce(se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  return jsonb_build_object('shop', shop, 'day', today,
    'receipts', (select count(*) from public.loyalty_receipts where status = 'approved' and (coalesce(reviewed_at, created_at) at time zone 'Asia/Hong_Kong')::date = today),
    'points', (select coalesce(sum(points),0) from public.loyalty_receipts where status = 'approved' and (coalesce(reviewed_at, created_at) at time zone 'Asia/Hong_Kong')::date = today),
    'visits', (select count(*) from public.loyalty_visits where kind = 'visit' and visit_day = today),
    'pending', (select count(*) from public.loyalty_receipts where status = 'pending'),
    'redeemed', (select count(*) from public.loyalty_redemptions where (redeemed_at at time zone 'Asia/Hong_Kong')::date = today),
    'log', (select coalesce(jsonb_agg(x order by x->>'at' desc), '[]'::jsonb) from (
        select jsonb_build_object('at', coalesce(r.reviewed_at, r.created_at), 'type', case when r.status='approved' then 'points' else r.status end, 'who', coalesce(m.name, public.lf_mask_phone(m.phone)), 'by', st.name, 'amount', r.total_hkd, 'points', r.points, 'source', r.source,
               'stamped', coalesce((r.visit_result->>'added')::boolean, false)) x
          from public.loyalty_receipts r join public.loyalty_members m on m.phone = r.phone left join public.loyalty_staff st on st.id = r.reviewed_by
          where (coalesce(r.reviewed_at, r.created_at) at time zone 'Asia/Hong_Kong')::date = today
        union all
        select jsonb_build_object('at', v.created_at, 'type', 'visit', 'who', coalesce(m.name, public.lf_mask_phone(m.phone)), 'by', st.name) x
          from public.loyalty_visits v join public.loyalty_members m on m.phone = v.phone left join public.loyalty_staff st on st.id = v.staff_id
          where v.kind = 'visit' and v.source = 'visit_only' and (v.created_at at time zone 'Asia/Hong_Kong')::date = today
        union all
        select jsonb_build_object('at', r.redeemed_at, 'type', 'redeem', 'who', coalesce(m.name, public.lf_mask_phone(m.phone)), 'by', st.name, 'reward', w.name_en) x
          from public.loyalty_redemptions r join public.loyalty_members m on m.phone = r.phone join public.loyalty_rewards w on w.id = r.reward_id left join public.loyalty_staff st on st.id = r.redeemed_staff
          where (r.redeemed_at at time zone 'Asia/Hong_Kong')::date = today
      ) t));
end $$;

-- owner stats v1c: + visits, status by rolling-year spend, Kama-eligible list, visit reward in the rewards list
create or replace function public.owner_stats(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true); today date := public.lf_hk_today(); kama int := coalesce((public.lf_setting('kama_eligible_hkd'))::int, 25000);
begin
  return jsonb_build_object(
    'day', today,
    'members', (select count(*) from public.loyalty_members),
    'members_7d', (select count(*) from public.loyalty_members where created_at > now() - interval '7 days'),
    'receipts_today', (select count(*) from public.loyalty_receipts where status='approved' and (coalesce(reviewed_at,created_at) at time zone 'Asia/Hong_Kong')::date = today),
    'receipts_all', (select count(*) from public.loyalty_receipts where status='approved'),
    'visits_today', (select count(*) from public.loyalty_visits where kind='visit' and visit_day = today),
    'visits_7d', (select count(*) from public.loyalty_visits where kind='visit' and visit_day > today - 7),
    'visits_all', (select count(*) from public.loyalty_visits where kind='visit'),
    'visits_only_all', (select count(*) from public.loyalty_visits where kind='visit' and source = 'visit_only'),
    'plates_completed', (select coalesce(sum(plates_completed),0) from public.loyalty_members),
    'pending', (select count(*) from public.loyalty_receipts where status='pending'),
    'rejected', (select count(*) from public.loyalty_receipts where status='rejected'),
    'spend_all', (select coalesce(sum(total_hkd),0) from public.loyalty_receipts where status='approved'),
    'spend_7d', (select coalesce(sum(total_hkd),0) from public.loyalty_receipts where status='approved' and coalesce(reviewed_at,created_at) > now() - interval '7 days'),
    'points_issued', (select coalesce(sum(points),0) from public.loyalty_receipts where status='approved'),
    'points_outstanding', (select coalesce(sum(shari_balance),0) from public.loyalty_members),
    'rewards_earned', (select count(*) from public.loyalty_redemptions where status in ('earned','revealed')),
    'rewards_redeemed', (select count(*) from public.loyalty_redemptions where status = 'redeemed'),
    'per_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'shop', shop_id, 'receipts', c, 'spend', sp, 'visits', vi) order by d desc, shop_id), '[]'::jsonb) from (
        select d, shop_id, sum(c) c, sum(sp) sp, sum(vi) vi from (
          select (coalesce(reviewed_at,created_at) at time zone 'Asia/Hong_Kong')::date d, coalesce(shop_id,'?') shop_id, count(*) c, sum(total_hkd) sp, 0 vi from public.loyalty_receipts where status='approved' and created_at > now() - interval '30 days' group by 1,2
          union all
          select visit_day d, shop_id, 0, 0, count(*) from public.loyalty_visits where kind='visit' and visit_day > today - 30 group by 1,2) u group by 1,2) t),
    'per_shop', (select coalesce(jsonb_agg(jsonb_build_object('shop', sh.name_en, 'shop_zh', sh.name_zh, 'receipts', (select count(*) from public.loyalty_receipts r where r.shop_id = sh.id and r.status='approved'), 'spend', (select coalesce(sum(total_hkd),0) from public.loyalty_receipts r where r.shop_id = sh.id and r.status='approved'),
                 'visits', (select count(*) from public.loyalty_visits v where v.shop_id = sh.id and v.kind='visit'),
                 'redeemed', (select count(*) from public.loyalty_redemptions r where r.redeemed_shop = sh.id)) order by sh.sort), '[]'::jsonb) from public.loyalty_shops sh),
    'top', (select coalesce(jsonb_agg(jsonb_build_object('name', m.name, 'phone_masked', public.lf_mask_phone(m.phone), 'spend', m.lifetime_spend_hkd, 'year_spend', m.ys, 'points', m.shari_balance,
                 'receipts', (select count(*) from public.loyalty_receipts r where r.phone = m.phone and r.status='approved'),
                 'visits', (select count(*) from public.loyalty_visits v where v.phone = m.phone and v.kind='visit'), 'stamps', m.rolls_on_plate, 'plates', m.plates_completed,
                 'tier', public.lf_status(m.phone), 'last', m.last_visit_at) order by m.ys desc, m.lifetime_spend_hkd desc), '[]'::jsonb)
            from (select mm.*, public.lf_year_spend(mm.phone) ys from public.loyalty_members mm order by public.lf_year_spend(mm.phone) desc, mm.lifetime_spend_hkd desc limit 15) m),
    'tiers', (select coalesce(jsonb_object_agg(tier, c), '{}'::jsonb) from (select public.lf_status(phone) tier, count(*) c from public.loyalty_members group by 1) t),
    'kama_eligible', (select coalesce(jsonb_agg(jsonb_build_object('phone', m.phone, 'phone_masked', public.lf_mask_phone(m.phone), 'name', m.name, 'year_spend', m.ys) order by m.ys desc), '[]'::jsonb)
            from (select mm.*, public.lf_year_spend(mm.phone) ys from public.loyalty_members mm where coalesce(mm.tier,'') <> 'kama') m where m.ys >= kama),
    'kama_members', (select coalesce(jsonb_agg(jsonb_build_object('phone', phone, 'phone_masked', public.lf_mask_phone(phone), 'name', name, 'year_spend', public.lf_year_spend(phone))), '[]'::jsonb) from public.loyalty_members where tier = 'kama'),
    'rewards', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'code', code, 'name_en', name_en, 'name_zh', name_zh, 'detail_en', detail_en, 'detail_zh', detail_zh, 'kind', kind, 'weight', weight, 'points_cost', points_cost, 'active', active) order by sort, id), '[]'::jsonb)
                from public.loyalty_rewards where kind = 'ladder' or (kind = 'plate' and (active or code = 'V1'))),
    'staff', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'role', role, 'shop', shop_id, 'active', active) order by id), '[]'::jsonb) from public.loyalty_staff),
    'settings', (select jsonb_object_agg(key, value) from public.loyalty_settings)
  );
end $$;

-- owner: edit a whitelisted setting (numbers only, ranges checked)
create or replace function public.owner_save_setting(p_token uuid, p_key text, p_value text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true); v numeric; lo numeric; hi numeric;
begin
  case p_key
    when 'rolls_per_plate' then lo := 2; hi := 20;
    when 'points_per_hkd' then lo := 0; hi := 100;
    when 'tier_gohan_hkd', 'tier_tobiko_hkd', 'kama_eligible_hkd' then lo := 0; hi := 10000000;
    when 'tier_mult_nori', 'tier_mult_gohan', 'tier_mult_tobiko', 'tier_mult_kama' then lo := 0; hi := 10;
    when 'tier_window_months' then lo := 1; hi := 60;
    when 'receipts_per_day' then lo := 1; hi := 20;
    when 'approve_over_hkd' then lo := 1; hi := 100000;
    when 'receipt_max_age_hours' then lo := 1; hi := 720;
    when 'gold_roll_chance', 'upgrade_chance' then lo := 0; hi := 1;
    else raise exception 'setting_not_editable' using errcode = 'P0001';
  end case;
  begin v := trim(p_value)::numeric; exception when others then raise exception 'bad_value' using errcode = 'P0001'; end;
  if v < lo or v > hi then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('rolls_per_plate','tier_gohan_hkd','tier_tobiko_hkd','kama_eligible_hkd','tier_window_months','receipts_per_day','receipt_max_age_hours') and v <> round(v) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  update public.loyalty_settings set value = trim(p_value), updated_at = now() where key = p_key;
  return jsonb_build_object('ok', true, 'key', p_key, 'value', trim(p_value));
end $$;

-- owner: invite a guest to Kama (or take it back -> status falls back to rolling-year spend)
create or replace function public.owner_set_kama(p_token uuid, p_phone text, p_on boolean) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true);
begin
  if not exists (select 1 from public.loyalty_members where phone = p_phone) then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  if p_on then update public.loyalty_members set tier = 'kama' where phone = p_phone;
  else update public.loyalty_members set tier = public.lf_tier_spend(public.lf_year_spend(p_phone)) where phone = p_phone; end if;
  return jsonb_build_object('ok', true, 'tier', public.lf_status(p_phone));
end $$;

create or replace function public.family_config() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object(
    'env', public.lf_setting('env'), 'test_mode', public.lf_setting('otp_test_mode') = 'true',
    'points_per_hkd', (public.lf_setting('points_per_hkd'))::numeric, 'receipt_max_age_hours', (public.lf_setting('receipt_max_age_hours'))::int,
    'receipts_per_day', (public.lf_setting('receipts_per_day'))::int, 'approve_over_hkd', (public.lf_setting('approve_over_hkd'))::numeric,
    'tier_gohan_hkd', (public.lf_setting('tier_gohan_hkd'))::int, 'tier_tobiko_hkd', (public.lf_setting('tier_tobiko_hkd'))::int, 'kama_eligible_hkd', (public.lf_setting('kama_eligible_hkd'))::int,
    'rolls_per_plate', (public.lf_setting('rolls_per_plate'))::int,
    'shops', (select jsonb_agg(jsonb_build_object('id', id, 'name_en', name_en, 'name_zh', name_zh) order by sort) from public.loyalty_shops where active))
$$;

create or replace function public.owner_export(p_token uuid, p_kind text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true);
begin
  if p_kind = 'members' then
    return (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) from (
      select phone, name, lang, tier, shari_balance points_balance, points points_lifetime, lifetime_spend_hkd, is_test, consent_at, created_at, last_visit_at,
             (select count(*) from public.loyalty_receipts r where r.phone = m.phone and r.status='approved') receipts, (select count(*) from public.loyalty_visits v where v.phone = m.phone and v.kind='visit') visits, rolls_on_plate stamps_on_plate, plates_completed, public.lf_year_spend(m.phone) spend_12m, public.lf_status(m.phone) status from public.loyalty_members m) t);
  elsif p_kind = 'receipts' then
    return (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) from (
      select r.id, r.created_at, r.receipt_at, r.shop_id, r.receipt_no, r.total_hkd, r.points, r.status, r.source, r.ocr_confidence, r.reason, r.is_test, r.phone, m.name, st.name reviewed_by
      from public.loyalty_receipts r join public.loyalty_members m on m.phone = r.phone left join public.loyalty_staff st on st.id = r.reviewed_by) t);
  elsif p_kind = 'rewards' then
    return (select coalesce(jsonb_agg(to_jsonb(t) order by t.earned_at), '[]'::jsonb) from (
      select r.id, r.reward_code, w.code reward, w.name_en, r.points_spent, r.upgraded, r.status, r.earned_at, r.revealed_at, r.redeemed_at, r.redeemed_shop, r.is_test, r.phone, m.name
      from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id join public.loyalty_members m on m.phone = r.phone) t);
  elsif p_kind = 'visits' then
    return (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) from (
      select v.id, v.created_at, v.visit_day, v.shop_id, v.source, v.receipt_id, v.gold, v.is_test, v.phone, m.name, st.name staff
      from public.loyalty_visits v join public.loyalty_members m on m.phone = v.phone left join public.loyalty_staff st on st.id = v.staff_id where v.kind = 'visit') t);
  end if;
  raise exception 'bad_kind' using errcode = 'P0001';
end $$;

revoke execute on function public.lf_add_visit(text, text, int, date, bigint, text, boolean), public.lf_year_spend(text), public.lf_status(text), public.lf_tier_mult(text), public.lf_credit_receipt(bigint) from public, anon, authenticated;
grant execute on function public.staff_visit(uuid, text, text, boolean), public.owner_save_setting(uuid, text, text), public.owner_set_kama(uuid, text, boolean) to anon, authenticated;
