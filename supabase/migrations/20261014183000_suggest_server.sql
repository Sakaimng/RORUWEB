
-- 20261014183000_suggest_server: ONE server-side "Suggested for you" pick, used by the guest card (/family) and the staff iPad line (/staff).
-- Same rules the guest card used in the browser (v35), moved here so guest and staff can never disagree.
create or replace function public.lf_suggest_from(me jsonb) returns jsonb language plpgsql stable security definer set search_path to 'public','extensions' as $$
declare tz jsonb := coalesce(me->'taste', '{}'::jsonb); lad jsonb := coalesce(me->'ladder', '[]'::jsonb);
        bal int := coalesce((me->>'points')::int, 0); per numeric; best jsonb; nxt jsonb; fav jsonb; favr jsonb; learned boolean; c text; rw jsonb; alt jsonb; vis int; l jsonb;
begin
  if coalesce((tz->>'on')::boolean, true) = false or jsonb_array_length(lad) = 0 then return jsonb_build_object('on', false); end if;
  per := greatest(1, coalesce(nullif((tz->>'avg_receipt')::numeric, 0), 300) * coalesce(nullif(me->>'points_per_hkd','')::numeric, 1) * coalesce(nullif(me->>'multiplier','')::numeric, 1));
  for l in select value from jsonb_array_elements(lad) order by (value->>'points_cost')::int loop
    if (l->>'points_cost')::int <= bal then best := l; elsif nxt is null then nxt := l; end if;
  end loop;
  learned := coalesce((tz->>'items_on')::boolean, true) and coalesce((tz->>'receipts_with_items')::int, 0) >= 2 and jsonb_array_length(coalesce(tz->'top', '[]'::jsonb)) > 0;
  if learned then
    fav := tz->'top'->0;
    select value into favr from jsonb_array_elements(lad) where coalesce(fav->'in_rewards', '[]'::jsonb) ? (value->>'code') and (value->>'points_cost')::int <= bal order by (value->>'points_cost')::int desc limit 1;
    if favr is null then select value into favr from jsonb_array_elements(lad) where coalesce(fav->'in_rewards', '[]'::jsonb) ? (value->>'code') order by (value->>'points_cost')::int limit 1; end if;
  end if;
  if fav is not null and favr is not null then
    rw := favr;
    if (favr->>'points_cost')::int <= bal then c := 'fav_ready'; else c := 'fav_save'; alt := best; vis := greatest(1, ceil(((favr->>'points_cost')::int - bal) / per)); end if;
  elsif best is not null then
    if nxt is not null and (nxt->>'points_cost')::int - bal <= per then c := 'save_next'; rw := nxt; alt := best; vis := 1;
    else c := 'ready'; rw := best; end if;
  else
    select value into rw from jsonb_array_elements(lad) order by (value->>'points_cost')::int limit 1;
    c := 'first'; vis := greatest(1, ceil(((rw->>'points_cost')::int - bal) / per));
  end if;
  return jsonb_build_object('on', true, 'learned', learned, 'case', c,
    'fav', case when fav is null then null else jsonb_build_object('name_en', fav->>'name_en', 'name_zh', fav->>'name_zh', 'kind', fav->>'kind') end,
    'reward', case when rw is null then null else jsonb_build_object('id', rw->'id', 'code', rw->>'code', 'name_en', rw->>'name_en', 'name_zh', rw->>'name_zh') end,
    'alt', case when alt is null then null else jsonb_build_object('id', alt->'id', 'code', alt->>'code', 'name_en', alt->>'name_en', 'name_zh', alt->>'name_zh') end,
    'visits', vis);
end $$;
create or replace function public.lf_suggest(p_phone text) returns jsonb language sql stable security definer set search_path to 'public','extensions' as $$
  select public.lf_suggest_from(public.lf_member_core(p_phone) || jsonb_build_object('taste', public.lf_taste(p_phone)))
$$;
revoke all on function public.lf_suggest_from(jsonb) from public, anon, authenticated;
revoke all on function public.lf_suggest(text) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.lf_member_json(p_phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare base jsonb := public.lf_member_core(p_phone); m public.loyalty_members; ref record; bday_claimed boolean; min_days int := coalesce((public.lf_setting('birthday_min_days'))::int, 30);
        in_win boolean; days_left int;
begin
  if base is null then return null; end if;
  select * into m from public.loyalty_members where phone = p_phone;
  select name into ref from public.loyalty_members where phone = m.referred_by;
  select exists (select 1 from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id where r.phone = p_phone and w.kind = 'birthday'
                   and r.status <> 'void' and r.earned_at > now() - interval '300 days') into bday_claimed;
  in_win := public.lf_bday_in_window(m.birthday_md);
  days_left := case when m.birthday_set_at is null then null else greatest(0, min_days - (now()::date - m.birthday_set_at::date)) end;
  return base || jsonb_build_object(
    'split_inbox', (select coalesce(jsonb_agg(jsonb_build_object('id', sr.id, 'who', '••••' || right(sr.requester_phone, 2), 'name', rq.name, 'receipt_no', o.receipt_no, 'bill', (select sum(total_hkd) from public.loyalty_receipts x where (x.receipt_key = sr.receipt_key or x.base_key = sr.receipt_key) and x.status = 'approved'),
                       'people_after', (select count(*) + 1 from public.loyalty_receipts x where (x.receipt_key = sr.receipt_key or x.base_key = sr.receipt_key) and x.status = 'approved'), 'expires_at', sr.expires_at) order by sr.created_at), '[]'::jsonb)
                    from public.loyalty_split_requests sr join public.loyalty_members rq on rq.phone = sr.requester_phone left join public.loyalty_receipts o on o.receipt_key = sr.receipt_key
                    where sr.first_phone = p_phone and sr.status = 'pending' and sr.expires_at > now()),
    'split_outbox', (select coalesce(jsonb_agg(jsonb_build_object('id', sr.id, 'receipt_no', o.receipt_no, 'status', case when sr.status = 'pending' and sr.expires_at <= now() then 'expired' else sr.status end,
                       'points', (select points from public.loyalty_receipts x where x.id = sr.receipt_id), 'created_at', sr.created_at) order by sr.created_at desc), '[]'::jsonb)
                    from public.loyalty_split_requests sr left join public.loyalty_receipts o on o.receipt_key = sr.receipt_key
                    where sr.requester_phone = p_phone and sr.created_at > now() - interval '7 days'),
    'perks', public.lf_perks_json(p_phone), 'kama_dinner', public.lf_kama_dinner(p_phone),
    'hook_today', public.lf_hook(public.lf_hk_today()), 'taste', public.lf_taste(p_phone), 'suggest', public.lf_suggest_from(base || jsonb_build_object('taste', public.lf_taste(p_phone))),
    'consents', jsonb_build_object('terms_version', m.terms_version, 'terms_at', m.terms_at, 'whatsapp', m.mkt_whatsapp, 'whatsapp_at', m.mkt_whatsapp_at, 'push', m.mkt_push, 'push_at', m.mkt_push_at,
             'current_version', public.lf_setting('terms_version')),
    'gold', jsonb_build_object('on', public.lf_feature_on('gold_receipt'), 'mult', (public.lf_setting('gold_receipt_mult'))::numeric, 'odds', (public.lf_setting('gold_receipt_odds'))::numeric,
             'count', (select count(*) from public.loyalty_receipts where phone = p_phone and gold)),
    'referral', jsonb_build_object('on', public.lf_feature_on('bring_friend'), 'code', m.member_code, 'bonus', (public.lf_setting('referral_bonus_points'))::int, 'cap', (public.lf_setting('referral_cap_per_year'))::int,
             'joined', (select count(*) from public.loyalty_members f where f.referred_by = p_phone), 'pending', (select count(*) from public.loyalty_members f where f.referred_by = p_phone and f.referral_bonus_at is null) + (select count(*) from public.loyalty_bonuses b where b.phone = p_phone and b.kind = 'referral_member' and b.status = 'pending'), 'min_spend', (public.lf_setting('referral_min_spend'))::numeric,
             'rewarded', (select count(*) from public.loyalty_bonuses b where b.phone = p_phone and b.kind = 'referral_member' and b.status = 'paid'),
             'points_earned', (select coalesce(sum(points),0) from public.loyalty_bonuses b where b.phone = p_phone and b.status = 'paid'),
             'invited_by', case when m.referred_by is null then null else coalesce(ref.name, public.lf_mask_phone(m.referred_by)) end,
             'my_bonus_pending', (m.referred_by is not null and m.referral_bonus_at is null)),
    'birthday', jsonb_build_object('on', public.lf_feature_on('birthday_roll'), 'md', m.birthday_md, 'in_window', in_win, 'claimed', bday_claimed,
             'days_until_eligible', days_left,
             'claimable', public.lf_feature_on('birthday_roll') and in_win and not bday_claimed and days_left = 0)
  );
end $function$
;

CREATE OR REPLACE FUNCTION public.staff_lookup(p_token uuid, p_query text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token); q text; rows jsonb; per_plate int := greatest(1, coalesce((public.lf_setting('rolls_per_plate'))::int, 5));
begin
  q := upper(regexp_replace(coalesce(p_query,''), '[^0-9A-Za-z+]', '', 'g'));
  if q = '' then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object('phone_masked', public.lf_mask_phone(m.phone), 'phone', m.phone, 'name', m.name, 'member_code', m.member_code,
      'points', m.shari_balance, 'spend', m.lifetime_spend_hkd, 'year_spend', public.lf_year_spend(m.phone), 'tier', public.lf_status(m.phone), 'multiplier', public.lf_tier_mult(public.lf_status(m.phone)),
      'stamps', least(m.rolls_on_plate, per_plate), 'per_plate', per_plate,
      'visited_today', exists(select 1 from public.loyalty_visits v where v.phone = m.phone and v.kind = 'visit' and v.visit_day = public.lf_hk_today()),
      'pending_rewards', (select count(*) from public.loyalty_redemptions r where r.phone = m.phone and r.status in ('earned','revealed')),
      'pending_receipts', (select count(*) from public.loyalty_receipts r where r.phone = m.phone and r.status = 'pending'),
      'suggest', public.lf_suggest(m.phone)
    ) order by m.last_visit_at desc nulls last), '[]'::jsonb) into rows
  from (select * from public.loyalty_members m where m.member_code = q or regexp_replace(m.phone, '[^0-9]', '', 'g') like '%' || regexp_replace(q, '[^0-9]', '', 'g') limit 8) m
  where length(regexp_replace(q, '[^0-9]', '', 'g')) >= 4 or m.member_code = q;
  return rows;
end $function$
;
