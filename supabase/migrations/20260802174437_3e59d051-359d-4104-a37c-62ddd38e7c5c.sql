ALTER TABLE public.lead_records
  ADD COLUMN IF NOT EXISTS handle text,
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS followers text,
  ADD COLUMN IF NOT EXISTS engagement text;

CREATE OR REPLACE FUNCTION public.rollup_lead_record()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_key text;
  v_source text;
  v_record text;
  v_disposition text;
  v_website text;
  v_socials jsonb;
  v_handle text;
  v_platform text;
  v_followers text;
  v_engagement text;
BEGIN
  v_key := coalesce(
    nullif(regexp_replace(coalesce(NEW.phone, ''), '[^0-9]', '', 'g'), ''),
    lower(coalesce(NEW.business_name, NEW.full_name, '') || '|' || coalesce(NEW.address, '') || '|' || coalesce(NEW.zip, ''))
  );
  IF v_key IS NULL OR v_key = '||' THEN
    RETURN NEW;
  END IF;

  SELECT j.source_type, j.record_type INTO v_source, v_record
  FROM public.jobs j WHERE j.id = NEW.job_id;

  v_disposition := CASE
    WHEN NEW.scrub_status IN ('litigator', 'dnc', 'clean') THEN NEW.scrub_status
    ELSE 'clean' END;

  v_website := nullif(coalesce(NEW.source_meta->>'website', NEW.source_meta->>'url', ''), '');
  v_socials := '{}'::jsonb;
  IF nullif(coalesce(NEW.source_meta->>'instagram', ''), '') IS NOT NULL THEN
    v_socials := v_socials || jsonb_build_object('instagram', NEW.source_meta->>'instagram');
  END IF;
  IF nullif(coalesce(NEW.source_meta->>'linkedin', ''), '') IS NOT NULL THEN
    v_socials := v_socials || jsonb_build_object('linkedin', NEW.source_meta->>'linkedin');
  END IF;

  v_handle := nullif(coalesce(NEW.source_meta->>'handle', NEW.source_meta->>'username', ''), '');
  v_platform := nullif(coalesce(NEW.source_meta->>'platform', ''), '');
  v_followers := nullif(coalesce(NEW.source_meta->>'followers', NEW.source_meta->>'follower_count', ''), '');
  v_engagement := nullif(coalesce(NEW.source_meta->>'engagement', NEW.source_meta->>'engagement_rate', ''), '');

  INSERT INTO public.lead_records (
    workspace_id, dedupe_key, full_name, business_name, phone, phone_type, email,
    address, website, socials, handle, platform, followers, engagement,
    city, state, zip, disposition, source_types, record_types,
    first_seen_job_id, last_seen_job_id, is_new
  ) VALUES (
    NEW.workspace_id, v_key, NEW.full_name, NEW.business_name, NEW.phone, NEW.phone_type, NEW.email,
    NEW.address, v_website, v_socials, v_handle, v_platform, v_followers, v_engagement,
    NEW.city, NEW.state, NEW.zip, v_disposition,
    CASE WHEN v_source IS NULL THEN '{}'::text[] ELSE ARRAY[v_source] END,
    CASE WHEN v_record IS NULL THEN '{}'::text[] ELSE ARRAY[v_record] END,
    NEW.job_id, NEW.job_id, true
  )
  ON CONFLICT (workspace_id, dedupe_key) DO UPDATE SET
    full_name = coalesce(public.lead_records.full_name, EXCLUDED.full_name),
    business_name = coalesce(public.lead_records.business_name, EXCLUDED.business_name),
    phone = coalesce(public.lead_records.phone, EXCLUDED.phone),
    phone_type = coalesce(EXCLUDED.phone_type, public.lead_records.phone_type),
    email = coalesce(public.lead_records.email, EXCLUDED.email),
    address = coalesce(public.lead_records.address, EXCLUDED.address),
    website = coalesce(public.lead_records.website, EXCLUDED.website),
    socials = public.lead_records.socials || EXCLUDED.socials,
    handle = coalesce(public.lead_records.handle, EXCLUDED.handle),
    platform = coalesce(public.lead_records.platform, EXCLUDED.platform),
    followers = coalesce(EXCLUDED.followers, public.lead_records.followers),
    engagement = coalesce(EXCLUDED.engagement, public.lead_records.engagement),
    city = coalesce(public.lead_records.city, EXCLUDED.city),
    state = coalesce(public.lead_records.state, EXCLUDED.state),
    zip = coalesce(public.lead_records.zip, EXCLUDED.zip),
    disposition = CASE
      WHEN public.lead_records.disposition = 'litigator' OR EXCLUDED.disposition = 'litigator' THEN 'litigator'
      WHEN public.lead_records.disposition = 'dnc' OR EXCLUDED.disposition = 'dnc' THEN 'dnc'
      ELSE EXCLUDED.disposition END,
    source_types = (
      SELECT array_agg(DISTINCT s) FROM unnest(public.lead_records.source_types || EXCLUDED.source_types) AS s
    ),
    record_types = (
      SELECT array_agg(DISTINCT r) FROM unnest(public.lead_records.record_types || EXCLUDED.record_types) AS r
    ),
    list_count = public.lead_records.list_count + CASE
      WHEN public.lead_records.last_seen_job_id IS DISTINCT FROM EXCLUDED.last_seen_job_id THEN 1 ELSE 0 END,
    last_seen_job_id = EXCLUDED.last_seen_job_id,
    last_seen_at = now(),
    is_new = false,
    updated_at = now();

  RETURN NEW;
END;
$function$;

UPDATE public.lead_records lr
SET handle = coalesce(lr.handle, nullif(coalesce(l.source_meta->>'handle', l.source_meta->>'username', ''), '')),
    platform = coalesce(lr.platform, nullif(coalesce(l.source_meta->>'platform', ''), '')),
    followers = coalesce(lr.followers, nullif(coalesce(l.source_meta->>'followers', l.source_meta->>'follower_count', ''), '')),
    engagement = coalesce(lr.engagement, nullif(coalesce(l.source_meta->>'engagement', l.source_meta->>'engagement_rate', ''), ''))
FROM public.leads l
WHERE l.workspace_id = lr.workspace_id
  AND l.source_meta IS NOT NULL
  AND (
    (lr.phone IS NOT NULL AND l.phone = lr.phone)
    OR (lr.phone IS NULL AND lower(coalesce(l.business_name, l.full_name, '')) = lower(coalesce(lr.business_name, lr.full_name, '')) AND coalesce(l.zip,'') = coalesce(lr.zip,''))
  );