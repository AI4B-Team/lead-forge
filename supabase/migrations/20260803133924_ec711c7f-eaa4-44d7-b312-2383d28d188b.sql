-- Property Scan ("AI Driving for Dollars") module

CREATE TABLE IF NOT EXISTS public.parcel_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apn text NOT NULL,
  fips text NOT NULL,
  lat numeric,
  lng numeric,
  condition_vector jsonb NOT NULL DEFAULT '{}'::jsonb,
  boolean_detections jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_vector jsonb NOT NULL DEFAULT '{}'::jsonb,
  distress_score numeric NOT NULL DEFAULT 0,
  condition_confidence numeric,
  rationale jsonb,
  imagery_source text NOT NULL,
  imagery_date date NOT NULL,
  model_version text NOT NULL,
  scored_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apn, fips, imagery_date, model_version)
);
CREATE INDEX IF NOT EXISTS parcel_conditions_fips_score_idx ON public.parcel_conditions (fips, distress_score DESC);
CREATE INDEX IF NOT EXISTS parcel_conditions_apn_idx ON public.parcel_conditions (apn, fips);

GRANT SELECT ON public.parcel_conditions TO authenticated;
GRANT ALL ON public.parcel_conditions TO service_role;
ALTER TABLE public.parcel_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parcel conditions readable by signed-in users" ON public.parcel_conditions
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.scan_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  name text,
  mode text NOT NULL DEFAULT 'area',
  vertical text NOT NULL DEFAULT 'investor',
  prompt text,
  example_parcels jsonb NOT NULL DEFAULT '[]'::jsonb,
  match_threshold int NOT NULL DEFAULT 75,
  images_per int NOT NULL DEFAULT 3,
  buy_box jsonb NOT NULL DEFAULT '{}'::jsonb,
  areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_list_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  parcels_in_area int,
  parcels_filtered int,
  parcels_scanned int,
  parcels_matched int,
  credits_quoted int,
  credits_charged int,
  credits_refunded int,
  status text NOT NULL DEFAULT 'draft',
  failed_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS scan_jobs_ws_idx ON public.scan_jobs (workspace_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_jobs TO authenticated;
GRANT ALL ON public.scan_jobs TO service_role;
ALTER TABLE public.scan_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members read scans" ON public.scan_jobs
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "workspace members create scans" ON public.scan_jobs
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id) AND created_by = auth.uid());
CREATE POLICY "workspace members update scans" ON public.scan_jobs
  FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "workspace admins delete scans" ON public.scan_jobs
  FOR DELETE TO authenticated USING (public.is_workspace_admin(workspace_id));

CREATE TABLE IF NOT EXISTS public.scan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.scan_jobs(id) ON DELETE CASCADE,
  parcel_condition_id uuid REFERENCES public.parcel_conditions(id) ON DELETE SET NULL,
  apn text,
  address text,
  city text,
  state text,
  zip text,
  distress_score numeric,
  condition_confidence numeric,
  matched boolean NOT NULL DEFAULT false,
  match_reason text,
  refusal_code text,
  refunded boolean NOT NULL DEFAULT false,
  scored_image_url text,
  scored_image_src text,
  scored_image_date date,
  sv_pano_id text,
  sv_heading numeric,
  sv_lat numeric,
  sv_lng numeric,
  enriched_at timestamptz,
  skip_traced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scan_results_job_idx ON public.scan_results (job_id, distress_score DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_results TO authenticated;
GRANT ALL ON public.scan_results TO service_role;
ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members read scan results" ON public.scan_results
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.scan_jobs j WHERE j.id = job_id AND public.is_workspace_member(j.workspace_id)
  ));
CREATE POLICY "workspace members write scan results" ON public.scan_results
  FOR ALL TO authenticated USING (EXISTS (
    SELECT 1 FROM public.scan_jobs j WHERE j.id = job_id AND public.is_workspace_member(j.workspace_id)
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.scan_jobs j WHERE j.id = job_id AND public.is_workspace_member(j.workspace_id)
  ));

CREATE TABLE IF NOT EXISTS public.monitor_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  scan_job_id uuid REFERENCES public.scan_jobs(id) ON DELETE CASCADE,
  list_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  cadence text NOT NULL DEFAULT 'monthly',
  vertical text NOT NULL DEFAULT 'investor',
  alert_on jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_run_at timestamptz,
  next_run_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS monitor_subs_ws_idx ON public.monitor_subscriptions (workspace_id, active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitor_subscriptions TO authenticated;
GRANT ALL ON public.monitor_subscriptions TO service_role;
ALTER TABLE public.monitor_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members manage monitors" ON public.monitor_subscriptions
  FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE TABLE IF NOT EXISTS public.lead_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  result_id uuid REFERENCES public.scan_results(id) ON DELETE CASCADE,
  lead_record_id uuid REFERENCES public.lead_records(id) ON DELETE CASCADE,
  set_by uuid NOT NULL DEFAULT auth.uid(),
  status text,
  reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_outcomes_ws_idx ON public.lead_outcomes (workspace_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_outcomes TO authenticated;
GRANT ALL ON public.lead_outcomes TO service_role;
ALTER TABLE public.lead_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members manage lead outcomes" ON public.lead_outcomes
  FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));