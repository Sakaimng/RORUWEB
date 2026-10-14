
-- Roru Family: SMART surprise upgrade (Dominic approved Oct 14 2026 15:50 HKT). Additive only.
-- Base 1 in 10 (existing upgrade_chance) · slow nights Mon–Wed HK 1 in 5 · lapsed guest (previous visit 30+ days ago) 1 in 5 · both 1 in 3.
-- Decided server-side inside family_claim_reward at claim time; rule + odds + roll logged on the redemption row.
insert into public.loyalty_settings (key, value) values
  ('upgrade_on', '1'),
  ('upgrade_slow_on', '1'), ('upgrade_slow_chance', '0.2'),
  ('upgrade_lapsed_on', '1'), ('upgrade_lapsed_chance', '0.2'), ('upgrade_lapsed_days', '30'),
  ('upgrade_both_chance', '0.333333')
on conflict (key) do nothing;

alter table public.loyalty_redemptions add column if not exists upgrade_rule text;
alter table public.loyalty_redemptions add column if not exists upgrade_odds numeric;
alter table public.loyalty_redemptions add column if not exists upgrade_roll numeric;
alter table public.loyalty_redemptions add column if not exists upgrade_days_since int;
alter table public.loyalty_redemptions add column if not exists upgrade_from_reward_id int;

-- days since the guest's previous visit (visits or approved receipts) strictly before the HK day of p_at; null = no history
create or replace function public.lf_days_since_prev_visit(p_phone text, p_at timestamptz)
returns int language sql stable security definer set search_path to 'public','extensions' as $$
  with d as (select (p_at at time zone 'Asia/Hong_Kong')::date as today)
  select (select today from d) - max(x) from (
    select v.visit_day as x from public.loyalty_visits v, d where v.phone = p_phone and v.kind = 'visit' and v.visit_day < d.today
    union all
    select (coalesce(r.receipt_at, r.created_at) at time zone 'Asia/Hong_Kong')::date from public.loyalty_receipts r, d
      where r.phone = p_phone and r.status = 'approved' and (coalesce(r.receipt_at, r.created_at) at time zone 'Asia/Hong_Kong')::date < d.today
  ) u
$$;

-- which rule applies for this guest at this moment (no randomness here)
create or replace function public.lf_upgrade_rule(p_phone text, p_at timestamptz)
returns jsonb language plpgsql stable security definer set search_path to 'public','extensions' as $$
declare dow int := extract(isodow from (p_at at time zone 'Asia/Hong_Kong')::date)::int; ds int := public.lf_days_since_prev_visit(p_phone, p_at);
  slow boolean; lapsed boolean; rule text; odds numeric;
begin
  if coalesce(public.lf_setting('upgrade_on'), '1') <> '1' then
    return jsonb_build_object('rule', 'off', 'odds', 0, 'days_since', ds, 'dow', dow);
  end if;
  slow := coalesce(public.lf_setting('upgrade_slow_on'), '1') = '1' and dow between 1 and 3;
  lapsed := coalesce(public.lf_setting('upgrade_lapsed_on'), '1') = '1' and ds is not null and ds >= coalesce((public.lf_setting('upgrade_lapsed_days'))::int, 30);
  if slow and lapsed then rule := 'both'; odds := coalesce((public.lf_setting('upgrade_both_chance'))::numeric, 0.333333);
  elsif slow then rule := 'slow_night'; odds := coalesce((public.lf_setting('upgrade_slow_chance'))::numeric, 0.2);
  elsif lapsed then rule := 'lapsed'; odds := coalesce((public.lf_setting('upgrade_lapsed_chance'))::numeric, 0.2);
  else rule := 'base'; odds := coalesce((public.lf_setting('upgrade_chance'))::numeric, 0.1);
  end if;
  return jsonb_build_object('rule', rule, 'odds', odds, 'days_since', ds, 'dow', dow);
end $$;

-- the roll itself (volatile): rule + odds + roll + won
create or replace function public.lf_upgrade_decide(p_phone text, p_at timestamptz)
returns jsonb language plpgsql volatile security definer set search_path to 'public','extensions' as $$
declare j jsonb := public.lf_upgrade_rule(p_phone, p_at); roll numeric := random()::numeric;
begin
  return j || jsonb_build_object('roll', round(roll, 6), 'won', roll < (j->>'odds')::numeric);
end $$;

-- server-side simulation: n rolls through the same decide function, nothing written
create or replace function public.lf_upgrade_simulate(p_phone text, p_at timestamptz, p_n int)
returns jsonb language plpgsql volatile security definer set search_path to 'public','extensions' as $$
declare i int; d jsonb; wins int := 0; rule text; odds numeric; ds int;
begin
  for i in 1..p_n loop d := public.lf_upgrade_decide(p_phone, p_at); if (d->>'won')::boolean then wins := wins + 1; end if; rule := d->>'rule'; odds := (d->>'odds')::numeric; ds := (d->>'days_since')::int; end loop;
  return jsonb_build_object('rule', rule, 'odds', round(odds, 6), 'one_in', round(1 / nullif(odds, 0), 2), 'days_since', ds, 'n', p_n, 'upgrades', wins, 'observed', round(wins::numeric / p_n, 6));
end $$;

create or replace function public.family_claim_reward(p_token uuid, p_reward_id integer)
 returns jsonb language plpgsql security definer set search_path to 'public','extensions' as $function$
declare ph text := public.lf_member_session(p_token); m public.loyalty_members; rw public.loyalty_rewards; up public.loyalty_rewards; rd_code text; test boolean := public.lf_setting('env') <> 'live'; upgraded boolean := false; dec jsonb;
begin
  select * into m from public.loyalty_members where phone = ph for update;
  select * into rw from public.loyalty_rewards where id = p_reward_id and active and kind = 'ladder';
  if rw.id is null then raise exception 'reward_not_found' using errcode = 'P0001'; end if;
  if m.shari_balance < rw.points_cost then raise exception 'not_enough_points' using errcode = 'P0001'; end if;
  -- smart surprise upgrade: decided here, once, at claim time (Oct 14 2026)
  dec := public.lf_upgrade_decide(ph, now());
  if (dec->>'won')::boolean then
    select * into up from public.loyalty_rewards where active and kind = 'ladder' and points_cost > rw.points_cost order by points_cost limit 1;
    if up.id is not null then upgraded := true; end if;
  end if;
  rd_code := 'R' || translate(upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 7)), '4', 'K');
  insert into public.loyalty_redemptions (phone, reward_id, reward_code, is_test, points_spent, upgraded, upgrade_rule, upgrade_odds, upgrade_roll, upgrade_days_since, upgrade_from_reward_id)
    values (ph, case when upgraded then up.id else rw.id end, rd_code, test, rw.points_cost, upgraded,
            dec->>'rule', (dec->>'odds')::numeric, (dec->>'roll')::numeric, (dec->>'days_since')::int, rw.id);
  update public.loyalty_members set shari_balance = shari_balance - rw.points_cost where phone = ph;
  return jsonb_build_object('ok', true, 'code', rd_code, 'member', public.lf_member_json(ph));
end $function$;

-- owner: recent upgrade decisions (owner PIN session only)
create or replace function public.owner_upgrade_log(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true);
begin
  return jsonb_build_object(
    'recent', (select coalesce(jsonb_agg(x order by x.id desc), '[]'::jsonb) from (
        select r.id, r.earned_at, public.lf_mask_phone(r.phone) as who, r.upgrade_rule as rule, r.upgrade_odds as odds, r.upgraded,
               f.name_en as asked, w.name_en as got, r.upgrade_days_since as days_since, r.is_test
        from public.loyalty_redemptions r left join public.loyalty_rewards f on f.id = r.upgrade_from_reward_id left join public.loyalty_rewards w on w.id = r.reward_id
        where r.upgrade_rule is not null order by r.id desc limit 12) x),
    'by_rule', (select coalesce(jsonb_object_agg(rule, jsonb_build_object('claims', c, 'upgraded', u)), '{}'::jsonb) from (
        select upgrade_rule rule, count(*) c, count(*) filter (where upgraded) u from public.loyalty_redemptions where upgrade_rule is not null group by 1) t));
end $$;

revoke all on function public.lf_days_since_prev_visit(text, timestamptz) from public, anon, authenticated;
revoke all on function public.lf_upgrade_rule(text, timestamptz) from public, anon, authenticated;
revoke all on function public.lf_upgrade_decide(text, timestamptz) from public, anon, authenticated;
revoke all on function public.lf_upgrade_simulate(text, timestamptz, int) from public, anon, authenticated;
grant execute on function public.owner_upgrade_log(uuid) to anon, authenticated;

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
    else raise exception 'setting_not_editable' using errcode = 'P0001';
  end case;
  begin v := trim(p_value)::numeric; exception when others then raise exception 'bad_value' using errcode = 'P0001'; end;
  if v < lo or v > hi then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key = 'rejoin_cooloff_days' and v not in (15, 30) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('hook_mon_on','hook_tue_on','hook_wed_on','upgrade_on','upgrade_slow_on','upgrade_lapsed_on') and v not in (0, 1) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('rolls_per_plate','tier_gohan_hkd','tier_tobiko_hkd','kama_eligible_hkd','tier_window_months','receipts_per_day','receipt_max_age_hours','referral_bonus_points','referral_cap_per_year','birthday_window_days','birthday_min_days','hook_mon_stamps','referral_min_spend','kama_dinner_passes','upgrade_lapsed_days') and v <> round(v) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  update public.loyalty_settings set value = trim(p_value), updated_at = now() where key = p_key;
  return jsonb_build_object('ok', true, 'key', p_key, 'value', trim(p_value));
end $function$;
CREATE OR REPLACE FUNCTION public.family_config()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select jsonb_build_object(
    'env', public.lf_setting('env'), 'test_mode', public.lf_setting('otp_test_mode') = 'true',
    'points_per_hkd', (public.lf_setting('points_per_hkd'))::numeric, 'receipt_max_age_hours', (public.lf_setting('receipt_max_age_hours'))::int,
    'receipts_per_day', (public.lf_setting('receipts_per_day'))::int, 'approve_over_hkd', (public.lf_setting('approve_over_hkd'))::numeric,
    'tier_gohan_hkd', (public.lf_setting('tier_gohan_hkd'))::int, 'tier_tobiko_hkd', (public.lf_setting('tier_tobiko_hkd'))::int, 'kama_eligible_hkd', (public.lf_setting('kama_eligible_hkd'))::int,
    'rolls_per_plate', (public.lf_setting('rolls_per_plate'))::int, 'hook_today', public.lf_hook(public.lf_hk_today()), 'hook_mon_stamps', (public.lf_setting('hook_mon_stamps'))::int, 'hook_tue_bonus_mult', (public.lf_setting('hook_tue_bonus_mult'))::numeric, 'hook_wed_gold_odds', (public.lf_setting('hook_wed_gold_odds'))::numeric, 'referral_bonus_points', (public.lf_setting('referral_bonus_points'))::int,
    'upgrade_boost_today', coalesce(public.lf_setting('upgrade_on'),'1') = '1' and coalesce(public.lf_setting('upgrade_slow_on'),'1') = '1' and extract(isodow from public.lf_hk_today())::int between 1 and 3,
    'shops', (select jsonb_agg(jsonb_build_object('id', id, 'name_en', name_en, 'name_zh', name_zh) order by sort) from public.loyalty_shops where active))
$function$;
