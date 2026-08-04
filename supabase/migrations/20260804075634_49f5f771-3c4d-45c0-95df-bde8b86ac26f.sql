-- ============ distress_records: the shared maintained feed ============
CREATE TABLE public.distress_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fips text NOT NULL,
  state text NOT NULL,
  county text NOT NULL,
  record_type text NOT NULL,
  doc_number text NOT NULL,
  filed_date date,
  pulled_date date NOT NULL DEFAULT current_date,
  owner_first text,
  owner_last text,
  company_entity text,
  property_address text,
  property_city text,
  property_state text,
  property_zip text,
  mailing_address text,
  mailing_city text,
  mailing_state text,
  mailing_zip text,
  amount numeric,
  auction_date date,
  status text,
  parcel_apn text,
  source_url text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT distress_records_dedupe UNIQUE (fips, record_type, doc_number)
);

CREATE INDEX distress_records_state_county_idx ON public.distress_records (state, county, record_type);
CREATE INDEX distress_records_pulled_idx ON public.distress_records (pulled_date DESC);
CREATE INDEX distress_records_filed_idx ON public.distress_records (filed_date DESC);
CREATE INDEX distress_records_apn_idx ON public.distress_records (fips, parcel_apn);

GRANT SELECT ON public.distress_records TO authenticated;
GRANT ALL ON public.distress_records TO service_role;

ALTER TABLE public.distress_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read the feed"
  ON public.distress_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage the feed"
  ON public.distress_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER distress_records_updated_at
  BEFORE UPDATE ON public.distress_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ distress_pulls: per-county per-type pull log ============
CREATE TABLE public.distress_pulls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fips text NOT NULL,
  state text NOT NULL,
  county text NOT NULL,
  record_type text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  records_found integer NOT NULL DEFAULT 0,
  records_added integer NOT NULL DEFAULT 0,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX distress_pulls_county_idx ON public.distress_pulls (state, county, record_type, started_at DESC);

GRANT SELECT ON public.distress_pulls TO authenticated;
GRANT ALL ON public.distress_pulls TO service_role;

ALTER TABLE public.distress_pulls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read pull history"
  ON public.distress_pulls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage pull history"
  ON public.distress_pulls FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============ distress_feed_views: per-user New watermark ============
CREATE TABLE public.distress_feed_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fips text NOT NULL,
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT distress_feed_views_unique UNIQUE (user_id, fips)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distress_feed_views TO authenticated;
GRANT ALL ON public.distress_feed_views TO service_role;

ALTER TABLE public.distress_feed_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own feed watermarks"
  ON public.distress_feed_views FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER distress_feed_views_updated_at
  BEFORE UPDATE ON public.distress_feed_views
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ distress_guides: data-driven walkthroughs ============
CREATE TABLE public.distress_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fips text NOT NULL,
  state text NOT NULL,
  county text NOT NULL,
  record_type text NOT NULL,
  slug text NOT NULL,
  title text,
  portal_url text NOT NULL,
  intro text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT distress_guides_unique UNIQUE (fips, record_type)
);

CREATE INDEX distress_guides_lookup_idx ON public.distress_guides (state, county, record_type);

GRANT SELECT ON public.distress_guides TO anon;
GRANT SELECT ON public.distress_guides TO authenticated;
GRANT ALL ON public.distress_guides TO service_role;

ALTER TABLE public.distress_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published guides are public"
  ON public.distress_guides FOR SELECT TO anon, authenticated USING (published);
CREATE POLICY "Super admins manage guides"
  ON public.distress_guides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER distress_guides_updated_at
  BEFORE UPDATE ON public.distress_guides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ public marketing read helpers (masked / aggregate only) ============

-- Site-wide live counters for the landing page.
CREATE OR REPLACE FUNCTION public.distress_feed_totals()
RETURNS TABLE(total_records bigint, counties bigint, states bigint, added_this_week bigint, last_pull_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.distress_records),
    (SELECT count(DISTINCT fips) FROM public.distress_records),
    (SELECT count(DISTINCT state) FROM public.distress_records),
    (SELECT count(*) FROM public.distress_records WHERE pulled_date >= current_date - 7),
    (SELECT max(started_at) FROM public.distress_pulls WHERE status = 'ok');
$$;

-- Per-state rollup for /distress-feed/counties.
CREATE OR REPLACE FUNCTION public.distress_state_summary()
RETURNS TABLE(state text, counties bigint, total_records bigint, new_this_week bigint, last_pull_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    c.state,
    count(DISTINCT c.county_name),
    coalesce(sum(r.total), 0)::bigint,
    coalesce(sum(r.recent), 0)::bigint,
    max(r.last_pull_at)
  FROM public.county_coverage c
  LEFT JOIN (
    SELECT d.state AS st, d.county AS cty,
           count(*) AS total,
           count(*) FILTER (WHERE d.pulled_date >= current_date - 7) AS recent,
           max(d.created_at) AS last_pull_at
    FROM public.distress_records d GROUP BY 1, 2
  ) r ON r.st = c.state AND lower(r.cty) = lower(c.county_name)
  GROUP BY c.state
  ORDER BY c.state;
$$;

-- Per-county rollup for a state page.
CREATE OR REPLACE FUNCTION public.distress_county_summary(_state text)
RETURNS TABLE(county text, fips text, total_records bigint, new_this_week bigint, record_types text[], last_pull_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    c.county_name,
    max(c.fips),
    coalesce(count(d.id), 0)::bigint,
    coalesce(count(d.id) FILTER (WHERE d.pulled_date >= current_date - 7), 0)::bigint,
    coalesce(array_agg(DISTINCT d.record_type) FILTER (WHERE d.record_type IS NOT NULL), ARRAY[]::text[]),
    max(d.created_at)
  FROM public.county_coverage c
  LEFT JOIN public.distress_records d
    ON d.state = c.state AND lower(d.county) = lower(c.county_name)
  WHERE lower(c.state) = lower(_state)
  GROUP BY c.county_name
  ORDER BY 3 DESC, 1;
$$;

-- Masked preview rows for a public county page. Surnames are reduced to an
-- initial here in the database so the full name never reaches the browser.
CREATE OR REPLACE FUNCTION public.distress_county_preview(_state text, _county text, _limit integer DEFAULT 10)
RETURNS TABLE(record_type text, filed_date date, owner_masked text, property_city text, property_zip text, amount numeric, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    d.record_type,
    d.filed_date,
    trim(coalesce(d.owner_first, coalesce(d.company_entity, 'Owner')) || ' ' ||
         CASE WHEN d.owner_last IS NULL OR d.owner_last = '' THEN ''
              ELSE left(d.owner_last, 1) || '.' END),
    d.property_city,
    d.property_zip,
    d.amount,
    d.status
  FROM public.distress_records d
  WHERE lower(d.state) = lower(_state) AND lower(d.county) = lower(_county)
  ORDER BY coalesce(d.filed_date, d.pulled_date) DESC
  LIMIT least(greatest(coalesce(_limit, 10), 1), 25);
$$;

-- Top counties by record volume for the landing page link block.
CREATE OR REPLACE FUNCTION public.distress_top_counties(_limit integer DEFAULT 20)
RETURNS TABLE(state text, county text, total_records bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT d.state, d.county, count(*)
  FROM public.distress_records d
  GROUP BY d.state, d.county
  ORDER BY count(*) DESC, d.state, d.county
  LIMIT least(greatest(coalesce(_limit, 20), 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.distress_feed_totals() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.distress_state_summary() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.distress_county_summary(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.distress_county_preview(text, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.distress_top_counties(integer) TO anon, authenticated;