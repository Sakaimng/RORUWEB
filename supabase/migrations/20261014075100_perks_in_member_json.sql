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
                    from public.loyalty_split_requests sr join public.loyalty_members rq on rq.phone = sr.requester_phone left join public.loyalty_receipts o on o.receipt_key = sr.receipt_key
                    where sr.first_phone = p_phone and sr.status = 'pending' and sr.expires_at > now()),
    'split_outbox', (select coalesce(jsonb_agg(jsonb_build_object('id', sr.id, 'receipt_no', o.receipt_no, 'status', case when sr.status = 'pending' and sr.expires_at <= now() then 'expired' else sr.status end,
                       'points', (select points from public.loyalty_receipts x where x.id = sr.receipt_id), 'created_at', sr.created_at) order by sr.created_at desc), '[]'::jsonb)
                    from public.loyalty_split_requests sr left join public.loyalty_receipts o on o.receipt_key = sr.receipt_key
                    where sr.requester_phone = p_phone and sr.created_at > now() - interval '7 days'),
    'perks', public.lf_perks_json(p_phone), 'kama_dinner', public.lf_kama_dinner(p_phone),
    'hook_today', public.lf_hook(public.lf_hk_today()),
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
             'claimable', public.lf_feature_on('birthday_roll') and in_win and not bday_claimed and days_left = 0)
  );
end $function$
;

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
    else raise exception 'setting_not_editable' using errcode = 'P0001';
  end case;
  begin v := trim(p_value)::numeric; exception when others then raise exception 'bad_value' using errcode = 'P0001'; end;
  if v < lo or v > hi then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key = 'rejoin_cooloff_days' and v not in (15, 30) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('hook_mon_on','hook_tue_on','hook_wed_on') and v not in (0, 1) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('rolls_per_plate','tier_gohan_hkd','tier_tobiko_hkd','kama_eligible_hkd','tier_window_months','receipts_per_day','receipt_max_age_hours','referral_bonus_points','referral_cap_per_year','birthday_window_days','birthday_min_days','hook_mon_stamps','referral_min_spend','kama_dinner_passes') and v <> round(v) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  update public.loyalty_settings set value = trim(p_value), updated_at = now() where key = p_key;
  return jsonb_build_object('ok', true, 'key', p_key, 'value', trim(p_value));
end $function$
;
