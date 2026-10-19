-- f41 (Oct 19 2026, task a9aa8a20): "$RORU of the week" Monday queue. ADDITIVE (new columns + new functions); the f39
-- functions lf_roll_week_at / owner_roll_week / owner_set_roll_week and the f39 read policy are redefined in place (all
-- created today by f39 for this feature; their f39 bodies stay in 20261019110000_roll_token_week_f39.sql). No data is deleted.
--
-- How the switch works (no cron): every pick is a row in loyalty_roll_week with an effective start (starts_at; null on old
-- rows = created_at). The item on at moment T = the latest row whose start <= T and that was not stopped by T. Queued weeks are
-- rows whose start is a future Monday 00:00 Asia/Hong_Kong, so at that instant they become "current" by themselves.
-- Bills: lf_roll_week_credit already asks lf_roll_week_at(the bill's time), so a bill in week N gets week N's item.
-- Removing / reordering the queue cancels the future rows (stopped_at = cancelled_at = now(), before their start, so they
-- can never be current) and inserts the new order. Stop ends the current item AND cancels the queue.
-- Guests: the public read policy now only shows rows that have started, so the queue never reaches a guest (API or realtime).

alter table public.loyalty_roll_week add column if not exists starts_at timestamptz;
alter table public.loyalty_roll_week add column if not exists cancelled_at timestamptz;
create index if not exists loyalty_roll_week_start_idx on public.loyalty_roll_week ((coalesce(starts_at, created_at)) desc);

-- guests only ever see weeks that have started
drop policy if exists roll_week_read on public.loyalty_roll_week;
create policy roll_week_read on public.loyalty_roll_week for select to anon, authenticated
  using (coalesce(starts_at, created_at) <= now() and cancelled_at is null);

create or replace function public.lf_roll_week_at(p_at timestamptz default now())
returns public.loyalty_roll_week language sql stable security definer set search_path = public, extensions as $$
  select w.* from public.loyalty_roll_week w
   where coalesce(w.starts_at, w.created_at) <= coalesce(p_at, now())
     and (w.stopped_at is null or w.stopped_at > coalesce(p_at, now()))
   order by coalesce(w.starts_at, w.created_at) desc, w.id desc limit 1
$$;

-- the Monday 00:00 (Hong Kong) after p_at
create or replace function public.lf_next_monday_hk(p_at timestamptz default now())
returns timestamptz language sql stable set search_path = public, extensions as $$
  select ((((p_at at time zone 'Asia/Hong_Kong')::date) + (8 - extract(isodow from (p_at at time zone 'Asia/Hong_Kong'))::int))::timestamp
          at time zone 'Asia/Hong_Kong')
$$;

-- queued weeks (start in the future, not cancelled), oldest first
create or replace function public.lf_roll_week_queue_json()
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'item_id', w.item_id, 'name_en', w.name_en, 'name_zh', w.name_zh, 'price_hkd', w.price_hkd,
           'multiplier', w.multiplier, 'starts_on', w.starts_on, 'starts_at', w.starts_at) order by w.starts_at, w.id), '[]'::jsonb)
    from public.loyalty_roll_week w
   where w.starts_at > now() and w.stopped_at is null and w.cancelled_at is null
$$;

create or replace function public.owner_roll_week(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true); cur public.loyalty_roll_week := public.lf_roll_week_at(now());
begin
  return jsonb_build_object('current', public.lf_roll_week_json(),
    'queue', public.lf_roll_week_queue_json(),
    'queue_max', 8,
    'next_monday', public.lf_next_monday_hk(now()),
    'menu', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name_en', name_en, 'name_zh', name_zh, 'kind', kind, 'price_hkd', price_hkd) order by id), '[]'::jsonb) from public.loyalty_menu_items where active),
    'history', (select coalesce(jsonb_agg(x order by (x->>'set_at') desc), '[]'::jsonb) from (
        select jsonb_build_object('id', w.id, 'name_en', w.name_en, 'name_zh', w.name_zh, 'multiplier', w.multiplier, 'price_hkd', w.price_hkd, 'starts_on', w.starts_on, 'set_at', coalesce(w.starts_at, w.created_at), 'stopped_at', w.stopped_at,
               'set_by', (select name from public.loyalty_staff st where st.id = w.set_by),
               'bills', (select count(*) from public.loyalty_roll_week_bonuses b where b.week_id = w.id),
               'extra', (select coalesce(sum(points), 0) from public.loyalty_roll_week_bonuses b where b.week_id = w.id)) x
          from public.loyalty_roll_week w
         where coalesce(w.starts_at, w.created_at) <= now() and w.cancelled_at is null
         order by coalesce(w.starts_at, w.created_at) desc, w.id desc limit 8) t),
    'this_week', jsonb_build_object('bills', (select count(*) from public.loyalty_roll_week_bonuses b where b.week_id = cur.id),
                                    'extra', (select coalesce(sum(points), 0) from public.loyalty_roll_week_bonuses b where b.week_id = cur.id),
                                    'qty', (select coalesce(sum(qty), 0) from public.loyalty_roll_week_bonuses b where b.week_id = cur.id)));
end $$;

-- owner picks the current item now (p_item_id) or stops everything (p_item_id null = current off AND queue cleared). Owner PIN only.
-- Picking a new current item keeps the queue.
create or replace function public.owner_set_roll_week(p_token uuid, p_item_id int, p_price_hkd numeric default null, p_multiplier numeric default 2)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true); mi public.loyalty_menu_items; pr numeric; test boolean := public.lf_setting('env') <> 'live';
begin
  if p_item_id is not null then
    select * into mi from public.loyalty_menu_items where id = p_item_id and active;
    if mi.id is null then raise exception 'item_not_found' using errcode = 'P0001'; end if;
    pr := coalesce(p_price_hkd, mi.price_hkd);
    if pr is null or pr <= 0 or pr > 100000 then raise exception 'price_required' using errcode = 'P0001'; end if;
    if p_multiplier is null or p_multiplier < 1 or p_multiplier > 5 then raise exception 'bad_value' using errcode = 'P0001'; end if;
    -- end whatever is on now; queued weeks stay
    update public.loyalty_roll_week set active = false, stopped_at = now(), stopped_by = s.id
     where stopped_at is null and coalesce(starts_at, created_at) <= now();
    insert into public.loyalty_roll_week (item_id, name_en, name_zh, price_hkd, multiplier, starts_on, starts_at, set_by, is_test)
      values (mi.id, mi.name_en, mi.name_zh, pr, p_multiplier, public.lf_hk_today(), now(), s.id, test);
    if mi.price_hkd is null then update public.loyalty_menu_items set price_hkd = pr where id = mi.id; end if;
  else
    -- Stop: current off and the queue cleared
    update public.loyalty_roll_week set active = false, stopped_at = now(), stopped_by = s.id,
           cancelled_at = case when coalesce(starts_at, created_at) > now() then now() else cancelled_at end
     where stopped_at is null;
  end if;
  return jsonb_build_object('ok', true, 'current', public.lf_roll_week_json(), 'queue', public.lf_roll_week_queue_json());
end $$;

-- owner saves the whole "Up next" list in order: p_items = [{"item_id": 18, "price_hkd": 38}, ...] (max 8).
-- Item 1 starts next Monday 00:00 HK, item 2 the Monday after, and so on. An empty list clears the queue.
create or replace function public.owner_set_roll_week_queue(p_token uuid, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true); test boolean := public.lf_setting('env') <> 'live';
  e jsonb; k int := 0; mi public.loyalty_menu_items; pr numeric; mon timestamptz := public.lf_next_monday_hk(now()); st timestamptz;
begin
  if p_items is null then p_items := '[]'::jsonb; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if jsonb_array_length(p_items) > 8 then raise exception 'queue_full' using errcode = 'P0001'; end if;
  -- validate everything first
  for e in select * from jsonb_array_elements(p_items) loop
    select * into mi from public.loyalty_menu_items where id = (e->>'item_id')::int and active;
    if mi.id is null then raise exception 'item_not_found' using errcode = 'P0001'; end if;
    pr := coalesce(nullif(e->>'price_hkd', '')::numeric, mi.price_hkd);
    if pr is null or pr <= 0 or pr > 100000 then raise exception 'price_required' using errcode = 'P0001'; end if;
  end loop;
  -- cancel the old queue
  update public.loyalty_roll_week set active = false, stopped_at = now(), cancelled_at = now(), stopped_by = s.id
   where starts_at > now() and stopped_at is null;
  for e in select * from jsonb_array_elements(p_items) loop
    select * into mi from public.loyalty_menu_items where id = (e->>'item_id')::int and active;
    pr := coalesce(nullif(e->>'price_hkd', '')::numeric, mi.price_hkd);
    st := mon + make_interval(days => 7 * k);
    insert into public.loyalty_roll_week (item_id, name_en, name_zh, price_hkd, multiplier, starts_on, starts_at, set_by, is_test)
      values (mi.id, mi.name_en, mi.name_zh, pr, 2, (st at time zone 'Asia/Hong_Kong')::date, st, s.id, test);
    if mi.price_hkd is null then update public.loyalty_menu_items set price_hkd = pr where id = mi.id; end if;
    k := k + 1;
  end loop;
  return jsonb_build_object('ok', true, 'current', public.lf_roll_week_json(), 'queue', public.lf_roll_week_queue_json());
end $$;

grant execute on function public.owner_roll_week(uuid), public.owner_set_roll_week(uuid, int, numeric, numeric),
  public.owner_set_roll_week_queue(uuid, jsonb) to anon, authenticated;
revoke execute on function public.lf_roll_week_queue_json(), public.lf_next_monday_hk(timestamptz) from public, anon, authenticated;
