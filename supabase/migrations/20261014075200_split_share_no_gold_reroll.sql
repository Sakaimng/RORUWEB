CREATE OR REPLACE FUNCTION public.lf_credit_receipt(p_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare r public.loyalty_receipts; m public.loyalty_members; pts int; mult numeric; st text; vr jsonb; vday date; is_gold boolean := false;
        bonus int := coalesce((public.lf_setting('referral_bonus_points'))::int, 100); minspend numeric := coalesce((public.lf_setting('referral_min_spend'))::numeric, 200); odds numeric; hk text; bst text; ref_shared boolean; cap int := coalesce((public.lf_setting('referral_cap_per_year'))::int, 10); test boolean := public.lf_setting('env') <> 'live';
begin
  select * into r from public.loyalty_receipts where id = p_id for update;
  if r.status <> 'approved' or r.points > 0 then return; end if;
  select * into m from public.loyalty_members where phone = r.phone for update;
  st := case when m.tier = 'kama' then 'kama' else public.lf_tier_spend(public.lf_year_spend(r.phone) - round(r.total_hkd)::int) end;
  mult := public.lf_tier_mult(st);
  vday := coalesce((r.receipt_at at time zone 'Asia/Hong_Kong')::date, public.lf_hk_today());
  if vday > public.lf_hk_today() then vday := public.lf_hk_today(); end if;
  hk := public.lf_hook(vday);
  odds := coalesce((public.lf_setting('gold_receipt_odds'))::numeric, 0.05);
  if hk = 'wed_gold' then odds := greatest(odds, coalesce((public.lf_setting('hook_wed_gold_odds'))::numeric, 0.2)); end if;
  is_gold := public.lf_feature_on('gold_receipt') and random() < odds;
  -- a guest split share never re-rolls gold: it inherits the original claim's result (no 'split to re-roll')
  if r.source = 'split' then
    select coalesce(bool_or(x.gold), false) into is_gold from public.loyalty_receipts x
     where x.id <> r.id and x.source <> 'split' and x.status = 'approved' and coalesce(x.base_key, x.receipt_key) = coalesce(r.base_key, r.receipt_key);
  end if;
  pts := floor(r.total_hkd * coalesce((public.lf_setting('points_per_hkd'))::numeric, 1) * mult * (case when is_gold then coalesce((public.lf_setting('gold_receipt_mult'))::numeric, 2) else 1 end));
  update public.loyalty_members set shari_balance = shari_balance + pts, points = points + pts,
    lifetime_spend_hkd = lifetime_spend_hkd + round(r.total_hkd)::int, last_visit_at = greatest(coalesce(last_visit_at, r.receipt_at, now()), coalesce(r.receipt_at, now()))
    where phone = r.phone;
  update public.loyalty_members set tier = public.lf_status(r.phone) where phone = r.phone;
  vr := public.lf_add_visit(r.phone, coalesce(r.shop_id, 'wanchai'), r.reviewed_by, vday, r.id, case when r.source in ('staff','staff_split') then 'staff_award' else 'receipt' end, false);
  -- bring a friend: paid once, on the friend's first approved receipt (or split share) of at least referral_min_spend.
  -- A receipt the referrer also claimed doesn't count, unless staff split it at the table. Flagged links wait for staff (status pending).
  ref_shared := r.source not in ('staff_split','split') and exists (select 1 from public.loyalty_receipts x where x.phone = m.referred_by and coalesce(x.base_key, x.receipt_key) = coalesce(r.base_key, r.receipt_key));
  if public.lf_feature_on('bring_friend') and m.referred_by is not null and m.referral_bonus_at is null and coalesce(m.phone_was_new, true)
     and r.total_hkd >= minspend and not ref_shared then
    if hk = 'tue_friends' then bonus := round(bonus * coalesce((public.lf_setting('hook_tue_bonus_mult'))::numeric, 2)); end if;
    bst := case when m.referral_flag is null then 'paid' else 'pending' end;
    update public.loyalty_members set referral_bonus_at = now() where phone = r.phone;
    insert into public.loyalty_bonuses (phone, kind, points, related_phone, receipt_id, is_test, status, reason) values (r.phone, 'referral_friend', bonus, m.referred_by, r.id, test, bst, m.referral_flag);
    if bst = 'paid' then update public.loyalty_members set shari_balance = shari_balance + bonus, points = points + bonus where phone = r.phone; end if;
    if (select count(*) from public.loyalty_bonuses b where b.phone = m.referred_by and b.kind = 'referral_member' and b.status <> 'rejected' and b.created_at > now() - interval '365 days') < cap then
      insert into public.loyalty_bonuses (phone, kind, points, related_phone, receipt_id, is_test, status, reason) values (m.referred_by, 'referral_member', bonus, r.phone, r.id, test, bst, m.referral_flag);
      if bst = 'paid' then update public.loyalty_members set shari_balance = shari_balance + bonus, points = points + bonus where phone = m.referred_by; end if;
    end if;
    vr := vr || jsonb_build_object('referral_bonus', bonus, 'referral_status', bst);
  end if;
  update public.loyalty_receipts set points = pts, multiplier = mult, gold = is_gold, visit_result = vr || jsonb_build_object('gold', is_gold, 'hook', hk) where id = p_id;
end $function$
;
