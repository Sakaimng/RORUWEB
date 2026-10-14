-- Roru Family (Dominic 14:33-14:35): weekly slow-night hooks, bring-a-friend anti-gaming, rejoin cool-off, staff split bill. Additive.
insert into public.loyalty_settings (key, value) values
  ('hook_mon_on', '1'), ('hook_mon_stamps', '2'),          -- MON "Double stamps": each visit = 2 stamps (still max 1 visit a day)
  ('hook_tue_on', '1'), ('hook_tue_bonus_mult', '2'),      -- TUE "Friends night": bring-a-friend bonus x2
  ('hook_wed_on', '1'), ('hook_wed_gold_odds', '0.2'),     -- WED "Gold rush": gold receipt odds 1 in 5
  ('referral_min_spend', '200'),                           -- friend's qualifying receipt (or split share) must be at least this (HK$)
  ('rejoin_cooloff_days', '30')                            -- 15 or 30
on conflict (key) do nothing;

-- one-way phone hashes (HMAC with a private pepper): "has this number ever been a member" + rejoin cool-off. No other personal data.
create table if not exists public.loyalty_secret (id int primary key default 1 check (id = 1), pepper text not null);
insert into public.loyalty_secret (id, pepper) values (1, encode(extensions.gen_random_bytes(32), 'hex')) on conflict (id) do nothing;
alter table public.loyalty_secret enable row level security;
revoke all on public.loyalty_secret from anon, authenticated;
create table if not exists public.loyalty_phone_hashes (
  phone_hash text primary key,
  first_seen_at timestamptz not null default now(),
  deleted_at timestamptz,
  rejoin_after timestamptz
);
alter table public.loyalty_phone_hashes enable row level security;
revoke all on public.loyalty_phone_hashes from anon, authenticated;
create or replace function public.lf_phone_hash(p text) returns text
language sql stable security definer set search_path = public, extensions as $$
  select encode(extensions.hmac(p, (select pepper from public.loyalty_secret where id = 1), 'sha256'), 'hex')
$$;
insert into public.loyalty_phone_hashes (phone_hash, first_seen_at) select public.lf_phone_hash(phone), coalesce(created_at, now()) from public.loyalty_members on conflict do nothing;

alter table public.loyalty_members add column if not exists phone_was_new boolean;        -- false = number had been a member before (never a "new friend")
alter table public.loyalty_members add column if not exists referral_flag text;           -- set when a friend link looks suspicious -> bonus waits for staff
create table if not exists public.loyalty_member_devices (
  phone text not null references public.loyalty_members(phone) on delete cascade,
  device_hash text not null,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  primary key (phone, device_hash)
);
create index if not exists loyalty_member_devices_dev_idx on public.loyalty_member_devices (device_hash);
alter table public.loyalty_member_devices enable row level security;
revoke all on public.loyalty_member_devices from anon, authenticated;

alter table public.loyalty_bonuses add column if not exists status text not null default 'paid' check (status in ('paid','pending','rejected'));
alter table public.loyalty_bonuses add column if not exists reason text;
alter table public.loyalty_bonuses add column if not exists reviewed_by int;
alter table public.loyalty_bonuses add column if not exists reviewed_at timestamptz;

alter table public.loyalty_receipts add column if not exists base_key text;                -- shared bill: every split part carries the bill's receipt key
alter table public.loyalty_receipts add column if not exists split_n int;
create index if not exists loyalty_receipts_base_idx on public.loyalty_receipts (base_key);
alter table public.loyalty_receipts drop constraint if exists loyalty_receipts_source_check;
alter table public.loyalty_receipts add constraint loyalty_receipts_source_check check (source in ('ocr','manual','staff','staff_split','split'));

-- is this receipt number already claimed (whole or as a split)?
create or replace function public.lf_receipt_used(p_key text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.loyalty_receipts where (receipt_key = p_key or base_key = p_key) and status <> 'rejected')
$$;

-- weekly hook for a HK day: 'mon_double' | 'tue_friends' | 'wed_gold' | null
create or replace function public.lf_hook(p_day date) returns text
language sql stable security definer set search_path = public, extensions as $$
  select case extract(isodow from p_day)::int
    when 1 then case when public.lf_setting('hook_mon_on') = '1' then 'mon_double' end
    when 2 then case when public.lf_setting('hook_tue_on') = '1' then 'tue_friends' end
    when 3 then case when public.lf_setting('hook_wed_on') = '1' then 'wed_gold' end
  end
$$;

create or replace function public.lf_add_visit(p_phone text, p_shop text, p_staff int, p_day date, p_receipt bigint, p_source text, p_demo boolean default false) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare m public.loyalty_members; vday date := coalesce(p_day, public.lf_hk_today()); test boolean := public.lf_setting('env') <> 'live';
        per_plate int := greatest(1, coalesce((public.lf_setting('rolls_per_plate'))::int, 5)); gold boolean; plate_full boolean := false;
        rw public.loyalty_rewards; rd_code text; reward jsonb := null; vid bigint; demo_day boolean := false; n int := 1;
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
  if public.lf_hook(vday) = 'mon_double' then n := greatest(1, coalesce((public.lf_setting('hook_mon_stamps'))::int, 2)); end if;
  update public.loyalty_members set rolls_on_plate = rolls_on_plate + n, gold_rolls = gold_rolls + (case when gold then 1 else 0 end),
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
  return jsonb_build_object('added', true, 'stamps_added', n, 'hook', public.lf_hook(vday), 'day', vday, 'demo_day', demo_day, 'gold', gold, 'stamps', m.rolls_on_plate, 'per_plate', per_plate, 'plate_full', plate_full, 'reward', reward);
end $$;

create or replace function public.lf_credit_receipt(p_id bigint) returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
declare r public.loyalty_receipts; m public.loyalty_members; pts int; mult numeric; st text; vr jsonb; vday date; is_gold boolean := false;
        bonus int := coalesce((public.lf_setting('referral_bonus_points'))::int, 100); minspend numeric := coalesce((public.lf_setting('referral_min_spend'))::numeric, 200); odds numeric; hk text; bst text; ref_shared boolean; cap int := coalesce((public.lf_setting('referral_cap_per_year'))::int, 10); test boolean := public.lf_setting('env') <> 'live';
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
  update public.loyalty_receipts set points = pts, multiplier = mult, gold = is_gold, visit_result = vr || jsonb_build_object('gold', is_gold, 'hook', hk) where id = p_id;
end $$;

create or replace function public.family_request_code(p_phone text, p_lang text default 'en') returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ra timestamptz; ph text; code text; test boolean; n int; ttl int := coalesce((public.lf_setting('otp_ttl_minutes'))::int, 10);
begin
  ph := public.lf_norm_phone(p_phone);
  if not exists (select 1 from public.loyalty_members where phone = ph) then
    select rejoin_after into ra from public.loyalty_phone_hashes where phone_hash = public.lf_phone_hash(ph) and rejoin_after > now();
    if ra is not null then raise exception '%', 'rejoin_after:' || to_char(ra at time zone 'Asia/Hong_Kong', 'YYYY-MM-DD') using errcode = 'P0001'; end if;
  end if;
  select count(*) into n from public.loyalty_otp where phone = ph and created_at > now() - interval '1 hour';
  if n >= 5 then raise exception 'too_many_codes' using errcode = 'P0001'; end if;
  test := public.lf_setting('otp_test_mode') = 'true';
  if test then code := public.lf_setting('otp_test_code'); else code := translate(lpad((floor(random()*1000000))::int::text, 6, '0'), '4', '8'); end if;
  insert into public.loyalty_otp (phone, code_hash, expires_at) values (ph, crypt(code, gen_salt('bf', 6)), now() + make_interval(mins => ttl));
  -- LIVE MODE: an SMS sender (Edge Function / webhook) has to deliver `code` to `ph` here. Not wired in preview: no SMS is sent.
  return jsonb_build_object('ok', true, 'phone_masked', public.lf_mask_phone(ph), 'test_mode', test, 'expires_in_minutes', ttl,
                            'hint', case when test then 'preview: use the test code' else null end);
end $$;

create or replace function public.family_verify_code(p_phone text, p_code text, p_consent boolean default false, p_name text default null, p_lang text default 'en', p_device text default null) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text; o record; tok uuid; is_new boolean := false; test boolean; ra timestamptz; seen boolean; dh text;
begin
  ph := public.lf_norm_phone(p_phone);
  select * into o from public.loyalty_otp where phone = ph and not used order by created_at desc limit 1;
  if o.id is null or o.expires_at < now() then raise exception 'code_expired' using errcode = 'P0001'; end if;
  if o.attempts >= 5 then raise exception 'too_many_attempts' using errcode = 'P0001'; end if;
  if o.code_hash <> crypt(coalesce(p_code,''), o.code_hash) then
    update public.loyalty_otp set attempts = attempts + 1 where id = o.id;
    raise exception 'wrong_code' using errcode = 'P0001';
  end if;
  update public.loyalty_otp set used = true where id = o.id;
  if not exists (select 1 from public.loyalty_members where phone = ph) then
    if not p_consent then raise exception 'consent_required' using errcode = 'P0001'; end if;
    select rejoin_after into ra from public.loyalty_phone_hashes where phone_hash = public.lf_phone_hash(ph) and rejoin_after > now();
    if ra is not null then raise exception '%', 'rejoin_after:' || to_char(ra at time zone 'Asia/Hong_Kong', 'YYYY-MM-DD') using errcode = 'P0001'; end if;
    seen := exists (select 1 from public.loyalty_phone_hashes where phone_hash = public.lf_phone_hash(ph));
    test := public.lf_setting('env') <> 'live';
    insert into public.loyalty_members (phone, name, consent_at, points, tier, lifetime_spend_hkd, shari_balance, member_code, lang, is_test, phone_was_new)
      values (ph, nullif(trim(coalesce(p_name,'')),''), now(), 0, 'nori', 0, 0, public.lf_new_member_code(), coalesce(p_lang,'en'), test, not seen);
    insert into public.loyalty_phone_hashes (phone_hash) values (public.lf_phone_hash(ph)) on conflict (phone_hash) do update set rejoin_after = null;
    is_new := true;
  else
    update public.loyalty_members set lang = coalesce(p_lang, lang),
      name = coalesce(nullif(trim(coalesce(p_name,'')),''), name),
      member_code = coalesce(member_code, public.lf_new_member_code())
      where phone = ph;
  end if;
  if p_device is not null and length(p_device) between 8 and 100 then
    dh := encode(extensions.digest(p_device, 'sha256'), 'hex');
    insert into public.loyalty_member_devices (phone, device_hash) values (ph, dh) on conflict (phone, device_hash) do update set last_at = now();
  end if;
  insert into public.loyalty_sessions (kind, phone, expires_at)
    values ('member', ph, now() + make_interval(days => coalesce((public.lf_setting('member_session_days'))::int, 180)))
    returning token into tok;
  return jsonb_build_object('ok', true, 'token', tok, 'is_new', is_new, 'member', public.lf_member_json(ph));
end $$;
drop function if exists public.family_verify_code(text, text, boolean, text, text);
grant execute on function public.family_verify_code(text, text, boolean, text, text, text) to anon, authenticated;

create or replace function public.family_delete_me(p_token uuid) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token); d int := coalesce((public.lf_setting('rejoin_cooloff_days'))::int, 30);
begin
  -- keep only a one-way hash of the number + dates: blocks rejoining for the cool-off, and the number never counts as a "new friend" again
  insert into public.loyalty_phone_hashes (phone_hash, deleted_at, rejoin_after) values (public.lf_phone_hash(ph), now(), now() + make_interval(days => d))
    on conflict (phone_hash) do update set deleted_at = now(), rejoin_after = now() + make_interval(days => d);
  delete from public.loyalty_members where phone = ph;   -- receipts/visits/redemptions/sessions/consents/devices/bonuses cascade
  delete from public.loyalty_otp where phone = ph;
  return jsonb_build_object('ok', true, 'rejoin_after', to_char((now() + make_interval(days => d)) at time zone 'Asia/Hong_Kong', 'YYYY-MM-DD'));
end $$;

-- friend link v2: anti-gaming
create or replace function public.family_set_referrer(p_token uuid, p_code text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token); m public.loyalty_members; refm public.loyalty_members; q text := upper(regexp_replace(coalesce(p_code,''), '[^0-9A-Za-z]', '', 'g')); flag text := null;
begin
  if not public.lf_feature_on('bring_friend') then raise exception 'feature_off' using errcode = 'P0001'; end if;
  select * into m from public.loyalty_members where phone = ph for update;
  select * into refm from public.loyalty_members where member_code = q;
  if refm.phone is null then raise exception 'referral_code_unknown' using errcode = 'P0001'; end if;
  if refm.phone = ph then raise exception 'referral_self' using errcode = 'P0001'; end if;
  if m.referred_by is not null then raise exception 'referral_already_set' using errcode = 'P0001'; end if;                       -- one referrer, ever
  if not coalesce(m.phone_was_new, true) then raise exception 'referral_new_members_only' using errcode = 'P0001'; end if;           -- number seen before (incl. deleted)
  if m.created_at < now() - interval '24 hours' or exists (select 1 from public.loyalty_receipts x where x.phone = ph) then raise exception 'referral_new_members_only' using errcode = 'P0001'; end if;
  if refm.referred_by = ph then raise exception 'referral_self' using errcode = 'P0001'; end if;                                     -- can't refer back your referrer
  if exists (select 1 from public.loyalty_member_devices a join public.loyalty_member_devices b on a.device_hash = b.device_hash where a.phone = ph and b.phone = refm.phone) then
    raise exception 'referral_same_device' using errcode = 'P0001'; end if;                                                          -- same phone/browser = self-referral
  if abs(extract(epoch from (m.created_at - refm.created_at))) < 60 then flag := 'friend joined within a minute of the member'; end if;
  update public.loyalty_members set referred_by = refm.phone, referred_at = now(), referral_flag = flag where phone = ph;
  return jsonb_build_object('ok', true, 'flagged', flag is not null, 'member', public.lf_member_json(ph));
end $$;

-- staff: friend bonuses waiting for a check
create or replace function public.staff_bonus_queue(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token);
begin
  return (select coalesce(jsonb_agg(jsonb_build_object('receipt_id', b.receipt_id, 'friend', coalesce(f.name, public.lf_mask_phone(f.phone)), 'member', coalesce(mm.name, public.lf_mask_phone(mm.phone)),
           'points', b.points, 'reason', b.reason, 'created_at', b.created_at) order by b.created_at), '[]'::jsonb)
          from public.loyalty_bonuses b join public.loyalty_members f on f.phone = b.phone left join public.loyalty_members mm on mm.phone = b.related_phone
          where b.status = 'pending' and b.kind = 'referral_friend');
end $$;
create or replace function public.staff_review_bonus(p_token uuid, p_receipt_id bigint, p_approve boolean) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); b record; n int := 0;
begin
  for b in select * from public.loyalty_bonuses where receipt_id = p_receipt_id and status = 'pending' for update loop
    update public.loyalty_bonuses set status = case when p_approve then 'paid' else 'rejected' end, reviewed_by = s.id, reviewed_at = now() where id = b.id;
    if p_approve then update public.loyalty_members set shari_balance = shari_balance + b.points, points = points + b.points where phone = b.phone; end if;
    n := n + 1;
  end loop;
  if n = 0 then raise exception 'already_reviewed' using errcode = 'P0001'; end if;
  return jsonb_build_object('ok', true, 'rows', n, 'status', case when p_approve then 'paid' else 'rejected' end);
end $$;

-- OWNER override: split one bill between 2-6 members (even split, or amounts that add up to the bill). Each gets points for their share + a visit stamp.
create or replace function public.staff_split(p_token uuid, p_receipt_no text, p_total numeric, p_parts jsonb, p_shop text default null) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
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
    if mm.phone is null then begin select * into mm from public.loyalty_members where phone = public.lf_norm_phone(q); exception when others then null; end; end if;
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
  if public.lf_receipt_used(k) then raise exception 'receipt_already_used' using errcode = 'P0001'; end if;
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
  if public.lf_receipt_used(k) then raise exception 'receipt_already_used' using errcode = 'P0001'; end if;
  insert into public.loyalty_receipts (phone, shop_id, receipt_no, receipt_key, total_hkd, receipt_at, status, source, reviewed_by, reviewed_at, is_test)
    values (m.phone, shop, coalesce(nullif(trim(p_receipt_no),''), k), k, round(p_total_hkd,2), now(), 'approved', 'staff', s.id, now(), test) returning id into rid;
  perform public.lf_credit_receipt(rid);
  return jsonb_build_object('ok', true, 'points', (select points from public.loyalty_receipts where id = rid), 'multiplier', (select multiplier from public.loyalty_receipts where id = rid), 'visit', (select visit_result from public.loyalty_receipts where id = rid), 'member', public.lf_member_json(m.phone));
end $$;

-- guest-side split (Dominic 14:37): the 2nd..6th member scanning a claimed receipt asks the first claimer to split it evenly
create table if not exists public.loyalty_split_requests (
  id bigserial primary key,
  receipt_key text not null,                         -- the bill's key (= the first claim's receipt_key)
  first_phone text not null references public.loyalty_members(phone) on delete cascade,
  requester_phone text not null references public.loyalty_members(phone) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','expired')),
  receipt_id bigint,                                 -- requester's share row once accepted
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '72 hours',
  decided_at timestamptz
);
create index if not exists loyalty_split_req_first_idx on public.loyalty_split_requests (first_phone, status);
create index if not exists loyalty_split_req_req_idx on public.loyalty_split_requests (requester_phone, created_at desc);
create unique index if not exists loyalty_split_req_once on public.loyalty_split_requests (receipt_key, requester_phone) where status in ('pending','accepted');
alter table public.loyalty_split_requests enable row level security;
revoke all on public.loyalty_split_requests from anon, authenticated;

-- re-price one already-credited receipt row to a new share (keeps its multiplier and gold), adjusting the member's balance
create or replace function public.lf_reprice_share(p_id bigint, p_share numeric) returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
declare r public.loyalty_receipts; newpts int; d int; ds int;
begin
  select * into r from public.loyalty_receipts where id = p_id for update;
  newpts := floor(p_share * coalesce((public.lf_setting('points_per_hkd'))::numeric, 1) * coalesce(r.multiplier, 1) * (case when r.gold then coalesce((public.lf_setting('gold_receipt_mult'))::numeric, 2) else 1 end));
  d := newpts - r.points; ds := round(p_share)::int - round(r.total_hkd)::int;
  update public.loyalty_receipts set total_hkd = p_share, points = newpts where id = p_id;
  update public.loyalty_members set shari_balance = greatest(0, shari_balance + d), points = greatest(0, points + d), lifetime_spend_hkd = greatest(0, lifetime_spend_hkd + ds) where phone = r.phone;
  update public.loyalty_members set tier = public.lf_status(r.phone) where phone = r.phone;
end $$;

create or replace function public.family_answer_split(p_token uuid, p_request_id bigint, p_yes boolean) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token); q public.loyalty_split_requests; o public.loyalty_receipts; bill numeric; n int; share numeric; firstshare numeric; x record; rid bigint; i int := 0; test boolean := public.lf_setting('env') <> 'live';
begin
  select * into q from public.loyalty_split_requests where id = p_request_id and first_phone = ph for update;
  if q.id is null then raise exception 'split_not_found' using errcode = 'P0001'; end if;
  if q.status <> 'pending' then raise exception 'already_reviewed' using errcode = 'P0001'; end if;
  if q.expires_at < now() then update public.loyalty_split_requests set status = 'expired', decided_at = now() where id = q.id; raise exception 'split_expired' using errcode = 'P0001'; end if;
  if not p_yes then
    update public.loyalty_split_requests set status = 'declined', decided_at = now() where id = q.id;
    return jsonb_build_object('ok', true, 'status', 'declined', 'member', public.lf_member_json(ph));
  end if;
  select * into o from public.loyalty_receipts where receipt_key = q.receipt_key and status = 'approved' for update;
  if o.id is null then raise exception 'split_not_found' using errcode = 'P0001'; end if;
  -- the whole bill = the first claim's total + every share already split off it
  select coalesce(sum(total_hkd), 0) into bill from public.loyalty_receipts where (receipt_key = q.receipt_key or base_key = q.receipt_key) and status = 'approved';
  select count(*) + 1 into n from public.loyalty_receipts where (receipt_key = q.receipt_key or base_key = q.receipt_key) and status = 'approved';
  if n > 6 then raise exception 'split_full' using errcode = 'P0001'; end if;
  share := floor(bill * 100 / n) / 100; firstshare := bill - share * (n - 1);
  update public.loyalty_receipts set base_key = q.receipt_key, split_n = n where receipt_key = q.receipt_key;
  for x in select id from public.loyalty_receipts where (receipt_key = q.receipt_key or base_key = q.receipt_key) and status = 'approved' order by (receipt_key = q.receipt_key) desc, id loop
    i := i + 1;
    perform public.lf_reprice_share(x.id, case when i = 1 then firstshare else share end);
    update public.loyalty_receipts set split_n = n where id = x.id;
  end loop;
  insert into public.loyalty_receipts (phone, shop_id, receipt_no, receipt_key, base_key, split_n, total_hkd, receipt_at, status, source, is_test)
    values (q.requester_phone, o.shop_id, o.receipt_no, q.receipt_key || '#S' || q.id, q.receipt_key, n, share, o.receipt_at, 'approved', 'split', test) returning id into rid;
  perform public.lf_credit_receipt(rid);
  update public.loyalty_split_requests set status = 'accepted', decided_at = now(), receipt_id = rid where id = q.id;
  return jsonb_build_object('ok', true, 'status', 'accepted', 'people', n, 'share', share, 'member', public.lf_member_json(ph));
end $$;

create or replace function public.family_submit_receipt(p_token uuid, p_receipt_no text, p_total_hkd numeric, p_receipt_at timestamptz default null, p_shop text default null, p_source text default 'ocr', p_ocr_confidence int default null, p_ocr_text text default null) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token); o public.loyalty_receipts; k text; n int; st text := 'approved'; why text := null; rid bigint; test boolean := public.lf_setting('env') <> 'live';
        maxage int := coalesce((public.lf_setting('receipt_max_age_hours'))::int, 48); perday int := coalesce((public.lf_setting('receipts_per_day'))::int, 3);
        approve_over numeric := coalesce((public.lf_setting('approve_over_hkd'))::numeric, 1500); minconf int := coalesce((public.lf_setting('ocr_min_confidence'))::int, 60);
begin
  k := upper(regexp_replace(coalesce(p_receipt_no,''), '[^0-9A-Za-z]', '', 'g'));
  if length(k) < 3 then raise exception 'receipt_no_required' using errcode = 'P0001'; end if;
  if p_total_hkd is null or p_total_hkd <= 0 or p_total_hkd > 100000 then raise exception 'bad_total' using errcode = 'P0001'; end if;
  if public.lf_receipt_used(k) then
    select * into o from public.loyalty_receipts where receipt_key = k and status <> 'rejected';
    if o.id is null or o.phone = ph or o.status <> 'approved'
       or exists (select 1 from public.loyalty_receipts x where x.base_key = k and x.phone = ph and x.status <> 'rejected')
       or exists (select 1 from public.loyalty_split_requests sr where sr.receipt_key = k and sr.requester_phone = ph and sr.status in ('pending','accepted') and sr.expires_at > now()) then
      raise exception 'receipt_already_used' using errcode = 'P0001';
    end if;
    if (select count(*) from public.loyalty_receipts x where (x.receipt_key = k or x.base_key = k) and x.status = 'approved') >= 6 then raise exception 'split_full' using errcode = 'P0001'; end if;
    if (select count(*) from public.loyalty_split_requests sr where sr.requester_phone = ph and sr.created_at > now() - interval '24 hours') >= perday then raise exception 'daily_receipt_limit' using errcode = 'P0001'; end if;
    update public.loyalty_split_requests set status = 'expired', decided_at = now() where receipt_key = k and requester_phone = ph and status = 'pending' and expires_at <= now();
    insert into public.loyalty_split_requests (receipt_key, first_phone, requester_phone, is_test) values (k, o.phone, ph, test) returning id into rid;
    return jsonb_build_object('ok', true, 'status', 'split_requested', 'id', rid, 'member', public.lf_member_json(ph));
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
    'split_inbox', (select coalesce(jsonb_agg(jsonb_build_object('id', sr.id, 'who', '••••' || right(sr.requester_phone, 2), 'name', rq.name, 'receipt_no', o.receipt_no, 'bill', (select sum(total_hkd) from public.loyalty_receipts x where (x.receipt_key = sr.receipt_key or x.base_key = sr.receipt_key) and x.status = 'approved'),
                       'people_after', (select count(*) + 1 from public.loyalty_receipts x where (x.receipt_key = sr.receipt_key or x.base_key = sr.receipt_key) and x.status = 'approved'), 'expires_at', sr.expires_at) order by sr.created_at), '[]'::jsonb)
                    from public.loyalty_split_requests sr join public.loyalty_members rq on rq.phone = sr.requester_phone left join public.loyalty_receipts o on o.receipt_key = sr.receipt_key
                    where sr.first_phone = p_phone and sr.status = 'pending' and sr.expires_at > now()),
    'split_outbox', (select coalesce(jsonb_agg(jsonb_build_object('id', sr.id, 'receipt_no', o.receipt_no, 'status', case when sr.status = 'pending' and sr.expires_at <= now() then 'expired' else sr.status end,
                       'points', (select points from public.loyalty_receipts x where x.id = sr.receipt_id), 'created_at', sr.created_at) order by sr.created_at desc), '[]'::jsonb)
                    from public.loyalty_split_requests sr left join public.loyalty_receipts o on o.receipt_key = sr.receipt_key
                    where sr.requester_phone = p_phone and sr.created_at > now() - interval '7 days'),
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
    when 'hook_mon_on', 'hook_tue_on', 'hook_wed_on' then lo := 0; hi := 1;
    when 'hook_mon_stamps' then lo := 1; hi := 5;
    when 'hook_tue_bonus_mult' then lo := 0; hi := 10;
    when 'hook_wed_gold_odds' then lo := 0; hi := 1;
    when 'referral_min_spend' then lo := 0; hi := 100000;
    when 'rejoin_cooloff_days' then lo := 15; hi := 30;
    else raise exception 'setting_not_editable' using errcode = 'P0001';
  end case;
  begin v := trim(p_value)::numeric; exception when others then raise exception 'bad_value' using errcode = 'P0001'; end;
  if v < lo or v > hi then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key = 'rejoin_cooloff_days' and v not in (15, 30) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('hook_mon_on','hook_tue_on','hook_wed_on') and v not in (0, 1) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('rolls_per_plate','tier_gohan_hkd','tier_tobiko_hkd','kama_eligible_hkd','tier_window_months','receipts_per_day','receipt_max_age_hours','referral_bonus_points','referral_cap_per_year','birthday_window_days','birthday_min_days','hook_mon_stamps','referral_min_spend') and v <> round(v) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  update public.loyalty_settings set value = trim(p_value), updated_at = now() where key = p_key;
  return jsonb_build_object('ok', true, 'key', p_key, 'value', trim(p_value));
end $$;

create or replace function public.family_config() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object(
    'env', public.lf_setting('env'), 'test_mode', public.lf_setting('otp_test_mode') = 'true',
    'points_per_hkd', (public.lf_setting('points_per_hkd'))::numeric, 'receipt_max_age_hours', (public.lf_setting('receipt_max_age_hours'))::int,
    'receipts_per_day', (public.lf_setting('receipts_per_day'))::int, 'approve_over_hkd', (public.lf_setting('approve_over_hkd'))::numeric,
    'tier_gohan_hkd', (public.lf_setting('tier_gohan_hkd'))::int, 'tier_tobiko_hkd', (public.lf_setting('tier_tobiko_hkd'))::int, 'kama_eligible_hkd', (public.lf_setting('kama_eligible_hkd'))::int,
    'rolls_per_plate', (public.lf_setting('rolls_per_plate'))::int, 'hook_today', public.lf_hook(public.lf_hk_today()), 'hook_mon_stamps', (public.lf_setting('hook_mon_stamps'))::int, 'hook_tue_bonus_mult', (public.lf_setting('hook_tue_bonus_mult'))::numeric, 'hook_wed_gold_odds', (public.lf_setting('hook_wed_gold_odds'))::numeric, 'referral_bonus_points', (public.lf_setting('referral_bonus_points'))::int,
    'shops', (select jsonb_agg(jsonb_build_object('id', id, 'name_en', name_en, 'name_zh', name_zh) order by sort) from public.loyalty_shops where active))
$$;

create or replace function public.staff_today(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
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

revoke execute on function public.lf_phone_hash(text), public.lf_receipt_used(text), public.lf_hook(date), public.lf_reprice_share(bigint, numeric), public.lf_add_visit(text, text, int, date, bigint, text, boolean), public.lf_credit_receipt(bigint) from public, anon, authenticated;
grant execute on function public.staff_bonus_queue(uuid), public.staff_review_bonus(uuid, bigint, boolean), public.staff_split(uuid, text, numeric, jsonb, text), public.family_answer_split(uuid, bigint, boolean) to anon, authenticated;
