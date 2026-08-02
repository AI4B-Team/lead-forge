ALTER TABLE public.adapter_requests
  ADD COLUMN IF NOT EXISTS login_required text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS risk_tier text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS outreach_level text,
  ADD COLUMN IF NOT EXISTS outreach_note text;

DROP FUNCTION IF EXISTS public.adapter_demand();

CREATE OR REPLACE FUNCTION public.adapter_demand()
RETURNS TABLE (
  source_key text,
  display_label text,
  requests bigint,
  workspaces bigint,
  queued bigint,
  needs_review bigint,
  screened_out bigint,
  frequencies text[],
  desired_fields text[],
  logins text[],
  sample_url text,
  first_requested_at timestamp with time zone,
  last_requested_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    lower(coalesce(nullif(a.source_label, ''), nullif(a.template_id, ''), nullif(a.record_type, ''), nullif(a.county, ''), 'unspecified')) AS source_key,
    min(coalesce(nullif(a.source_label, ''), nullif(a.template_id, ''), nullif(a.record_type, ''), nullif(a.county, ''), 'Unspecified')) AS display_label,
    count(*) AS requests,
    count(DISTINCT a.workspace_id) AS workspaces,
    count(*) FILTER (WHERE a.status = 'queued') AS queued,
    count(*) FILTER (WHERE a.status = 'needs_review') AS needs_review,
    count(*) FILTER (WHERE a.status = 'screened_out') AS screened_out,
    (SELECT array_agg(DISTINCT f) FROM unnest(array_agg(a.frequency)) AS f) AS frequencies,
    (SELECT array_agg(DISTINCT d) FROM unnest(coalesce(array_agg(a.desired_fields), '{}')) AS x, unnest(x) AS d) AS desired_fields,
    (SELECT array_agg(DISTINCT l) FROM unnest(array_agg(coalesce(a.login_required, 'none'))) AS l) AS logins,
    min(a.target_url) AS sample_url,
    min(a.created_at) AS first_requested_at,
    max(a.created_at) AS last_requested_at
  FROM public.adapter_requests a
  GROUP BY 1
  ORDER BY count(DISTINCT a.workspace_id) DESC, count(*) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.adapter_demand() FROM anon;
GRANT EXECUTE ON FUNCTION public.adapter_demand() TO authenticated, service_role;