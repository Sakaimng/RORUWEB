-- Roru Family: points rewards ladder approved by Dominic, Oct 14 2026 15:19 HKT.
-- Replaces the four placeholder ladder rows (L1-L4) in place; same ids, codes, kind and flow
-- (guest claims -> points deducted -> scratch -> staff confirms). Owner can edit/toggle in Rewards.
-- No schema change. Previous values: tasks/eb5feae2.../ladder-before.json
update public.loyalty_rewards set name_en = 'Any highball on us', name_zh = '任選 Highball 一杯',
  detail_en = 'Your pick from the bar', detail_zh = '吧枱任你揀', points_cost = 588, active = true, sort = 11, updated_at = now()
  where code = 'L1' and kind = 'ladder';
update public.loyalty_rewards set name_en = 'A hand roll + a highball on us', name_zh = '手卷 + Highball',
  detail_en = 'A hand roll of your choice and a highball', detail_zh = '自選手卷一條，再加 Highball 一杯', points_cost = 1388, active = true, sort = 12, updated_at = now()
  where code = 'L2' and kind = 'ladder';
update public.loyalty_rewards set name_en = '5 roll set on us', name_zh = '5 卷套餐',
  detail_en = 'Our 5 roll set, on the house', detail_zh = '5 卷套餐，本店請客', points_cost = 2888, active = true, sort = 13, updated_at = now()
  where code = 'L3' and kind = 'ladder';
update public.loyalty_rewards set name_en = 'Chef''s Pick on us', name_zh = 'Chef''s Pick 主廚精選',
  detail_en = 'The chef''s choice for the night', detail_zh = '主廚當晚精選', points_cost = 5888, active = true, sort = 15, updated_at = now()
  where code = 'L4' and kind = 'ladder';
select json_agg(r order by points_cost) from (select id, code, name_en, name_zh, detail_en, detail_zh, points_cost, active from public.loyalty_rewards where kind = 'ladder') r;
