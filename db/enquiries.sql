-- RORUBARU website enquiries pipeline (events + catering), draft Nov 14 2026.
-- NOT APPLIED YET. Apply manually in the Supabase SQL editor (project "Roru Loyalty")
-- only after Dominic approves the preview build. Until then the /events and /catering
-- pages and the owner/staff Enquiries views run on the synthetic pipeline in
-- public/loyalty/enquiries.js (sample rows + this-browser localStorage, nothing sent).
--
-- Design: one table, one public submit function, manager/owner read + update
-- functions. Same patterns as the loyalty stack: RLS on, all access via
-- security-definer functions, lf_staff_need_manager for the staff/owner side.

create table if not exists public.roru_enquiries (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('event', 'catering')),
  name text not null,
  email text not null,
  phone text not null default '',
  event_date date,
  headcount int,
  budget text not null default '',
  details jsonb not null default '{}'::jsonb,   -- catering: {company, fulfil}
  message text not null default '',
  lang text not null default 'en',
  -- 'agreed' = agreed with the customer; enquiry tracking only, NOT a reservation.
  status text not null default 'new' check (status in ('new', 'in_touch', 'agreed', 'closed')),
  handled_by text not null default '',
  handled_at timestamptz,
  notes text not null default ''
);
alter table public.roru_enquiries enable row level security;
create index if not exists roru_enquiries_status_idx on public.roru_enquiries (status, created_at desc);

-- Public submit (website forms; anon key). Validates, trims, rate-limits 3 per
-- email per day. Honeypot is handled client-side; nothing here trusts the client.
create or replace function public.roru_enquiry_submit(
  p_kind text, p_name text, p_email text, p_phone text default '',
  p_event_date text default '', p_headcount int default null,
  p_budget text default '', p_details jsonb default '{}'::jsonb,
  p_message text default '', p_lang text default 'en'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  k text := lower(left(trim(coalesce(p_kind, '')), 20));
  nm text := left(trim(coalesce(p_name, '')), 200);
  em text := lower(left(trim(coalesce(p_email, '')), 254));
  ph text := left(trim(coalesce(p_phone, '')), 40);
  bg text := left(trim(coalesce(p_budget, '')), 60);
  ms text := left(trim(coalesce(p_message, '')), 5000);
  lg text := case when p_lang = 'zh' then 'zh' else 'en' end;
  d date;
begin
  if k not in ('event', 'catering') then return jsonb_build_object('ok', false, 'error', 'bad_kind'); end if;
  if length(nm) = 0 then return jsonb_build_object('ok', false, 'error', 'name_required'); end if;
  if em !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then return jsonb_build_object('ok', false, 'error', 'email_invalid'); end if;
  if length(ms) < 8 then return jsonb_build_object('ok', false, 'error', 'message_short'); end if;
  if p_headcount is not null and (p_headcount < 1 or p_headcount > 2000) then return jsonb_build_object('ok', false, 'error', 'bad_headcount'); end if;
  d := nullif(trim(coalesce(p_event_date, '')), '')::date;
  if (select count(*) from public.roru_enquiries where email = em and created_at > now() - interval '1 day') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'too_many');
  end if;
  insert into public.roru_enquiries (kind, name, email, phone, event_date, headcount, budget, details, message, lang)
  values (k, nm, em, ph, d, p_headcount, bg, coalesce(p_details, '{}'::jsonb), ms, lg);
  return jsonb_build_object('ok', true);
exception when others then
  return jsonb_build_object('ok', false, 'error', 'bad_input');
end $$;

revoke all on function public.roru_enquiry_submit(text, text, text, text, text, int, text, jsonb, text, text) from public;
grant execute on function public.roru_enquiry_submit(text, text, text, text, text, int, text, jsonb, text, text) to anon, authenticated;

-- Manager/owner list, newest first, plus the "new" count for badges.
create or replace function public.staff_enquiries(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.loyalty_staff := public.lf_staff_need_manager(p_token);
begin
  return jsonb_build_object(
    'new_count', (select count(*) from public.roru_enquiries where status = 'new'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'created_at', e.created_at, 'kind', e.kind, 'name', e.name,
        'email', e.email, 'phone', e.phone, 'event_date', e.event_date,
        'headcount', e.headcount, 'budget', e.budget, 'details', e.details,
        'message', e.message, 'lang', e.lang, 'status', e.status,
        'handled_by', e.handled_by, 'handled_at', e.handled_at, 'notes', e.notes
      ) order by e.created_at desc)
      from (select * from public.roru_enquiries order by created_at desc limit 200) e
    ), '[]'::jsonb)
  );
end $$;

revoke all on function public.staff_enquiries(text) from public;
grant execute on function public.staff_enquiries(text) to anon, authenticated;

-- Manager/owner status + note update. Leaving 'new' stamps who handled it.
create or replace function public.staff_enquiry_update(p_token text, p_id bigint, p_status text, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s public.loyalty_staff := public.lf_staff_need_manager(p_token);
  st text := lower(trim(coalesce(p_status, '')));
begin
  if st not in ('new', 'in_touch', 'agreed', 'closed') then
    raise exception 'bad_status' using errcode = 'P0001';
  end if;
  update public.roru_enquiries set
    status = st,
    notes = coalesce(p_notes, notes),
    handled_by = case when status = 'new' and st <> 'new' then s.name else handled_by end,
    handled_at = case when status = 'new' and st <> 'new' then now() else handled_at end
  where id = p_id;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.staff_enquiry_update(text, bigint, text, text) from public;
grant execute on function public.staff_enquiry_update(text, bigint, text, text) to anon, authenticated;
