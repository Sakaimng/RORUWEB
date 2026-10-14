
-- Roru Family add-ons (Dominic Oct 14 2026 15:53–15:57 HKT). Additive only.
-- A) POS logging of every redemption (one tap), B) staff roles staff/manager/owner with per-person PINs,
-- C) Month-end export (PDF/CSV, manager+owner, logged), D) Suggested-for-you card + receipt items (from on-device OCR text, no image stored).

-- A) POS
alter table public.loyalty_rewards add column if not exists pos_item_en text;
alter table public.loyalty_redemptions add column if not exists pos_logged_at timestamptz;
alter table public.loyalty_redemptions add column if not exists pos_logged_staff int;
update public.loyalty_rewards set pos_item_en = case code when 'L1' then 'Highball (any)' when 'L2' then 'Hand roll (any) + Highball (any)' when 'L3' then '5 Roll Set' when 'L4' then 'Chef''s Pick'
  when 'V1' then 'Visit reward (TBC)' when 'BDAY' then 'Birthday hand roll (TBC)' when 'GOLD' then 'Gold roll treat (TBC)' else name_en end where pos_item_en is null;

create or replace function public.lf_pos_item_json(p_id bigint)
returns jsonb language sql stable security definer set search_path to 'public','extensions' as $$
  select jsonb_build_object('id', r.id, 'code', r.reward_code, 'kind', w.kind, 'give_en', w.name_en, 'give_zh', w.name_zh, 'pos_item', coalesce(w.pos_item_en, w.name_en),
    'upgraded', coalesce(r.upgraded, false), 'from_en', f.name_en, 'from_zh', f.name_zh, 'who', '••••' || right(r.phone, 2), 'shop', r.redeemed_shop,
    'redeemed_at', r.redeemed_at, 'redeemed_by', rs.name, 'logged_at', r.pos_logged_at, 'logged_by', ls.name, 'is_test', r.is_test)
  from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id
    left join public.loyalty_rewards f on f.id = r.upgrade_from_reward_id and r.upgraded
    left join public.loyalty_staff rs on rs.id = r.redeemed_staff left join public.loyalty_staff ls on ls.id = r.pos_logged_staff
  where r.id = p_id
$$;

create or replace function public.staff_pos_queue(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); shop text;
begin
  select coalesce(se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  return jsonb_build_object('shop', shop,
    'not_logged', (select count(*) from public.loyalty_redemptions r where r.status = 'redeemed' and r.pos_logged_at is null and coalesce(r.redeemed_shop, 'wanchai') = shop and r.redeemed_at > now() - interval '35 days'),
    'items', (select coalesce(jsonb_agg(public.lf_pos_item_json(x.id) order by (x.pos_logged_at is not null), x.redeemed_at desc), '[]'::jsonb) from (
       select r.id, r.pos_logged_at, r.redeemed_at from public.loyalty_redemptions r where r.status = 'redeemed' and coalesce(r.redeemed_shop, 'wanchai') = shop
         and ((r.pos_logged_at is null and r.redeemed_at > now() - interval '35 days') or r.pos_logged_at > now() - interval '12 hours')
       order by (r.pos_logged_at is not null), r.redeemed_at desc limit 30) x));
end $$;

create or replace function public.staff_pos_log(p_token uuid, p_code text)
returns jsonb language plpgsql security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); r public.loyalty_redemptions; rc text;
begin
  rc := upper(regexp_replace(coalesce(p_code,''), '[^0-9A-Za-z]', '', 'g'));
  select * into r from public.loyalty_redemptions where reward_code = rc for update;
  if r.id is null then raise exception 'reward_not_found' using errcode = 'P0001'; end if;
  if r.status <> 'redeemed' then raise exception 'not_redeemed_yet' using errcode = 'P0001'; end if;
  if r.pos_logged_at is null then update public.loyalty_redemptions set pos_logged_at = now(), pos_logged_staff = s.id where id = r.id; end if;
  return jsonb_build_object('ok', true, 'item', public.lf_pos_item_json(r.id));
end $$;

create or replace function public.staff_redeem(p_token uuid, p_reward_code text)
 returns jsonb language plpgsql security definer set search_path to 'public','extensions' as $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token); r record; shop text; rc text;
begin
  rc := upper(regexp_replace(coalesce(p_reward_code,''), '[^0-9A-Za-z]', '', 'g'));
  select rd.*, w.name_en, w.name_zh into r from public.loyalty_redemptions rd join public.loyalty_rewards w on w.id = rd.reward_id where rd.reward_code = rc;
  if r.id is null then raise exception 'reward_not_found' using errcode = 'P0001'; end if;
  if r.status = 'redeemed' then raise exception 'already_redeemed' using errcode = 'P0001'; end if;
  if r.status = 'void' then raise exception 'reward_void' using errcode = 'P0001'; end if;
  select coalesce(se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  update public.loyalty_redemptions set status = 'redeemed', redeemed_at = now(), redeemed_shop = shop, redeemed_staff = s.id where id = r.id;
  return jsonb_build_object('ok', true, 'reward', jsonb_build_object('code', rc, 'name_en', r.name_en, 'name_zh', r.name_zh, 'phone_masked', public.lf_mask_phone(r.phone)),
                            'pos', public.lf_pos_item_json(r.id), 'member', public.lf_member_json(r.phone));
end $function$;

-- B) roles
create or replace function public.lf_staff_need_manager(p_token uuid)
returns public.loyalty_staff language plpgsql stable security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token);
begin
  if s.role not in ('manager', 'owner') then raise exception 'manager_only' using errcode = 'P0001'; end if;
  return s;
end $$;

create or replace function public.owner_set_staff(p_token uuid, p_id integer, p_name text, p_pin text, p_role text, p_shop text, p_active boolean)
 returns jsonb language plpgsql security definer set search_path to 'public','extensions' as $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true); nid int; v_role text;
begin
  v_role := coalesce(nullif(p_role, ''), (select st.role from public.loyalty_staff st where st.id = p_id), 'staff');
  if v_role not in ('staff', 'manager', 'owner') then raise exception 'bad_role' using errcode = 'P0001'; end if;
  if p_id = s.id and (v_role <> 'owner' or p_active is false) then raise exception 'cannot_demote_self' using errcode = 'P0001'; end if;
  if p_pin is not null and p_pin <> '' then
    -- per-person PINs: 6 digits, no digit 4 (Dominic Oct 14). Existing shared PINs keep working until changed.
    if p_pin !~ '^[0-35-9]{6}$' then raise exception 'pin_must_be_6_digits_no_4' using errcode = 'P0001'; end if;
    if exists (select 1 from public.loyalty_staff st where st.active and st.id is distinct from p_id and st.pin_hash = crypt(p_pin, st.pin_hash)) then raise exception 'pin_already_used' using errcode = 'P0001'; end if;
  else p_pin := null;
  end if;
  if p_id is null then
    if p_pin is null then raise exception 'pin_required' using errcode = 'P0001'; end if;
    insert into public.loyalty_staff (name, role, pin_hash, shop_id) values (coalesce(nullif(trim(p_name),''),'Staff'), v_role, crypt(p_pin, gen_salt('bf', 8)), coalesce(p_shop, 'wanchai')) returning id into nid;
  else
    update public.loyalty_staff st set name = coalesce(nullif(trim(p_name),''), st.name), role = v_role,
      pin_hash = case when p_pin is null then st.pin_hash else crypt(p_pin, gen_salt('bf', 8)) end,
      shop_id = coalesce(p_shop, st.shop_id), active = coalesce(p_active, st.active) where st.id = p_id;
    nid := p_id;
  end if;
  return jsonb_build_object('ok', true, 'id', nid, 'role', v_role);
end $function$;

-- C) month-end
create table if not exists public.loyalty_exports (id bigserial primary key, staff_id int, month text, format text, rows int, created_at timestamptz default now());
alter table public.loyalty_exports enable row level security;

create or replace function public.staff_month_end(p_token uuid, p_month text, p_format text default 'view')
returns jsonb language plpgsql security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_need_manager(p_token); d0 date; d1 date; rows jsonb; n int;
begin
  if p_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' then raise exception 'bad_month' using errcode = 'P0001'; end if;
  d0 := (p_month || '-01')::date; d1 := (d0 + interval '1 month')::date;
  select coalesce(jsonb_agg(x order by x->>'at'), '[]'::jsonb) into rows from (
    select jsonb_build_object('at', r.redeemed_at,
        'type', case when r.upgraded then 'Upgrade' when w.kind = 'ladder' then 'Reward redeemed' when w.kind = 'plate' then 'Visit reward' when w.kind = 'birthday' then 'Birthday roll' when w.kind = 'gold' then 'Gold treat' else w.kind end,
        'item', w.name_en || case when r.upgraded then ' (upgraded from ' || coalesce(f.name_en, '?') || ')' else '' end,
        'pos_item', coalesce(w.pos_item_en, w.name_en), 'code', r.reward_code, 'guest', '••••' || right(r.phone, 2), 'shop', coalesce(sh.name_en, r.redeemed_shop),
        'points', r.points_spent, 'redeemed_by', rs.name, 'logged', r.pos_logged_at is not null, 'logged_at', r.pos_logged_at, 'logged_by', ls.name, 'is_test', r.is_test) x
      from public.loyalty_redemptions r join public.loyalty_rewards w on w.id = r.reward_id
        left join public.loyalty_rewards f on f.id = r.upgrade_from_reward_id left join public.loyalty_shops sh on sh.id = r.redeemed_shop
        left join public.loyalty_staff rs on rs.id = r.redeemed_staff left join public.loyalty_staff ls on ls.id = r.pos_logged_staff
      where r.status = 'redeemed' and (r.redeemed_at at time zone 'Asia/Hong_Kong')::date >= d0 and (r.redeemed_at at time zone 'Asia/Hong_Kong')::date < d1
    union all
    select jsonb_build_object('at', coalesce(x.reviewed_at, x.created_at), 'type', 'Gold receipt', 'item', 'Points ×' || coalesce(public.lf_setting('gold_receipt_mult'), '2') || ' on receipt (no item to give)',
        'pos_item', 'Nothing to ring (points only)', 'code', coalesce(x.receipt_no, '#' || x.id), 'guest', '••••' || right(x.phone, 2), 'shop', coalesce(sh.name_en, x.shop_id),
        'points', x.points, 'redeemed_by', st.name, 'logged', null, 'logged_at', null, 'logged_by', null, 'is_test', x.is_test) x
      from public.loyalty_receipts x left join public.loyalty_shops sh on sh.id = x.shop_id left join public.loyalty_staff st on st.id = x.reviewed_by
      where x.gold and x.status = 'approved' and (coalesce(x.reviewed_at, x.created_at) at time zone 'Asia/Hong_Kong')::date >= d0 and (coalesce(x.reviewed_at, x.created_at) at time zone 'Asia/Hong_Kong')::date < d1
  ) t;
  n := jsonb_array_length(rows);
  if p_format in ('pdf', 'csv') then insert into public.loyalty_exports (staff_id, month, format, rows) values (s.id, p_month, p_format, n); end if;
  return jsonb_build_object('month', p_month, 'by', s.name, 'role', s.role, 'generated_at', now(), 'rows', rows,
    'exports', (select coalesce(jsonb_agg(jsonb_build_object('at', e.created_at, 'by', st.name, 'format', e.format, 'month', e.month) order by e.id desc), '[]'::jsonb)
                from (select * from public.loyalty_exports order by id desc limit 6) e left join public.loyalty_staff st on st.id = e.staff_id));
end $$;

-- D) receipt items + suggestions
create table if not exists public.loyalty_menu_items (id serial primary key, name_en text not null unique, name_zh text, kind text, match_en text, in_rewards text[] default '{}', active boolean default true);
alter table public.loyalty_menu_items enable row level security;
insert into public.loyalty_menu_items (name_en, name_zh, kind, match_en, in_rewards) values
('4 Roll Set',null,'set','4 Roll Set',array[]::text[]),
('5 Roll Set',null,'set','5 Roll Set',array['L3']::text[]),
('6 Roll Set',null,'set','6 Roll Set',array[]::text[]),
('7 Roll Set',null,'set','7 Roll Set',array[]::text[]),
('Chef''s Pick',null,'set','Chef''s Pick',array['L4']::text[]),
('Akami Tuna','赤身','roll','Akami Tuna',array['L2']::text[]),
('Ikura','三文魚子','roll','Ikura',array['L2']::text[]),
('Medai','鯛魚','roll','Medai',array['L2']::text[]),
('Salmon','三文魚','roll','Salmon',array['L2','L3']::text[]),
('Scallop','帆立貝','roll','Scallop',array['L2','L3']::text[]),
('Unagi','鰻魚','roll','Unagi',array['L2']::text[]),
('Yellowtail','油甘魚','roll','Yellowtail',array['L2','L3']::text[]),
('Aka Ebi','紅蝦','roll','Aka Ebi',array['L2']::text[]),
('Coconut Shrimp','椰子蝦','roll','Coconut Shrimp',array['L2']::text[]),
('Lobster Bomb','龍蝦炸彈','roll','Lobster Bomb',array['L2']::text[]),
('Mala Negitoro','麻辣香拿魚蓉','roll','Mala Negitoro',array['L2','L3']::text[]),
('Typhoon Shelter Soft Shell Crab','避風塘軟殼蟹','roll','Typhoon Shelter Soft Shell Crab',array['L2']::text[]),
('Wagyu','和牛','roll','Wagyu',array['L2']::text[]),
('Maitake Tempura','舞茸','roll','Maitake Tempura',array['L2']::text[]),
('Tamago (V)','玉子燒','roll','Tamago',array['L2','L3']::text[]),
('Ossetra Caviar (50g)','Ossetra 魚子醬 (50克)','food','Ossetra Caviar',array[]::text[]),
('Daily Miso Soup','味噌湯','food','Daily Miso Soup',array[]::text[]),
('Edamame','枝豆','food','Edamame',array[]::text[]),
('Kisu Tempura','天婦羅鱚魚','food','Kisu Tempura',array[]::text[]),
('Snow Crab Tamago','雪場蟹玉子','food','Snow Crab Tamago',array[]::text[]),
('Spicy Chanja Cream Cheese','辣鱈魚腸忌廉芝士','food','Spicy Chanja Cream Cheese',array[]::text[]),
('Negitoro Dip','葱花吞拿魚蓉','food','Negitoro Dip',array[]::text[]),
('Daily Crudo',null,'food','Daily Crudo',array[]::text[]),
('Grilled Kama',null,'food','Grilled Kama',array[]::text[]),
('Potato Salad','薯仔沙律','food','Potato Salad',array[]::text[]),
('Shiza Sarada','凱撒沙律','food','Shiza Sarada',array[]::text[]),
('Monaka','最中','dessert','Monaka',array[]::text[]),
('Mapo Tofu Ice Cream','麻婆豆腐雪糕','dessert','Mapo Tofu Ice Cream',array[]::text[]),
('Daily Bara Chirashi',null,'food','Daily Bara Chirashi',array[]::text[]),
('Draught Beer',null,'drink','Draught Beer',array[]::text[]),
('Draught Sake (carafe)',null,'drink','Draught Sake',array[]::text[]),
('Oolong Highball',null,'drink','Oolong Highball',array['L1','L2']::text[]),
('Umeshu Highball',null,'drink','Umeshu Highball',array['L1','L2']::text[]),
('Kaku Highball',null,'drink','Kaku Highball',array['L1','L2']::text[]),
('Spicy Paloma',null,'drink','Spicy Paloma',array[]::text[]),
('Yuzu Holzer OG',null,'drink','Yuzu Holzer OG',array[]::text[]),
('Sake Cup',null,'drink','Sake Cup',array[]::text[]),
('Taiko Junmai',null,'drink','Taiko Junmai',array[]::text[]),
('Wakabotan Hinohikari',null,'drink','Wakabotan Hinohikari',array[]::text[]),
('Sari Black',null,'drink','Sari Black',array[]::text[]),
('Pessegueiro Colheita Branco (2023)',null,'drink','Pessegueiro Colheita Branco',array[]::text[]),
('Les Hauts d''Artigny Touraine Amboise (2023)',null,'drink','Les Hauts d''Artigny Touraine Amboise',array[]::text[]),
('La Moynerie (2023)',null,'drink','La Moynerie',array[]::text[]),
('La Croix Picot (2022)',null,'drink','La Croix Picot',array[]::text[]),
('Foreau Vouvray Sec (2021)',null,'drink','Foreau Vouvray Sec',array[]::text[]),
('Saint-Véran La Renommée (2022)',null,'drink','Saint-Véran La Renommée',array[]::text[]),
('Pessegueiro Aluze Douro DOC (2020)',null,'drink','Pessegueiro Aluze Douro DOC',array[]::text[]),
('Clos de la Gaffelière (2016)',null,'drink','Clos de la Gaffelière',array[]::text[]),
('Yuzu Soda',null,'drink','Yuzu Soda',array[]::text[]),
('Shizuoka Cola',null,'drink','Shizuoka Cola',array[]::text[]),
('Celosa Blush',null,'drink','Celosa Blush',array[]::text[]),
('Hojicha',null,'drink','Hojicha',array[]::text[]),
('Genmaicha Midori',null,'drink','Genmaicha Midori',array[]::text[]),
('Ruby Symphony',null,'drink','Ruby Symphony',array[]::text[]),
('Still Water (per person)',null,'drink','Still Water',array[]::text[]),
('Sparkling Water (per person)',null,'drink','Sparkling Water',array[]::text[])
on conflict (name_en) do nothing;

create table if not exists public.loyalty_receipt_items (id bigserial primary key, receipt_id bigint not null, phone text not null, item_id int not null, qty int not null default 1, created_at timestamptz default now(), unique (receipt_id, item_id));
alter table public.loyalty_receipt_items enable row level security;

-- reads line items from the receipt's OCR text (made on the guest's phone at scan; no image is stored) against the real menu only
create or replace function public.lf_extract_items(p_receipt_id bigint)
returns int language plpgsql security definer set search_path to 'public','extensions' as $$
declare x public.loyalty_receipts; ln text; best record; q int; n int := 0; mm text[];
begin
  select * into x from public.loyalty_receipts where id = p_receipt_id;
  if x.id is null or x.ocr_text is null or x.status <> 'approved' then return 0; end if;
  if coalesce(public.lf_setting('suggest_items_on'), '1') <> '1' then return 0; end if;
  delete from public.loyalty_receipt_items where receipt_id = x.id;
  foreach ln in array regexp_split_to_array(x.ocr_text, E'\n') loop
    if ln ~* '(sub ?total|total|service|visa|master|amex|octopus|change|cash|tel |receipt no|table|date:|thank)' then continue; end if;
    select mi.id, mi.name_en, coalesce(mi.match_en, mi.name_en) mt into best from public.loyalty_menu_items mi
      where mi.active and (ln ilike '%' || coalesce(mi.match_en, mi.name_en) || '%' or (mi.name_zh is not null and ln like '%' || mi.name_zh || '%'))
      order by greatest(case when ln ilike '%' || coalesce(mi.match_en, mi.name_en) || '%' then length(coalesce(mi.match_en, mi.name_en)) else 0 end, case when mi.name_zh is not null and ln like '%' || mi.name_zh || '%' then length(mi.name_zh) * 3 else 0 end) desc limit 1;
    if best.id is null then continue; end if;
    mm := regexp_match(ln, '\s(\d{1,2})\s+\$?\d+[.,]\d{2}\s*$');
    q := coalesce(mm[1]::int, 1); if q < 1 or q > 30 then q := 1; end if;
    insert into public.loyalty_receipt_items (receipt_id, phone, item_id, qty) values (x.id, x.phone, best.id, q)
      on conflict (receipt_id, item_id) do update set qty = public.loyalty_receipt_items.qty + excluded.qty;
    n := n + 1; best := null;
  end loop;
  return n;
end $$;

create or replace function public.lf_receipt_items_trg() returns trigger language plpgsql security definer set search_path to 'public','extensions' as $$
begin
  if new.status = 'approved' and new.ocr_text is not null and (tg_op = 'INSERT' or old.status is distinct from new.status or old.ocr_text is distinct from new.ocr_text) then
    perform public.lf_extract_items(new.id);
  end if;
  return new;
end $$;
drop trigger if exists loyalty_receipt_items_trg on public.loyalty_receipts;
create trigger loyalty_receipt_items_trg after insert or update of status, ocr_text on public.loyalty_receipts for each row execute function public.lf_receipt_items_trg();

create or replace function public.lf_taste(p_phone text)
returns jsonb language sql stable security definer set search_path to 'public','extensions' as $$
  select jsonb_build_object(
    'on', coalesce(public.lf_setting('suggest_card_on'), '1') = '1', 'items_on', coalesce(public.lf_setting('suggest_items_on'), '1') = '1',
    'avg_receipt', (select round(avg(total_hkd)) from public.loyalty_receipts where phone = p_phone and status = 'approved' and coalesce(receipt_at, created_at) > now() - interval '12 months'),
    'receipts_with_items', (select count(distinct receipt_id) from public.loyalty_receipt_items where phone = p_phone),
    'top', (select coalesce(jsonb_agg(t order by t.n desc, t.last desc), '[]'::jsonb) from (
        select mi.name_en, mi.name_zh, mi.kind, mi.in_rewards, sum(ri.qty) n, max(ri.created_at) last from public.loyalty_receipt_items ri join public.loyalty_menu_items mi on mi.id = ri.item_id
        where ri.phone = p_phone and coalesce(public.lf_setting('suggest_items_on'), '1') = '1' group by 1,2,3,4 order by sum(ri.qty) desc limit 3) t))
$$;

insert into public.loyalty_settings (key, value) values ('suggest_card_on', '1'), ('suggest_items_on', '1') on conflict (key) do nothing;

do $$ declare r record; begin for r in select id from public.loyalty_receipts where status = 'approved' and ocr_text is not null loop perform public.lf_extract_items(r.id); end loop; end $$;

revoke all on function public.lf_pos_item_json(bigint) from public, anon, authenticated;
revoke all on function public.lf_staff_need_manager(uuid) from public, anon, authenticated;
revoke all on function public.lf_extract_items(bigint) from public, anon, authenticated;
revoke all on function public.lf_receipt_items_trg() from public, anon, authenticated;
revoke all on function public.lf_taste(text) from public, anon, authenticated;
grant execute on function public.staff_pos_queue(uuid) to anon, authenticated;
grant execute on function public.staff_pos_log(uuid, text) to anon, authenticated;
grant execute on function public.staff_month_end(uuid, text, text) to anon, authenticated;

CREATE OR REPLACE FUNCTION public.owner_save_setting(p_token uuid, p_key text, p_value text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true); v numeric; lo numeric; hi numeric;
begin
  case p_key
    when 'rolls_per_plate' then lo := 2; hi := 20;
    when 'points_per_hkd' then lo := 0; hi := 100;
    when 'tier_gohan_hkd', 'tier_tobiko_hkd', 'kama_eligible_hkd' then lo := 0; hi := 10000000;
    when 'tier_mult_nori', 'tier_mult_gohan', 'tier_mult_tobiko', 'tier_mult_kama', 'gold_receipt_mult' then lo := 0; hi := 10;
    when 'tier_window_months' then lo := 1; hi := 60;
    when 'receipts_per_day' then lo := 1; hi := 20;
    when 'approve_over_hkd' then lo := 1; hi := 100000;
    when 'receipt_max_age_hours' then lo := 1; hi := 720;
    when 'gold_roll_chance', 'upgrade_chance', 'gold_receipt_odds' then lo := 0; hi := 1;
    when 'referral_bonus_points' then lo := 0; hi := 100000;
    when 'referral_cap_per_year' then lo := 0; hi := 1000;
    when 'birthday_window_days' then lo := 0; hi := 15;
    when 'birthday_min_days' then lo := 0; hi := 365;
    when 'roru_day_points_mult' then lo := 0; hi := 10;
    when 'hook_mon_on', 'hook_tue_on', 'hook_wed_on' then lo := 0; hi := 1;
    when 'hook_mon_stamps' then lo := 1; hi := 5;
    when 'hook_tue_bonus_mult' then lo := 0; hi := 10;
    when 'hook_wed_gold_odds' then lo := 0; hi := 1;
    when 'referral_min_spend' then lo := 0; hi := 100000;
    when 'rejoin_cooloff_days' then lo := 15; hi := 30;
    when 'kama_dinner_passes' then lo := 0; hi := 12;
    when 'upgrade_on', 'upgrade_slow_on', 'upgrade_lapsed_on' then lo := 0; hi := 1;
    when 'upgrade_slow_chance', 'upgrade_lapsed_chance', 'upgrade_both_chance' then lo := 0; hi := 1;
    when 'upgrade_lapsed_days' then lo := 7; hi := 365;
    when 'suggest_card_on', 'suggest_items_on' then lo := 0; hi := 1;
    else raise exception 'setting_not_editable' using errcode = 'P0001';
  end case;
  begin v := trim(p_value)::numeric; exception when others then raise exception 'bad_value' using errcode = 'P0001'; end;
  if v < lo or v > hi then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key = 'rejoin_cooloff_days' and v not in (15, 30) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('hook_mon_on','hook_tue_on','hook_wed_on','upgrade_on','upgrade_slow_on','upgrade_lapsed_on','suggest_card_on','suggest_items_on') and v not in (0, 1) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_key in ('rolls_per_plate','tier_gohan_hkd','tier_tobiko_hkd','kama_eligible_hkd','tier_window_months','receipts_per_day','receipt_max_age_hours','referral_bonus_points','referral_cap_per_year','birthday_window_days','birthday_min_days','hook_mon_stamps','referral_min_spend','kama_dinner_passes','upgrade_lapsed_days') and v <> round(v) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  update public.loyalty_settings set value = trim(p_value), updated_at = now() where key = p_key;
  return jsonb_build_object('ok', true, 'key', p_key, 'value', trim(p_value));
end $function$;
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
    'hook_today', public.lf_hook(public.lf_hk_today()), 'taste', public.lf_taste(p_phone),
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
end $function$;
