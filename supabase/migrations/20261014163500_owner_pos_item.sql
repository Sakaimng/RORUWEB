CREATE OR REPLACE FUNCTION public.owner_stats(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true); today date := public.lf_hk_today(); kama int := coalesce((public.lf_setting('kama_eligible_hkd'))::int, 25000);
begin
  return jsonb_build_object(
    'day', today,
    'members', (select count(*) from public.loyalty_members),
    'members_7d', (select count(*) from public.loyalty_members where created_at > now() - interval '7 days'),
    'receipts_today', (select count(*) from public.loyalty_receipts where status='approved' and (coalesce(reviewed_at,created_at) at time zone 'Asia/Hong_Kong')::date = today),
    'receipts_all', (select count(*) from public.loyalty_receipts where status='approved'),
    'visits_today', (select count(*) from public.loyalty_visits where kind='visit' and visit_day = today),
    'visits_7d', (select count(*) from public.loyalty_visits where kind='visit' and visit_day > today - 7),
    'visits_all', (select count(*) from public.loyalty_visits where kind='visit'),
    'visits_only_all', (select count(*) from public.loyalty_visits where kind='visit' and source = 'visit_only'),
    'plates_completed', (select coalesce(sum(plates_completed),0) from public.loyalty_members),
    'pending', (select count(*) from public.loyalty_receipts where status='pending'),
    'rejected', (select count(*) from public.loyalty_receipts where status='rejected'),
    'spend_all', (select coalesce(sum(total_hkd),0) from public.loyalty_receipts where status='approved'),
    'spend_7d', (select coalesce(sum(total_hkd),0) from public.loyalty_receipts where status='approved' and coalesce(reviewed_at,created_at) > now() - interval '7 days'),
    'points_issued', (select coalesce(sum(points),0) from public.loyalty_receipts where status='approved'),
    'points_outstanding', (select coalesce(sum(shari_balance),0) from public.loyalty_members),
    'rewards_earned', (select count(*) from public.loyalty_redemptions where status in ('earned','revealed')),
    'rewards_redeemed', (select count(*) from public.loyalty_redemptions where status = 'redeemed'),
    'per_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'shop', shop_id, 'receipts', c, 'spend', sp, 'visits', vi) order by d desc, shop_id), '[]'::jsonb) from (
        select d, shop_id, sum(c) c, sum(sp) sp, sum(vi) vi from (
          select (coalesce(reviewed_at,created_at) at time zone 'Asia/Hong_Kong')::date d, coalesce(shop_id,'?') shop_id, count(*) c, sum(total_hkd) sp, 0 vi from public.loyalty_receipts where status='approved' and created_at > now() - interval '30 days' group by 1,2
          union all
          select visit_day d, shop_id, 0, 0, count(*) from public.loyalty_visits where kind='visit' and visit_day > today - 30 group by 1,2) u group by 1,2) t),
    'per_shop', (select coalesce(jsonb_agg(jsonb_build_object('shop', sh.name_en, 'shop_zh', sh.name_zh, 'receipts', (select count(*) from public.loyalty_receipts r where r.shop_id = sh.id and r.status='approved'), 'spend', (select coalesce(sum(total_hkd),0) from public.loyalty_receipts r where r.shop_id = sh.id and r.status='approved'),
                 'visits', (select count(*) from public.loyalty_visits v where v.shop_id = sh.id and v.kind='visit'),
                 'redeemed', (select count(*) from public.loyalty_redemptions r where r.redeemed_shop = sh.id)) order by sh.sort), '[]'::jsonb) from public.loyalty_shops sh),
    'top', (select coalesce(jsonb_agg(jsonb_build_object('name', m.name, 'phone_masked', public.lf_mask_phone(m.phone), 'spend', m.lifetime_spend_hkd, 'year_spend', m.ys, 'points', m.shari_balance,
                 'receipts', (select count(*) from public.loyalty_receipts r where r.phone = m.phone and r.status='approved'),
                 'visits', (select count(*) from public.loyalty_visits v where v.phone = m.phone and v.kind='visit'), 'stamps', m.rolls_on_plate, 'plates', m.plates_completed,
                 'tier', public.lf_status(m.phone), 'last', m.last_visit_at) order by m.ys desc, m.lifetime_spend_hkd desc), '[]'::jsonb)
            from (select mm.*, public.lf_year_spend(mm.phone) ys from public.loyalty_members mm order by public.lf_year_spend(mm.phone) desc, mm.lifetime_spend_hkd desc limit 15) m),
    'tiers', (select coalesce(jsonb_object_agg(tier, c), '{}'::jsonb) from (select public.lf_status(phone) tier, count(*) c from public.loyalty_members group by 1) t),
    'kama_eligible', (select coalesce(jsonb_agg(jsonb_build_object('phone', m.phone, 'phone_masked', public.lf_mask_phone(m.phone), 'name', m.name, 'year_spend', m.ys) order by m.ys desc), '[]'::jsonb)
            from (select mm.*, public.lf_year_spend(mm.phone) ys from public.loyalty_members mm where coalesce(mm.tier,'') <> 'kama') m where m.ys >= kama),
    'kama_members', (select coalesce(jsonb_agg(jsonb_build_object('phone', phone, 'phone_masked', public.lf_mask_phone(phone), 'name', name, 'year_spend', public.lf_year_spend(phone))), '[]'::jsonb) from public.loyalty_members where tier = 'kama'),
    'rewards', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'code', code, 'name_en', name_en, 'name_zh', name_zh, 'detail_en', detail_en, 'detail_zh', detail_zh, 'kind', kind, 'weight', weight, 'points_cost', points_cost, 'active', active, 'pos_item', pos_item_en) order by sort, id), '[]'::jsonb)
                from public.loyalty_rewards where kind = 'ladder' or (kind = 'plate' and (active or code = 'V1'))),
    'staff', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'role', role, 'shop', shop_id, 'active', active) order by id), '[]'::jsonb) from public.loyalty_staff),
    'settings', (select jsonb_object_agg(key, value) from public.loyalty_settings)
  );
end $function$;
create or replace function public.owner_save_pos_item(p_token uuid, p_id int, p_pos text)
returns jsonb language plpgsql security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true);
begin
  update public.loyalty_rewards set pos_item_en = nullif(left(trim(coalesce(p_pos, '')), 80), ''), updated_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'id', p_id);
end $$;
grant execute on function public.owner_save_pos_item(uuid, int, text) to anon, authenticated;
