
-- ===== f37b: the passport (food + drinks) runs by calendar quarter (Dominic via Tab, Oct 17 2026 ~17:58 HKT) =====
-- Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec. No carry-over: stamps reset when the quarter ends (stamps are per season row, as before).
-- The current season becomes "Q4 2026", 1 Oct - 31 Dec 2026 (was "Season 1", 15 Oct 2026 - 15 Jan 2027).
-- Each later quarter is created by itself the first time anything touches the passport in that quarter (a guest / staff / owner page opening,
-- or a receipt being saved), copying the latest quarter's prizes, dishes, bottles and rewards, so the owner's edits carry forward.
-- Additive: 1 row updated (season 1 name + dates), 3 new functions, 1 new BEFORE trigger. Nothing dropped, no stamp or member data touched.

update public.loyalty_passport_seasons set name_en = 'Q4 2026', name_zh = '2026年第四季', starts_on = date '2026-10-01', ends_on = date '2026-12-31', updated_at = now() where id = 1;
alter table public.loyalty_passport_seasons alter column name_en set default 'Q4 2026';
alter table public.loyalty_passport_seasons alter column name_zh set default '2026年第四季';

create or replace function public.lf_passport_quarter_ensure() returns int language plpgsql security definer set search_path to 'public','extensions' as $$
declare d date := public.lf_hk_today(); qs date; qe date; q int; y int; src public.loyalty_passport_seasons; nid int;
begin
  if exists (select 1 from public.loyalty_passport_seasons where active and d between starts_on and ends_on) then return 0; end if;
  perform pg_advisory_xact_lock(hashtext('lf_passport_quarter_ensure'));
  if exists (select 1 from public.loyalty_passport_seasons where active and d between starts_on and ends_on) then return 0; end if;
  qs := date_trunc('quarter', d)::date; qe := (date_trunc('quarter', d) + interval '3 months')::date - 1;
  q := extract(quarter from d)::int; y := extract(year from d)::int;
  select * into src from public.loyalty_passport_seasons where active and ends_on < d order by ends_on desc, id desc limit 1;   -- the quarter that just ended
  if src.id is null then return 0; end if;
  insert into public.loyalty_passport_seasons (name_en, name_zh, starts_on, ends_on, tiers, max_per_bill, active)
    values ('Q' || q || ' ' || y, y || '年第' || (array['一','二','三','四'])[q] || '季', greatest(qs, src.ends_on + 1), qe, src.tiers, src.max_per_bill, true) returning id into nid;
  insert into public.loyalty_passport_items (season_id, item_id, sort, grp, short_en, short_zh)
    select nid, item_id, sort, grp, short_en, short_zh from public.loyalty_passport_items where season_id = src.id;
  insert into public.loyalty_drink_bottles (season_id, item_id, sort, cat, short_en, short_zh, price_hkd, cost_hkd, min_line_hkd, glass_too, note_en, active)
    select nid, item_id, sort, cat, short_en, short_zh, price_hkd, cost_hkd, min_line_hkd, glass_too, note_en, active from public.loyalty_drink_bottles where season_id = src.id;
  insert into public.loyalty_drink_rewards (season_id, at_count, name_en, name_zh, line_en, line_zh, cost_hkd, cost_note, name_zhs, line_zhs, active)
    select nid, at_count, name_en, name_zh, line_en, line_zh, cost_hkd, cost_note, name_zhs, line_zhs, true from public.loyalty_drink_rewards where season_id = src.id and active;
  return nid;
end $$;
revoke execute on function public.lf_passport_quarter_ensure() from public, anon, authenticated;

-- called by the guest, staff and owner pages as they open (idempotent, does nothing while a season covers today)
create or replace function public.passport_quarter_tick() returns jsonb language plpgsql security definer set search_path to 'public','extensions' as $$
declare n int := public.lf_passport_quarter_ensure(); se public.loyalty_passport_seasons := public.lf_passport_season();
begin
  return jsonb_build_object('created', n, 'season', se.name_en, 'starts_on', se.starts_on, 'ends_on', se.ends_on);
end $$;
grant execute on function public.passport_quarter_tick() to anon, authenticated;

create or replace function public.lf_passport_quarter_trg() returns trigger language plpgsql security definer set search_path to 'public','extensions' as $$
begin
  perform public.lf_passport_quarter_ensure();
  return new;
end $$;
revoke execute on function public.lf_passport_quarter_trg() from public, anon, authenticated;
do $t$ begin
  if not exists (select 1 from pg_trigger where tgname = 'loyalty_receipts_aquarter_trg' and tgrelid = 'public.loyalty_receipts'::regclass) then
    create trigger loyalty_receipts_aquarter_trg before insert or update of status on public.loyalty_receipts for each row execute function public.lf_passport_quarter_trg();
  end if;
end $t$;
