-- Roru Family v1c extras (Dominic 14:21): Gold receipt, Bring a friend, Birthday roll as working v1 features. Additive.
insert into public.loyalty_settings (key, value) values
  ('gold_receipt_odds', '0.05'),        -- ~1 in 20 approved receipts turns gold
  ('gold_receipt_mult', '2'),           -- gold = double points (placeholder; "or a free roll (TBC)")
  ('referral_bonus_points', '100'),     -- both friend and member, when the friend's first receipt is approved
  ('referral_cap_per_year', '10'),      -- bonuses per member per rolling year
  ('birthday_window_days', '3'),        -- birthday week = birthday +/- 3 days
  ('birthday_min_days', '30')           -- birthday must be on file this many days before the roll unlocks (anti-fraud)
on conflict (key) do nothing;
update public.loyalty_features set status = 'on', updated_at = now() where key in ('gold_receipt','bring_friend','birthday_roll') and status = 'soon';
update public.loyalty_features set detail_en = 'Random scans turn gold: double points (or a free roll — TBC).', detail_zh = '隨機掃描會變金色：雙倍積分（或免費手卷 — 待定）。' where key = 'gold_receipt';

alter table public.loyalty_members add column if not exists referred_by text;           -- phone of the member who invited them (set once)
alter table public.loyalty_members add column if not exists referred_at timestamptz;
alter table public.loyalty_members add column if not exists referral_bonus_at timestamptz;
alter table public.loyalty_members add column if not exists birthday_md text check (birthday_md is null or birthday_md ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$');
alter table public.loyalty_members add column if not exists birthday_set_at timestamptz;
alter table public.loyalty_receipts add column if not exists gold boolean not null default false;

create table if not exists public.loyalty_bonuses (
  id bigserial primary key,
  phone text not null references public.loyalty_members(phone) on delete cascade,
  kind text not null check (kind in ('referral_friend','referral_member')),
  points int not null,
  related_phone text,
  receipt_id bigint,
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists loyalty_bonuses_phone_idx on public.loyalty_bonuses (phone, created_at desc);
alter table public.loyalty_bonuses enable row level security;
revoke all on public.loyalty_bonuses from anon, authenticated;

alter table public.loyalty_rewards drop constraint if exists loyalty_rewards_kind_check;
alter table public.loyalty_rewards add constraint loyalty_rewards_kind_check check (kind in ('plate','gold','bonus','ladder','birthday'));
insert into public.loyalty_rewards (code, name_en, name_zh, detail_en, detail_zh, kind, weight, points_cost, sort, active) values
  ('BDAY', 'Birthday roll (TBC)', '生日手卷（待定）', 'Placeholder — a hand roll on us in your birthday week', '佔位 — 生日週送你一個手卷', 'birthday', 0, 0, 2, true)
on conflict (code) do nothing;

create or replace function public.lf_feature_on(p_key text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select coalesce((select status = 'on' from public.loyalty_features where key = p_key), false)
$$;

-- birthday window: is today within +/- N days of MM-DD (handles year ends)
create or replace function public.lf_bday_in_window(p_md text) returns boolean
language plpgsql stable security definer set search_path = public, extensions as $$
declare today date := public.lf_hk_today(); w int := coalesce((public.lf_setting('birthday_window_days'))::int, 3); y int; d date;
begin
  if p_md is null then return false; end if;
  foreach y in array array[extract(year from today)::int - 1, extract(year from today)::int, extract(year from today)::int + 1] loop
    begin d := make_date(y, substr(p_md,1,2)::int, substr(p_md,4,2)::int); exception when others then d := make_date(y, 3, 1); end;  -- 29 Feb -> 1 Mar
    if abs(today - d) <= w then return true; end if;
  end loop;
  return false;
end $$;

create or replace function public.lf_member_core(p_phone text) returns jsonb
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

create or replace function public.lf_member_json(p_phone text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
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
    'gold', jsonb_build_object('on', public.lf_feature_on('gold_receipt'), 'mult', (public.lf_setting('gold_receipt_mult'))::numeric, 'odds', (public.lf_setting('gold_receipt_odds'))::numeric,
             'count', (select count(*) from public.loyalty_receipts where phone = p_phone and gold)),
    'referral', jsonb_build_object('on', public.lf_feature_on('bring_friend'), 'code', m.member_code, 'bonus', (public.lf_setting('referral_bonus_points'))::int, 'cap', (public.lf_setting('referral_cap_per_year'))::int,
             'joined', (select count(*) from public.loyalty_members f where f.referred_by = p_phone),
             'rewarded', (select count(*) from public.loyalty_bonuses b where b.phone = p_phone and b.kind = 'referral_member'),
             'points_earned', (select coalesce(sum(points),0) from public.loyalty_bonuses b where b.phone = p_phone),
             'invited_by', case when m.referred_by is null then null else coalesce(ref.name, public.lf_mask_phone(m.referred_by)) end,
             'my_bonus_pending', (m.referred_by is not null and m.referral_bonus_at is null)),
    'birthday', jsonb_build_object('on', public.lf_feature_on('birthday_roll'), 'md', m.birthday_md, 'in_window', in_win, 'claimed', bday_claimed,
             'days_until_eligible', days_left,
             'claimable', public.lf_feature_on('birthday_roll') and in_win and not bday_claimed and days_left = 0)
  );
end $$;

-- credit receipt v1c+extras: gold chance (x gold mult), referral bonus on the friend's first approved receipt
create or replace function public.lf_credit_receipt(p_id bigint) returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
declare r public.loyalty_receipts; m public.loyalty_members; pts int; mult numeric; st text; vr jsonb; vday date; is_gold boolean := false;
        bonus int := coalesce((public.lf_setting('referral_bonus_points'))::int, 100); cap int := coalesce((public.lf_setting('referral_cap_per_year'))::int, 10); test boolean := public.lf_setting('env') <> 'live';
begin
  select * into r from public.loyalty_receipts where id = p_id for update;
  if r.status <> 'approved' or r.points > 0 then return; end if;
  select * into m from public.loyalty_members where phone = r.phone for update;
  st := case when m.tier = 'kama' then 'kama' else public.lf_tier_spend(public.lf_year_spend(r.phone) - round(r.total_hkd)::int) end;
  mult := public.lf_tier_mult(st);
  is_gold := public.lf_feature_on('gold_receipt') and random() < coalesce((public.lf_setting('gold_receipt_odds'))::numeric, 0.05);
  pts := floor(r.total_hkd * coalesce((public.lf_setting('points_per_hkd'))::numeric, 1) * mult * (case when is_gold then coalesce((public.lf_setting('gold_receipt_mult'))::numeric, 2) else 1 end));
  update public.loyalty_members set shari_balance = shari_balance + pts, points = points + pts,
    lifetime_spend_hkd = lifetime_spend_hkd + round(r.total_hkd)::int, last_visit_at = greatest(coalesce(last_visit_at, r.receipt_at, now()), coalesce(r.receipt_at, now()))
    where phone = r.phone;
  update public.loyalty_members set tier = public.lf_status(r.phone) where phone = r.phone;
  vday := coalesce((r.receipt_at at time zone 'Asia/Hong_Kong')::date, public.lf_hk_today());
  if vday > public.lf_hk_today() then vday := public.lf_hk_today(); end if;
  vr := public.lf_add_visit(r.phone, coalesce(r.shop_id, 'wanchai'), r.reviewed_by, vday, r.id, case when r.source = 'staff' then 'staff_award' else 'receipt' end, false);
  -- bring a friend: the friend's first approved receipt pays both once (referrer capped per rolling year)
  if public.lf_feature_on('bring_friend') and m.referred_by is not null and m.referral_bonus_at is null
     and not exists (select 1 from public.loyalty_receipts x where x.phone = r.phone and x.status = 'approved' and x.id <> r.id and x.points > 0) then
    update public.loyalty_members set referral_bonus_at = now(), shari_balance = shari_balance + bonus, points = points + bonus where phone = r.phone;
    insert into public.loyalty_bonuses (phone, kind, points, related_phone, receipt_id, is_test) values (r.phone, 'referral_friend', bonus, m.referred_by, r.id, test);
    if (select count(*) from public.loyalty_bonuses b where b.phone = m.referred_by and b.kind = 'referral_member' and b.created_at > now() - interval '365 days') < cap then
      update public.loyalty_members set shari_balance = shari_balance + bonus, points = points + bonus where phone = m.referred_by;
      insert into public.loyalty_bonuses (phone, kind, points, related_phone, receipt_id, is_test) values (m.referred_by, 'referral_member', bonus, r.phone, r.id, test);
    end if;
    vr := vr || jsonb_build_object('referral_bonus', bonus);
  end if;
  update public.loyalty_receipts set points = pts, multiplier = mult, gold = is_gold, visit_result = vr || jsonb_build_object('gold', is_gold) where id = p_id;
end $$;

-- guest links the friend who invited them: once, only as a brand-new member (joined < 24 h, no receipts yet), not themselves
create or replace function public.family_set_referrer(p_token uuid, p_code text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token); m public.loyalty_members; refm public.loyalty_members; q text := upper(regexp_replace(coalesce(p_code,''), '[^0-9A-Za-z]', '', 'g'));
begin
  if not public.lf_feature_on('bring_friend') then raise exception 'feature_off' using errcode = 'P0001'; end if;
  select * into m from public.loyalty_members where phone = ph for update;
  select * into refm from public.loyalty_members where member_code = q;
  if refm.phone is null then raise exception 'referral_code_unknown' using errcode = 'P0001'; end if;
  if refm.phone = ph then raise exception 'referral_self' using errcode = 'P0001'; end if;
  if m.referred_by is not null then raise exception 'referral_already_set' using errcode = 'P0001'; end if;
  if m.created_at < now() - interval '24 hours' or exists (select 1 from public.loyalty_receipts x where x.phone = ph) then raise exception 'referral_new_members_only' using errcode = 'P0001'; end if;
  if refm.referred_by = ph then raise exception 'referral_self' using errcode = 'P0001'; end if;
  update public.loyalty_members set referred_by = refm.phone, referred_at = now() where phone = ph;
  return jsonb_build_object('ok', true, 'member', public.lf_member_json(ph));
end $$;

-- guest sets a birthday (month-day) once; changes go through staff/owner
create or replace function public.family_set_birthday(p_token uuid, p_md text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token); cur text;
begin
  if p_md !~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' then raise exception 'bad_birthday' using errcode = 'P0001'; end if;
  select birthday_md into cur from public.loyalty_members where phone = ph;
  if cur is not null and cur <> p_md then raise exception 'birthday_locked' using errcode = 'P0001'; end if;
  update public.loyalty_members set birthday_md = p_md, birthday_set_at = coalesce(birthday_set_at, now()) where phone = ph;
  return jsonb_build_object('ok', true, 'member', public.lf_member_json(ph));
end $$;

-- guest claims the birthday roll in their birthday week (once a year) -> code/QR for staff to redeem
create or replace function public.family_claim_birthday(p_token uuid) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token); j jsonb; rw public.loyalty_rewards; rd_code text; test boolean := public.lf_setting('env') <> 'live';
begin
  perform 1 from public.loyalty_members where phone = ph for update;
  j := public.lf_member_json(ph) -> 'birthday';
  if not coalesce((j->>'claimable')::boolean, false) then raise exception 'birthday_not_available' using errcode = 'P0001'; end if;
  select * into rw from public.loyalty_rewards where code = 'BDAY' and active;
  if rw.id is null then raise exception 'reward_not_found' using errcode = 'P0001'; end if;
  rd_code := 'R' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 7));
  insert into public.loyalty_redemptions (phone, reward_id, reward_code, is_test, status, revealed_at) values (ph, rw.id, rd_code, test, 'revealed', now());
  return jsonb_build_object('ok', true, 'code', rd_code, 'member', public.lf_member_json(ph));
end $$;

-- owner: clear a guest's birthday (so they can re-enter it) — the only way to change it
create or replace function public.owner_clear_birthday(p_token uuid, p_phone text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true);
begin
  update public.loyalty_members set birthday_md = null, birthday_set_at = null where phone = p_phone;
  return jsonb_build_object('ok', true);
end $$;

-- owner features: built ones toggle on/off; teasers toggle soon/off
create or replace function public.owner_save_feature(p_token uuid, p_key text, p_status text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true); built boolean := p_key in ('gold_receipt','bring_friend','birthday_roll');
begin
  if p_status not in ('off','soon','on') or (p_status = 'on' and not built) or (p_status = 'soon' and built) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  update public.loyalty_features set status = p_status, updated_at = now() where key = p_key;
  if not found then raise exception 'feature_not_found' using errcode = 'P0001'; end if;
  return jsonb_build_object('ok', true, 'key', p_key, 'status', p_status);
end $$;

-- owner: extras numbers
create or replace function public.owner_extras(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true);
begin
  return jsonb_build_object(
    'gold_receipts', (select count(*) from public.loyalty_receipts where gold),
    'referrals_joined', (select count(*) from public.loyalty_members where referred_by is not null),
    'referrals_rewarded', (select count(*) from public.loyalty_bonuses where kind = 'referral_friend'),
    'referral_points', (select coalesce(sum(points),0) from public.loyalty_bonuses),
    'birthdays_on_file', (select count(*) from public.loyalty_members where birthday_md is not null),
    'birthday_rolls', (select count(*) from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id where w.kind = 'birthday'),
    'birthdays_this_week', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'phone_masked', public.lf_mask_phone(phone), 'phone', phone, 'md', birthday_md)), '[]'::jsonb) from public.loyalty_members where public.lf_bday_in_window(birthday_md)),
    'top_referrers', (select coalesce(jsonb_agg(jsonb_build_object('name', m.name, 'phone_masked', public.lf_mask_phone(m.phone), 'joined', t.c) order by t.c desc), '[]'::jsonb)
                        from (select referred_by p, count(*) c from public.loyalty_members where referred_by is not null group by 1 order by 2 desc limit 10) t join public.loyalty_members m on m.phone = t.p));
end $$;

-- owner settings whitelist + the extras' knobs
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
    else raise exception 'setting_not_editable' using errcode = 'P0001';
  end case;
  begin v := trim(p_value)::numeric; exception when others then raise exception 'bad_value' using errcode = 'P0001'; end;
  if v < lo or v > hi then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('rolls_per_plate','tier_gohan_hkd','tier_tobiko_hkd','kama_eligible_hkd','tier_window_months','receipts_per_day','receipt_max_age_hours','referral_bonus_points','referral_cap_per_year','birthday_window_days','birthday_min_days') and v <> round(v) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  update public.loyalty_settings set value = trim(p_value), updated_at = now() where key = p_key;
  return jsonb_build_object('ok', true, 'key', p_key, 'value', trim(p_value));
end $$;

revoke execute on function public.lf_member_core(text), public.lf_feature_on(text), public.lf_bday_in_window(text), public.lf_credit_receipt(bigint) from public, anon, authenticated;
grant execute on function public.family_set_referrer(uuid, text), public.family_set_birthday(uuid, text), public.family_claim_birthday(uuid),
  public.owner_clear_birthday(uuid, text), public.owner_extras(uuid) to anon, authenticated;
