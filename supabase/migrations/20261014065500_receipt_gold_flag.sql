-- member json: gold flag on each receipt
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
           'stamped', coalesce((x.visit_result->>'added')::boolean, false), 'gold', x.gold, 'at', coalesce(x.receipt_at, x.created_at), 'shop', s.name_en, 'shop_zh', s.name_zh, 'reason', x.reason) order by x.created_at desc), '[]'::jsonb)
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
revoke execute on function public.lf_member_core(text) from public, anon, authenticated;
