-- 1. data_sources extensions
ALTER TABLE public.data_sources
  ADD COLUMN IF NOT EXISTS source_class text NOT NULL DEFAULT 'open_data',
  ADD COLUMN IF NOT EXISTS entity_name text,
  ADD COLUMN IF NOT EXISTS fetch_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS precedence integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS crawl_interval_minutes integer NOT NULL DEFAULT 1440,
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0;

ALTER TABLE public.data_sources
  DROP CONSTRAINT IF EXISTS data_sources_source_class_check;
ALTER TABLE public.data_sources
  ADD CONSTRAINT data_sources_source_class_check CHECK (source_class IN (
    'trustee_firm','substitute_trustee','court','recorder','sheriff',
    'public_notice','tax_office','auction_platform','bankruptcy','hoa_firm','open_data'
  ));

ALTER TABLE public.data_sources DROP CONSTRAINT IF EXISTS data_sources_platform_check;
ALTER TABLE public.data_sources
  ADD CONSTRAINT data_sources_platform_check CHECK (platform IN (
    'socrata','arcgis','bulk_file','html_table','html_search','pdf_list','json_api'
  ));

ALTER TABLE public.data_sources DROP CONSTRAINT IF EXISTS data_sources_status_check;
ALTER TABLE public.data_sources
  ADD CONSTRAINT data_sources_status_check CHECK (status IN (
    'discovered','pending_verification','verified','enabled','disabled','failed'
  ));

CREATE INDEX IF NOT EXISTS data_sources_class_idx ON public.data_sources (source_class, status);

-- 2. source_coverage already exists (H3). Reconcile the status vocabulary only.
ALTER TABLE public.source_coverage DROP CONSTRAINT IF EXISTS source_coverage_status_check;
ALTER TABLE public.source_coverage
  ADD CONSTRAINT source_coverage_status_check CHECK (status IN (
    'unverified','pending_verification','verified','enabled','disabled','failed'
  ));

-- 3. foreclosure_cases
CREATE TABLE public.foreclosure_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fips text NOT NULL,
  state text NOT NULL,
  county text,
  case_number text,
  case_number_normalized text,
  parcel_apn text,
  property_address text,
  property_city text,
  property_state text,
  property_zip text,
  address_hash text NOT NULL,
  owner_first text,
  owner_last text,
  company_entity text,
  record_type text NOT NULL,
  case_status text NOT NULL DEFAULT 'active',
  stage text,
  filed_date date,
  auction_date date,
  auction_time text,
  opening_bid numeric,
  attorney_name text,
  attorney_firm text,
  attorney_phone text,
  mortgagee text,
  servicer text,
  loan_balance numeric,
  original_mortgage numeric,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  first_seen_source_id uuid REFERENCES public.data_sources(id) ON DELETE SET NULL,
  last_observed_at timestamptz NOT NULL DEFAULT now(),
  field_provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT foreclosure_cases_case_status_check CHECK (case_status IN (
    'active','postponed','sold','cancelled','redeemed','dismissed'
  )),
  CONSTRAINT foreclosure_cases_stage_check CHECK (stage IS NULL OR stage IN (
    'pre_foreclosure','lis_pendens','hearing_scheduled','continued',
    'judgment_entered','auction_set','sold'
  ))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.foreclosure_cases TO authenticated;
GRANT ALL ON public.foreclosure_cases TO service_role;
ALTER TABLE public.foreclosure_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage foreclosure cases" ON public.foreclosure_cases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE UNIQUE INDEX foreclosure_cases_case_number_idx
  ON public.foreclosure_cases (fips, case_number_normalized)
  WHERE case_number_normalized IS NOT NULL;
CREATE INDEX foreclosure_cases_address_idx ON public.foreclosure_cases (fips, address_hash);
CREATE INDEX foreclosure_cases_auction_idx ON public.foreclosure_cases (auction_date);
CREATE INDEX foreclosure_cases_type_status_idx ON public.foreclosure_cases (record_type, case_status);
CREATE INDEX foreclosure_cases_apn_idx ON public.foreclosure_cases (fips, parcel_apn) WHERE parcel_apn IS NOT NULL;

CREATE TRIGGER foreclosure_cases_updated_at BEFORE UPDATE ON public.foreclosure_cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. case_observations
CREATE TABLE public.case_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.foreclosure_cases(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.data_sources(id) ON DELETE SET NULL,
  source_class text NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  match_key_used text,
  match_confidence numeric,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT case_observations_match_key_check CHECK (match_key_used IS NULL OR match_key_used IN (
    'case_number','apn','address','fuzzy'
  ))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_observations TO authenticated;
GRANT ALL ON public.case_observations TO service_role;
ALTER TABLE public.case_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage case observations" ON public.case_observations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX case_observations_case_idx ON public.case_observations (case_id, observed_at DESC);
CREATE INDEX case_observations_source_idx ON public.case_observations (source_id, observed_at DESC);

-- 5. case_events (referenced by P3/P6)
CREATE TABLE public.case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.foreclosure_cases(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_events TO authenticated;
GRANT ALL ON public.case_events TO service_role;
ALTER TABLE public.case_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage case events" ON public.case_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX case_events_case_idx ON public.case_events (case_id, created_at DESC);
CREATE INDEX case_events_type_idx ON public.case_events (event_type, created_at DESC);

-- 6. suppression_signals
CREATE TABLE public.suppression_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.foreclosure_cases(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suppression_signals_type_check CHECK (signal_type IN (
    'bankruptcy','listed_on_mls','deceased','represented_by_counsel','redeemed','sold'
  ))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppression_signals TO authenticated;
GRANT ALL ON public.suppression_signals TO service_role;
ALTER TABLE public.suppression_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage suppression signals" ON public.suppression_signals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX suppression_signals_case_idx ON public.suppression_signals (case_id);
CREATE INDEX suppression_signals_type_idx ON public.suppression_signals (signal_type);

-- 7. leads.case_id
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES public.foreclosure_cases(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS leads_case_id_idx ON public.leads (case_id) WHERE case_id IS NOT NULL;