
-- 20261014184000_owner_dashboard: numbers for the owner Overview dashboard (v36). Read-only, owner only.
create or replace function public.owner_dashboard(p_token uuid) returns jsonb language plpgsql stable security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true); today date := public.lf_hk_today();
begin
  return jsonb_build_object(
    'today', today,
    'spend_7d', (select coalesce(sum(total_hkd),0) from public.loyalty_receipts where status='approved' and coalesce(reviewed_at,created_at) > now() - interval '7 days'),
    'spend_prev', (select coalesce(sum(total_hkd),0) from public.loyalty_receipts where status='approved' and coalesce(reviewed_at,created_at) > now() - interval '14 days' and coalesce(reviewed_at,created_at) <= now() - interval '7 days'),
    'visits_7d', (select count(*) from public.loyalty_visits where kind='visit' and visit_day > today - 7),
    'visits_prev', (select count(*) from public.loyalty_visits where kind='visit' and visit_day > today - 14 and visit_day <= today - 7),
    'members', (select count(*) from public.loyalty_members),
    'members_7d', (select count(*) from public.loyalty_members where created_at > now() - interval '7 days'),
    'members_prev', (select count(*) from public.loyalty_members where created_at > now() - interval '14 days' and created_at <= now() - interval '7 days'),
    'redeemed_7d', (select count(*) from public.loyalty_redemptions where status='redeemed' and redeemed_at > now() - interval '7 days'),
    'redeemed_prev', (select count(*) from public.loyalty_redemptions where status='redeemed' and redeemed_at > now() - interval '14 days' and redeemed_at <= now() - interval '7 days'),
    'by_item', (select coalesce(jsonb_agg(jsonb_build_object('name_en', t.name_en, 'name_zh', t.name_zh, 'n', t.n) order by t.n desc, t.name_en), '[]'::jsonb) from (
        select w.name_en, w.name_zh, count(*) n from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id
        where r.status='redeemed' and r.redeemed_at > now() - interval '30 days' group by 1,2) t),
    'pos_logged', (select count(*) from public.loyalty_redemptions where status='redeemed' and redeemed_at > now() - interval '30 days' and pos_logged_at is not null),
    'pos_not', (select count(*) from public.loyalty_redemptions where status='redeemed' and redeemed_at > now() - interval '30 days' and pos_logged_at is null)
  );
end $$;
revoke all on function public.owner_dashboard(uuid) from public;
grant execute on function public.owner_dashboard(uuid) to anon, authenticated;
