-- 20261014210000_receipt_fingerprint.sql — Roru Family preview (Oct 14 2026)
-- RORUBARU's POS receipts print no receipt/order number. A claim is locked by a FINGERPRINT of what IS printed:
-- date + time to the minute + table + total (server + seat count kept beside it, not in the lock: OCR misreads names).
-- Additive only: new columns on loyalty_receipts, new extension, replaced functions. No member/orders data touched.
create extension if not exists fuzzystrmatch with schema extensions;

alter table public.loyalty_receipts add column if not exists fp_key text;
alter table public.loyalty_receipts add column if not exists fp_at timestamptz;
alter table public.loyalty_receipts add column if not exists fp_table text;
alter table public.loyalty_receipts add column if not exists fp_total numeric;
alter table public.loyalty_receipts add column if not exists fp_server text;
alter table public.loyalty_receipts add column if not exists fp_seats int;
create index if not exists loyalty_receipts_fp_idx on public.loyalty_receipts (fp_table, fp_total, fp_at) where fp_at is not null;

-- old 9-arg entry point is replaced by the 12-arg one (same names; the new args default to null)
drop function if exists public.family_submit_receipt(uuid, text, numeric, timestamptz, text, text, integer, text, text);

create or replace function public.family_submit_receipt(p_token uuid, p_receipt_no text, p_total_hkd numeric, p_receipt_at timestamptz default null,
  p_shop text default null, p_source text default 'ocr', p_ocr_confidence integer default null, p_ocr_text text default null, p_image_hash text default null,
  p_table text default null, p_server text default null, p_seats integer default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $function$
declare ph text := public.lf_member_session(p_token); h text := lower(nullif(trim(coalesce(p_image_hash, '')), ''));
        tb text := upper(left(regexp_replace(coalesce(p_table, ''), '[^0-9A-Za-z]', '', 'g'), 6));
        no_k text := upper(regexp_replace(coalesce(p_receipt_no, ''), '[^0-9A-Za-z]', '', 'g'));
        tot numeric := round(p_total_hkd, 2); at_min timestamptz := date_trunc('minute', p_receipt_at);
        maxage int := coalesce((public.lf_setting('receipt_max_age_hours'))::int, 72);
        fpk text; k text; hit public.loyalty_receipts; near public.loyalty_receipts; res jsonb; rid bigint; lbl text; src text := coalesce(p_source, 'ocr');
begin
  if h is not null and h !~ '^[0-9a-f]{64}$' then h := null; end if;
  -- lock 1: this member already sent this exact photo
  if h is not null and exists (select 1 from public.loyalty_receipts where image_sha256 = h and phone = ph and status <> 'rejected') then
    raise exception 'receipt_photo_already_used' using errcode = 'P0001';
  end if;
  if tot is null or tot <= 0 or tot > 100000 then raise exception 'bad_total' using errcode = 'P0001'; end if;
  if at_min is null and length(no_k) < 3 then raise exception 'receipt_no_required' using errcode = 'P0001'; end if;
  -- the 72 h window applies to every claim of a bill, shares included
  if at_min is not null and at_min < now() - make_interval(hours => maxage) then raise exception 'receipt_too_old' using errcode = 'P0001'; end if;
  if at_min is not null and at_min > now() + interval '1 hour' then raise exception 'receipt_in_future' using errcode = 'P0001'; end if;
  if at_min is not null then
    fpk := 'FP' || to_char(at_min at time zone 'Asia/Hong_Kong', 'YYMMDDHH24MI') || 'T' || coalesce(nullif(tb, ''), 'X') || 'A' || (tot * 100)::bigint;
    -- lock 2 + 3: same fingerprint, or same date + table + total within ±2 min (a misread minute or server name)
    select * into hit from public.loyalty_receipts r
      where r.status <> 'rejected' and r.fp_at is not null and r.fp_total = tot
        and ((tb <> '' and r.fp_table = tb and abs(extract(epoch from r.fp_at - at_min)) <= 120) or r.fp_key = fpk
             -- table misread: same total, same minute (±2), same server (±2 letters) and same seat count = same bill
             or (abs(extract(epoch from r.fp_at - at_min)) <= 120 and r.fp_server is not null and nullif(trim(coalesce(p_server, '')), '') is not null
                 and levenshtein(lower(left(r.fp_server, 30)), lower(left(trim(p_server), 30))) <= 2 and r.fp_seats = p_seats)
             -- same guest again: same day, same total, same server and seat count (table and time both misread)
             or (r.phone = ph and (r.fp_at at time zone 'Asia/Hong_Kong')::date = (at_min at time zone 'Asia/Hong_Kong')::date
                 and r.fp_server is not null and nullif(trim(coalesce(p_server, '')), '') is not null
                 and levenshtein(lower(left(r.fp_server, 30)), lower(left(trim(p_server), 30))) <= 2 and r.fp_seats = p_seats))
      order by abs(extract(epoch from r.fp_at - at_min)), r.id limit 1;
  end if;
  -- the bill's key: an earlier claim of the same bill wins (so a second guest becomes a share request, the same guest is refused)
  k := coalesce(hit.receipt_key, nullif(case when length(no_k) >= 3 then no_k end, ''), fpk);
  if hit.id is null and length(no_k) >= 3 and fpk is not null and exists (select 1 from public.loyalty_receipts where fp_key = fpk and status <> 'rejected') then
    k := (select receipt_key from public.loyalty_receipts where fp_key = fpk and status <> 'rejected' order by id limit 1);
  end if;
  -- a fingerprint without a table number is too loose to auto-approve: staff check it
  if src = 'ocr' and hit.id is null and length(no_k) < 3 and tb = '' then src := 'manual'; end if;
  -- lock 4 (soft): looks like a bill already claimed (same total, within ±2 min at any table, or this guest same total same day) -> staff check, not auto points
  if hit.id is null and at_min is not null then
    select * into near from public.loyalty_receipts r
      where r.status <> 'rejected' and r.fp_at is not null and r.fp_total = tot
        and (abs(extract(epoch from r.fp_at - at_min)) <= 120
             or (r.phone = ph and (r.fp_at at time zone 'Asia/Hong_Kong')::date = (at_min at time zone 'Asia/Hong_Kong')::date))
      order by r.id limit 1;
    if near.id is not null then src := 'manual'; end if;
  end if;
  res := public.lf_submit_receipt_core(p_token, k, tot, at_min, p_shop, src, p_ocr_confidence, p_ocr_text);
  if coalesce(res->>'status', '') <> 'split_requested' then
    rid := (res->>'id')::bigint;
    lbl := case when length(no_k) >= 3 and hit.id is null then null
                else concat_ws(' · ', case when tb <> '' then 'Table ' || tb end, to_char(at_min at time zone 'Asia/Hong_Kong', 'DD/MM HH24:MI')) end;
    update public.loyalty_receipts set image_sha256 = coalesce(h, image_sha256), fp_key = fpk, fp_at = at_min, fp_table = nullif(tb, ''), fp_total = tot,
           fp_server = nullif(left(trim(coalesce(p_server, '')), 30), ''), fp_seats = case when p_seats between 1 and 60 then p_seats end,
           receipt_no = coalesce(lbl, receipt_no),
           reason = case when status <> 'pending' then reason
                         when near.id is not null then coalesce(nullif(case when coalesce(p_source, 'ocr') = 'ocr' then regexp_replace(reason, '^typed by guest(; )?', '') else reason end, '') || '; ', '') || 'looks like ' || coalesce(near.receipt_no, near.receipt_key) || ' (same total' || case when near.phone = ph then ', same guest' else '' end || ')'
                         when tb = '' and length(no_k) < 3 then coalesce(nullif(case when coalesce(p_source, 'ocr') = 'ocr' then regexp_replace(reason, '^typed by guest(; )?', '') else reason end, '') || '; ', '') || 'no table read' else reason end
     where id = rid and phone = ph;
    res := res || jsonb_build_object('read', jsonb_build_object('table', nullif(tb, ''), 'server', nullif(trim(coalesce(p_server, '')), ''), 'seats', p_seats, 'total', tot,
             'at', to_char(at_min at time zone 'Asia/Hong_Kong', 'YYYY-MM-DD HH24:MI')),
           'items', (select coalesce(jsonb_agg(jsonb_build_object('en', mi.name_en, 'zh', mi.name_zh, 'qty', ri.qty) order by ri.id), '[]'::jsonb)
                       from public.loyalty_receipt_items ri join public.loyalty_menu_items mi on mi.id = ri.item_id where ri.receipt_id = rid));
  end if;
  return res;
end $function$;
revoke all on function public.family_submit_receipt(uuid, text, numeric, timestamptz, text, text, integer, text, text, text, text, integer) from public;
grant execute on function public.family_submit_receipt(uuid, text, numeric, timestamptz, text, text, integer, text, text, text, text, integer) to anon, authenticated;

-- items: real POS layout. "3 4 Rolls Set $534.00" = 3 x "4 Roll Set"; "$178.00 each" lines skipped; $0.00 set parts count;
-- wrapped names ("Typhoon Shelter Soft" / "Shell Crab ...") joined; OCR slips matched by edit distance against the menu only.
create or replace function public.lf_extract_items(p_receipt_id bigint) returns integer
language plpgsql security definer set search_path = public, extensions as $function$
declare x public.loyalty_receipts; ln text; ents text[] := '{}'; cont boolean := false; e text; nm text; w text[]; nw int; mi record; mm text; mw int; s int; win text; d int; lim int;
        best_id int; best_score numeric; best_q int; sc numeric; q int; n int := 0;
begin
  select * into x from public.loyalty_receipts where id = p_receipt_id;
  if x.id is null or x.ocr_text is null or x.status <> 'approved' then return 0; end if;
  if coalesce(public.lf_setting('suggest_items_on'), '1') <> '1' then return 0; end if;
  delete from public.loyalty_receipt_items where receipt_id = x.id;
  foreach ln in array regexp_split_to_array(x.ocr_text, E'\n') loop
    ln := trim(ln); if ln = '' then cont := false; continue; end if;
    if ln ~* '(sub\s*-?\s*t[o0]tal|^\W*t[o0a]t[ae][lni1]\M|s[ae]r?v[il1]?[ce][ec]?\s*charge|visa|master|amex|octopus|change|cash|\mtel\M|receipt|t[ae]b[l1i]e\s*[:;.=#]|date|s[ae]r[vu][ae]r\s*[:;.=]|seat|count|thank|\mtax\M|\meach\M|@|\(852\)|road|hello|服務費|小計|合計)'
       or ln ~ '^\W*[\$£§S]\s?\d' then cont := false; continue; end if;
    if ln ~ '[\$£§]\s?\d' then ents := ents || regexp_replace(ln, '[\$£§][^\$£§]*$', ''); cont := true;
    elsif cont and ln ~ '[A-Za-z一-鿿]{2}' and array_length(ents, 1) > 0 then ents[array_length(ents, 1)] := ents[array_length(ents, 1)] || ' ' || ln; cont := false;
    else cont := false; end if;
  end loop;
  foreach e in array ents loop
    nm := trim(regexp_replace(lower(regexp_replace(e, '[^0-9A-Za-z一-鿿 ]', ' ', 'g')), '\s+', ' ', 'g'));
    if nm = '' then continue; end if;
    w := string_to_array(nm, ' '); nw := array_length(w, 1); best_id := null; best_score := 99; best_q := 1;
    for mi in select id, lower(coalesce(match_en, name_en)) m, name_zh from public.loyalty_menu_items where active loop
      if mi.name_zh is not null and length(mi.name_zh) >= 2 and e like '%' || mi.name_zh || '%' then
        sc := 0 - length(mi.name_zh) / 100.0; if sc < best_score then best_score := sc; best_id := mi.id; best_q := 1;
          if w[1] ~ '^\d{1,2}$' and not (mi.m ~ ('^' || w[1] || ' ')) then best_q := w[1]::int; end if; end if;
        continue;
      end if;
      mm := mi.m; mw := array_length(string_to_array(mm, ' '), 1);
      lim := case when length(mm) <= 5 then 1 else floor(length(mm) * 0.3)::int end;
      for s in 1 .. greatest(nw - mw + 1, 0) loop
        win := array_to_string(w[s:s + mw - 1], ' ');
        if mm ~ '^\d' and left(win, 1) <> left(mm, 1) then continue; end if;
        if abs(length(win) - length(mm)) > lim then continue; end if;
        d := levenshtein(win, mm);
        if d <= lim then
          sc := d::numeric / length(mm) - length(mm) / 1000.0;
          if sc < best_score then best_score := sc; best_id := mi.id;
            q := case when s > 1 and w[s - 1] ~ '^\d{1,2}$' then w[s - 1]::int else 1 end; best_q := case when q between 1 and 30 then q else 1 end; end if;
        end if;
      end loop;
    end loop;
    if best_id is null then continue; end if;
    insert into public.loyalty_receipt_items (receipt_id, phone, item_id, qty) values (x.id, x.phone, best_id, best_q)
      on conflict (receipt_id, item_id) do update set qty = public.loyalty_receipt_items.qty + excluded.qty;
    n := n + 1;
  end loop;
  return n;
end $function$;
notify pgrst, 'reload schema';

-- a rejected claim can share a fingerprint key with the live one: split inbox/outbox join only live claims (was listing a request once per row)
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
                    from public.loyalty_split_requests sr join public.loyalty_members rq on rq.phone = sr.requester_phone left join public.loyalty_receipts o on o.receipt_key = sr.receipt_key and o.status <> 'rejected'
                    where sr.first_phone = p_phone and sr.status = 'pending' and sr.expires_at > now()),
    'split_outbox', (select coalesce(jsonb_agg(jsonb_build_object('id', sr.id, 'receipt_no', o.receipt_no, 'status', case when sr.status = 'pending' and sr.expires_at <= now() then 'expired' else sr.status end,
                       'points', (select points from public.loyalty_receipts x where x.id = sr.receipt_id), 'created_at', sr.created_at) order by sr.created_at desc), '[]'::jsonb)
                    from public.loyalty_split_requests sr left join public.loyalty_receipts o on o.receipt_key = sr.receipt_key and o.status <> 'rejected'
                    where sr.requester_phone = p_phone and sr.created_at > now() - interval '7 days'),
    'perks', public.lf_perks_json(p_phone), 'kama_dinner', public.lf_kama_dinner(p_phone),
    'hook_today', public.lf_hook(public.lf_hk_today()), 'taste', public.lf_taste(p_phone), 'suggest', public.lf_suggest_from(base || jsonb_build_object('taste', public.lf_taste(p_phone))),
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
end $function$
;
