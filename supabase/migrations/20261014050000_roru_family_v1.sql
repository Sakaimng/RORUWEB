-- Roru Family loyalty v1 (dark preview) — additive migration, 2026-10-14
-- Never drops or rewrites loyalty_members / orders. Adds columns + new tables + RPC functions.
-- All guest/staff/owner access goes through SECURITY DEFINER functions; tables stay RLS-on with no policies.

create extension if not exists pgcrypto;

-- ---------- settings ----------
create table if not exists public.loyalty_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
insert into public.loyalty_settings (key, value) values
  ('env', 'preview'),               -- preview | live
  ('otp_test_mode', 'true'),        -- true: fixed test code, no SMS sent
  ('otp_test_code', '246810'),
  ('rolls_per_plate', '5'),
  ('gold_roll_chance', '0.10'),     -- 10% of visits
  ('streak_visits', '3'),           -- visits in streak_days -> +1 bonus roll
  ('streak_days', '30'),
  ('otp_ttl_minutes', '10'),
  ('member_session_days', '180'),
  ('staff_session_hours', '14')
on conflict (key) do nothing;

-- ---------- shops ----------
create table if not exists public.loyalty_shops (
  id text primary key,
  name_en text not null,
  name_zh text not null,
  active boolean not null default true,
  sort int not null default 0
);
insert into public.loyalty_shops (id, name_en, name_zh, sort) values
  ('wanchai', 'Wan Chai', '灣仔', 1),
  ('central', 'Central', '中環', 2)
on conflict (id) do nothing;

-- ---------- members: additive columns only ----------
alter table public.loyalty_members
  add column if not exists member_code text,
  add column if not exists rolls_on_plate int not null default 0,
  add column if not exists plates_completed int not null default 0,
  add column if not exists gold_rolls int not null default 0,
  add column if not exists lang text not null default 'en',
  add column if not exists is_test boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists last_visit_at timestamptz;
create unique index if not exists loyalty_members_member_code_key on public.loyalty_members (member_code);

-- ---------- rewards (Dominic edits these; placeholders until he decides) ----------
create table if not exists public.loyalty_rewards (
  id serial primary key,
  code text unique not null,
  name_en text not null,
  name_zh text not null,
  detail_en text,
  detail_zh text,
  kind text not null default 'plate' check (kind in ('plate','gold','bonus')),
  weight int not null default 10,      -- relative chance when a plate fills (kind=plate)
  active boolean not null default true,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.loyalty_rewards (code, name_en, name_zh, detail_en, detail_zh, kind, weight, sort) values
  ('A', 'Reward A (TBC)', '獎賞 A（待定）', 'Placeholder — Dominic to decide', '佔位 — 待 Dominic 決定', 'plate', 70, 1),
  ('B', 'Reward B (TBC)', '獎賞 B（待定）', 'Placeholder — rarer reward', '佔位 — 較稀有獎賞', 'plate', 25, 2),
  ('C', 'Reward C (TBC)', '獎賞 C（待定）', 'Placeholder — rare reward', '佔位 — 稀有獎賞', 'plate', 5, 3),
  ('GOLD', 'Gold roll treat (TBC)', '金色手卷小禮（待定）', 'Placeholder — small treat on a gold roll day', '佔位 — 金色手卷當日小禮', 'gold', 0, 9)
on conflict (code) do nothing;

-- ---------- visits (1 roll = 1 row) ----------
create table if not exists public.loyalty_visits (
  id bigserial primary key,
  phone text not null references public.loyalty_members(phone) on delete cascade,
  shop_id text not null references public.loyalty_shops(id),
  staff_id int,
  kind text not null default 'visit' check (kind in ('visit','bonus')),
  visit_day date not null,
  gold boolean not null default false,
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);
-- one roll per phone per day, across all shops, enforced here
create unique index if not exists loyalty_visits_one_per_day on public.loyalty_visits (phone, visit_day) where kind = 'visit';
create index if not exists loyalty_visits_day_idx on public.loyalty_visits (visit_day, shop_id);

-- ---------- redemptions (a full plate earns one) ----------
create table if not exists public.loyalty_redemptions (
  id bigserial primary key,
  phone text not null references public.loyalty_members(phone) on delete cascade,
  reward_id int not null references public.loyalty_rewards(id),
  reward_code text not null unique,            -- short code shown as QR for staff
  status text not null default 'earned' check (status in ('earned','revealed','redeemed','void')),
  earned_at timestamptz not null default now(),
  revealed_at timestamptz,
  redeemed_at timestamptz,
  redeemed_shop text references public.loyalty_shops(id),
  redeemed_staff int,
  is_test boolean not null default false
);
create index if not exists loyalty_redemptions_phone_idx on public.loyalty_redemptions (phone, status);

-- ---------- staff (PINs hashed) ----------
create table if not exists public.loyalty_staff (
  id serial primary key,
  name text not null,
  role text not null default 'staff' check (role in ('staff','owner')),
  pin_hash text not null,
  shop_id text references public.loyalty_shops(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.loyalty_pin_attempts (
  id bigserial primary key,
  ok boolean not null,
  created_at timestamptz not null default now()
);

-- ---------- sessions + otp ----------
create table if not exists public.loyalty_sessions (
  token uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('member','staff')),
  phone text references public.loyalty_members(phone) on delete cascade,
  staff_id int references public.loyalty_staff(id) on delete cascade,
  shop_id text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.loyalty_otp (
  id bigserial primary key,
  phone text not null,
  code_hash text not null,
  attempts int not null default 0,
  used boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists loyalty_otp_phone_idx on public.loyalty_otp (phone, created_at desc);

-- RLS on everything, no policies: nothing is readable with the public key except through the functions below
alter table public.loyalty_settings enable row level security;
alter table public.loyalty_shops enable row level security;
alter table public.loyalty_rewards enable row level security;
alter table public.loyalty_visits enable row level security;
alter table public.loyalty_redemptions enable row level security;
alter table public.loyalty_staff enable row level security;
alter table public.loyalty_pin_attempts enable row level security;
alter table public.loyalty_sessions enable row level security;
alter table public.loyalty_otp enable row level security;
revoke all on public.loyalty_settings, public.loyalty_shops, public.loyalty_rewards, public.loyalty_visits,
  public.loyalty_redemptions, public.loyalty_staff, public.loyalty_pin_attempts, public.loyalty_sessions, public.loyalty_otp
  from anon, authenticated;

-- ======================= helpers (internal) =======================
create or replace function public.lf_setting(p_key text) returns text
language sql stable security definer set search_path = public, extensions as $$
  select value from public.loyalty_settings where key = p_key
$$;

create or replace function public.lf_hk_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Hong_Kong')::date $$;

create or replace function public.lf_norm_phone(p text) returns text
language plpgsql immutable as $$
declare d text;
begin
  d := regexp_replace(coalesce(p,''), '[^0-9+]', '', 'g');
  if d like '+%' then d := '+' || regexp_replace(d, '[^0-9]', '', 'g'); end if;
  if d ~ '^[0-9]{8}$' then return '+852' || d; end if;        -- HK local
  if d ~ '^852[0-9]{8}$' then return '+' || d; end if;
  if d ~ '^\+852[0-9]{8}$' then return d; end if;
  if d ~ '^\+[0-9]{8,15}$' then return d; end if;             -- other countries, E.164
  raise exception 'bad_phone' using errcode = 'P0001';
end $$;

create or replace function public.lf_mask_phone(p text) returns text
language sql immutable as $$ select regexp_replace(p, '^(\+\d{3})\d+(\d{4})$', '\1 •••• \2') $$;

create or replace function public.lf_new_member_code() returns text
language plpgsql volatile as $$
declare c text; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  loop
    c := '';
    for i in 1..8 loop c := c || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.loyalty_members where member_code = c);
  end loop;
  return c;
end $$;

create or replace function public.lf_tier(p_plates int) returns text
language sql immutable as $$
  select case when p_plates >= 5 then 'tobiko' when p_plates >= 2 then 'gohan' else 'nori' end
$$;

create or replace function public.lf_member_json(p_phone text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare m record; v30 int; last_bonus timestamptz; rewards jsonb; visits jsonb; today date := public.lf_hk_today();
begin
  select * into m from public.loyalty_members where phone = p_phone;
  if not found then return null; end if;
  select count(*) into v30 from public.loyalty_visits where phone = p_phone and kind = 'visit' and visit_day > today - (public.lf_setting('streak_days'))::int;
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'status', r.status, 'code', r.reward_code,
           'name_en', w.name_en, 'name_zh', w.name_zh, 'detail_en', w.detail_en, 'detail_zh', w.detail_zh, 'kind', w.kind,
           'earned_at', r.earned_at, 'redeemed_at', r.redeemed_at) order by r.earned_at desc), '[]'::jsonb)
    into rewards
    from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id
    where r.phone = p_phone and r.status <> 'void';
  select coalesce(jsonb_agg(jsonb_build_object('day', v.visit_day, 'shop', s.name_en, 'shop_zh', s.name_zh, 'gold', v.gold, 'kind', v.kind) order by v.created_at desc), '[]'::jsonb)
    into visits
    from (select * from public.loyalty_visits where phone = p_phone order by created_at desc limit 12) v
    join public.loyalty_shops s on s.id = v.shop_id;
  return jsonb_build_object(
    'phone_masked', public.lf_mask_phone(m.phone),
    'name', m.name, 'lang', m.lang, 'tier', coalesce(m.tier,'nori'),
    'member_code', m.member_code,
    'rolls', m.rolls_on_plate, 'rolls_per_plate', (public.lf_setting('rolls_per_plate'))::int,
    'plates', m.plates_completed, 'gold_rolls', m.gold_rolls,
    'visits_30d', v30, 'streak_target', (public.lf_setting('streak_visits'))::int,
    'visited_today', exists(select 1 from public.loyalty_visits where phone = p_phone and kind='visit' and visit_day = today),
    'gold_today', exists(select 1 from public.loyalty_visits where phone = p_phone and visit_day = today and gold),
    'last_visit_at', m.last_visit_at, 'member_since', m.created_at,
    'rewards', rewards, 'visits', visits
  );
end $$;

create or replace function public.lf_member_session(p_token uuid) returns text
language plpgsql stable security definer set search_path = public, extensions as $$
declare ph text;
begin
  select phone into ph from public.loyalty_sessions where token = p_token and kind = 'member' and expires_at > now();
  if ph is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  return ph;
end $$;

create or replace function public.lf_staff_session(p_token uuid, p_need_owner boolean default false) returns public.loyalty_staff
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff;
begin
  select st.* into s from public.loyalty_sessions se join public.loyalty_staff st on st.id = se.staff_id
   where se.token = p_token and se.kind = 'staff' and se.expires_at > now() and st.active;
  if s.id is null then raise exception 'staff_not_signed_in' using errcode = 'P0001'; end if;
  if p_need_owner and s.role <> 'owner' then raise exception 'owner_only' using errcode = 'P0001'; end if;
  return s;
end $$;

-- ======================= GUEST API (anon) =======================
create or replace function public.family_request_code(p_phone text, p_lang text default 'en') returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text; code text; test boolean; n int; ttl int := coalesce((public.lf_setting('otp_ttl_minutes'))::int, 10);
begin
  ph := public.lf_norm_phone(p_phone);
  select count(*) into n from public.loyalty_otp where phone = ph and created_at > now() - interval '1 hour';
  if n >= 5 then raise exception 'too_many_codes' using errcode = 'P0001'; end if;
  test := public.lf_setting('otp_test_mode') = 'true';
  if test then code := public.lf_setting('otp_test_code'); else code := lpad((floor(random()*1000000))::int::text, 6, '0'); end if;
  insert into public.loyalty_otp (phone, code_hash, expires_at) values (ph, crypt(code, gen_salt('bf', 6)), now() + make_interval(mins => ttl));
  -- LIVE MODE: an SMS sender (Edge Function / webhook) has to deliver `code` to `ph` here. Not wired in preview: no SMS is sent.
  return jsonb_build_object('ok', true, 'phone_masked', public.lf_mask_phone(ph), 'test_mode', test, 'expires_in_minutes', ttl,
                            'hint', case when test then 'preview: use the test code' else null end);
end $$;

create or replace function public.family_verify_code(p_phone text, p_code text, p_consent boolean default false, p_name text default null, p_lang text default 'en') returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text; o record; tok uuid; is_new boolean := false; test boolean;
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
    test := public.lf_setting('env') <> 'live';
    insert into public.loyalty_members (phone, name, consent_at, points, tier, lifetime_spend_hkd, shari_balance, member_code, lang, is_test)
      values (ph, nullif(trim(coalesce(p_name,'')),''), now(), 0, 'nori', 0, 0, public.lf_new_member_code(), coalesce(p_lang,'en'), test);
    is_new := true;
  else
    update public.loyalty_members set lang = coalesce(p_lang, lang),
      name = coalesce(nullif(trim(coalesce(p_name,'')),''), name),
      member_code = coalesce(member_code, public.lf_new_member_code())
      where phone = ph;
  end if;
  insert into public.loyalty_sessions (kind, phone, expires_at)
    values ('member', ph, now() + make_interval(days => coalesce((public.lf_setting('member_session_days'))::int, 180)))
    returning token into tok;
  return jsonb_build_object('ok', true, 'token', tok, 'is_new', is_new, 'member', public.lf_member_json(ph));
end $$;

create or replace function public.family_me(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  return public.lf_member_json(public.lf_member_session(p_token));
end $$;

create or replace function public.family_update(p_token uuid, p_name text default null, p_lang text default null) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token);
begin
  update public.loyalty_members set name = coalesce(nullif(trim(coalesce(p_name,'')),''), name), lang = coalesce(p_lang, lang) where phone = ph;
  return public.lf_member_json(ph);
end $$;

-- scratch the nori: earned -> revealed
create or replace function public.family_reveal(p_token uuid, p_redemption_id bigint) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token);
begin
  update public.loyalty_redemptions set status = 'revealed', revealed_at = now()
    where id = p_redemption_id and phone = ph and status = 'earned';
  return public.lf_member_json(ph);
end $$;

create or replace function public.family_signout(p_token uuid) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  delete from public.loyalty_sessions where token = p_token and kind = 'member';
  return jsonb_build_object('ok', true);
end $$;

-- PDPO: a member can delete everything we hold about them
create or replace function public.family_delete_me(p_token uuid) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token);
begin
  delete from public.loyalty_members where phone = ph;   -- visits/redemptions/sessions cascade
  delete from public.loyalty_otp where phone = ph;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.family_config() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object(
    'env', public.lf_setting('env'), 'test_mode', public.lf_setting('otp_test_mode') = 'true',
    'rolls_per_plate', (public.lf_setting('rolls_per_plate'))::int,
    'streak_visits', (public.lf_setting('streak_visits'))::int, 'streak_days', (public.lf_setting('streak_days'))::int,
    'shops', (select jsonb_agg(jsonb_build_object('id', id, 'name_en', name_en, 'name_zh', name_zh) order by sort) from public.loyalty_shops where active))
$$;

-- ======================= STAFF API =======================
create or replace function public.staff_login(p_pin text, p_shop text default 'wanchai') returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare s record; fails int; tok uuid;
begin
  select count(*) into fails from public.loyalty_pin_attempts where not ok and created_at > now() - interval '15 minutes';
  if fails >= 10 then raise exception 'locked_try_later' using errcode = 'P0001'; end if;
  select * into s from public.loyalty_staff where active and pin_hash = crypt(coalesce(p_pin,''), pin_hash) limit 1;
  if s.id is null then
    insert into public.loyalty_pin_attempts (ok) values (false);
    raise exception 'wrong_pin' using errcode = 'P0001';
  end if;
  insert into public.loyalty_pin_attempts (ok) values (true);
  if not exists (select 1 from public.loyalty_shops where id = p_shop and active) then p_shop := coalesce(s.shop_id, 'wanchai'); end if;
  insert into public.loyalty_sessions (kind, staff_id, shop_id, expires_at)
    values ('staff', s.id, p_shop, now() + make_interval(hours => coalesce((public.lf_setting('staff_session_hours'))::int, 14)))
    returning token into tok;
  return jsonb_build_object('ok', true, 'token', tok, 'staff', jsonb_build_object('id', s.id, 'name', s.name, 'role', s.role, 'shop', p_shop));
end $$;

create or replace function public.staff_lookup(p_token uuid, p_query text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); q text; rows jsonb;
begin
  q := upper(regexp_replace(coalesce(p_query,''), '[^0-9A-Za-z+]', '', 'g'));
  if q = '' then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object('phone_masked', public.lf_mask_phone(m.phone), 'phone', m.phone, 'name', m.name,
      'member_code', m.member_code, 'rolls', m.rolls_on_plate, 'plates', m.plates_completed, 'tier', m.tier,
      'visited_today', exists(select 1 from public.loyalty_visits v where v.phone = m.phone and v.kind='visit' and v.visit_day = public.lf_hk_today()),
      'pending_rewards', (select count(*) from public.loyalty_redemptions r where r.phone = m.phone and r.status in ('earned','revealed'))
    ) order by m.last_visit_at desc nulls last), '[]'::jsonb) into rows
  from (select * from public.loyalty_members m
        where m.member_code = q
           or regexp_replace(m.phone, '[^0-9]', '', 'g') like '%' || regexp_replace(q, '[^0-9]', '', 'g')
        limit 8) m
  where length(regexp_replace(q, '[^0-9]', '', 'g')) >= 4 or m.member_code = q;
  return rows;
end $$;

-- +1 roll. p_who = member code (from QR) or phone (8 digits / +852…)
create or replace function public.staff_add_roll(p_token uuid, p_who text, p_shop text default null) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token);
        m public.loyalty_members; shop text; today date := public.lf_hk_today();
        per_plate int := coalesce((public.lf_setting('rolls_per_plate'))::int, 5);
        gold boolean := false; bonus boolean := false; plate_full boolean := false;
        v30 int; test boolean := public.lf_setting('env') <> 'live';
        rw public.loyalty_rewards; rd_code text; reward jsonb := null; q text;
begin
  q := upper(regexp_replace(coalesce(p_who,''), '[^0-9A-Za-z+]', '', 'g'));
  select * into m from public.loyalty_members where member_code = q;
  if m.phone is null then
    begin select * into m from public.loyalty_members where phone = public.lf_norm_phone(q); exception when others then null; end;
  end if;
  if m.phone is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  select coalesce(p_shop, se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  if exists (select 1 from public.loyalty_visits where phone = m.phone and kind = 'visit' and visit_day = today) then
    raise exception 'already_today' using errcode = 'P0001';
  end if;
  gold := random() < coalesce((public.lf_setting('gold_roll_chance'))::numeric, 0.1);
  insert into public.loyalty_visits (phone, shop_id, staff_id, kind, visit_day, gold, is_test) values (m.phone, shop, s.id, 'visit', today, gold, test);
  update public.loyalty_members set rolls_on_plate = rolls_on_plate + 1, last_visit_at = now(), gold_rolls = gold_rolls + (case when gold then 1 else 0 end)
    where phone = m.phone;
  -- streak bonus: the Nth visit in the window gives one extra roll (once per window)
  select count(*) into v30 from public.loyalty_visits where phone = m.phone and kind = 'visit' and visit_day > today - coalesce((public.lf_setting('streak_days'))::int, 30);
  if v30 = coalesce((public.lf_setting('streak_visits'))::int, 3)
     and not exists (select 1 from public.loyalty_visits where phone = m.phone and kind = 'bonus' and visit_day > today - coalesce((public.lf_setting('streak_days'))::int, 30)) then
    bonus := true;
    insert into public.loyalty_visits (phone, shop_id, staff_id, kind, visit_day, is_test) values (m.phone, shop, s.id, 'bonus', today, test);
    update public.loyalty_members set rolls_on_plate = rolls_on_plate + 1 where phone = m.phone;
  end if;
  -- plate full? (a bonus can tip it over too; loop in case of two completions)
  select * into m from public.loyalty_members where phone = m.phone;
  while m.rolls_on_plate >= per_plate loop
    plate_full := true;
    -- weighted random reward among active plate rewards
    select r.* into rw from public.loyalty_rewards r where r.active and r.kind = 'plate' and r.weight > 0
      order by -ln(random()) / r.weight limit 1;
    if rw.id is null then raise exception 'no_active_rewards' using errcode = 'P0001'; end if;
    rd_code := 'R' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 7));
    insert into public.loyalty_redemptions (phone, reward_id, reward_code, is_test) values (m.phone, rw.id, rd_code, test);
    update public.loyalty_members set rolls_on_plate = rolls_on_plate - per_plate, plates_completed = plates_completed + 1,
      tier = case when tier = 'kama' then 'kama' else public.lf_tier(plates_completed + 1) end
      where phone = m.phone;
    select * into m from public.loyalty_members where phone = m.phone;
    reward := jsonb_build_object('code', rd_code, 'name_en', rw.name_en, 'name_zh', rw.name_zh);
  end loop;
  return jsonb_build_object('ok', true, 'added', true, 'gold', gold, 'bonus', bonus, 'plate_full', plate_full, 'reward', reward,
                            'member', public.lf_member_json(m.phone));
end $$;

create or replace function public.staff_redeem(p_token uuid, p_reward_code text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
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
                            'member', public.lf_member_json(r.phone));
end $$;

-- pending rewards for a member (staff view, by code or phone)
create or replace function public.staff_member(p_token uuid, p_who text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); m public.loyalty_members; q text;
begin
  q := upper(regexp_replace(coalesce(p_who,''), '[^0-9A-Za-z+]', '', 'g'));
  select * into m from public.loyalty_members where member_code = q;
  if m.phone is null then
    begin select * into m from public.loyalty_members where phone = public.lf_norm_phone(q); exception when others then null; end;
  end if;
  if m.phone is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  return public.lf_member_json(m.phone);
end $$;

create or replace function public.staff_today(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); shop text; today date := public.lf_hk_today();
begin
  select coalesce(se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  return jsonb_build_object('shop', shop, 'day', today,
    'rolls', (select count(*) from public.loyalty_visits where shop_id = shop and visit_day = today and kind = 'visit'),
    'redeemed', (select count(*) from public.loyalty_redemptions where redeemed_shop = shop and (redeemed_at at time zone 'Asia/Hong_Kong')::date = today),
    'log', (select coalesce(jsonb_agg(x order by x->>'at' desc), '[]'::jsonb) from (
        select jsonb_build_object('at', v.created_at, 'type', case when v.kind='bonus' then 'bonus' when v.gold then 'gold' else 'roll' end,
               'who', coalesce(m.name, public.lf_mask_phone(m.phone)), 'by', st.name) x
          from public.loyalty_visits v join public.loyalty_members m on m.phone = v.phone left join public.loyalty_staff st on st.id = v.staff_id
          where v.shop_id = shop and v.visit_day = today
        union all
        select jsonb_build_object('at', r.redeemed_at, 'type', 'redeem', 'who', coalesce(m.name, public.lf_mask_phone(m.phone)), 'by', st.name, 'reward', w.name_en) x
          from public.loyalty_redemptions r join public.loyalty_members m on m.phone = r.phone join public.loyalty_rewards w on w.id = r.reward_id left join public.loyalty_staff st on st.id = r.redeemed_staff
          where r.redeemed_shop = shop and (r.redeemed_at at time zone 'Asia/Hong_Kong')::date = today
      ) t));
end $$;

-- ======================= OWNER API =======================
create or replace function public.owner_stats(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true); today date := public.lf_hk_today();
begin
  return jsonb_build_object(
    'day', today,
    'members', (select count(*) from public.loyalty_members),
    'members_7d', (select count(*) from public.loyalty_members where created_at > now() - interval '7 days'),
    'rolls_today', (select count(*) from public.loyalty_visits where visit_day = today and kind='visit'),
    'rolls_7d', (select count(*) from public.loyalty_visits where visit_day > today - 7 and kind='visit'),
    'rolls_all', (select count(*) from public.loyalty_visits where kind='visit'),
    'gold_all', (select count(*) from public.loyalty_visits where gold),
    'plates_all', (select coalesce(sum(plates_completed),0) from public.loyalty_members),
    'rewards_earned', (select count(*) from public.loyalty_redemptions where status in ('earned','revealed')),
    'rewards_redeemed', (select count(*) from public.loyalty_redemptions where status = 'redeemed'),
    'per_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'shop', shop_id, 'rolls', c) order by d desc, shop_id), '[]'::jsonb)
                from (select visit_day d, shop_id, count(*) c from public.loyalty_visits where kind='visit' and visit_day > today - 30 group by 1,2) t),
    'per_shop', (select coalesce(jsonb_agg(jsonb_build_object('shop', sh.name_en, 'shop_zh', sh.name_zh, 'rolls', (select count(*) from public.loyalty_visits v where v.shop_id = sh.id and v.kind='visit'),
                 'redeemed', (select count(*) from public.loyalty_redemptions r where r.redeemed_shop = sh.id)) order by sh.sort), '[]'::jsonb) from public.loyalty_shops sh),
    'top', (select coalesce(jsonb_agg(jsonb_build_object('name', m.name, 'phone_masked', public.lf_mask_phone(m.phone), 'visits', c, 'plates', m.plates_completed, 'tier', m.tier, 'last', m.last_visit_at) order by c desc), '[]'::jsonb)
            from (select phone, count(*) c from public.loyalty_visits where kind='visit' group by phone order by c desc limit 10) v join public.loyalty_members m on m.phone = v.phone),
    'tiers', (select coalesce(jsonb_object_agg(tier, c), '{}'::jsonb) from (select coalesce(tier,'nori') tier, count(*) c from public.loyalty_members group by 1) t),
    'rewards', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'code', code, 'name_en', name_en, 'name_zh', name_zh, 'detail_en', detail_en, 'detail_zh', detail_zh, 'kind', kind, 'weight', weight, 'active', active) order by sort, id), '[]'::jsonb) from public.loyalty_rewards),
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
      select phone, name, lang, tier, rolls_on_plate, plates_completed, gold_rolls, is_test, consent_at, created_at, last_visit_at,
             (select count(*) from public.loyalty_visits v where v.phone = m.phone and v.kind='visit') visits
      from public.loyalty_members m) t);
  elsif p_kind = 'visits' then
    return (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) from (
      select v.id, v.created_at, v.visit_day, v.shop_id, v.kind, v.gold, v.is_test, v.phone, m.name, st.name staff
      from public.loyalty_visits v join public.loyalty_members m on m.phone = v.phone left join public.loyalty_staff st on st.id = v.staff_id) t);
  elsif p_kind = 'rewards' then
    return (select coalesce(jsonb_agg(to_jsonb(t) order by t.earned_at), '[]'::jsonb) from (
      select r.id, r.reward_code, w.code reward, w.name_en, r.status, r.earned_at, r.revealed_at, r.redeemed_at, r.redeemed_shop, r.is_test, r.phone, m.name
      from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id join public.loyalty_members m on m.phone = r.phone) t);
  end if;
  raise exception 'bad_kind' using errcode = 'P0001';
end $$;

create or replace function public.owner_save_reward(p_token uuid, p_id int, p_name_en text, p_name_zh text, p_detail_en text, p_detail_zh text, p_weight int, p_active boolean) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true);
begin
  update public.loyalty_rewards set name_en = coalesce(nullif(trim(p_name_en),''), name_en), name_zh = coalesce(nullif(trim(p_name_zh),''), name_zh),
    detail_en = p_detail_en, detail_zh = p_detail_zh, weight = greatest(0, coalesce(p_weight, weight)), active = coalesce(p_active, active), updated_at = now()
    where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.owner_set_staff(p_token uuid, p_id int, p_name text, p_pin text, p_role text, p_shop text, p_active boolean) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true); nid int;
begin
  if p_pin is not null and p_pin !~ '^[0-9]{4,8}$' then raise exception 'pin_4_to_8_digits' using errcode = 'P0001'; end if;
  if p_id is null then
    if p_pin is null then raise exception 'pin_required' using errcode = 'P0001'; end if;
    insert into public.loyalty_staff (name, role, pin_hash, shop_id) values (coalesce(nullif(trim(p_name),''),'Staff'), coalesce(p_role,'staff'), crypt(p_pin, gen_salt('bf', 8)), p_shop) returning id into nid;
  else
    update public.loyalty_staff set name = coalesce(nullif(trim(p_name),''), name), role = coalesce(p_role, role),
      pin_hash = case when p_pin is null then pin_hash else crypt(p_pin, gen_salt('bf', 8)) end,
      shop_id = coalesce(p_shop, shop_id), active = coalesce(p_active, active) where id = p_id;
    nid := p_id;
  end if;
  return jsonb_build_object('ok', true, 'id', nid);
end $$;

-- ======================= grants =======================
revoke execute on function public.lf_setting(text), public.lf_member_json(text), public.lf_member_session(uuid), public.lf_staff_session(uuid, boolean),
  public.lf_new_member_code(), public.lf_norm_phone(text), public.lf_mask_phone(text), public.lf_tier(int), public.lf_hk_today() from public, anon, authenticated;
grant execute on function
  public.family_request_code(text, text), public.family_verify_code(text, text, boolean, text, text), public.family_me(uuid), public.family_update(uuid, text, text),
  public.family_reveal(uuid, bigint), public.family_signout(uuid), public.family_delete_me(uuid), public.family_config(),
  public.staff_login(text, text), public.staff_lookup(uuid, text), public.staff_add_roll(uuid, text, text), public.staff_redeem(uuid, text), public.staff_member(uuid, text), public.staff_today(uuid),
  public.owner_stats(uuid), public.owner_export(uuid, text), public.owner_save_reward(uuid, int, text, text, text, text, int, boolean), public.owner_set_staff(uuid, int, text, text, text, text, boolean)
  to anon, authenticated;
