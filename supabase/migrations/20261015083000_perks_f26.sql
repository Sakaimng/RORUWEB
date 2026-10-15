-- v48 / f26 (task 3f2240c5, 2026-10-15 ~08:40 UTC): High Rollers approved perks (Dominic 16:08 HKT). ADDITIVE.
-- Before-state of every replaced function + the perks/rewards/features rows: tasks/3f2240c5…/before/

-- v48 / f26 (task 3f2240c5) — High Rollers approved perks (Dominic 16:08 HKT 15 Oct 2026). ADDITIVE.
alter table public.loyalty_perks add column if not exists today text;          -- null | visit | month | year | birthday
alter table public.loyalty_perks add column if not exists per_period int;
alter table public.loyalty_perks add column if not exists today_en text;
alter table public.loyalty_perks add column if not exists today_zh text;
alter table public.loyalty_perks add column if not exists replaces text;       -- a higher-tier perk that supersedes a lower one
alter table public.loyalty_perk_uses add column if not exists undone_at timestamptz;
alter table public.loyalty_perk_uses add column if not exists undone_staff int;
alter table public.loyalty_perk_uses add column if not exists undo_reason text;
alter table public.loyalty_perk_uses add column if not exists redemption_id bigint;
alter table public.loyalty_redemptions add column if not exists source_receipt_id bigint;
insert into public.loyalty_settings(key, value) values ('tobiko_dinner_passes', '1'), ('perk_undo_minutes', '15') on conflict (key) do nothing;


-- perks: display rows = the approved list
update public.loyalty_perks set detail_en = 'Fill the plate (5 stamps), get a free hand roll: any roll, Wagyu included', detail_zh = '集滿一碟（5 個印），送免費手卷一條：任揀，包括和牛', updated_at = now() where key = 'nori_stamps';
update public.loyalty_perks set name_en = 'Gold receipts, every tier', name_zh = '金色收據（所有級別）', detail_en = 'About 1 in 20 receipts turns gold: 2× points on it + a free highball', detail_zh = '約每 20 張收據有 1 張變金色：該張雙倍積分 + 免費 Highball 一杯', updated_at = now() where key = 'nori_gold';
update public.loyalty_perks set tier = 'gohan', sort = 22, name_en = 'Birthday roll', name_zh = '生日手卷', detail_en = 'A hand roll on us in your birthday week', detail_zh = '生日週送你一條手卷', today = 'birthday', today_en = 'birthday roll', today_zh = '生日手卷', updated_at = now() where key = 'nori_bday';
insert into public.loyalty_perks (key, tier, kind, emoji, name_en, name_zh, detail_en, detail_zh, status, confirmed, sort, today, per_period, today_en, today_zh, replaces) values
  ('gohan_edamame', 'gohan', 'text', '🫛', 'Free edamame, every visit', '每次到訪送枝豆', 'Show your card when you sit down', '坐低時出示會員卡', 'on', true, 21, 'visit', null, 'free edamame', '免費枝豆', null),
  ('tobiko_chef', 'tobiko', 'text', '👨‍🍳', 'Chef''s off-menu roll, once a month', '主廚隱藏手卷，每月一次', 'Show your card; staff mark it used', '出示會員卡，員工會記錄已使用', 'on', true, 33, 'month', 1, 'chef''s off-menu roll', '主廚隱藏手卷', null),
  ('tobiko_dinner', 'tobiko', 'text', '🍶', 'Kama Dinner · 1 a year', 'Kama 晚宴 · 每年 1 次', 'Set Kama menu (TBC) · next date TBC', 'Kama 套餐（待定）· 下次日期待定', 'on', true, 34, 'year', 1, 'Kama Dinner pass', 'Kama 晚宴券', null)
  on conflict (key) do nothing;
update public.loyalty_perks set name_en = 'Kama Dinner · {p} a year', name_zh = 'Kama 晚宴 · 每年 {p} 次', today = 'year', today_en = 'Kama Dinner pass', today_zh = 'Kama 晚宴券', replaces = 'tobiko_dinner', updated_at = now() where key = 'kama_dinner';
update public.loyalty_perks set status = 'on', confirmed = true, sort = 53, name_en = 'Chef''s off-menu roll, every visit', name_zh = '主廚隱藏手卷，每次到訪', detail_en = 'Show your card when you sit down', detail_zh = '坐低時出示會員卡', today = 'visit', today_en = 'chef''s off-menu roll', today_zh = '主廚隱藏手卷', replaces = 'tobiko_chef', updated_at = now() where key = 'kama_chef';
update public.loyalty_perks set sort = 31 where key = 'tobiko_secret';
-- not on the approved per-tier list: hidden from the perk list only (features keep working; owner can switch back on)
update public.loyalty_perks set status = 'off', updated_at = now() where key in ('gohan_events', 'tobiko_drops', 'nori_friend', 'nori_nights') and status = 'on';
-- rewards
update public.loyalty_rewards set name_en = 'Free hand roll (any, Wagyu included)', name_zh = '免費手卷一條（任揀，包括和牛）', detail_en = 'Any roll on the menu, Wagyu included, on us', detail_zh = '餐牌任揀，包括和牛，本店請客', pos_item_en = 'Hand roll (any 1, incl. Wagyu)' where code = 'V1';
update public.loyalty_rewards set name_en = 'Birthday roll', name_zh = '生日手卷', pos_item_en = 'Birthday hand roll' where code = 'BDAY';
update public.loyalty_rewards set name_en = 'Free highball (gold receipt)', name_zh = '免費 Highball（金色收據）', detail_en = 'Your gold receipt prize, on us', detail_zh = '金色收據獎品，本店請客', pos_item_en = 'Highball (gold receipt)', active = true where code = 'GOLD';
update public.loyalty_features set detail_en = 'Random scans turn gold: double points + a free highball.', detail_zh = '隨機收據變金色：雙倍積分 + 免費 Highball 一杯。' where key = 'gold_receipt';

update public.loyalty_features set detail_en = 'A hand roll on us in your birthday week (Gohan and up).', detail_zh = '生日週送你一條手卷（壽司飯或以上）。' where key = 'birthday_roll';


CREATE OR REPLACE FUNCTION public.lf_kama_dinner(p_phone text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select jsonb_build_object('passes', p.n, 'used', u.n, 'left', greatest(0, p.n - u.n))
  from (select coalesce((public.lf_setting('kama_dinner_passes'))::int, 2) n) p,
       (select coalesce(sum(passes),0)::int n from public.loyalty_perk_uses where phone = p_phone and perk_key = 'kama_dinner' and undone_at is null and used_at > now() - interval '12 months') u $function$;

CREATE OR REPLACE FUNCTION public.lf_perk_status(p_phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare st text := public.lf_status(p_phone); rk int := public.lf_tier_rank(public.lf_status(p_phone)); m public.loyalty_members; p record;
        today jsonb := '[]'::jsonb; lim jsonb := '[]'::jsonb; allowed int; used int; lu record; since timestamptz; month_start timestamptz; next_reset text;
        in_win boolean; br record; min_days int := coalesce((public.lf_setting('birthday_min_days'))::int, 30); days_left int; bstate text; undo_min int := coalesce((public.lf_setting('perk_undo_minutes'))::int, 15);
begin
  select * into m from public.loyalty_members where phone = p_phone;
  if m.phone is null then return null; end if;
  month_start := date_trunc('month', now() at time zone 'Asia/Hong_Kong') at time zone 'Asia/Hong_Kong';
  for p in select k.* from public.loyalty_perks k
           where k.status = 'on' and k.today is not null and public.lf_tier_rank(k.tier) <= rk
             and not exists (select 1 from public.loyalty_perks r where r.status = 'on' and r.replaces = k.key and public.lf_tier_rank(r.tier) <= rk)
           order by public.lf_tier_rank(k.tier), k.sort loop
    if p.today = 'visit' then
      today := today || jsonb_build_object('key', p.key, 'emoji', p.emoji, 'en', p.today_en, 'zh', p.today_zh, 'state', 'visit');
    elsif p.today in ('month', 'year') then
      allowed := case p.key when 'kama_dinner' then coalesce((public.lf_setting('kama_dinner_passes'))::int, 2)
                            when 'tobiko_dinner' then coalesce((public.lf_setting('tobiko_dinner_passes'))::int, 1) else coalesce(p.per_period, 1) end;
      since := case when p.today = 'month' then month_start else now() - interval '12 months' end;
      select coalesce(sum(passes), 0)::int into used from public.loyalty_perk_uses where phone = p_phone and perk_key = p.key and undone_at is null and used_at >= since;
      select u.id, u.used_at, u.staff_id into lu from public.loyalty_perk_uses u where u.phone = p_phone and u.perk_key = p.key and u.undone_at is null and u.used_at >= since order by u.used_at desc limit 1;
      next_reset := case when p.today = 'month' then to_char((month_start at time zone 'Asia/Hong_Kong') + interval '1 month', 'YYYY-MM-DD')
                         when lu.id is not null then to_char((select min(used_at) from public.loyalty_perk_uses where phone = p_phone and perk_key = p.key and undone_at is null and used_at >= since) at time zone 'Asia/Hong_Kong' + interval '12 months', 'YYYY-MM-DD') end;
      lim := lim || jsonb_build_object('key', p.key, 'emoji', p.emoji, 'name_en', replace(p.name_en, '{p}', allowed::text), 'name_zh', replace(p.name_zh, '{p}', allowed::text),
               'en', p.today_en, 'zh', p.today_zh, 'period', p.today, 'allowed', allowed, 'used', used, 'left', greatest(0, allowed - used),
               'state', case when used < allowed then 'available' else 'used' end, 'next_reset', next_reset,
               'last_use_id', lu.id, 'last_used_at', lu.used_at, 'undo_staff_until', case when lu.id is null then null else lu.used_at + make_interval(mins => undo_min) end);
      if used < allowed and p.today = 'month' then today := today || jsonb_build_object('key', p.key, 'emoji', p.emoji, 'en', p.today_en, 'zh', p.today_zh, 'state', 'available', 'period', p.today); end if;
    elsif p.today = 'birthday' then
      in_win := public.lf_feature_on('birthday_roll') and public.lf_bday_in_window(m.birthday_md);
      select r.id, r.status, r.redeemed_at, r.reward_code into br from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id
        where r.phone = p_phone and w.kind = 'birthday' and r.status <> 'void' and r.earned_at > now() - interval '300 days' order by r.earned_at desc limit 1;
      days_left := case when m.birthday_set_at is null then null else greatest(0, min_days - (now()::date - m.birthday_set_at::date)) end;
      bstate := case when m.birthday_md is null then 'no_birthday'
                     when br.id is not null and (br.redeemed_at is not null or br.status = 'redeemed') then 'used'
                     when br.id is not null then 'claimed'
                     when not in_win then 'later'
                     when coalesce(days_left, 1) > 0 then 'too_new'
                     else 'available' end;
      lim := lim || jsonb_build_object('key', p.key, 'emoji', p.emoji, 'name_en', p.name_en, 'name_zh', p.name_zh, 'en', p.today_en, 'zh', p.today_zh, 'period', 'birthday',
               'state', bstate, 'md', m.birthday_md, 'last_use_id', (select u.id from public.loyalty_perk_uses u where br.id is not null and u.redemption_id = br.id and u.undone_at is null order by u.id desc limit 1), 'in_window', in_win, 'reward_code', br.reward_code, 'days_until_eligible', days_left);
      if bstate in ('available', 'claimed') then today := today || jsonb_build_object('key', p.key, 'emoji', p.emoji, 'en', p.today_en, 'zh', p.today_zh, 'state', bstate, 'period', 'birthday'); end if;
    end if;
  end loop;
  return jsonb_build_object('tier', st, 'today', today, 'limited', lim);
end $function$;

CREATE OR REPLACE FUNCTION public.staff_use_perk(p_token uuid, p_who text, p_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token); m public.loyalty_members; ps jsonb; it jsonb; rw public.loyalty_rewards; rid bigint; rc text; uid bigint; shop text; test boolean := public.lf_setting('env') <> 'live';
begin
  select * into m from public.loyalty_members where member_code = upper(regexp_replace(coalesce(p_who,''), '[^0-9A-Za-z]', '', 'g')) for update;
  if m.phone is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  ps := public.lf_perk_status(m.phone);
  select x into it from jsonb_array_elements(ps->'limited') x where x->>'key' = p_key;
  if it is null then raise exception 'perk_not_for_tier' using errcode = 'P0001'; end if;
  if it->>'period' = 'birthday' then
    if it->>'state' = 'claimed' then
      update public.loyalty_redemptions set status = 'redeemed', redeemed_at = now(), redeemed_staff = s.id where reward_code = it->>'reward_code' and status in ('earned','revealed') returning id, reward_code into rid, rc;
    elsif it->>'state' = 'available' then
      select * into rw from public.loyalty_rewards where code = 'BDAY' and active;
      if rw.id is null then raise exception 'reward_not_found' using errcode = 'P0001'; end if;
      rc := 'R' || translate(upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 7)), '4', 'K');
      insert into public.loyalty_redemptions (phone, reward_id, reward_code, is_test, status, revealed_at, redeemed_at, redeemed_staff)
        values (m.phone, rw.id, rc, test, 'redeemed', now(), now(), s.id) returning id into rid;
    else raise exception 'perk_used_up' using errcode = 'P0001'; end if;
    if rid is null then raise exception 'perk_used_up' using errcode = 'P0001'; end if;
  else
    if (it->>'left')::int < 1 then raise exception 'perk_used_up' using errcode = 'P0001'; end if;
  end if;
  insert into public.loyalty_perk_uses (phone, perk_key, passes, staff_id, is_test, redemption_id, note) values (m.phone, p_key, 1, s.id, test, rid, rc) returning id into uid;
  select coalesce(se.shop_id, s.shop_id) into shop from public.loyalty_sessions se where se.token = p_token;
  insert into public.loyalty_staff_access_log (staff_id, staff_name, staff_role, shop_id, member_code, action, hits, first_at, last_at, detail)
    values (s.id, s.name, s.role, shop, m.member_code, 'perk_use', 1, now(), now(), p_key || ' · use ' || uid || coalesce(' · ' || rc, ''));
  return jsonb_build_object('ok', true, 'use_id', uid, 'perk', p_key, 'perks', public.lf_perk_status(m.phone), 'member', public.lf_member_staff_json(m.phone));
end $function$;

CREATE OR REPLACE FUNCTION public.staff_undo_perk(p_token uuid, p_use_id bigint, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token); u public.loyalty_perk_uses; mc text; shop text; why text := left(trim(coalesce(p_reason, '')), 200);
        undo_min int := coalesce((public.lf_setting('perk_undo_minutes'))::int, 15); quick boolean;
begin
  select * into u from public.loyalty_perk_uses where id = p_use_id for update;
  if u.id is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  if u.undone_at is not null then raise exception 'already_undone' using errcode = 'P0001'; end if;
  quick := u.used_at > now() - make_interval(mins => undo_min);
  if not quick then
    if s.role not in ('manager', 'owner') then raise exception 'manager_only' using errcode = 'P0001'; end if;
    if length(why) < 3 then raise exception 'reason_required' using errcode = 'P0001'; end if;
  end if;
  update public.loyalty_perk_uses set undone_at = now(), undone_staff = s.id, undo_reason = nullif(why, '') where id = u.id;
  if u.redemption_id is not null then
    update public.loyalty_redemptions set status_before_undo = status, status = 'void', undone_at = now(), undone_by = 'staff', undone_staff = s.id, undo_reason = coalesce(nullif(why, ''), 'perk undo'), refunded_points = 0
      where id = u.redemption_id and status <> 'void';
  end if;
  select member_code into mc from public.loyalty_members where phone = u.phone;
  select coalesce(se.shop_id, s.shop_id) into shop from public.loyalty_sessions se where se.token = p_token;
  insert into public.loyalty_staff_access_log (staff_id, staff_name, staff_role, shop_id, member_code, action, hits, first_at, last_at, detail)
    values (s.id, s.name, s.role, shop, mc, 'perk_undo', 1, now(), now(), u.perk_key || ' · use ' || u.id || coalesce(' · ' || nullif(why, ''), ''));
  return jsonb_build_object('ok', true, 'perks', public.lf_perk_status(u.phone), 'member', public.lf_member_staff_json(u.phone));
end $function$;

CREATE OR REPLACE FUNCTION public.family_update(p_token uuid, p_name text DEFAULT NULL::text, p_lang text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare ph text := public.lf_member_session(p_token); nm text := nullif(trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), '');
begin
  if nm is not null and (length(nm) > 30 or nm !~ '[[:alpha:]]') then raise exception 'bad_name' using errcode = 'P0001'; end if;
  update public.loyalty_members set name = coalesce(nm, name), lang = coalesce(p_lang, lang) where phone = ph;
  return public.lf_member_json(ph);
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
  return base || jsonb_build_object(
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

CREATE OR REPLACE FUNCTION public.lf_member_staff_json(p_phone text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
    'suggest', public.lf_suggest(m.phone),
    'perk_status', public.lf_perk_status(m.phone),
    'used_rewards', (select count(*) from public.loyalty_redemptions r where r.phone = m.phone and r.undone_at is null
                      and (r.redeemed_at is not null or coalesce(r.points_spent, 0) > 0)))
  from public.loyalty_members m where m.phone = p_phone
$function$;

CREATE OR REPLACE FUNCTION public.lf_credit_receipt(p_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare r public.loyalty_receipts; m public.loyalty_members; pts int; mult numeric; st text; vr jsonb; vday date; is_gold boolean := false;
        bonus int := coalesce((public.lf_setting('referral_bonus_points'))::int, 100); minspend numeric := coalesce((public.lf_setting('referral_min_spend'))::numeric, 200); odds numeric; hk text; bst text; ref_shared boolean; cap int := coalesce((public.lf_setting('referral_cap_per_year'))::int, 10); test boolean := public.lf_setting('env') <> 'live'; gw public.loyalty_rewards; gcode text;
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

revoke execute on function public.lf_perk_status(text) from public, anon, authenticated;
