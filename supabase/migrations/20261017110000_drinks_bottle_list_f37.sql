
-- ===== f37: the bottle list follows the rorubaru.com drinks menu (Dominic, Oct 17 2026 17:22-17:37 HKT) =====
-- "No, there's only three white wines, and I think like four different bottles sake." / "The beverage menu on the website is the most accurate one."
-- 4th sake = HEAVENSAKE JUNMAI 12 - KONISHI - 12.5% - 720ML, sold at HK$388 a bottle ("ignore the price on the picture"), HK$80 a glass (glasses never stamp).
-- Names and bottle prices: the drinks board on rorubaru.com/menu (site/public/menus/DRINKS MENU 1.svg on Sakaimng/RORUWEB main 2acc371, read only).
-- Costs: October price sheet (menu_prices_review_oct2026.xlsx, BEVERAGE); Heavensake is not on the sheet -> cost unknown (null).
-- Additive only: 3 new nullable columns, 1 new menu item, upserts on the season-1 bottle rows, 2 functions re-created with extra keys. Nothing dropped or deleted.

alter table public.loyalty_drink_bottles add column if not exists note_en text;          -- small line under the name (vintage, brewery / ABV / size)
alter table public.loyalty_drink_rewards add column if not exists name_zhs text;         -- 简中 reward name
alter table public.loyalty_drink_rewards add column if not exists line_zhs text;         -- 简中 reward line

insert into public.loyalty_menu_items (name_en, kind, match_en, active)
select 'Heavensake Junmai 12 (Konishi)', 'drink', 'Heavensake', true
 where not exists (select 1 from public.loyalty_menu_items where kind = 'drink' and lower(match_en) = 'heavensake');

insert into public.loyalty_drink_bottles (season_id, item_id, sort, cat, short_en, price_hkd, cost_hkd, min_line_hkd, glass_too, note_en, active, updated_at)
select 1, v.item_id, v.sort, v.cat, v.short_en, v.price, v.cost, 200, v.glass_too, v.note, true, now() from (values
  (43, 1, 'sake', 'Taiko Junmai', 638::numeric, 188::numeric, false, null::text),
  (44, 2, 'sake', 'Wakabotan Hinohikari', 658, 188, false, null),
  (45, 3, 'sake', 'Sari Black', 588, 140, false, null),
  ((select id from public.loyalty_menu_items where kind = 'drink' and lower(match_en) = 'heavensake' order by id limit 1), 4, 'sake', 'Heavensake Junmai 12', 388, null, true, 'Konishi · 12.5% · 720ml'),
  (46, 5, 'white', 'Pessegueiro Colheita Branco', 368, 110, true, '2023'),
  (47, 6, 'white', 'Les Hauts d''Artigny Touraine Amboise', 388, 110, false, '2023'),
  (48, 7, 'white', 'La Moynerie', 658, 195, false, '2023')
) v(item_id, sort, cat, short_en, price, cost, glass_too, note)
on conflict (season_id, item_id) do update set sort = excluded.sort, cat = excluded.cat, short_en = excluded.short_en, price_hkd = excluded.price_hkd, cost_hkd = excluded.cost_hkd,
  glass_too = excluded.glass_too, note_en = excluded.note_en, active = true, updated_at = now();

-- anything else on the season-1 list goes inactive (kept, not deleted)
update public.loyalty_drink_bottles set active = false, updated_at = now()
 where season_id = 1 and active and item_id not in (43, 44, 45, 46, 47, 48, (select id from public.loyalty_menu_items where kind = 'drink' and lower(match_en) = 'heavensake' order by id limit 1));

-- rewards stay as Dominic approved them (17:39 "the 3 rewards are fine"); 简中 text + the 10-bottle cost note now uses the menu price
update public.loyalty_drink_rewards set name_zhs = '全桌一轮 Highball', line_zhs = '最多 3 杯 Kaku 或乌龙 Highball', updated_at = now() where season_id = 1 and active and at_count = 3;
update public.loyalty_drink_rewards set name_zhs = '一壶店家清酒', line_zhs = '生清酒，我们请客', updated_at = now() where season_id = 1 and active and at_count = 6;
update public.loyalty_drink_rewards set name_zhs = '送你一瓶酒 + 专属存酒牌', line_zhs = 'Pessegueiro Colheita Branco，再加一个写上你名字的存酒牌',
       cost_note = 'Pessegueiro Colheita Branco bottle cost 110.00 (menu HK$368) + tag', updated_at = now() where season_id = 1 and active and at_count = 10;

create or replace function public.lf_drinks_json(p_phone text) returns jsonb language plpgsql stable security definer set search_path to 'public','extensions' as $$
declare se public.loyalty_passport_seasons := public.lf_passport_season(); cnt int; diff int; total int; d date := public.lf_hk_today();
        rep boolean := coalesce(public.lf_setting('drinks_count_repeats'), '1') = '1';
begin
  if se.id is null or coalesce(public.lf_setting('drinks_passport_on'), '1') <> '1' then return jsonb_build_object('on', false); end if;
  select count(*) into total from public.loyalty_drink_bottles where season_id = se.id and active;
  select count(*), count(distinct item_id) into cnt, diff from public.loyalty_drink_stamps s
   where s.season_id = se.id and s.phone = p_phone and s.undone_at is null and exists (select 1 from public.loyalty_drink_bottles b where b.season_id = se.id and b.item_id = s.item_id and b.active);
  if not rep then cnt := diff; end if;
  return jsonb_build_object('on', true, 'count', cnt, 'different', diff, 'total', total, 'repeats_count', rep,
    'max_per_bill', coalesce((public.lf_setting('drinks_max_per_bill'))::int, 6),
    'season', jsonb_build_object('id', se.id, 'name_en', se.name_en, 'name_zh', se.name_zh, 'starts_on', se.starts_on, 'ends_on', se.ends_on,
       'status', case when d < se.starts_on then 'upcoming' when d > se.ends_on then 'ended' else 'live' end),
    'bottles', (select coalesce(jsonb_agg(jsonb_build_object('id', b.item_id, 'en', coalesce(b.short_en, mi.name_en), 'zh', coalesce(b.short_zh, b.short_en, mi.name_zh, mi.name_en), 'cat', b.cat, 'price', b.price_hkd, 'note', b.note_en,
               'n', (select count(*) from public.loyalty_drink_stamps s where s.season_id = se.id and s.phone = p_phone and s.item_id = b.item_id and s.undone_at is null),
               'at', (select min(s.created_at) from public.loyalty_drink_stamps s where s.season_id = se.id and s.phone = p_phone and s.item_id = b.item_id and s.undone_at is null),
               'last_sid', (select max(s.id) from public.loyalty_drink_stamps s where s.season_id = se.id and s.phone = p_phone and s.item_id = b.item_id and s.undone_at is null)) order by b.sort, b.item_id), '[]'::jsonb)
              from public.loyalty_drink_bottles b join public.loyalty_menu_items mi on mi.id = b.item_id where b.season_id = se.id and b.active),
    'rewards', (select coalesce(jsonb_agg(jsonb_build_object('n', r.at_count, 'id', r.id, 'en', r.name_en, 'zh', coalesce(r.name_zh, r.name_en), 'line_en', r.line_en, 'line_zh', coalesce(r.line_zh, r.line_en), 'zhs', r.name_zhs, 'line_zhs', r.line_zhs,
               'reached', cnt >= r.at_count, 'used_at', c.used_at, 'claim_id', c.id) order by r.at_count), '[]'::jsonb)
              from public.loyalty_drink_rewards r left join public.loyalty_drink_claims c on c.season_id = se.id and c.phone = p_phone and c.at_count = r.at_count and c.undone_at is null
              where r.season_id = se.id and r.active));
end $$;

create or replace function public.owner_drinks(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token); se public.loyalty_passport_seasons := public.lf_passport_season();
begin
  if s.role <> 'owner' then raise exception 'owner_only' using errcode = 'P0001'; end if;
  if se.id is null then return jsonb_build_object('on', false); end if;
  return jsonb_build_object('on', coalesce(public.lf_setting('drinks_passport_on'), '1') = '1', 'season', jsonb_build_object('id', se.id, 'name_en', se.name_en, 'starts_on', se.starts_on, 'ends_on', se.ends_on),
    'repeats_count', coalesce(public.lf_setting('drinks_count_repeats'), '1') = '1', 'max_per_bill', coalesce((public.lf_setting('drinks_max_per_bill'))::int, 6),
    'drinks', (select coalesce(jsonb_agg(jsonb_build_object('id', mi.id, 'name', mi.name_en, 'in', coalesce(b.active, false), 'cat', b.cat, 'short_en', b.short_en, 'short_zh', b.short_zh, 'note', b.note_en, 'glass_too', coalesce(b.glass_too, false),
                 'price', b.price_hkd, 'cost', b.cost_hkd, 'min_line', coalesce(b.min_line_hkd, 200), 'sort', b.sort,
                 'stamped', (select count(*) from public.loyalty_drink_stamps x where x.season_id = se.id and x.item_id = mi.id and x.undone_at is null)) order by coalesce(b.active, false) desc, b.sort, mi.id), '[]'::jsonb)
               from public.loyalty_menu_items mi left join public.loyalty_drink_bottles b on b.item_id = mi.id and b.season_id = se.id where mi.kind = 'drink' and mi.active),
    'rewards', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'n', r.at_count, 'en', r.name_en, 'zh', r.name_zh, 'line_en', r.line_en, 'line_zh', r.line_zh, 'cost', r.cost_hkd, 'cost_note', r.cost_note,
                 'claimed', (select count(*) from public.loyalty_drink_claims c where c.season_id = se.id and c.at_count = r.at_count and c.undone_at is null)) order by r.at_count), '[]'::jsonb)
               from public.loyalty_drink_rewards r where r.season_id = se.id and r.active),
    'playing', (select count(distinct phone) from public.loyalty_drink_stamps x where x.season_id = se.id and x.undone_at is null),
    'bottles', (select count(*) from public.loyalty_drink_stamps x where x.season_id = se.id and x.undone_at is null),
    'week', (select count(*) from public.loyalty_drink_stamps x where x.season_id = se.id and x.undone_at is null and x.created_at > now() - interval '7 days'),
    'by_source', (select coalesce(jsonb_object_agg(src, n), '{}'::jsonb) from (select source src, count(*) n from public.loyalty_drink_stamps x where x.season_id = se.id and x.undone_at is null group by source) q));
end $function$;
