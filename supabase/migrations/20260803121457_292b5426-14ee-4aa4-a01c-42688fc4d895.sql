CREATE TABLE public.industries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid REFERENCES public.industries(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.industries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.industries TO authenticated;
GRANT ALL ON public.industries TO service_role;
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "industries_read_all" ON public.industries FOR SELECT USING (true);
CREATE POLICY "industries_admin_write" ON public.industries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER industries_updated_at BEFORE UPDATE ON public.industries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.record_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  category text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.record_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.record_types TO authenticated;
GRANT ALL ON public.record_types TO service_role;
ALTER TABLE public.record_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "record_types_read_all" ON public.record_types FOR SELECT USING (true);
CREATE POLICY "record_types_admin_write" ON public.record_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER record_types_updated_at BEFORE UPDATE ON public.record_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.county_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fips text,
  county_name text NOT NULL,
  state text NOT NULL,
  source_type text NOT NULL DEFAULT 'records',
  status text NOT NULL DEFAULT 'requested',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (county_name, state, source_type)
);
GRANT SELECT ON public.county_coverage TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.county_coverage TO authenticated;
GRANT ALL ON public.county_coverage TO service_role;
ALTER TABLE public.county_coverage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "county_coverage_read_all" ON public.county_coverage FOR SELECT USING (true);
CREATE POLICY "county_coverage_admin_write" ON public.county_coverage FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER county_coverage_updated_at BEFORE UPDATE ON public.county_coverage FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.industries (name, slug, sort_order) VALUES
  ('Insurance', 'insurance', 10),
  ('Real Estate', 'real_estate', 20),
  ('Solar & Roofing', 'solar', 30),
  ('Home Services', 'home_services', 40),
  ('Agencies', 'agency', 50),
  ('Other', 'other', 60);

INSERT INTO public.industries (name, slug, parent_id, sort_order) VALUES
  ('Electrician', 'electrician', (SELECT id FROM public.industries WHERE slug = 'home_services'), 10),
  ('HVAC', 'hvac', (SELECT id FROM public.industries WHERE slug = 'home_services'), 20),
  ('Plumber', 'plumber', (SELECT id FROM public.industries WHERE slug = 'home_services'), 30),
  ('Roofer', 'roofer', (SELECT id FROM public.industries WHERE slug = 'solar'), 40),
  ('Solar Installer', 'solar_installer', (SELECT id FROM public.industries WHERE slug = 'solar'), 50),
  ('Landscaper', 'landscaper', (SELECT id FROM public.industries WHERE slug = 'home_services'), 60),
  ('Pest Control', 'pest_control', (SELECT id FROM public.industries WHERE slug = 'home_services'), 70),
  ('General Contractor', 'general_contractor', (SELECT id FROM public.industries WHERE slug = 'home_services'), 80),
  ('Insurance Agent', 'insurance_agent', (SELECT id FROM public.industries WHERE slug = 'insurance'), 90),
  ('Mortgage Broker', 'mortgage_broker', (SELECT id FROM public.industries WHERE slug = 'real_estate'), 100);

INSERT INTO public.record_types (name, slug, category, sort_order) VALUES
  ('Probate', 'probate', 'real_estate_distress', 10),
  ('Code Violation', 'code_violation', 'real_estate_distress', 20),
  ('Pre-Foreclosure / Lis Pendens', 'pre_foreclosure', 'real_estate_distress', 30),
  ('Tax Default / Delinquency', 'tax_default', 'real_estate_distress', 40),
  ('Vacancy / Demolition Notice', 'vacancy', 'real_estate_distress', 50),
  ('Eviction', 'eviction', 'real_estate_distress', 60);

INSERT INTO public.county_coverage (county_name, state, source_type, status) VALUES
  ('Hillsborough', 'FL', 'records', 'live'),
  ('Pasco', 'FL', 'records', 'live'),
  ('Pinellas', 'FL', 'records', 'live'),
  ('Polk', 'FL', 'records', 'live'),
  ('Hernando', 'FL', 'records', 'live'),
  ('Harris', 'TX', 'records', 'beta'),
  ('Maricopa', 'AZ', 'records', 'beta'),
  ('Pima', 'AZ', 'records', 'requested'),
  ('Dallas', 'TX', 'records', 'requested'),
  ('Fulton', 'GA', 'records', 'requested');