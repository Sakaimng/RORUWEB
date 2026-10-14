-- v42 (task 55cf510c): additive key used_rewards for the staff 💡 wording
CREATE OR REPLACE FUNCTION public.lf_member_staff_json(p_phone text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select jsonb_build_object(
    'member_code', m.member_code, 'phone_masked', public.lf_mask_phone(m.phone), 'name', m.name,
    'points', m.shari_balance, 'tier', public.lf_status(m.phone), 'multiplier', public.lf_tier_mult(public.lf_status(m.phone)),
    'stamps', least(m.rolls_on_plate, greatest(1, coalesce((public.lf_setting('rolls_per_plate'))::int, 5))),
    'per_plate', greatest(1, coalesce((public.lf_setting('rolls_per_plate'))::int, 5)),
    'visited_today', exists(select 1 from public.loyalty_visits v where v.phone = m.phone and v.kind = 'visit' and v.visit_day = public.lf_hk_today()),
    'pending_rewards', (select count(*) from public.loyalty_redemptions r where r.phone = m.phone and r.status in ('earned','revealed')),
    'pending_receipts', (select count(*) from public.loyalty_receipts r where r.phone = m.phone and r.status = 'pending'),
    'rewards', (select coalesce(jsonb_agg(jsonb_build_object('code', r.reward_code, 'status', r.status, 'upgraded', r.upgraded, 'kind', w.kind,
                  'name_en', w.name_en, 'name_zh', w.name_zh) order by r.earned_at desc), '[]'::jsonb)
                from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id
                where r.phone = m.phone and r.status in ('earned','revealed')),
    'suggest', public.lf_suggest(m.phone),
    'used_rewards', (select count(*) from public.loyalty_redemptions r where r.phone = m.phone and r.undone_at is null
                      and (r.redeemed_at is not null or coalesce(r.points_spent, 0) > 0)))
  from public.loyalty_members m where m.phone = p_phone
$function$;

-- v42 (task 55cf510c): additive key reward_zh on today's log redeem rows
CREATE OR REPLACE FUNCTION public.staff_today(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token); shop text; today date := public.lf_hk_today();
begin
  select coalesce(se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  return jsonb_build_object('shop', shop, 'day', today,
    'receipts', (select count(*) from public.loyalty_receipts where status = 'approved' and (coalesce(reviewed_at, created_at) at time zone 'Asia/Hong_Kong')::date = today),
    'points', (select coalesce(sum(points),0) from public.loyalty_receipts where status = 'approved' and (coalesce(reviewed_at, created_at) at time zone 'Asia/Hong_Kong')::date = today),
    'visits', (select count(*) from public.loyalty_visits where kind = 'visit' and visit_day = today),
    'pending', (select count(*) from public.loyalty_receipts where status = 'pending'), 'pending_bonuses', (select count(*) from public.loyalty_bonuses where status = 'pending' and kind = 'referral_friend'),
    'redeemed', (select count(*) from public.loyalty_redemptions where (redeemed_at at time zone 'Asia/Hong_Kong')::date = today),
    'log', (select coalesce(jsonb_agg(x order by x->>'at' desc), '[]'::jsonb) from (
        select jsonb_build_object('at', coalesce(r.reviewed_at, r.created_at), 'type', case when r.status='approved' then 'points' else r.status end, 'who', coalesce(m.name, public.lf_mask_phone(m.phone)), 'by', st.name, 'amount', r.total_hkd, 'points', r.points, 'source', r.source,
               'stamped', coalesce((r.visit_result->>'added')::boolean, false)) x
          from public.loyalty_receipts r join public.loyalty_members m on m.phone = r.phone left join public.loyalty_staff st on st.id = r.reviewed_by
          where (coalesce(r.reviewed_at, r.created_at) at time zone 'Asia/Hong_Kong')::date = today
        union all
        select jsonb_build_object('at', v.created_at, 'type', 'visit', 'who', coalesce(m.name, public.lf_mask_phone(m.phone)), 'by', st.name) x
          from public.loyalty_visits v join public.loyalty_members m on m.phone = v.phone left join public.loyalty_staff st on st.id = v.staff_id
          where v.kind = 'visit' and v.source = 'visit_only' and (v.created_at at time zone 'Asia/Hong_Kong')::date = today
        union all
        select jsonb_build_object('at', r.redeemed_at, 'type', 'redeem', 'who', coalesce(m.name, public.lf_mask_phone(m.phone)), 'by', st.name, 'reward', w.name_en, 'reward_zh', w.name_zh) x
          from public.loyalty_redemptions r join public.loyalty_members m on m.phone = r.phone join public.loyalty_rewards w on w.id = r.reward_id left join public.loyalty_staff st on st.id = r.redeemed_staff
          where (r.redeemed_at at time zone 'Asia/Hong_Kong')::date = today
      ) t));
end $function$
;
