-- 1. Recurring scan cadence on jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS schedule text NOT NULL DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS record_type text NOT NULL DEFAULT 'business',
  ADD COLUMN IF NOT EXISTS name text;

CREATE INDEX IF NOT EXISTS jobs_next_run_idx ON public.jobs (next_run_at) WHERE schedule <> 'one_time';

-- 2. Cumulative, cross-list record asset
CREATE TABLE public.lead_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  full_name text,
  business_name text,
  phone text,
  phone_type text,
  email text,
  city text,
  state text,
  zip text,
  disposition text NOT NULL DEFAULT 'clean',
  source_types text[] NOT NULL DEFAULT '{}',
  record_types text[] NOT NULL DEFAULT '{}',
  list_count integer NOT NULL DEFAULT 1,
  first_seen_job_id uuid,
  last_seen_job_id uuid,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_new boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, dedupe_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_records TO authenticated;
GRANT ALL ON public.lead_records TO service_role;
ALTER TABLE public.lead_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage workspace lead records"
  ON public.lead_records FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX IF NOT EXISTS lead_records_ws_idx ON public.lead_records (workspace_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS lead_records_new_idx ON public.lead_records (workspace_id) WHERE is_new;

-- 3. Event vocabulary (integration spine)
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivered_at timestamptz,
  delivery_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view workspace events"
  ON public.events FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Members insert workspace events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX IF NOT EXISTS events_ws_idx ON public.events (workspace_id, created_at DESC);

-- 4. Webhook endpoints
CREATE TABLE public.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  event_types text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO authenticated;
GRANT ALL ON public.webhook_endpoints TO service_role;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage workspace webhooks"
  ON public.webhook_endpoints FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- 5. "Since your last visit" tracking
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS last_visit_at timestamptz;

-- 6. updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_lead_records_updated_at BEFORE UPDATE ON public.lead_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_webhook_endpoints_updated_at BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Auto-roll leads into the cumulative record asset
CREATE OR REPLACE FUNCTION public.rollup_lead_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_source text;
  v_record text;
  v_disposition text;
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

  INSERT INTO public.lead_records (
    workspace_id, dedupe_key, full_name, business_name, phone, phone_type, email,
    city, state, zip, disposition, source_types, record_types,
    first_seen_job_id, last_seen_job_id, is_new
  ) VALUES (
    NEW.workspace_id, v_key, NEW.full_name, NEW.business_name, NEW.phone, NEW.phone_type, NEW.email,
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
$$;

CREATE TRIGGER leads_rollup_lead_record
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.rollup_lead_record();

-- 8. Backfill the cumulative asset from existing leads
INSERT INTO public.lead_records (
  workspace_id, dedupe_key, full_name, business_name, phone, phone_type, email,
  city, state, zip, disposition, source_types, record_types, list_count,
  first_seen_job_id, last_seen_job_id, first_seen_at, last_seen_at, is_new
)
SELECT
  l.workspace_id,
  coalesce(
    nullif(regexp_replace(coalesce(l.phone, ''), '[^0-9]', '', 'g'), ''),
    lower(coalesce(l.business_name, l.full_name, '') || '|' || coalesce(l.address, '') || '|' || coalesce(l.zip, ''))
  ) AS dedupe_key,
  (array_agg(l.full_name ORDER BY l.created_at))[1],
  (array_agg(l.business_name ORDER BY l.created_at))[1],
  (array_agg(l.phone ORDER BY l.created_at))[1],
  (array_agg(l.phone_type ORDER BY l.created_at DESC))[1],
  (array_agg(l.email ORDER BY l.created_at))[1],
  (array_agg(l.city ORDER BY l.created_at))[1],
  (array_agg(l.state ORDER BY l.created_at))[1],
  (array_agg(l.zip ORDER BY l.created_at))[1],
  CASE
    WHEN bool_or(l.scrub_status = 'litigator') THEN 'litigator'
    WHEN bool_or(l.scrub_status = 'dnc') THEN 'dnc'
    ELSE 'clean' END,
  coalesce((SELECT array_agg(DISTINCT j2.source_type) FROM public.jobs j2 WHERE j2.id = ANY(array_agg(l.job_id))), '{}'::text[]),
  '{business}'::text[],
  count(DISTINCT l.job_id)::int,
  (array_agg(l.job_id ORDER BY l.created_at))[1],
  (array_agg(l.job_id ORDER BY l.created_at DESC))[1],
  min(l.created_at),
  max(l.created_at),
  false
FROM public.leads l
GROUP BY l.workspace_id, 2
ON CONFLICT (workspace_id, dedupe_key) DO NOTHING;