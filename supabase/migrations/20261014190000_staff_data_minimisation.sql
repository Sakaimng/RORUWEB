-- v37 staff data minimisation (HK PDPO): staff-facing RPCs return masked phone (last 4) + member_code (opaque id) only;
-- staff actions resolve members by member_code only (no phone lookups); staff payloads drop birthday, consents, receipts history,
-- referral/split names, spend totals and OCR text. Additive: replaces functions only, no table/data changes.

create or replace function public.lf_member_staff_json(p_phone text)
 returns jsonb language sql stable security definer set search_path to 'public','extensions'
as $f$
  select jsonb_build_object(
    'member_code', m.member_code, 'phone_masked', public.lf_mask_phone(m.phone), 'name', m.name,
    'points', m.shari_balance, 'tier', public.lf_status(m.phone), 'multiplier', public.lf_tier_mult(public.lf_status(m.phone)),
    'stamps', least(m.rolls_on_plate, greatest(1, coalesce((public.lf_setting('rolls_per_plate'))::int, 5))),
    'per_plate', greatest(1, coalesce((public.lf_setting('rolls_per_plate'))::int, 5)),
    'visited_today', exists(select 1 from public.loyalty_visits v where v.phone = m.phone and v.kind = 'visit' and v.visit_day = public.lf_hk_today()),
    'pending_rewards', (select count(*) from public.loyalty_redemptions r where r.phone = m.phone and r.status in ('earned','revealed')),
    'pending_receipts', (select count(*) from public.loyalty_receipts r where r.phone = m.phone and r.status = 'pending'),
    'rewards', (select coalesce(jsonb_agg(jsonb_build_object('code', r.reward_code, 'status', r.status, 'upgraded', r.upgraded, 'kind', w.kind,
                  'name_en', w.name_en, 'name_zh', w.name_zh) order by r.earned_at desc), '[]'::jsonb)
                from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id
                where r.phone = m.phone and r.status in ('earned','revealed')),
    'suggest', public.lf_suggest(m.phone))
  from public.loyalty_members m where m.phone = p_phone
$f$;
revoke all on function public.lf_member_staff_json(text) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.staff_member(p_token uuid, p_who text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token); m public.loyalty_members; q text;
begin
  q := upper(regexp_replace(coalesce(p_who,''), '[^0-9A-Za-z+]', '', 'g'));
  select * into m from public.loyalty_members where member_code = q;
  if m.phone is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  return public.lf_member_staff_json(m.phone);
end $function$
;

CREATE OR REPLACE FUNCTION public.staff_visit(p_token uuid, p_who text, p_shop text DEFAULT NULL::text, p_demo boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token); m public.loyalty_members; q text; shop text; vr jsonb;
begin
  q := upper(regexp_replace(coalesce(p_who,''), '[^0-9A-Za-z+]', '', 'g'));
  select * into m from public.loyalty_members where member_code = q;
  if m.phone is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  select coalesce(p_shop, se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  vr := public.lf_add_visit(m.phone, shop, s.id, public.lf_hk_today(), null, 'visit_only', coalesce(p_demo, false));
  return jsonb_build_object('ok', true, 'visit', vr, 'member', public.lf_member_staff_json(m.phone));
end $function$
;

CREATE OR REPLACE FUNCTION public.staff_award(p_token uuid, p_who text, p_total_hkd numeric, p_receipt_no text DEFAULT NULL::text, p_shop text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token); m public.loyalty_members; q text; k text; shop text; rid bigint; test boolean := public.lf_setting('env') <> 'live';
begin
  q := upper(regexp_replace(coalesce(p_who,''), '[^0-9A-Za-z+]', '', 'g'));
  select * into m from public.loyalty_members where member_code = q;
  if m.phone is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  if p_total_hkd is null or p_total_hkd <= 0 or p_total_hkd > 100000 then raise exception 'bad_total' using errcode = 'P0001'; end if;
  select coalesce(p_shop, se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  k := upper(regexp_replace(coalesce(p_receipt_no,''), '[^0-9A-Za-z]', '', 'g'));
  if k = '' then k := 'STAFF-' || s.id || '-' || to_char(now(), 'YYYYMMDDHH24MISSMS'); end if;
  if public.lf_receipt_used(k) then raise exception 'receipt_already_used' using errcode = 'P0001'; end if;
  insert into public.loyalty_receipts (phone, shop_id, receipt_no, receipt_key, total_hkd, receipt_at, status, source, reviewed_by, reviewed_at, is_test)
    values (m.phone, shop, coalesce(nullif(trim(p_receipt_no),''), k), k, round(p_total_hkd,2), now(), 'approved', 'staff', s.id, now(), test) returning id into rid;
  perform public.lf_credit_receipt(rid);
  return jsonb_build_object('ok', true, 'points', (select points from public.loyalty_receipts where id = rid), 'multiplier', (select multiplier from public.loyalty_receipts where id = rid), 'visit', (select visit_result from public.loyalty_receipts where id = rid), 'member', public.lf_member_staff_json(m.phone));
end $function$
;

CREATE OR REPLACE FUNCTION public.staff_add_roll(p_token uuid, p_who text, p_shop text DEFAULT NULL::text, p_demo boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token);
        m public.loyalty_members; shop text; today date := public.lf_hk_today(); vday date;
        per_plate int := coalesce((public.lf_setting('rolls_per_plate'))::int, 5);
        gold boolean := false; bonus boolean := false; plate_full boolean := false;
        v30 int; test boolean := public.lf_setting('env') <> 'live';
        rw public.loyalty_rewards; rd_code text; reward jsonb := null; q text;
begin
  q := upper(regexp_replace(coalesce(p_who,''), '[^0-9A-Za-z+]', '', 'g'));
  select * into m from public.loyalty_members where member_code = q;
  if m.phone is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  select coalesce(p_shop, se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  vday := today;
  if exists (select 1 from public.loyalty_visits where phone = m.phone and kind = 'visit' and visit_day = today) then
    if p_demo and test then
      select max(d) into vday from generate_series(today - 60, today, interval '1 day') g(d)
        where not exists (select 1 from public.loyalty_visits v where v.phone = m.phone and v.kind='visit' and v.visit_day = g.d::date);
      if vday is null then raise exception 'already_today' using errcode = 'P0001'; end if;
    else
      raise exception 'already_today' using errcode = 'P0001';
    end if;
  end if;
  gold := random() < coalesce((public.lf_setting('gold_roll_chance'))::numeric, 0.1);
  insert into public.loyalty_visits (phone, shop_id, staff_id, kind, visit_day, gold, is_test) values (m.phone, shop, s.id, 'visit', vday, gold, test);
  update public.loyalty_members set rolls_on_plate = rolls_on_plate + 1, last_visit_at = now(), gold_rolls = gold_rolls + (case when gold then 1 else 0 end)
    where phone = m.phone;
  select count(*) into v30 from public.loyalty_visits where phone = m.phone and kind = 'visit' and visit_day > today - coalesce((public.lf_setting('streak_days'))::int, 30);
  if v30 = coalesce((public.lf_setting('streak_visits'))::int, 3)
     and not exists (select 1 from public.loyalty_visits where phone = m.phone and kind = 'bonus' and visit_day > today - coalesce((public.lf_setting('streak_days'))::int, 30)) then
    bonus := true;
    insert into public.loyalty_visits (phone, shop_id, staff_id, kind, visit_day, is_test) values (m.phone, shop, s.id, 'bonus', today, test);
    update public.loyalty_members set rolls_on_plate = rolls_on_plate + 1 where phone = m.phone;
  end if;
  select * into m from public.loyalty_members where phone = m.phone;
  while m.rolls_on_plate >= per_plate loop
    plate_full := true;
    select r.* into rw from public.loyalty_rewards r where r.active and r.kind = 'plate' and r.weight > 0 order by -ln(random()) / r.weight limit 1;
    if rw.id is null then raise exception 'no_active_rewards' using errcode = 'P0001'; end if;
    rd_code := 'R' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 7));
    insert into public.loyalty_redemptions (phone, reward_id, reward_code, is_test) values (m.phone, rw.id, rd_code, test);
    update public.loyalty_members set rolls_on_plate = rolls_on_plate - per_plate, plates_completed = plates_completed + 1,
      tier = case when tier = 'kama' then 'kama' else public.lf_tier(plates_completed + 1) end
      where phone = m.phone;
    select * into m from public.loyalty_members where phone = m.phone;
    reward := jsonb_build_object('code', rd_code, 'name_en', rw.name_en, 'name_zh', rw.name_zh);
  end loop;
  return jsonb_build_object('ok', true, 'added', true, 'gold', gold, 'bonus', bonus, 'plate_full', plate_full, 'demo_day', (vday <> today), 'reward', reward,
                            'member', public.lf_member_staff_json(m.phone));
end $function$
;

CREATE OR REPLACE FUNCTION public.staff_split(p_token uuid, p_receipt_no text, p_total numeric, p_parts jsonb, p_shop text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true); k text; n int; i int := 0; part jsonb; q text; mm public.loyalty_members; amt numeric; even numeric; sumv numeric := 0;
        shop text; test boolean := public.lf_setting('env') <> 'live'; rid bigint; out jsonb := '[]'::jsonb; phones text[] := '{}'; amts numeric[] := '{}'; given boolean;
begin
  n := jsonb_array_length(coalesce(p_parts, '[]'::jsonb));
  if n < 2 or n > 6 then raise exception 'split_2_to_6' using errcode = 'P0001'; end if;
  if p_total is null or p_total <= 0 or p_total > 100000 then raise exception 'bad_total' using errcode = 'P0001'; end if;
  select coalesce(p_shop, se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  k := upper(regexp_replace(coalesce(p_receipt_no,''), '[^0-9A-Za-z]', '', 'g'));
  if k = '' then k := 'STAFF-' || s.id || '-' || to_char(now(), 'YYYYMMDDHH24MISSMS'); end if;
  if public.lf_receipt_used(k) then raise exception 'receipt_already_used' using errcode = 'P0001'; end if;
  given := exists (select 1 from jsonb_array_elements(p_parts) e where nullif(e->>'amount','') is not null);
  even := floor(p_total * 100 / n) / 100;
  for part in select * from jsonb_array_elements(p_parts) loop
    i := i + 1;
    q := upper(regexp_replace(coalesce(part->>'who',''), '[^0-9A-Za-z+]', '', 'g'));
    mm := null;
    select * into mm from public.loyalty_members where member_code = q;
    if mm.phone is null then raise exception '%', 'member_not_found:' || i using errcode = 'P0001'; end if;
    if mm.phone = any(phones) then raise exception 'split_same_member_twice' using errcode = 'P0001'; end if;
    amt := case when given then round((part->>'amount')::numeric, 2) else even + case when i = 1 then p_total - even * n else 0 end end;
    if amt is null or amt <= 0 then raise exception 'bad_total' using errcode = 'P0001'; end if;
    phones := phones || mm.phone; amts := amts || amt; sumv := sumv + amt;
  end loop;
  if abs(sumv - p_total) > 0.01 then raise exception 'split_must_add_up' using errcode = 'P0001'; end if;
  for i in 1..n loop
    insert into public.loyalty_receipts (phone, shop_id, receipt_no, receipt_key, base_key, split_n, total_hkd, receipt_at, status, source, reviewed_by, reviewed_at, is_test)
      values (phones[i], shop, coalesce(nullif(trim(p_receipt_no),''), k), k || '#' || i, k, n, amts[i], now(), 'approved', 'staff_split', s.id, now(), test) returning id into rid;
    perform public.lf_credit_receipt(rid);
    out := out || jsonb_build_object('member', (select coalesce(name, public.lf_mask_phone(phone)) from public.loyalty_members where phone = phones[i]), 'amount', amts[i],
             'points', (select points from public.loyalty_receipts where id = rid), 'visit', (select visit_result from public.loyalty_receipts where id = rid));
  end loop;
  return jsonb_build_object('ok', true, 'receipt', k, 'parts', out);
end $function$
;

CREATE OR REPLACE FUNCTION public.staff_lookup(p_token uuid, p_query text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token); q text; rows jsonb; per_plate int := greatest(1, coalesce((public.lf_setting('rolls_per_plate'))::int, 5));
begin
  q := upper(regexp_replace(coalesce(p_query,''), '[^0-9A-Za-z+]', '', 'g'));
  if q = '' then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object('phone_masked', public.lf_mask_phone(m.phone), 'name', m.name, 'member_code', m.member_code,
      'points', m.shari_balance, 'tier', public.lf_status(m.phone), 'multiplier', public.lf_tier_mult(public.lf_status(m.phone)),
      'stamps', least(m.rolls_on_plate, per_plate), 'per_plate', per_plate,
      'visited_today', exists(select 1 from public.loyalty_visits v where v.phone = m.phone and v.kind = 'visit' and v.visit_day = public.lf_hk_today()),
      'pending_rewards', (select count(*) from public.loyalty_redemptions r where r.phone = m.phone and r.status in ('earned','revealed')),
      'pending_receipts', (select count(*) from public.loyalty_receipts r where r.phone = m.phone and r.status = 'pending'),
      'suggest', public.lf_suggest(m.phone)
    ) order by m.last_visit_at desc nulls last), '[]'::jsonb) into rows
  from (select * from public.loyalty_members m where m.member_code = q or regexp_replace(m.phone, '[^0-9]', '', 'g') like '%' || regexp_replace(q, '[^0-9]', '', 'g') limit 8) m
  where length(regexp_replace(q, '[^0-9]', '', 'g')) >= 4 or m.member_code = q;
  return rows;
end $function$
;

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
  select coalesce(se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  update public.loyalty_redemptions set status = 'redeemed', redeemed_at = now(), redeemed_shop = shop, redeemed_staff = s.id where id = r.id;
  return jsonb_build_object('ok', true, 'reward', jsonb_build_object('code', rc, 'name_en', r.name_en, 'name_zh', r.name_zh, 'phone_masked', public.lf_mask_phone(r.phone)),
                            'pos', public.lf_pos_item_json(r.id), 'member', public.lf_member_staff_json(r.phone));
end $function$
;

CREATE OR REPLACE FUNCTION public.staff_queue(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token);
begin
  return (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'receipt_no', r.receipt_no, 'total_hkd', r.total_hkd, 'at', r.receipt_at, 'created_at', r.created_at, 'source', r.source, 'reason', r.reason, 'ocr_confidence', r.ocr_confidence,
           'who', coalesce(m.name, public.lf_mask_phone(m.phone)), 'phone_masked', public.lf_mask_phone(m.phone), 'shop', r.shop_id) order by r.created_at), '[]'::jsonb)
          from public.loyalty_receipts r join public.loyalty_members m on m.phone = r.phone where r.status = 'pending');
end $function$
;

CREATE OR REPLACE FUNCTION public.staff_use_kama_pass(p_token uuid, p_phone text, p_passes integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token, false); d jsonb; ph text;
begin
  -- v37: p_phone carries the member_code (opaque id); a phone number is no longer accepted from staff
  select phone into ph from public.loyalty_members where member_code = upper(regexp_replace(coalesce(p_phone,''), '[^0-9A-Za-z]', '', 'g'));
  if ph is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  if public.lf_status(ph) <> 'kama' then raise exception 'not_kama' using errcode = 'P0001'; end if;
  if p_passes not in (1,2) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  d := public.lf_kama_dinner(ph);
  if (d->>'left')::int < p_passes then raise exception 'no_passes_left' using errcode = 'P0001'; end if;
  insert into public.loyalty_perk_uses(phone, perk_key, passes, staff_id, is_test) values (ph, 'kama_dinner', p_passes, s.id, public.lf_setting('env') <> 'live');
  return jsonb_build_object('ok', true, 'kama_dinner', public.lf_kama_dinner(ph));
end $function$
;
