
-- ===== f37c: points expiry rule (Dominic, Oct 17 2026: "Points expire on 31 Dec every year.") =====
-- Stored and shown only. NOTHING is expired or deleted by this migration; no balance changes.
-- Still to build (PROGRESS): a WhatsApp reminder on 1 Dec to members with a balance, and the expiry job at 00:00 HKT on 31 Dec.
insert into public.loyalty_settings (key, value) values ('points_expiry', 'annual_dec31') on conflict (key) do nothing;

-- the date the current balance expires under the rule (null when no rule is set)
create or replace function public.lf_points_expire_on(p_d date default null) returns date language sql stable security definer set search_path to 'public','extensions' as $$
  select case when public.lf_setting('points_expiry') = 'annual_dec31' then make_date(extract(year from coalesce(p_d, public.lf_hk_today()))::int, 12, 31) end $$;

-- public rules for the guest page (no member data)
create or replace function public.family_rules() returns jsonb language sql stable security definer set search_path to 'public','extensions' as $$
  select jsonb_build_object('points_expiry', public.lf_setting('points_expiry'), 'points_expire_on', public.lf_points_expire_on()) $$;
grant execute on function public.family_rules(), public.lf_points_expire_on(date) to anon, authenticated;
