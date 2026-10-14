-- Dominic 14:31: no digit 4 in anything guest-facing (4 sounds like 'death'). Codes are generated without 4; preview test code and 48 h window changed. Additive.
update public.loyalty_settings set value = '72', updated_at = now() where key = 'receipt_max_age_hours' and value = '48';
update public.loyalty_settings set value = '135790', updated_at = now() where key = 'otp_test_code' and value = '246810';
-- Roru Day (coming soon, not built): one night a month = secret drop night + double points for members. Placeholder setting only.
insert into public.loyalty_settings (key, value) values ('roru_day_points_mult', '2') on conflict (key) do nothing;
insert into public.loyalty_features (key, emoji, name_en, name_zh, detail_en, detail_zh, sort) values
  ('roru_day', '🌙', 'Roru Day', 'Roru Day', 'One night a month: the secret drop night, with double points for members.', '每月一晚：隱藏菜式發佈夜，會員雙倍積分。', 6)
on conflict (key) do nothing;
create or replace function public.lf_new_member_code() returns text
language plpgsql volatile as $$
declare c text; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ2356789';
begin
  loop
    c := '';
    for i in 1..8 loop c := c || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.loyalty_members where member_code = c);
  end loop;
  return c;
end $$;
create or replace function public.family_request_code(p_phone text, p_lang text default 'en') returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text; code text; test boolean; n int; ttl int := coalesce((public.lf_setting('otp_ttl_minutes'))::int, 10);
begin
  ph := public.lf_norm_phone(p_phone);
  select count(*) into n from public.loyalty_otp where phone = ph and created_at > now() - interval '1 hour';
  if n >= 5 then raise exception 'too_many_codes' using errcode = 'P0001'; end if;
  test := public.lf_setting('otp_test_mode') = 'true';
  if test then code := public.lf_setting('otp_test_code'); else code := translate(lpad((floor(random()*1000000))::int::text, 6, '0'), '4', '8'); end if;
  insert into public.loyalty_otp (phone, code_hash, expires_at) values (ph, crypt(code, gen_salt('bf', 6)), now() + make_interval(mins => ttl));
  -- LIVE MODE: an SMS sender (Edge Function / webhook) has to deliver `code` to `ph` here. Not wired in preview: no SMS is sent.
  return jsonb_build_object('ok', true, 'phone_masked', public.lf_mask_phone(ph), 'test_mode', test, 'expires_in_minutes', ttl,
                            'hint', case when test then 'preview: use the test code' else null end);
end $$;
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
    rd_code := 'R' || translate(upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 7)), '4', 'K');
    insert into public.loyalty_redemptions (phone, reward_id, reward_code, is_test) values (p_phone, rw.id, rd_code, test);
    update public.loyalty_members set rolls_on_plate = rolls_on_plate - per_plate, plates_completed = plates_completed + 1 where phone = p_phone returning * into m;
    reward := jsonb_build_object('code', rd_code, 'name_en', rw.name_en, 'name_zh', rw.name_zh);
  end loop;
  return jsonb_build_object('added', true, 'day', vday, 'demo_day', demo_day, 'gold', gold, 'stamps', m.rolls_on_plate, 'per_plate', per_plate, 'plate_full', plate_full, 'reward', reward);
end $$;
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
  rd_code := 'R' || translate(upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 7)), '4', 'K');
  insert into public.loyalty_redemptions (phone, reward_id, reward_code, is_test, points_spent, upgraded) values (ph, case when upgraded then up.id else rw.id end, rd_code, test, rw.points_cost, upgraded);
  update public.loyalty_members set shari_balance = shari_balance - rw.points_cost where phone = ph;
  return jsonb_build_object('ok', true, 'code', rd_code, 'member', public.lf_member_json(ph));
end $$;
create or replace function public.family_claim_birthday(p_token uuid) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token); j jsonb; rw public.loyalty_rewards; rd_code text; test boolean := public.lf_setting('env') <> 'live';
begin
  perform 1 from public.loyalty_members where phone = ph for update;
  j := public.lf_member_json(ph) -> 'birthday';
  if not coalesce((j->>'claimable')::boolean, false) then raise exception 'birthday_not_available' using errcode = 'P0001'; end if;
  select * into rw from public.loyalty_rewards where code = 'BDAY' and active;
  if rw.id is null then raise exception 'reward_not_found' using errcode = 'P0001'; end if;
  rd_code := 'R' || translate(upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 7)), '4', 'K');
  insert into public.loyalty_redemptions (phone, reward_id, reward_code, is_test, status, revealed_at) values (ph, rw.id, rd_code, test, 'revealed', now());
  return jsonb_build_object('ok', true, 'code', rd_code, 'member', public.lf_member_json(ph));
end $$;
create or replace function public.owner_save_setting(p_token uuid, p_key text, p_value text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
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
    else raise exception 'setting_not_editable' using errcode = 'P0001';
  end case;
  begin v := trim(p_value)::numeric; exception when others then raise exception 'bad_value' using errcode = 'P0001'; end;
  if v < lo or v > hi then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('rolls_per_plate','tier_gohan_hkd','tier_tobiko_hkd','kama_eligible_hkd','tier_window_months','receipts_per_day','receipt_max_age_hours','referral_bonus_points','referral_cap_per_year','birthday_window_days','birthday_min_days') and v <> round(v) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  update public.loyalty_settings set value = trim(p_value), updated_at = now() where key = p_key;
  return jsonb_build_object('ok', true, 'key', p_key, 'value', trim(p_value));
end $$;
