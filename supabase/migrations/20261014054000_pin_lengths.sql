
-- PIN length rule: staff PIN = 4 digits, owner PIN = 6 digits (the keypads auto-submit at that length)
create or replace function public.owner_set_staff(p_token uuid, p_id int, p_name text, p_pin text, p_role text, p_shop text, p_active boolean) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true); nid int; role text;
begin
  role := coalesce(p_role, (select st.role from public.loyalty_staff st where st.id = p_id), 'staff');
  if p_pin is not null then
    if role = 'owner' and p_pin !~ '^[0-9]{6}$' then raise exception 'owner_pin_must_be_6_digits' using errcode = 'P0001'; end if;
    if role = 'staff' and p_pin !~ '^[0-9]{4}$' then raise exception 'staff_pin_must_be_4_digits' using errcode = 'P0001'; end if;
    if exists (select 1 from public.loyalty_staff st where st.active and st.id is distinct from p_id and st.pin_hash = crypt(p_pin, st.pin_hash)) then raise exception 'pin_already_used' using errcode = 'P0001'; end if;
  end if;
  if p_id is null then
    if p_pin is null then raise exception 'pin_required' using errcode = 'P0001'; end if;
    insert into public.loyalty_staff (name, role, pin_hash, shop_id) values (coalesce(nullif(trim(p_name),''),'Staff'), role, crypt(p_pin, gen_salt('bf', 8)), p_shop) returning id into nid;
  else
    update public.loyalty_staff set name = coalesce(nullif(trim(p_name),''), name), role = role,
      pin_hash = case when p_pin is null then pin_hash else crypt(p_pin, gen_salt('bf', 8)) end,
      shop_id = coalesce(p_shop, shop_id), active = coalesce(p_active, active) where id = p_id;
    nid := p_id;
  end if;
  return jsonb_build_object('ok', true, 'id', nid);
end $$;
