
-- preview only: p_demo=true skips the one-per-day rule by booking the roll on the nearest free earlier day (is_test rows). Ignored when env='live'.
create or replace function public.staff_add_roll(p_token uuid, p_who text, p_shop text default null, p_demo boolean default false) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token);
        m public.loyalty_members; shop text; today date := public.lf_hk_today(); vday date;
        per_plate int := coalesce((public.lf_setting('rolls_per_plate'))::int, 5);
        gold boolean := false; bonus boolean := false; plate_full boolean := false;
        v30 int; test boolean := public.lf_setting('env') <> 'live';
        rw public.loyalty_rewards; rd_code text; reward jsonb := null; q text;
begin
  q := upper(regexp_replace(coalesce(p_who,''), '[^0-9A-Za-z+]', '', 'g'));
  select * into m from public.loyalty_members where member_code = q;
  if m.phone is null then
    begin select * into m from public.loyalty_members where phone = public.lf_norm_phone(q); exception when others then null; end;
  end if;
  if m.phone is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
  select coalesce(p_shop, se.shop_id, 'wanchai') into shop from public.loyalty_sessions se where se.token = p_token;
  vday := today;
  if exists (select 1 from public.loyalty_visits where phone = m.phone and kind = 'visit' and visit_day = today) then
    if p_demo and test then
      select max(d) into vday from generate_series(today - 60, today, interval '1 day') g(d)
        where not exists (select 1 from public.loyalty_visits v where v.phone = m.phone and v.kind='visit' and v.visit_day = g.d::date);
      if vday is null then raise exception 'already_today' using errcode = 'P0001'; end if;
    else
      raise exception 'already_today' using errcode = 'P0001';
    end if;
  end if;
  gold := random() < coalesce((public.lf_setting('gold_roll_chance'))::numeric, 0.1);
  insert into public.loyalty_visits (phone, shop_id, staff_id, kind, visit_day, gold, is_test) values (m.phone, shop, s.id, 'visit', vday, gold, test);
  update public.loyalty_members set rolls_on_plate = rolls_on_plate + 1, last_visit_at = now(), gold_rolls = gold_rolls + (case when gold then 1 else 0 end)
    where phone = m.phone;
  select count(*) into v30 from public.loyalty_visits where phone = m.phone and kind = 'visit' and visit_day > today - coalesce((public.lf_setting('streak_days'))::int, 30);
  if v30 = coalesce((public.lf_setting('streak_visits'))::int, 3)
     and not exists (select 1 from public.loyalty_visits where phone = m.phone and kind = 'bonus' and visit_day > today - coalesce((public.lf_setting('streak_days'))::int, 30)) then
    bonus := true;
    insert into public.loyalty_visits (phone, shop_id, staff_id, kind, visit_day, is_test) values (m.phone, shop, s.id, 'bonus', today, test);
    update public.loyalty_members set rolls_on_plate = rolls_on_plate + 1 where phone = m.phone;
  end if;
  select * into m from public.loyalty_members where phone = m.phone;
  while m.rolls_on_plate >= per_plate loop
    plate_full := true;
    select r.* into rw from public.loyalty_rewards r where r.active and r.kind = 'plate' and r.weight > 0 order by -ln(random()) / r.weight limit 1;
    if rw.id is null then raise exception 'no_active_rewards' using errcode = 'P0001'; end if;
    rd_code := 'R' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 7));
    insert into public.loyalty_redemptions (phone, reward_id, reward_code, is_test) values (m.phone, rw.id, rd_code, test);
    update public.loyalty_members set rolls_on_plate = rolls_on_plate - per_plate, plates_completed = plates_completed + 1,
      tier = case when tier = 'kama' then 'kama' else public.lf_tier(plates_completed + 1) end
      where phone = m.phone;
    select * into m from public.loyalty_members where phone = m.phone;
    reward := jsonb_build_object('code', rd_code, 'name_en', rw.name_en, 'name_zh', rw.name_zh);
  end loop;
  return jsonb_build_object('ok', true, 'added', true, 'gold', gold, 'bonus', bonus, 'plate_full', plate_full, 'demo_day', (vday <> today), 'reward', reward,
                            'member', public.lf_member_json(m.phone));
end $$;
drop function if exists public.staff_add_roll(uuid, text, text);
grant execute on function public.staff_add_roll(uuid, text, text, boolean) to anon, authenticated;
