-- Roru Family v1c: "coming soon" extras (Dominic 14:13: roll out in phases). Teasers only, no mechanics yet. Additive.
create table if not exists public.loyalty_features (
  key text primary key,
  emoji text,
  name_en text not null, name_zh text not null,
  detail_en text, detail_zh text,
  status text not null default 'soon' check (status in ('off','soon','on')),   -- off = hidden, soon = locked teaser on /family, on = reserved for when it's built
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.loyalty_features enable row level security;
revoke all on public.loyalty_features from anon, authenticated;
insert into public.loyalty_features (key, emoji, name_en, name_zh, detail_en, detail_zh, sort) values
  ('gold_receipt', '✨', 'Gold receipt', '金色收據', 'Random scans turn gold: double points or a free roll.', '隨機掃描會變金色：雙倍積分或免費手卷。', 1),
  ('bring_friend', '👯', 'Bring a friend', '帶朋友來', 'Bring a friend — you both get bonus points.', '帶朋友來 — 你們都可獲額外積分。', 2),
  ('birthday_roll', '🎂', 'Birthday roll', '生日手卷', 'A hand roll on us in your birthday week.', '生日週送你一個手卷。', 3),
  ('secret_menu', '🤫', 'Secret menu', '隱藏菜單', 'An off-menu roll for Tobiko and up.', 'Tobiko 或以上會員專享的隱藏手卷。', 4),
  ('fish_collection', '🐟', 'Fish collection', '魚類收集', 'Try every fish, earn a badge.', '嚐遍每一款魚，贏取徽章。', 5)
on conflict (key) do nothing;

create or replace function public.family_features() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(jsonb_build_object('key', key, 'emoji', emoji, 'name_en', name_en, 'name_zh', name_zh, 'detail_en', detail_en, 'detail_zh', detail_zh, 'status', status) order by sort), '[]'::jsonb)
  from public.loyalty_features where status <> 'off'
$$;
create or replace function public.owner_features(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true);
begin
  return (select coalesce(jsonb_agg(to_jsonb(f) order by f.sort), '[]'::jsonb) from public.loyalty_features f);
end $$;
create or replace function public.owner_save_feature(p_token uuid, p_key text, p_status text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare s public.loyalty_staff := public.lf_staff_session(p_token, true);
begin
  if p_status not in ('off','soon') then raise exception 'bad_value' using errcode = 'P0001'; end if;   -- 'on' only once a feature is actually built
  update public.loyalty_features set status = p_status, updated_at = now() where key = p_key;
  if not found then raise exception 'feature_not_found' using errcode = 'P0001'; end if;
  return jsonb_build_object('ok', true, 'key', p_key, 'status', p_status);
end $$;
grant execute on function public.family_features(), public.owner_features(uuid), public.owner_save_feature(uuid, text, text) to anon, authenticated;
