-- f38 (Oct 17 2026, Dominic "go" 19:22): staff redeem gets a confirm step that also logs the POS. ADDITIVE ONLY:
-- two new functions; staff_redeem and staff_pos_log are unchanged and still work as before.
-- staff_redeem_preview: what the confirm sheet shows BEFORE anything changes (reward, what to ring on POS, upgrade, status).
-- staff_redeem_confirm: the staff member rang it on POS and tapped Confirm -> redeem + mark it logged on POS, in one transaction.

create or replace function public.staff_redeem_preview(p_token uuid, p_reward_code text)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token); r record; rc text;
begin
  rc := upper(regexp_replace(coalesce(p_reward_code,''), '[^0-9A-Za-z]', '', 'g'));
  select rd.id, rd.status, rd.points_spent, rd.phone, w.name_en, w.name_zh into r
    from public.loyalty_redemptions rd join public.loyalty_rewards w on w.id = rd.reward_id where rd.reward_code = rc;
  if r.id is null then raise exception 'reward_not_found' using errcode = 'P0001'; end if;
  return jsonb_build_object('ok', true, 'code', rc, 'status', r.status, 'name_en', r.name_en, 'name_zh', r.name_zh,
    'points_spent', coalesce(r.points_spent, 0), 'phone_masked', public.lf_mask_phone(r.phone), 'pos', public.lf_pos_item_json(r.id));
end $function$;

create or replace function public.staff_redeem_confirm(p_token uuid, p_reward_code text)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare res jsonb; lg jsonb;
begin
  res := public.staff_redeem(p_token, p_reward_code);
  lg := public.staff_pos_log(p_token, p_reward_code);
  return res || jsonb_build_object('pos', lg->'item', 'pos_logged', true);
end $function$;

grant execute on function public.staff_redeem_preview(uuid, text) to anon, authenticated, service_role;
grant execute on function public.staff_redeem_confirm(uuid, text) to anon, authenticated, service_role;
