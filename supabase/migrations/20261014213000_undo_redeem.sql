-- 20261014213000_undo_redeem.sql — Roru Family preview (Oct 14 2026). Dominic 17:30: redeemed on his demo row by mistake, "how can they unredeem it?"
-- Additive: columns on loyalty_redemptions + loyalty_staff_access_log, new functions, replaced month-end. Points refunded by adding back points_spent.
alter table public.loyalty_redemptions add column if not exists undone_at timestamptz;
alter table public.loyalty_redemptions add column if not exists undone_by text;          -- 'guest' | 'staff'
alter table public.loyalty_redemptions add column if not exists undone_staff int;
alter table public.loyalty_redemptions add column if not exists undo_reason text;
alter table public.loyalty_redemptions add column if not exists refunded_points int;
alter table public.loyalty_redemptions add column if not exists status_before_undo text;
alter table public.loyalty_staff_access_log add column if not exists detail text;

-- guest: undo a reward they claimed with points that staff has not used yet -> void, points back in full
create or replace function public.family_undo_redeem(p_token uuid, p_redemption_id bigint) returns jsonb
language plpgsql security definer set search_path = public, extensions as $function$
declare ph text := public.lf_member_session(p_token); r public.loyalty_redemptions;
begin
  select * into r from public.loyalty_redemptions where id = p_redemption_id and phone = ph for update;
  if r.id is null then raise exception 'reward_not_found' using errcode = 'P0001'; end if;
  if r.status = 'redeemed' then raise exception 'already_redeemed' using errcode = 'P0001'; end if;
  if r.status = 'void' then raise exception 'reward_void' using errcode = 'P0001'; end if;
  if coalesce(r.points_spent, 0) <= 0 then raise exception 'nothing_to_refund' using errcode = 'P0001'; end if;
  update public.loyalty_redemptions set status_before_undo = status, status = 'void', undone_at = now(), undone_by = 'guest', refunded_points = r.points_spent where id = r.id;
  update public.loyalty_members set shari_balance = shari_balance + r.points_spent where phone = ph;
  return jsonb_build_object('ok', true, 'refunded', r.points_spent, 'member', public.lf_member_json(ph));
end $function$;
revoke all on function public.family_undo_redeem(uuid, bigint) from public;
grant execute on function public.family_undo_redeem(uuid, bigint) to anon, authenticated;

-- manager / owner: reverse a reward staff already used; reason required; written to the access/audit log
create or replace function public.staff_reverse_redeem(p_token uuid, p_reward_code text, p_reason text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $function$
declare s public.loyalty_staff := public.lf_staff_need_manager(p_token); rc text := upper(regexp_replace(coalesce(p_reward_code, ''), '[^0-9A-Za-z]', '', 'g'));
        why text := left(trim(coalesce(p_reason, '')), 200); r public.loyalty_redemptions; mc text; shop text;
begin
  if length(why) < 3 then raise exception 'reason_required' using errcode = 'P0001'; end if;
  select * into r from public.loyalty_redemptions where reward_code = rc for update;
  if r.id is null then raise exception 'reward_not_found' using errcode = 'P0001'; end if;
  if r.status = 'void' then raise exception 'reward_void' using errcode = 'P0001'; end if;
  update public.loyalty_redemptions set status_before_undo = status, status = 'void', undone_at = now(), undone_by = 'staff', undone_staff = s.id, undo_reason = why,
         refunded_points = coalesce(r.points_spent, 0) where id = r.id;
  if coalesce(r.points_spent, 0) > 0 then update public.loyalty_members set shari_balance = shari_balance + r.points_spent where phone = r.phone; end if;
  select member_code into mc from public.loyalty_members where phone = r.phone;
  select coalesce(se.shop_id, s.shop_id) into shop from public.loyalty_sessions se where se.token = p_token;
  insert into public.loyalty_staff_access_log (staff_id, staff_name, staff_role, shop_id, member_code, action, hits, first_at, last_at, detail)
    values (s.id, s.name, s.role, shop, mc, 'reverse_redeem', 1, now(), now(), rc || ' · ' || coalesce(r.points_spent, 0) || ' pts back · ' || why);
  return jsonb_build_object('ok', true, 'code', rc, 'refunded', coalesce(r.points_spent, 0), 'was_logged_on_pos', r.pos_logged_at is not null, 'was', r.status);
end $function$;
revoke all on function public.staff_reverse_redeem(uuid, text, text) from public;
grant execute on function public.staff_reverse_redeem(uuid, text, text) to anon, authenticated;

-- owner access log shows the reason line
CREATE OR REPLACE FUNCTION public.owner_access_log(p_token uuid, p_limit integer DEFAULT 50, p_member_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true);
begin
  return jsonb_build_object(
    'total_7d', (select coalesce(sum(hits), 0) from public.loyalty_staff_access_log where last_at > now() - interval '7 days'),
    'rows', (select coalesce(jsonb_agg(r order by r.last_at desc), '[]'::jsonb) from (
      select l.id, l.staff_id, l.staff_name, l.staff_role, l.shop_id, l.member_code, m.name member_name, coalesce(m.is_test, false) is_test,
             l.action, l.hits, l.first_at, l.last_at, l.detail
        from public.loyalty_staff_access_log l left join public.loyalty_members m on m.member_code = l.member_code
       where p_member_code is null or l.member_code = upper(p_member_code)
       order by l.last_at desc limit least(greatest(coalesce(p_limit, 50), 1), 500)) r));
end $function$
;

-- month-end: reversed rewards listed as reversed (not counted), with what to do on the POS
CREATE OR REPLACE FUNCTION public.staff_month_end(p_token uuid, p_month text, p_format text DEFAULT 'view'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_need_manager(p_token); d0 date; d1 date; rows jsonb; n int;
begin
  if p_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' then raise exception 'bad_month' using errcode = 'P0001'; end if;
  d0 := (p_month || '-01')::date; d1 := (d0 + interval '1 month')::date;
  select coalesce(jsonb_agg(x order by x->>'at'), '[]'::jsonb) into rows from (
    select jsonb_build_object('at', r.redeemed_at,
        'type', case when r.upgraded then 'Upgrade' when w.kind = 'ladder' then 'Reward redeemed' when w.kind = 'plate' then 'Visit reward' when w.kind = 'birthday' then 'Birthday roll' when w.kind = 'gold' then 'Gold treat' else w.kind end,
        'item', w.name_en || case when r.upgraded then ' (upgraded from ' || coalesce(f.name_en, '?') || ')' else '' end,
        'pos_item', coalesce(w.pos_item_en, w.name_en), 'code', r.reward_code, 'guest', '••••' || right(r.phone, 2), 'shop', coalesce(sh.name_en, r.redeemed_shop),
        'points', r.points_spent, 'redeemed_by', rs.name, 'logged', r.pos_logged_at is not null, 'logged_at', r.pos_logged_at, 'logged_by', ls.name, 'is_test', r.is_test,
        'reversed', r.status = 'void', 'reversed_at', r.undone_at, 'reversed_by', us.name, 'reverse_reason', r.undo_reason, 'refunded', r.refunded_points,
        'pos_action', case when r.status = 'void' and r.pos_logged_at is not null then 'Void it on the POS too' when r.status = 'void' then 'Not on POS: nothing to do' end) x
      from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id
        left join public.loyalty_rewards f on f.id = r.upgrade_from_reward_id left join public.loyalty_shops sh on sh.id = r.redeemed_shop
        left join public.loyalty_staff rs on rs.id = r.redeemed_staff left join public.loyalty_staff ls on ls.id = r.pos_logged_staff
        left join public.loyalty_staff us on us.id = r.undone_staff
      where (r.status = 'redeemed' or (r.status = 'void' and r.undone_by = 'staff' and r.redeemed_at is not null)) and (r.redeemed_at at time zone 'Asia/Hong_Kong')::date >= d0 and (r.redeemed_at at time zone 'Asia/Hong_Kong')::date < d1
    union all
    select jsonb_build_object('at', coalesce(x.reviewed_at, x.created_at), 'type', 'Gold receipt', 'item', 'Points ×' || coalesce(public.lf_setting('gold_receipt_mult'), '2') || ' on receipt (no item to give)',
        'pos_item', 'Nothing to ring (points only)', 'code', coalesce(x.receipt_no, '#' || x.id), 'guest', '••••' || right(x.phone, 2), 'shop', coalesce(sh.name_en, x.shop_id),
        'points', x.points, 'redeemed_by', st.name, 'logged', null, 'logged_at', null, 'logged_by', null, 'is_test', x.is_test, 'reversed', false) x
      from public.loyalty_receipts x left join public.loyalty_shops sh on sh.id = x.shop_id left join public.loyalty_staff st on st.id = x.reviewed_by
      where x.gold and x.status = 'approved' and (coalesce(x.reviewed_at, x.created_at) at time zone 'Asia/Hong_Kong')::date >= d0 and (coalesce(x.reviewed_at, x.created_at) at time zone 'Asia/Hong_Kong')::date < d1
  ) t;
  n := jsonb_array_length(rows);
  if p_format in ('pdf', 'csv') then insert into public.loyalty_exports (staff_id, month, format, rows) values (s.id, p_month, p_format, n); end if;
  return jsonb_build_object('month', p_month, 'by', s.name, 'role', s.role, 'generated_at', now(), 'rows', rows,
    'exports', (select coalesce(jsonb_agg(jsonb_build_object('at', e.created_at, 'by', st.name, 'format', e.format, 'month', e.month) order by e.id desc), '[]'::jsonb)
                from (select * from public.loyalty_exports order by id desc limit 6) e left join public.loyalty_staff st on st.id = e.staff_id));
end $function$
;
notify pgrst, 'reload schema';
