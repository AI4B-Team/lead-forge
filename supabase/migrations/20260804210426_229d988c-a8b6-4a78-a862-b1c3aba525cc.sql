CREATE TABLE public.source_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.data_sources(id) ON DELETE CASCADE,
  fips text NOT NULL,
  state text NOT NULL,
  county_name text,
  record_type text NOT NULL,
  status text NOT NULL DEFAULT 'unverified',
  verified_at timestamptz,
  last_success_at timestamptz,
  sample_row_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX source_coverage_unique_idx
  ON public.source_coverage (COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid), fips, record_type);
CREATE INDEX source_coverage_lookup_idx ON public.source_coverage (fips, record_type, status);
CREATE INDEX source_coverage_geo_idx ON public.source_coverage (state, county_name);

GRANT SELECT ON public.source_coverage TO authenticated;
GRANT SELECT ON public.source_coverage TO anon;
GRANT ALL ON public.source_coverage TO service_role;

ALTER TABLE public.source_coverage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coverage is readable by everyone"
  ON public.source_coverage FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TRIGGER source_coverage_updated_at
  BEFORE UPDATE ON public.source_coverage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.source_coverage (fips, state, county_name, record_type, status, verified_at, last_success_at)
VALUES
  ('17031', 'IL', 'Cook', 'Code Violation', 'verified', now(), now()),
  ('42101', 'PA', 'Philadelphia', 'Code Violation', 'verified', now(), now()),
  ('42101', 'PA', 'Philadelphia', 'Tax Default / Delinquency', 'verified', now(), now()),
  ('36005', 'NY', 'New York City', 'Tax Default / Delinquency', 'verified', now(), now()),
  ('36047', 'NY', 'New York City', 'Tax Default / Delinquency', 'verified', now(), now()),
  ('36061', 'NY', 'New York City', 'Tax Default / Delinquency', 'verified', now(), now()),
  ('36081', 'NY', 'New York City', 'Tax Default / Delinquency', 'verified', now(), now()),
  ('36085', 'NY', 'New York City', 'Tax Default / Delinquency', 'verified', now(), now());

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS is_demo_workspace boolean NOT NULL DEFAULT false;