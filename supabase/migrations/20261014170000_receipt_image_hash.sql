CREATE OR REPLACE FUNCTION public.lf_submit_receipt_core(p_token uuid, p_receipt_no text, p_total_hkd numeric, p_receipt_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_shop text DEFAULT NULL::text, p_source text DEFAULT 'ocr'::text, p_ocr_confidence integer DEFAULT NULL::integer, p_ocr_text text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare ph text := public.lf_member_session(p_token); o public.loyalty_receipts; k text; n int; st text := 'approved'; why text := null; rid bigint; test boolean := public.lf_setting('env') <> 'live';
        maxage int := coalesce((public.lf_setting('receipt_max_age_hours'))::int, 48); perday int := coalesce((public.lf_setting('receipts_per_day'))::int, 3);
        approve_over numeric := coalesce((public.lf_setting('approve_over_hkd'))::numeric, 1500); minconf int := coalesce((public.lf_setting('ocr_min_confidence'))::int, 60);
begin
  k := upper(regexp_replace(coalesce(p_receipt_no,''), '[^0-9A-Za-z]', '', 'g'));
  if length(k) < 3 then raise exception 'receipt_no_required' using errcode = 'P0001'; end if;
  if p_total_hkd is null or p_total_hkd <= 0 or p_total_hkd > 100000 then raise exception 'bad_total' using errcode = 'P0001'; end if;
  if public.lf_receipt_used(k) then
    select * into o from public.loyalty_receipts where receipt_key = k and status <> 'rejected';
    if o.id is null or o.phone = ph or o.status <> 'approved'
       or exists (select 1 from public.loyalty_receipts x where x.base_key = k and x.phone = ph and x.status <> 'rejected')
       or exists (select 1 from public.loyalty_split_requests sr where sr.receipt_key = k and sr.requester_phone = ph and sr.status in ('pending','accepted') and sr.expires_at > now()) then
      raise exception 'receipt_already_used' using errcode = 'P0001';
    end if;
    if (select count(*) from public.loyalty_receipts x where (x.receipt_key = k or x.base_key = k) and x.status = 'approved') >= 6 then raise exception 'split_full' using errcode = 'P0001'; end if;
    if (select count(*) from public.loyalty_split_requests sr where sr.requester_phone = ph and sr.created_at > now() - interval '24 hours') >= perday then raise exception 'daily_receipt_limit' using errcode = 'P0001'; end if;
    update public.loyalty_split_requests set status = 'expired', decided_at = now() where receipt_key = k and requester_phone = ph and status = 'pending' and expires_at <= now();
    insert into public.loyalty_split_requests (receipt_key, first_phone, requester_phone, is_test) values (k, o.phone, ph, test) returning id into rid;
    return jsonb_build_object('ok', true, 'status', 'split_requested', 'id', rid, 'member', public.lf_member_json(ph));
  end if;
  if p_receipt_at is not null and p_receipt_at < now() - make_interval(hours => maxage) then raise exception 'receipt_too_old' using errcode = 'P0001'; end if;
  if p_receipt_at is not null and p_receipt_at > now() + interval '1 hour' then raise exception 'receipt_in_future' using errcode = 'P0001'; end if;
  select count(*) into n from public.loyalty_receipts where phone = ph and created_at > now() - interval '24 hours' and status <> 'rejected';
  if n >= perday then raise exception 'daily_receipt_limit' using errcode = 'P0001'; end if;
  if p_source <> 'ocr' then st := 'pending'; why := 'typed by guest'; end if;
  if p_source = 'ocr' and (p_ocr_confidence is null or p_ocr_confidence < minconf) then st := 'pending'; why := 'low OCR confidence'; end if;
  if p_total_hkd >= approve_over then st := 'pending'; why := coalesce(why || '; ', '') || 'over HK$' || approve_over::int; end if;
  if p_receipt_at is null then st := 'pending'; why := coalesce(why || '; ', '') || 'no date read'; end if;
  insert into public.loyalty_receipts (phone, shop_id, receipt_no, receipt_key, total_hkd, receipt_at, status, source, ocr_confidence, ocr_text, reason, is_test)
    values (ph, p_shop, trim(p_receipt_no), k, round(p_total_hkd, 2), p_receipt_at, st, p_source, p_ocr_confidence, left(p_ocr_text, 2000), why, test) returning id into rid;
  if st = 'approved' then perform public.lf_credit_receipt(rid); end if;
  return jsonb_build_object('ok', true, 'id', rid, 'status', st, 'reason', why, 'points', (select points from public.loyalty_receipts where id = rid), 'visit', (select visit_result from public.loyalty_receipts where id = rid), 'member', public.lf_member_json(ph));
end $function$;
revoke all on function public.lf_submit_receipt_core(uuid, text, numeric, timestamptz, text, text, integer, text) from public, anon, authenticated;
alter table public.loyalty_receipts add column if not exists image_sha256 text;
create index if not exists loyalty_receipts_image_sha256_idx on public.loyalty_receipts (image_sha256) where image_sha256 is not null;
drop function if exists public.family_submit_receipt(uuid, text, numeric, timestamptz, text, text, integer, text);
-- Receipt photo policy (Dominic Oct 14 16:11): the photo is read on the guest's phone and never uploaded; we keep only the extracted
-- fields (+ line items, see lf_extract_items) and a one-way SHA-256 of the photo bytes to catch the same photo being sent twice.
create or replace function public.family_submit_receipt(p_token uuid, p_receipt_no text, p_total_hkd numeric, p_receipt_at timestamptz default null, p_shop text default null,
  p_source text default 'ocr', p_ocr_confidence integer default null, p_ocr_text text default null, p_image_hash text default null)
returns jsonb language plpgsql security definer set search_path to 'public','extensions' as $$
declare ph text := public.lf_member_session(p_token); h text := lower(nullif(trim(coalesce(p_image_hash, '')), '')); res jsonb; k text;
begin
  if h is not null and h !~ '^[0-9a-f]{64}$' then h := null; end if;
  if h is not null and exists (select 1 from public.loyalty_receipts where image_sha256 = h and phone = ph and status <> 'rejected') then
    raise exception 'receipt_photo_already_used' using errcode = 'P0001';
  end if;
  res := public.lf_submit_receipt_core(p_token, p_receipt_no, p_total_hkd, p_receipt_at, p_shop, p_source, p_ocr_confidence, p_ocr_text);
  if h is not null and coalesce(res->>'status', '') <> 'split_requested' then
    k := upper(regexp_replace(coalesce(p_receipt_no,''), '[^0-9A-Za-z]', '', 'g'));
    update public.loyalty_receipts set image_sha256 = h where id = (select id from public.loyalty_receipts where phone = ph and receipt_key = k order by id desc limit 1);
  end if;
  return res;
end $$;
grant execute on function public.family_submit_receipt(uuid, text, numeric, timestamptz, text, text, integer, text, text) to anon, authenticated;
