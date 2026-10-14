-- Roru Family: consent records (Dominic 14:26: privacy compliance first — HK PDPO incl. direct-marketing rules). Additive.
alter table public.loyalty_members add column if not exists terms_version text;
alter table public.loyalty_members add column if not exists terms_at timestamptz;
alter table public.loyalty_members add column if not exists mkt_whatsapp boolean not null default false;
alter table public.loyalty_members add column if not exists mkt_whatsapp_at timestamptz;
alter table public.loyalty_members add column if not exists mkt_push boolean not null default false;
alter table public.loyalty_members add column if not exists mkt_push_at timestamptz;

-- append-only log: every grant / withdrawal with the exact wording shown and its version
create table if not exists public.loyalty_consents (
  id bigserial primary key,
  phone text not null references public.loyalty_members(phone) on delete cascade,
  kind text not null check (kind in ('terms','marketing_whatsapp','marketing_push')),
  granted boolean not null,
  wording_version text not null,
  wording text,
  source text not null default 'guest',          -- guest | unsubscribe | staff
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists loyalty_consents_phone_idx on public.loyalty_consents (phone, kind, created_at desc);
alter table public.loyalty_consents enable row level security;
revoke all on public.loyalty_consents from anon, authenticated;
insert into public.loyalty_settings (key, value) values ('terms_version', 'v0-draft-2026-10-14') on conflict (key) do nothing;

-- guest records consents. Terms must be accepted (true); marketing ones are each optional and independent. Only changes are logged.
create or replace function public.family_set_consents(p_token uuid, p_terms boolean default null, p_whatsapp boolean default null, p_push boolean default null,
                                                      p_version text default null, p_wording jsonb default '{}'::jsonb, p_source text default 'guest') returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ph text := public.lf_member_session(p_token); m public.loyalty_members; v text := coalesce(nullif(trim(p_version),''), public.lf_setting('terms_version')); test boolean := public.lf_setting('env') <> 'live';
        src text := case when p_source in ('guest','unsubscribe') then p_source else 'guest' end;
begin
  select * into m from public.loyalty_members where phone = ph for update;
  if p_terms is not null then
    if not p_terms then raise exception 'terms_required' using errcode = 'P0001'; end if;
    if m.terms_version is distinct from v then
      update public.loyalty_members set terms_version = v, terms_at = now(), consent_at = coalesce(consent_at, now()) where phone = ph;
      insert into public.loyalty_consents (phone, kind, granted, wording_version, wording, source, is_test) values (ph, 'terms', true, v, left(p_wording->>'terms', 1000), src, test);
    end if;
  end if;
  if p_whatsapp is not null and p_whatsapp is distinct from m.mkt_whatsapp then
    update public.loyalty_members set mkt_whatsapp = p_whatsapp, mkt_whatsapp_at = now() where phone = ph;
    insert into public.loyalty_consents (phone, kind, granted, wording_version, wording, source, is_test) values (ph, 'marketing_whatsapp', p_whatsapp, v, left(p_wording->>'whatsapp', 1000), src, test);
  end if;
  if p_push is not null and p_push is distinct from m.mkt_push then
    update public.loyalty_members set mkt_push = p_push, mkt_push_at = now() where phone = ph;
    insert into public.loyalty_consents (phone, kind, granted, wording_version, wording, source, is_test) values (ph, 'marketing_push', p_push, v, left(p_wording->>'push', 1000), src, test);
  end if;
  return jsonb_build_object('ok', true, 'member', public.lf_member_json(ph));
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
    'consents', jsonb_build_object('terms_version', m.terms_version, 'terms_at', m.terms_at, 'whatsapp', m.mkt_whatsapp, 'whatsapp_at', m.mkt_whatsapp_at, 'push', m.mkt_push, 'push_at', m.mkt_push_at,
             'current_version', public.lf_setting('terms_version')),
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

create or replace function public.owner_export(p_token uuid, p_kind text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true);
begin
  if p_kind = 'members' then
    return (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) from (
      select phone, name, lang, tier, shari_balance points_balance, points points_lifetime, lifetime_spend_hkd, is_test, consent_at, created_at, last_visit_at,
             (select count(*) from public.loyalty_receipts r where r.phone = m.phone and r.status='approved') receipts, (select count(*) from public.loyalty_visits v where v.phone = m.phone and v.kind='visit') visits, rolls_on_plate stamps_on_plate, plates_completed, public.lf_year_spend(m.phone) spend_12m, public.lf_status(m.phone) status from public.loyalty_members m) t);
  elsif p_kind = 'receipts' then
    return (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) from (
      select r.id, r.created_at, r.receipt_at, r.shop_id, r.receipt_no, r.total_hkd, r.points, r.status, r.source, r.ocr_confidence, r.reason, r.is_test, r.phone, m.name, st.name reviewed_by
      from public.loyalty_receipts r join public.loyalty_members m on m.phone = r.phone left join public.loyalty_staff st on st.id = r.reviewed_by) t);
  elsif p_kind = 'rewards' then
    return (select coalesce(jsonb_agg(to_jsonb(t) order by t.earned_at), '[]'::jsonb) from (
      select r.id, r.reward_code, w.code reward, w.name_en, r.points_spent, r.upgraded, r.status, r.earned_at, r.revealed_at, r.redeemed_at, r.redeemed_shop, r.is_test, r.phone, m.name
      from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id join public.loyalty_members m on m.phone = r.phone) t);
  elsif p_kind = 'consents' then
    return (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) from (
      select c.id, c.created_at, c.phone, m.name, c.kind, c.granted, c.wording_version, c.source, c.wording, c.is_test
      from public.loyalty_consents c join public.loyalty_members m on m.phone = c.phone) t);
  elsif p_kind = 'marketing_optins' then
    return (select coalesce(jsonb_agg(to_jsonb(t) order by t.name), '[]'::jsonb) from (
      select phone, name, lang, mkt_whatsapp, mkt_whatsapp_at, mkt_push, mkt_push_at, is_test from public.loyalty_members where mkt_whatsapp or mkt_push) t);
  elsif p_kind = 'visits' then
    return (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) from (
      select v.id, v.created_at, v.visit_day, v.shop_id, v.source, v.receipt_id, v.gold, v.is_test, v.phone, m.name, st.name staff
      from public.loyalty_visits v join public.loyalty_members m on m.phone = v.phone left join public.loyalty_staff st on st.id = v.staff_id where v.kind = 'visit') t);
  end if;
  raise exception 'bad_kind' using errcode = 'P0001';
end $$;
grant execute on function public.family_set_consents(uuid, boolean, boolean, boolean, text, jsonb, text) to anon, authenticated;
