
-- v38 staff guest card (Dominic's call, Oct 14 2026 16:47 HKT): staff see full phone, birthday and spending background on the guest card;
-- every staff lookup / scan / card view is recorded in loyalty_staff_access_log (PDPO accountability), owner reads it via owner_access_log.
-- Additive: one new table, new functions, staff_member + staff_lookup replaced (lookup rows unchanged: masked phone; matching unchanged).
-- Staff actions still resolve by member_code only; consents, OCR text, split names, referrer stay off staff payloads.

create table if not exists public.loyalty_staff_access_log (
  id bigserial primary key,
  staff_id integer, staff_name text, staff_role text, shop_id text,
  member_code text not null, action text not null,      -- 'lookup' (typed number), 'scan' (QR / member code), 'view' (guest card opened)
  hits integer not null default 1,                      -- repeats by the same staff on the same guest within 2 min fold into one row
  first_at timestamptz not null default now(), last_at timestamptz not null default now()
);
create index if not exists loyalty_staff_access_log_last_idx on public.loyalty_staff_access_log (last_at desc);
create index if not exists loyalty_staff_access_log_member_idx on public.loyalty_staff_access_log (member_code, last_at desc);
alter table public.loyalty_staff_access_log enable row level security;
revoke all on table public.loyalty_staff_access_log from public, anon, authenticated;
revoke all on sequence public.loyalty_staff_access_log_id_seq from public, anon, authenticated;

create or replace function public.lf_log_access(p_staff public.loyalty_staff, p_token uuid, p_code text, p_action text)
 returns void language plpgsql security definer set search_path to 'public','extensions'
as $f$
declare rid bigint; shop text;
begin
  if p_code is null then return; end if;
  select l.id into rid from public.loyalty_staff_access_log l
   where l.staff_id is not distinct from p_staff.id and l.member_code = p_code and l.action = p_action and l.last_at > now() - interval '2 minutes'
   order by l.last_at desc limit 1;
  if rid is not null then
    update public.loyalty_staff_access_log set hits = hits + 1, last_at = now() where id = rid;
  else
    select se.shop_id into shop from public.loyalty_sessions se where se.token = p_token;
    insert into public.loyalty_staff_access_log (staff_id, staff_name, staff_role, shop_id, member_code, action)
    values (p_staff.id, p_staff.name, p_staff.role, coalesce(shop, p_staff.shop_id), p_code, p_action);
  end if;
end $f$;
revoke all on function public.lf_log_access(public.loyalty_staff, uuid, text, text) from public, anon, authenticated;

create or replace function public.lf_fmt_phone(p_phone text)
 returns text language sql immutable set search_path to 'public'
as $f$
  select case when p_phone ~ '^\+852[0-9]{8}$' then '+852 ' || substr(p_phone, 5, 4) || ' ' || substr(p_phone, 9, 4) else p_phone end
$f$;

-- the guest card: full phone, birthday (+ tag), spending background. Staff-only payload (no consents, OCR, split names, referrer).
create or replace function public.lf_member_staff_profile(p_phone text)
 returns jsonb language plpgsql stable security definer set search_path to 'public','extensions'
as $f$
declare m public.loyalty_members; today date := public.lf_hk_today(); bd date; d int; tag text; nv int; lastv date; t jsonb;
begin
  select * into m from public.loyalty_members where phone = p_phone;
  if m.phone is null then return null; end if;
  if m.birthday_md ~ '^[0-9]{2}-[0-9]{2}$' then
    begin
      bd := make_date(extract(year from today)::int, split_part(m.birthday_md, '-', 1)::int, split_part(m.birthday_md, '-', 2)::int);
    exception when others then
      bd := make_date(extract(year from today)::int, 3, 1);   -- 29 Feb in a non-leap year
    end;
    d := bd - today;
    if d < -180 then d := d + 365; elsif d > 180 then d := d - 365; end if;
    tag := case when d = 0 then 'today' when d between -3 and 7 then 'week'
                when split_part(m.birthday_md, '-', 1)::int = extract(month from today)::int then 'month' end;
  end if;
  select count(distinct v.visit_day), max(v.visit_day) into nv, lastv from public.loyalty_visits v where v.phone = p_phone and v.kind = 'visit';
  lastv := greatest(lastv, (m.last_visit_at at time zone 'Asia/Hong_Kong')::date);
  t := public.lf_taste(p_phone);
  return jsonb_build_object(
    'phone', public.lf_fmt_phone(m.phone),
    'birthday_md', m.birthday_md, 'birthday_tag', tag, 'birthday_in_days', d,
    'member_since', (m.created_at at time zone 'Asia/Hong_Kong')::date,
    'spend_lifetime', coalesce(m.lifetime_spend_hkd, 0),
    'spend_12m', public.lf_year_spend(p_phone),
    'visits', coalesce(nv, 0),
    'last_visit', lastv, 'days_since_visit', case when lastv is null then null else today - lastv end,
    'avg_per_visit', case when coalesce(nv, 0) > 0 and coalesce(m.lifetime_spend_hkd, 0) > 0 then round(m.lifetime_spend_hkd::numeric / nv) else (t->>'avg_receipt')::numeric end,
    'receipts', (select count(*) from public.loyalty_receipts r where r.phone = p_phone and r.status = 'approved'),
    'favourites', (select coalesce(jsonb_agg(jsonb_build_object('name_en', x->>'name_en', 'name_zh', x->>'name_zh', 'kind', x->>'kind', 'n', (x->>'n')::int)), '[]'::jsonb)
                   from jsonb_array_elements(coalesce(t->'top', '[]'::jsonb)) x));
end $f$;
revoke all on function public.lf_member_staff_profile(text) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.staff_member(p_token uuid, p_who text)
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token); m public.loyalty_members; q text;
begin
  q := upper(regexp_replace(coalesce(p_who,''), '[^0-9A-Za-z+]', '', 'g'));
  select * into m from public.loyalty_members where member_code = q;
  if m.phone is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  perform public.lf_log_access(s, p_token, m.member_code, 'view');
  return public.lf_member_staff_json(m.phone) || jsonb_build_object('profile', public.lf_member_staff_profile(m.phone));
end $function$
;

CREATE OR REPLACE FUNCTION public.staff_lookup(p_token uuid, p_query text)
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token); q text; rows jsonb; per_plate int := greatest(1, coalesce((public.lf_setting('rolls_per_plate'))::int, 5)); c record;
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
  for c in select x->>'member_code' mc from jsonb_array_elements(rows) x loop
    perform public.lf_log_access(s, p_token, c.mc, case when c.mc = q then 'scan' else 'lookup' end);
  end loop;
  return rows;
end $function$
;

-- owner: who looked at which guest, newest first
create or replace function public.owner_access_log(p_token uuid, p_limit integer default 50, p_member_code text default null)
 returns jsonb language plpgsql stable security definer set search_path to 'public','extensions'
as $f$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true);
begin
  return jsonb_build_object(
    'total_7d', (select coalesce(sum(hits), 0) from public.loyalty_staff_access_log where last_at > now() - interval '7 days'),
    'rows', (select coalesce(jsonb_agg(r order by r.last_at desc), '[]'::jsonb) from (
      select l.id, l.staff_id, l.staff_name, l.staff_role, l.shop_id, l.member_code, m.name member_name, coalesce(m.is_test, false) is_test,
             l.action, l.hits, l.first_at, l.last_at
        from public.loyalty_staff_access_log l left join public.loyalty_members m on m.member_code = l.member_code
       where p_member_code is null or l.member_code = upper(p_member_code)
       order by l.last_at desc limit least(greatest(coalesce(p_limit, 50), 1), 500)) r));
end $f$;
revoke all on function public.owner_access_log(uuid, integer, text) from public;
grant execute on function public.owner_access_log(uuid, integer, text) to anon, authenticated;
