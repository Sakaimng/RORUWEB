
-- 20261014075000_tier_perks.sql : per-tier perks (owner-toggleable) + Kama Dinner passes. Additive.
create table if not exists public.loyalty_perks (
  key text primary key, tier text not null check (tier in ('nori','gohan','tobiko','kama')), kind text not null default 'text',
  emoji text, name_en text not null, name_zh text not null, detail_en text, detail_zh text,
  status text not null default 'off' check (status in ('on','off')), confirmed boolean not null default false,
  sort int not null default 0, updated_at timestamptz not null default now());
alter table public.loyalty_perks enable row level security;
create table if not exists public.loyalty_perk_uses (
  id bigserial primary key, phone text not null references public.loyalty_members(phone) on delete cascade,
  perk_key text not null references public.loyalty_perks(key), passes int not null default 1 check (passes between 1 and 10),
  used_at timestamptz not null default now(), staff_id int, note text, is_test boolean not null default false);
alter table public.loyalty_perk_uses enable row level security;
insert into public.loyalty_settings(key,value) values ('kama_dinner_passes','2') on conflict (key) do nothing;

insert into public.loyalty_perks(key,tier,kind,emoji,name_en,name_zh,detail_en,detail_zh,status,confirmed,sort) values
 ('nori_points','nori','mult','🍣','{x}× points on every HK$1','每 HK$1 賺 {x}× 積分',null,null,'on',true,10),
 ('nori_stamps','nori','text','🍽️','Visit stamps','到訪印章','Fill the plate, unlock a visit reward','集滿一碟，解鎖到訪獎賞','on',true,11),
 ('nori_gold','nori','text','✨','Gold receipts','金色收據','Random receipts turn gold: 2× points','隨機收據變金色：雙倍積分','on',true,12),
 ('nori_friend','nori','text','👯','Bring a friend','帶朋友來','You both get bonus points','你們都有額外積分','on',true,13),
 ('nori_bday','nori','text','🎂','Birthday roll','生日手卷','A hand roll on us in your birthday week','生日週送你一個手卷','on',true,15),
 ('nori_nights','nori','text','🌙','Weekly slow-night treats','平日晚上驚喜','Mon double stamps · Tue friends night · Wed gold rush','週一雙倍印章 · 週二朋友夜 · 週三金色收據夜','on',true,16),
 ('gohan_points','gohan','mult','🍣','{x}× points on every HK$1','每 HK$1 賺 {x}× 積分',null,null,'on',true,20),
 ('gohan_events','gohan','text','📣','First to hear about events & takeovers','搶先知道活動及客席主廚夜',null,null,'on',true,21),
 ('tobiko_points','tobiko','mult','🍣','{x}× points on every HK$1','每 HK$1 賺 {x}× 積分',null,null,'on',true,30),
 ('tobiko_secret','tobiko','text','🤫','Secret menu access','隱藏菜單','When it launches','推出後開放','on',true,31),
 ('tobiko_drops','tobiko','text','💬','WhatsApp drop alerts','WhatsApp 新品通知','Opt-in, when it launches','自選訂閱，推出後開放','on',true,32),
 ('tobiko_seats','tobiko','text','🎟️','Early access to event seats','活動座位優先預訂',null,null,'off',false,33),
 ('tobiko_plus1','tobiko','text','➕','A free +1 on Roru Day','Roru Day 免費 +1',null,null,'off',false,35),
 ('kama_points','kama','mult','🍣','{x}× points on every HK$1','每 HK$1 賺 {x}× 積分',null,null,'on',true,50),
 ('kama_invite','kama','text','🔑','Invite only','只限邀請','Chosen by Dominic','由 Dominic 親自邀請','on',true,51),
 ('kama_dinner','kama','dinner','🍶','Kama Dinner · {p} passes a year · bring a +1 with both','Kama 晚宴 · 每年 {p} 張券 · 用兩張可帶 +1','Set Kama menu (TBC) · next date TBC','Kama 套餐（待定）· 下次日期待定','on',true,52),
 ('kama_chopsticks','kama','text','🥢','Your own named chopsticks at the counter','專屬刻名筷子，留在吧枱',null,null,'off',false,53),
 ('kama_taste','kama','text','🧪','Taste-test new rolls first','搶先試食新手卷',null,null,'off',false,55),
 ('kama_seat','kama','text','💺','Counter seat held on Roru Day','Roru Day 為你保留吧枱座位',null,null,'off',false,56),
 ('kama_chef','kama','text','👨‍🍳','Chef''s choice off-menu roll, monthly','每月主廚隱藏手卷',null,null,'off',false,57)
on conflict (key) do nothing;

create or replace function public.lf_tier_rank(p text) returns int language sql immutable as $$
  select case p when 'nori' then 1 when 'gohan' then 2 when 'tobiko' then 3 when 'kama' then 5 else 0 end $$;

create or replace function public.lf_kama_dinner(p_phone text) returns jsonb
 language sql stable security definer set search_path to 'public','extensions' as $$
  select jsonb_build_object('passes', p.n, 'used', u.n, 'left', greatest(0, p.n - u.n))
  from (select coalesce((public.lf_setting('kama_dinner_passes'))::int, 2) n) p,
       (select coalesce(sum(passes),0)::int n from public.loyalty_perk_uses where phone = p_phone and perk_key = 'kama_dinner' and used_at > now() - interval '12 months') u $$;

create or replace function public.lf_perks_json(p_phone text) returns jsonb
 language sql stable security definer set search_path to 'public','extensions' as $$
  select coalesce(jsonb_agg(jsonb_build_object('key', key, 'tier', tier, 'kind', kind, 'emoji', emoji, 'name_en', name_en, 'name_zh', name_zh,
            'detail_en', detail_en, 'detail_zh', detail_zh) order by public.lf_tier_rank(tier), sort), '[]'::jsonb)
  from public.loyalty_perks where status = 'on' $$;

create or replace function public.owner_perks(p_token uuid) returns jsonb
 language plpgsql stable security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true);
begin
  return jsonb_build_object('perks', (select coalesce(jsonb_agg(to_jsonb(x) order by public.lf_tier_rank(x.tier), x.sort), '[]'::jsonb) from public.loyalty_perks x),
    'kama_dinner_passes', (public.lf_setting('kama_dinner_passes'))::int);
end $$;

create or replace function public.owner_save_perk(p_token uuid, p_key text, p_status text, p_name_en text default null, p_name_zh text default null, p_detail_en text default null, p_detail_zh text default null) returns jsonb
 language plpgsql security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true);
begin
  if p_status not in ('on','off') then raise exception 'bad_value' using errcode = 'P0001'; end if;
  if p_name_en is not null and length(trim(p_name_en)) = 0 then raise exception 'bad_value' using errcode = 'P0001'; end if;
  update public.loyalty_perks set status = p_status,
     name_en = coalesce(nullif(trim(p_name_en),''), name_en), name_zh = coalesce(nullif(trim(p_name_zh),''), name_zh),
     detail_en = case when p_detail_en is null then detail_en else nullif(trim(p_detail_en),'') end,
     detail_zh = case when p_detail_zh is null then detail_zh else nullif(trim(p_detail_zh),'') end,
     updated_at = now() where key = p_key;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  return jsonb_build_object('ok', true, 'key', p_key, 'status', p_status);
end $$;

-- staff/owner records a used Kama Dinner pass (1 solo, 2 = with a +1)
create or replace function public.staff_use_kama_pass(p_token uuid, p_phone text, p_passes int default 1) returns jsonb
 language plpgsql security definer set search_path to 'public','extensions' as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, false); d jsonb;
begin
  if public.lf_status(p_phone) <> 'kama' then raise exception 'not_kama' using errcode = 'P0001'; end if;
  if p_passes not in (1,2) then raise exception 'bad_value' using errcode = 'P0001'; end if;
  d := public.lf_kama_dinner(p_phone);
  if (d->>'left')::int < p_passes then raise exception 'no_passes_left' using errcode = 'P0001'; end if;
  insert into public.loyalty_perk_uses(phone, perk_key, passes, staff_id, is_test) values (p_phone, 'kama_dinner', p_passes, s.id, public.lf_setting('env') <> 'live');
  return jsonb_build_object('ok', true, 'kama_dinner', public.lf_kama_dinner(p_phone));
end $$;

revoke execute on function public.lf_perks_json(text), public.lf_kama_dinner(text), public.lf_tier_rank(text) from public, anon, authenticated;
