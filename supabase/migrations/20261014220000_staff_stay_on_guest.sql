-- v40 (task 49f72b7c): staff iPad stays on the guest after an action + privacy auto-close of the guest card.
-- Additive: one new setting row, owner_save_setting accepts it (30/60/90/120 s only), two new read functions.
insert into public.loyalty_settings (key, value) select 'staff_card_timeout_s', '60'
 where not exists (select 1 from public.loyalty_settings where key = 'staff_card_timeout_s');

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
    else raise exception 'setting_not_editable' using errcode = 'P0001';
  end case;
  begin v := trim(p_value)::numeric; exception when others then raise exception 'bad_value' using errcode = 'P0001'; end;
  if v < lo or v > hi then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key = 'rejoin_cooloff_days' and v not in (15, 30) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('hook_mon_on','hook_tue_on','hook_wed_on','upgrade_on','upgrade_slow_on','upgrade_lapsed_on','suggest_card_on','suggest_items_on') and v not in (0, 1) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('rolls_per_plate','tier_gohan_hkd','tier_tobiko_hkd','kama_eligible_hkd','tier_window_months','receipts_per_day','receipt_max_age_hours','referral_bonus_points','referral_cap_per_year','birthday_window_days','birthday_min_days','hook_mon_stamps','referral_min_spend','kama_dinner_passes','upgrade_lapsed_days') and v <> round(v) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key = 'staff_card_timeout_s' and v not in (30, 60, 90, 120) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  update public.loyalty_settings set value = trim(p_value), updated_at = now() where key = p_key;
  return jsonb_build_object('ok', true, 'key', p_key, 'value', trim(p_value));
end $function$;

-- staff iPad UI settings (signed-in staff only)
create or replace function public.staff_ui_settings(p_token uuid)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $f$
declare s public.loyalty_staff := public.lf_staff_session(p_token); v int;
begin
  v := coalesce(nullif(public.lf_setting('staff_card_timeout_s'), '')::int, 60);
  if v not in (30, 60, 90, 120) then v := 60; end if;
  return jsonb_build_object('card_timeout_s', v);
end $f$;

-- refresh the open guest after a staff action (same shape as staff_lookup's row); logged as a 'view'
create or replace function public.staff_guest(p_token uuid, p_who text)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $f$
declare s public.loyalty_staff := public.lf_staff_session(p_token); q text; ph text;
begin
  q := upper(regexp_replace(coalesce(p_who,''), '[^0-9A-Za-z]', '', 'g'));
  select m.phone into ph from public.loyalty_members m where m.member_code = q;
  if ph is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  perform public.lf_log_access(s, p_token, q, 'view');
  return public.lf_member_staff_json(ph);
end $f$;
grant execute on function public.staff_ui_settings(uuid) to anon, authenticated;
grant execute on function public.staff_guest(uuid, text) to anon, authenticated;
