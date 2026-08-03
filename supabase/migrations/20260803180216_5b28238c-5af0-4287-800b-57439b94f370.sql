-- 1. Discovered data source catalog -----------------------------------------
CREATE TABLE public.data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('socrata','arcgis','bulk_file')),
  domain text NOT NULL,
  dataset_id text,
  resource_url text,
  title text,
  jurisdiction text,
  county_name text,
  state text,
  fips text,
  record_type text NOT NULL,
  field_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'discovered' CHECK (status IN ('discovered','verified','enabled','disabled','failed')),
  row_estimate integer,
  last_error text,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, domain, dataset_id, record_type)
);
GRANT SELECT ON public.data_sources TO authenticated;
GRANT ALL ON public.data_sources TO service_role;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "data_sources readable by members" ON public.data_sources
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "data_sources managed by super admins" ON public.data_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER data_sources_updated_at BEFORE UPDATE ON public.data_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX data_sources_lookup ON public.data_sources (county_name, state, record_type, status);

-- 2. Records officer contacts -------------------------------------------------
CREATE TABLE public.agency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name text NOT NULL,
  department text,
  jurisdiction text,
  county_name text,
  state text NOT NULL,
  fips text,
  contact_name text,
  contact_title text,
  email text,
  phone text,
  record_types text[] NOT NULL DEFAULT '{}'::text[],
  response_format text,
  avg_turnaround_days integer,
  responsive boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.agency_contacts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_contacts TO authenticated;
ALTER TABLE public.agency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_contacts super admin only" ON public.agency_contacts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER agency_contacts_updated_at BEFORE UPDATE ON public.agency_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Standing records requests (one per agency, platform-level) ---------------
CREATE TABLE public.records_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agency_contacts(id) ON DELETE CASCADE,
  record_types text[] NOT NULL DEFAULT '{}'::text[],
  date_range_days integer NOT NULL DEFAULT 30,
  cadence text NOT NULL DEFAULT 'monthly' CHECK (cadence IN ('weekly','biweekly','monthly','quarterly')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sent','received','parsing','needs_mapping','failed','paused')),
  subject text,
  body text,
  last_sent_at timestamptz,
  last_received_at timestamptz,
  next_send_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id)
);
GRANT ALL ON public.records_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.records_requests TO authenticated;
ALTER TABLE public.records_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "records_requests super admin only" ON public.records_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER records_requests_updated_at BEFORE UPDATE ON public.records_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Returned files -----------------------------------------------------------
CREATE TABLE public.records_request_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.records_requests(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agency_contacts(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_type text,
  storage_path text,
  rows_total integer NOT NULL DEFAULT 0,
  rows_parsed integer NOT NULL DEFAULT 0,
  parse_status text NOT NULL DEFAULT 'pending' CHECK (parse_status IN ('pending','parsed','needs_mapping','failed')),
  parse_error text,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.records_request_files TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.records_request_files TO authenticated;
ALTER TABLE public.records_request_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "records_request_files super admin only" ON public.records_request_files
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 5. Remembered column mapping per agency ------------------------------------
CREATE TABLE public.agency_column_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agency_contacts(id) ON DELETE CASCADE,
  record_type text,
  column_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, record_type)
);
GRANT ALL ON public.agency_column_maps TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_column_maps TO authenticated;
ALTER TABLE public.agency_column_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_column_maps super admin only" ON public.agency_column_maps
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER agency_column_maps_updated_at BEFORE UPDATE ON public.agency_column_maps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Human-authenticated portal sessions -------------------------------------
CREATE TABLE public.portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_key text NOT NULL,
  portal_url text,
  county_name text,
  state text,
  cookies_encrypted text,
  captured_by uuid,
  captured_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  needs_reauth boolean NOT NULL DEFAULT false,
  tos_allows_automation boolean NOT NULL DEFAULT false,
  tos_checked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portal_key)
);
GRANT ALL ON public.portal_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_sessions TO authenticated;
ALTER TABLE public.portal_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_sessions super admin only" ON public.portal_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER portal_sessions_updated_at BEFORE UPDATE ON public.portal_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Coverage now records HOW a county is reached -----------------------------
ALTER TABLE public.county_coverage
  ADD COLUMN IF NOT EXISTS access_path text NOT NULL DEFAULT 'open_data'
    CHECK (access_path IN ('open_data','arcgis','bulk_file','records_request','browser','not_permitted')),
  ADD COLUMN IF NOT EXISTS tos_prohibits_automation boolean NOT NULL DEFAULT false;