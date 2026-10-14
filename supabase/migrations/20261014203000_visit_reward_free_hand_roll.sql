-- v44 (2026-10-14 ~20:30 HKT): visit (plate) reward = Free hand roll (any except Wagyu); POS item editable on the owner page.
-- Data updates (reward V1 + perk nori_stamps text) and family_config gains 'visit_reward'.
update loyalty_rewards set name_en='Free hand roll (any except Wagyu)', name_zh='免費手卷一條（和牛除外）',
 detail_en='Any hand roll from the regular menu except Wagyu, on us', detail_zh='正價餐牌任揀一條手卷（和牛除外），本店請客',
 pos_item_en='Hand roll (any 1, not Wagyu)', updated_at=now() where id=14 and code='V1' and kind='plate' returning id,name_en,name_zh,detail_en,detail_zh,pos_item_en;
update loyalty_perks set detail_en='Fill the plate, get a free hand roll (any except Wagyu)', detail_zh='集滿一碟，送免費手卷一條（和牛除外）', updated_at=now() where key='nori_stamps' returning key,detail_en,detail_zh;

update loyalty_rewards set detail_en='Your pick from the regular menu, on us', detail_zh='正價餐牌任你揀，本店請客', updated_at=now() where id=14;

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
    'visit_reward', (select jsonb_build_object('name_en', name_en, 'name_zh', name_zh, 'detail_en', detail_en, 'detail_zh', detail_zh) from public.loyalty_rewards where active and kind = 'plate' and weight > 0 order by sort, id limit 1),
    'shops', (select jsonb_agg(jsonb_build_object('id', id, 'name_en', name_en, 'name_zh', name_zh) order by sort) from public.loyalty_shops where active))
$function$
;
