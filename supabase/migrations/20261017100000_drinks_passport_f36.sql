
-- ===== f36: DRINKS PASSPORT ("bottle passport") in the same Passport tab (Dominic, Oct 17 2026 16:44 HKT "build it out and show me first") =====
-- Additive only: four new tables, three settings, new functions, one new trigger. Nothing dropped, no data deleted, no existing function changed.
-- Same season as the food passport (lf_passport_season(): 15 Oct 2026 - 15 Jan 2027).
-- RULES
--  * One stamp per DIFFERENT bottle on the list (bottles only: a glass never stamps; a line counts as a bottle when its price per unit
--    is at least min_line_hkd, so "Pessegueiro Colheita Branco" by the glass at HK$88 doesn't stamp, the HK$458 bottle does).
--  * Milestones (3 / 6 / 10) count EVERY bottle ordered this season, repeats included (setting drinks_count_repeats = 1). With only 6
--    different bottles on the October sheet, counting different bottles only would make 10 impossible; set 0 to count different bottles only.
--  * Only the guest who scanned / paid gets bottles (split shares never stamp, like the food passport). Max drinks_max_per_bill (6) bottles a bill.
--  * Rewards are handed over by staff, who mark them used on the iPad (once each per guest per season); undo like other benefits.

insert into public.loyalty_settings (key, value) values ('drinks_passport_on', '1'), ('drinks_count_repeats', '1'), ('drinks_max_per_bill', '6') on conflict (key) do nothing;

create table if not exists public.loyalty_drink_bottles (
  season_id int not null references public.loyalty_passport_seasons(id),
  item_id int not null references public.loyalty_menu_items(id),
  sort int not null default 0,
  cat text not null default 'sake' check (cat in ('sake','shochu','white','red','rose','sparkling','whisky','other')),
  short_en text, short_zh text,
  price_hkd numeric, cost_hkd numeric,          -- from the October management sheet (menu_prices_review_oct2026.xlsx, BEVERAGE)
  min_line_hkd numeric not null default 200,    -- a receipt line below this per unit is a glass, not a bottle
  glass_too boolean not null default false,     -- also sold by the glass (a line we can't price is then not trusted)
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (season_id, item_id));
create table if not exists public.loyalty_drink_rewards (
  id serial primary key,
  season_id int not null references public.loyalty_passport_seasons(id),
  at_count int not null check (at_count between 1 and 99),
  name_en text not null, name_zh text, line_en text, line_zh text,
  cost_hkd numeric, cost_note text,
  active boolean not null default true,
  updated_at timestamptz not null default now());
create unique index if not exists loyalty_drink_rewards_one on public.loyalty_drink_rewards (season_id, at_count) where active;
create table if not exists public.loyalty_drink_stamps (
  id bigserial primary key,
  season_id int not null references public.loyalty_passport_seasons(id),
  phone text not null, item_id int not null,
  source text not null check (source in ('receipt','staff')),
  receipt_id bigint, bill_ref text, staff_id int, is_test boolean not null default false,
  created_at timestamptz not null default now(), undone_at timestamptz, undone_staff int, undo_reason text);   -- one row per bottle
create index if not exists loyalty_drink_stamps_phone on public.loyalty_drink_stamps (phone, season_id);
create index if not exists loyalty_drink_stamps_receipt on public.loyalty_drink_stamps (receipt_id);
create table if not exists public.loyalty_drink_claims (
  id bigserial primary key,
  season_id int not null references public.loyalty_passport_seasons(id),
  phone text not null, at_count int not null, reward_id int,
  used_at timestamptz not null default now(), staff_id int, is_test boolean not null default false,
  undone_at timestamptz, undone_staff int, undo_reason text);
create unique index if not exists loyalty_drink_claims_one on public.loyalty_drink_claims (season_id, phone, at_count) where undone_at is null;
alter table public.loyalty_drink_bottles enable row level security;
alter table public.loyalty_drink_rewards enable row level security;
alter table public.loyalty_drink_stamps enable row level security;
alter table public.loyalty_drink_claims enable row level security;

-- the October sheet's bottles (Magnum Sari Black is marked REMOVE, so it's left out). Season 1.
insert into public.loyalty_drink_bottles (season_id, item_id, sort, cat, short_en, price_hkd, cost_hkd, min_line_hkd) values
  (1, 43, 1, 'sake', 'Taiko Junmai', 698, 188, 200),
  (1, 44, 2, 'sake', 'Wakabotan Hinohikari', 698, 188, 200),
  (1, 45, 3, 'sake', 'Sari Black', 588, 140, 200),
  (1, 46, 4, 'white', 'Pessegueiro Colheita Branco', 458, 110, 200),
  (1, 47, 5, 'white', 'Les Hauts d''Artigny', 488, 110, 200),
  (1, 48, 6, 'white', 'La Moynerie', 698, 195, 200)
on conflict (season_id, item_id) do nothing;
update public.loyalty_drink_bottles set glass_too = true where season_id = 1 and item_id = 46;
insert into public.loyalty_drink_rewards (season_id, at_count, name_en, name_zh, line_en, line_zh, cost_hkd, cost_note)
select 1, v.a, v.en, v.zh, v.len, v.lzh, v.c, v.note from (values
  (3, 'A round of highballs for the table', '全枱一輪 Highball', 'Up to 3 Kaku or Oolong highballs', '最多 3 杯 Kaku 或烏龍 Highball', 45.0, '3 x Oolong Highball cost 15.00 (Kaku 13.60) = max 45.00'),
  (6, 'A carafe of house sake', '一壺店家清酒', 'Our draught sake, on us', '生清酒，我哋請', 61.2, 'Draught Sake carafe cost 61.20 (sells 188)'),
  (10, 'A bottle on the house + your bottle-keep tag', '送你一支酒 + 專屬存酒牌', 'Pessegueiro Colheita Branco, and your name on a bottle-keep tag', 'Pessegueiro Colheita Branco，仲有寫上你個名嘅存酒牌', 110.0, 'Pessegueiro Colheita Branco bottle cost 110.00 (sells 458) + tag')
) v(a, en, zh, len, lzh, c, note)
where not exists (select 1 from public.loyalty_drink_rewards r where r.season_id = 1 and r.active);

create or replace function public.lf_drinks_json(p_phone text) returns jsonb language plpgsql stable security definer set search_path to 'public','extensions' as $$
declare se public.loyalty_passport_seasons := public.lf_passport_season(); cnt int; diff int; total int; d date := public.lf_hk_today();
        rep boolean := coalesce(public.lf_setting('drinks_count_repeats'), '1') = '1';
begin
  if se.id is null or coalesce(public.lf_setting('drinks_passport_on'), '1') <> '1' then return jsonb_build_object('on', false); end if;
  select count(*) into total from public.loyalty_drink_bottles where season_id = se.id and active;
  select count(*), count(distinct item_id) into cnt, diff from public.loyalty_drink_stamps s
   where s.season_id = se.id and s.phone = p_phone and s.undone_at is null and exists (select 1 from public.loyalty_drink_bottles b where b.season_id = se.id and b.item_id = s.item_id and b.active);
  if not rep then cnt := diff; end if;
  return jsonb_build_object('on', true, 'count', cnt, 'different', diff, 'total', total, 'repeats_count', rep,
    'max_per_bill', coalesce((public.lf_setting('drinks_max_per_bill'))::int, 6),
    'season', jsonb_build_object('id', se.id, 'name_en', se.name_en, 'name_zh', se.name_zh, 'starts_on', se.starts_on, 'ends_on', se.ends_on,
       'status', case when d < se.starts_on then 'upcoming' when d > se.ends_on then 'ended' else 'live' end),
    'bottles', (select coalesce(jsonb_agg(jsonb_build_object('id', b.item_id, 'en', coalesce(b.short_en, mi.name_en), 'zh', coalesce(b.short_zh, b.short_en, mi.name_zh, mi.name_en), 'cat', b.cat,
               'n', (select count(*) from public.loyalty_drink_stamps s where s.season_id = se.id and s.phone = p_phone and s.item_id = b.item_id and s.undone_at is null),
               'at', (select min(s.created_at) from public.loyalty_drink_stamps s where s.season_id = se.id and s.phone = p_phone and s.item_id = b.item_id and s.undone_at is null),
               'last_sid', (select max(s.id) from public.loyalty_drink_stamps s where s.season_id = se.id and s.phone = p_phone and s.item_id = b.item_id and s.undone_at is null)) order by b.sort, b.item_id), '[]'::jsonb)
              from public.loyalty_drink_bottles b join public.loyalty_menu_items mi on mi.id = b.item_id where b.season_id = se.id and b.active),
    'rewards', (select coalesce(jsonb_agg(jsonb_build_object('n', r.at_count, 'id', r.id, 'en', r.name_en, 'zh', coalesce(r.name_zh, r.name_en), 'line_en', r.line_en, 'line_zh', coalesce(r.line_zh, r.line_en),
               'reached', cnt >= r.at_count, 'used_at', c.used_at, 'claim_id', c.id) order by r.at_count), '[]'::jsonb)
              from public.loyalty_drink_rewards r left join public.loyalty_drink_claims c on c.season_id = se.id and c.phone = p_phone and c.at_count = r.at_count and c.undone_at is null
              where r.season_id = se.id and r.active));
end $$;

-- receipt scan -> bottles. Uses the item lines the receipt reader already found (loyalty_receipt_items, with quantity) and the
-- OCR line's price to tell a bottle from a glass. Runs once per receipt; the guest who scanned only (never a split share).
create or replace function public.lf_drinks_from_receipt(p_id bigint) returns int language plpgsql security definer set search_path to 'public','extensions' as $$
declare r public.loyalty_receipts; se public.loyalty_passport_seasons; d date; added int := 0; room int; bill text; it record; ln text; pr numeric; ok boolean; q int; lq int; k int;
        maxb int := coalesce((public.lf_setting('drinks_max_per_bill'))::int, 6);
begin
  select * into r from public.loyalty_receipts where id = p_id;
  if r.id is null or r.status <> 'approved' or r.ocr_text is null or coalesce(r.source, '') in ('split', 'staff_split') or r.phone is null then return 0; end if;
  if coalesce(public.lf_setting('drinks_passport_on'), '1') <> '1' then return 0; end if;
  if exists (select 1 from public.loyalty_drink_stamps s where s.receipt_id = r.id) then return 0; end if;
  d := (coalesce(r.receipt_at, r.created_at) at time zone 'Asia/Hong_Kong')::date;
  select * into se from public.loyalty_passport_seasons where active and d between starts_on and ends_on order by id desc limit 1;
  if se.id is null then return 0; end if;
  bill := nullif(upper(regexp_replace(coalesce(r.receipt_no, ''), '[^0-9A-Za-z]', '', 'g')), '');
  room := maxb - (select count(*) from public.loyalty_drink_stamps s where s.season_id = se.id and s.phone = r.phone and s.undone_at is null and bill is not null and s.bill_ref = bill);
  for it in select ri.item_id, greatest(1, least(coalesce(ri.qty, 1), 12)) qty, b.min_line_hkd, b.glass_too, lower(coalesce(mi.match_en, mi.name_en)) m
              from public.loyalty_receipt_items ri join public.loyalty_drink_bottles b on b.item_id = ri.item_id and b.season_id = se.id and b.active
              join public.loyalty_menu_items mi on mi.id = ri.item_id
             where ri.receipt_id = r.id order by b.sort loop
    -- the OCR lines for this bottle: each line's quantity counts when its price per unit looks like a bottle, not a glass
    q := 0; ok := null;
    foreach ln in array regexp_split_to_array(lower(r.ocr_text), E'\n') loop
      if position(it.m in ln) > 0 and ln ~ '[\$£§]\s?\d' then
        pr := (regexp_match(ln, '.*[\$£§]\s?(\d+(?:\.\d+)?)'))[1]::numeric;
        lq := coalesce((regexp_match(ln, '^\W*(\d{1,2})\s*[x×*]?\s'))[1]::int, 1); if lq < 1 or lq > 12 then lq := 1; end if;
        ok := coalesce(ok, false);
        if pr / lq >= it.min_line_hkd then q := q + lq; ok := true; end if;
      end if;
    end loop;
    if ok is null then   -- the reader matched the bottle but no clean price line: trust its quantity unless the wine is also sold by the glass
      if it.glass_too then continue; end if;
      q := it.qty;
    end if;
    if q = 0 then continue; end if;
    for k in 1 .. q loop
      exit when added >= room;
      insert into public.loyalty_drink_stamps (season_id, phone, item_id, source, receipt_id, bill_ref, is_test)
        values (se.id, r.phone, it.item_id, 'receipt', r.id, bill, coalesce(r.is_test, false));
      added := added + 1;
    end loop;
  end loop;
  return added;
end $$;

create or replace function public.lf_drinks_receipt_trg() returns trigger language plpgsql security definer set search_path to 'public','extensions' as $$
begin
  if new.status = 'approved' and new.ocr_text is not null and (tg_op = 'INSERT' or old.status is distinct from new.status or old.ocr_text is distinct from new.ocr_text) then
    perform public.lf_drinks_from_receipt(new.id);
  end if;
  return new;
end $$;
do $t$ begin
  if not exists (select 1 from pg_trigger where tgname = 'loyalty_receipts_zzdrinks_trg' and tgrelid = 'public.loyalty_receipts'::regclass) then
    create trigger loyalty_receipts_zzdrinks_trg after insert or update of status, ocr_text on public.loyalty_receipts for each row execute function public.lf_drinks_receipt_trg();
  end if;
end $t$;

create or replace function public.family_drinks(p_token uuid) returns jsonb language plpgsql stable security definer set search_path to 'public','extensions' as $$
begin return public.lf_drinks_json(public.lf_member_session(p_token)); end $$;

create or replace function public.staff_drinks(p_token uuid, p_who text) returns jsonb language plpgsql security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); m public.loyalty_members;
begin
  select * into m from public.loyalty_members where member_code = upper(regexp_replace(coalesce(p_who, ''), '[^0-9A-Za-z]', '', 'g'));
  if m.phone is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  return public.lf_drinks_json(m.phone) || jsonb_build_object('undo_minutes', coalesce((public.lf_setting('perk_undo_minutes'))::int, 15), 'role', s.role);
end $$;

-- staff stamp bottles from the guest's bill: p_items = one entry per bottle (the same id twice = 2 bottles)
create or replace function public.staff_drinks_stamp(p_token uuid, p_who text, p_items int[], p_bill text default null) returns jsonb language plpgsql security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); m public.loyalty_members; se public.loyalty_passport_seasons := public.lf_passport_season(); d date := public.lf_hk_today();
        bill text := nullif(upper(regexp_replace(coalesce(p_bill, ''), '[^0-9A-Za-z]', '', 'g')), ''); maxb int := coalesce((public.lf_setting('drinks_max_per_bill'))::int, 6);
        used int; i int; ids bigint[] := '{}'; nid bigint; test boolean := public.lf_setting('env') <> 'live';
begin
  if coalesce(public.lf_setting('drinks_passport_on'), '1') <> '1' then raise exception 'passport_off' using errcode = 'P0001'; end if;
  if se.id is null or d not between se.starts_on and se.ends_on then raise exception 'passport_no_season' using errcode = 'P0001'; end if;
  select * into m from public.loyalty_members where member_code = upper(regexp_replace(coalesce(p_who, ''), '[^0-9A-Za-z]', '', 'g'));
  if m.phone is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  if coalesce(array_length(p_items, 1), 0) = 0 then raise exception 'passport_nothing_picked' using errcode = 'P0001'; end if;
  if bill is not null and exists (select 1 from public.loyalty_drink_stamps x where x.season_id = se.id and x.bill_ref = bill and x.phone <> m.phone and x.undone_at is null) then raise exception 'passport_not_payer' using errcode = 'P0001'; end if;
  used := case when bill is null then (select count(*) from public.loyalty_drink_stamps x where x.season_id = se.id and x.phone = m.phone and x.undone_at is null and x.source = 'staff' and x.created_at > now() - interval '6 hours' and x.bill_ref is null)
               else (select count(*) from public.loyalty_drink_stamps x where x.season_id = se.id and x.phone = m.phone and x.undone_at is null and x.bill_ref = bill) end;
  if used + array_length(p_items, 1) > maxb then raise exception 'passport_bill_cap' using errcode = 'P0001'; end if;
  for i in 1 .. array_length(p_items, 1) loop
    if not exists (select 1 from public.loyalty_drink_bottles b where b.season_id = se.id and b.item_id = p_items[i] and b.active) then raise exception 'not_found' using errcode = 'P0001'; end if;
    insert into public.loyalty_drink_stamps (season_id, phone, item_id, source, bill_ref, staff_id, is_test)
      values (se.id, m.phone, p_items[i], 'staff', bill, s.id, test or coalesce(m.is_test, false)) returning id into nid;
    ids := ids || nid;
  end loop;
  perform public.lf_passport_log(s, p_token, m.member_code, 'drinks_stamp', array_length(p_items, 1) || ' bottle(s)' || coalesce(' · bill ' || bill, ''));
  return jsonb_build_object('ok', true, 'added', array_length(ids, 1), 'stamp_ids', to_jsonb(ids), 'drinks', public.lf_drinks_json(m.phone));
end $$;

create or replace function public.staff_drinks_unstamp(p_token uuid, p_stamp_id bigint, p_reason text default null) returns jsonb language plpgsql security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); x public.loyalty_drink_stamps; why text := left(trim(coalesce(p_reason, '')), 200); mc text;
        undo_min int := coalesce((public.lf_setting('perk_undo_minutes'))::int, 15);
begin
  select * into x from public.loyalty_drink_stamps where id = p_stamp_id for update;
  if x.id is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  if x.undone_at is not null then raise exception 'already_undone' using errcode = 'P0001'; end if;
  if not (x.source = 'staff' and x.created_at > now() - make_interval(mins => undo_min)) then
    if s.role not in ('manager', 'owner') then raise exception 'manager_only' using errcode = 'P0001'; end if;
    if length(why) < 3 then raise exception 'reason_required' using errcode = 'P0001'; end if;
  end if;
  update public.loyalty_drink_stamps set undone_at = now(), undone_staff = s.id, undo_reason = nullif(why, '') where id = x.id;
  select member_code into mc from public.loyalty_members where phone = x.phone;
  perform public.lf_passport_log(s, p_token, mc, 'drinks_undo', 'bottle ' || (select name_en from public.loyalty_menu_items where id = x.item_id) || coalesce(' · ' || nullif(why, ''), ''));
  return jsonb_build_object('ok', true, 'drinks', public.lf_drinks_json(x.phone));
end $$;

create or replace function public.staff_drinks_claim(p_token uuid, p_who text, p_at int) returns jsonb language plpgsql security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); m public.loyalty_members; dj jsonb; rw public.loyalty_drink_rewards; test boolean := public.lf_setting('env') <> 'live';
begin
  select * into m from public.loyalty_members where member_code = upper(regexp_replace(coalesce(p_who, ''), '[^0-9A-Za-z]', '', 'g'));
  if m.phone is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  dj := public.lf_drinks_json(m.phone);
  if not coalesce((dj->>'on')::boolean, false) then raise exception 'passport_off' using errcode = 'P0001'; end if;
  select * into rw from public.loyalty_drink_rewards where season_id = (dj->'season'->>'id')::int and at_count = p_at and active;
  if rw.id is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  if (dj->>'count')::int < p_at then raise exception 'passport_not_reached' using errcode = 'P0001'; end if;
  if exists (select 1 from public.loyalty_drink_claims c where c.season_id = rw.season_id and c.phone = m.phone and c.at_count = p_at and c.undone_at is null) then raise exception 'perk_used_up' using errcode = 'P0001'; end if;
  insert into public.loyalty_drink_claims (season_id, phone, at_count, reward_id, staff_id, is_test) values (rw.season_id, m.phone, p_at, rw.id, s.id, test or coalesce(m.is_test, false));
  perform public.lf_passport_log(s, p_token, m.member_code, 'drinks_reward', p_at || ' bottles · ' || rw.name_en);
  return jsonb_build_object('ok', true, 'drinks', public.lf_drinks_json(m.phone));
end $$;

create or replace function public.staff_drinks_claim_undo(p_token uuid, p_claim_id bigint, p_reason text default null) returns jsonb language plpgsql security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); x public.loyalty_drink_claims; why text := left(trim(coalesce(p_reason, '')), 200); mc text;
        undo_min int := coalesce((public.lf_setting('perk_undo_minutes'))::int, 15);
begin
  select * into x from public.loyalty_drink_claims where id = p_claim_id for update;
  if x.id is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  if x.undone_at is not null then raise exception 'already_undone' using errcode = 'P0001'; end if;
  if x.used_at < now() - make_interval(mins => undo_min) then
    if s.role not in ('manager', 'owner') then raise exception 'manager_only' using errcode = 'P0001'; end if;
    if length(why) < 3 then raise exception 'reason_required' using errcode = 'P0001'; end if;
  end if;
  update public.loyalty_drink_claims set undone_at = now(), undone_staff = s.id, undo_reason = nullif(why, '') where id = x.id;
  select member_code into mc from public.loyalty_members where phone = x.phone;
  perform public.lf_passport_log(s, p_token, mc, 'drinks_reward_undo', x.at_count || ' bottles' || coalesce(' · ' || nullif(why, ''), ''));
  return jsonb_build_object('ok', true, 'drinks', public.lf_drinks_json(x.phone));
end $$;

-- owner: the bottle list (every drink on the menu, with whether it's in the passport), the rewards, and how it's going
create or replace function public.owner_drinks(p_token uuid) returns jsonb language plpgsql stable security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); se public.loyalty_passport_seasons := public.lf_passport_season();
begin
  if s.role <> 'owner' then raise exception 'owner_only' using errcode = 'P0001'; end if;
  if se.id is null then return jsonb_build_object('on', false); end if;
  return jsonb_build_object('on', coalesce(public.lf_setting('drinks_passport_on'), '1') = '1', 'season', jsonb_build_object('id', se.id, 'name_en', se.name_en, 'starts_on', se.starts_on, 'ends_on', se.ends_on),
    'repeats_count', coalesce(public.lf_setting('drinks_count_repeats'), '1') = '1', 'max_per_bill', coalesce((public.lf_setting('drinks_max_per_bill'))::int, 6),
    'drinks', (select coalesce(jsonb_agg(jsonb_build_object('id', mi.id, 'name', mi.name_en, 'in', coalesce(b.active, false), 'cat', b.cat, 'short_en', b.short_en, 'short_zh', b.short_zh,
                 'price', b.price_hkd, 'cost', b.cost_hkd, 'min_line', coalesce(b.min_line_hkd, 200), 'sort', b.sort,
                 'stamped', (select count(*) from public.loyalty_drink_stamps x where x.season_id = se.id and x.item_id = mi.id and x.undone_at is null)) order by coalesce(b.active, false) desc, b.sort, mi.id), '[]'::jsonb)
               from public.loyalty_menu_items mi left join public.loyalty_drink_bottles b on b.item_id = mi.id and b.season_id = se.id where mi.kind = 'drink' and mi.active),
    'rewards', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'n', r.at_count, 'en', r.name_en, 'zh', r.name_zh, 'line_en', r.line_en, 'line_zh', r.line_zh, 'cost', r.cost_hkd, 'cost_note', r.cost_note,
                 'claimed', (select count(*) from public.loyalty_drink_claims c where c.season_id = se.id and c.at_count = r.at_count and c.undone_at is null)) order by r.at_count), '[]'::jsonb)
               from public.loyalty_drink_rewards r where r.season_id = se.id and r.active),
    'playing', (select count(distinct phone) from public.loyalty_drink_stamps x where x.season_id = se.id and x.undone_at is null),
    'bottles', (select count(*) from public.loyalty_drink_stamps x where x.season_id = se.id and x.undone_at is null),
    'week', (select count(*) from public.loyalty_drink_stamps x where x.season_id = se.id and x.undone_at is null and x.created_at > now() - interval '7 days'),
    'by_source', (select coalesce(jsonb_object_agg(src, n), '{}'::jsonb) from (select source src, count(*) n from public.loyalty_drink_stamps x where x.season_id = se.id and x.undone_at is null group by source) q));
end $$;

-- owner saves the list and the rewards. p_bottles: [{id, in, cat, short_en, short_zh, price, cost, min_line, sort}]; p_rewards: [{n, en, zh, line_en, line_zh, cost, cost_note}]
create or replace function public.owner_save_drinks(p_token uuid, p_bottles jsonb, p_rewards jsonb, p_repeats boolean default null, p_max int default null) returns jsonb language plpgsql security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token); se public.loyalty_passport_seasons := public.lf_passport_season(); x jsonb; ns int[] := '{}';
begin
  if s.role <> 'owner' then raise exception 'owner_only' using errcode = 'P0001'; end if;
  if se.id is null then raise exception 'passport_no_season' using errcode = 'P0001'; end if;
  for x in select * from jsonb_array_elements(coalesce(p_bottles, '[]'::jsonb)) loop
    if not exists (select 1 from public.loyalty_menu_items mi where mi.id = (x->>'id')::int and mi.kind = 'drink') then raise exception 'not_found' using errcode = 'P0001'; end if;
    insert into public.loyalty_drink_bottles (season_id, item_id, sort, cat, short_en, short_zh, price_hkd, cost_hkd, min_line_hkd, active, updated_at)
      values (se.id, (x->>'id')::int, coalesce((x->>'sort')::int, 0), coalesce(nullif(x->>'cat', ''), 'other'), nullif(trim(x->>'short_en'), ''), nullif(trim(x->>'short_zh'), ''),
              nullif(x->>'price', '')::numeric, nullif(x->>'cost', '')::numeric, coalesce(nullif(x->>'min_line', '')::numeric, 200), coalesce((x->>'in')::boolean, false), now())
      on conflict (season_id, item_id) do update set sort = excluded.sort, cat = excluded.cat, short_en = excluded.short_en, short_zh = excluded.short_zh, price_hkd = excluded.price_hkd,
        cost_hkd = excluded.cost_hkd, min_line_hkd = excluded.min_line_hkd, active = excluded.active, updated_at = now();
  end loop;
  if p_rewards is not null then
    for x in select * from jsonb_array_elements(p_rewards) loop
      if (x->>'n')::int is null or (x->>'n')::int < 1 or (x->>'n')::int > 99 or coalesce(trim(x->>'en'), '') = '' then raise exception 'bad_value' using errcode = 'P0001'; end if;
      if (x->>'n')::int = any(ns) then raise exception 'bad_value' using errcode = 'P0001'; end if;
      ns := ns || (x->>'n')::int;
    end loop;
    update public.loyalty_drink_rewards set active = false, updated_at = now() where season_id = se.id and active and not (at_count = any(ns));
    for x in select * from jsonb_array_elements(p_rewards) loop
      update public.loyalty_drink_rewards set name_en = trim(x->>'en'), name_zh = nullif(trim(x->>'zh'), ''), line_en = nullif(trim(x->>'line_en'), ''), line_zh = nullif(trim(x->>'line_zh'), ''),
             cost_hkd = nullif(x->>'cost', '')::numeric, cost_note = nullif(trim(x->>'cost_note'), ''), updated_at = now()
       where season_id = se.id and active and at_count = (x->>'n')::int;
      if not found then
        insert into public.loyalty_drink_rewards (season_id, at_count, name_en, name_zh, line_en, line_zh, cost_hkd, cost_note)
          values (se.id, (x->>'n')::int, trim(x->>'en'), nullif(trim(x->>'zh'), ''), nullif(trim(x->>'line_en'), ''), nullif(trim(x->>'line_zh'), ''), nullif(x->>'cost', '')::numeric, nullif(trim(x->>'cost_note'), ''));
      end if;
    end loop;
  end if;
  if p_repeats is not null then update public.loyalty_settings set value = case when p_repeats then '1' else '0' end, updated_at = now() where key = 'drinks_count_repeats'; end if;
  if p_max is not null then
    if p_max < 1 or p_max > 24 then raise exception 'bad_value' using errcode = 'P0001'; end if;
    update public.loyalty_settings set value = p_max::text, updated_at = now() where key = 'drinks_max_per_bill';
  end if;
  perform public.lf_passport_log(s, p_token, '-', 'drinks_owner_edit', 'bottle list / rewards saved');
  return public.owner_drinks(p_token);
end $$;

grant execute on function public.family_drinks(uuid), public.staff_drinks(uuid, text), public.staff_drinks_stamp(uuid, text, int[], text), public.staff_drinks_unstamp(uuid, bigint, text),
  public.staff_drinks_claim(uuid, text, int), public.staff_drinks_claim_undo(uuid, bigint, text), public.owner_drinks(uuid), public.owner_save_drinks(uuid, jsonb, jsonb, boolean, int) to anon, authenticated;
revoke execute on function public.lf_drinks_json(text), public.lf_drinks_from_receipt(bigint), public.lf_drinks_receipt_trg() from public, anon, authenticated;
