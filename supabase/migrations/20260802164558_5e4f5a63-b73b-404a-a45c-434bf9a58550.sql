ALTER TABLE public.adapter_requests
  ADD COLUMN IF NOT EXISTS source_label text,
  ADD COLUMN IF NOT EXISTS target_url text,
  ADD COLUMN IF NOT EXISTS desired_fields text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS geo text,
  ADD COLUMN IF NOT EXISTS requested_by uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS screening_reason text,
  ADD COLUMN IF NOT EXISTS notified_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS adapter_requests_source_key_idx
  ON public.adapter_requests (lower(coalesce(nullif(source_label, ''), nullif(template_id, ''), nullif(record_type, ''), nullif(county, ''), 'unspecified')));
CREATE INDEX IF NOT EXISTS adapter_requests_status_idx ON public.adapter_requests (status);

-- Internal roadmap report: overlapping demand grouped by requested source.
CREATE OR REPLACE FUNCTION public.adapter_demand()
RETURNS TABLE (
  source_key text,
  display_label text,
  requests bigint,
  workspaces bigint,
  queued bigint,
  screened_out bigint,
  frequencies text[],
  desired_fields text[],
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
    count(*) FILTER (WHERE a.status = 'screened_out') AS screened_out,
    (SELECT array_agg(DISTINCT f) FROM unnest(array_agg(a.frequency)) AS f) AS frequencies,
    (SELECT array_agg(DISTINCT d) FROM unnest(coalesce(array_agg(a.desired_fields), '{}')) AS x, unnest(x) AS d) AS desired_fields,
    min(a.target_url) AS sample_url,
    min(a.created_at) AS first_requested_at,
    max(a.created_at) AS last_requested_at
  FROM public.adapter_requests a
  GROUP BY 1
  ORDER BY count(DISTINCT a.workspace_id) DESC, count(*) DESC;
END;
$$;

-- Who to email when a requested source ships.
CREATE OR REPLACE FUNCTION public.adapter_request_notify_list(_source_key text)
RETURNS TABLE (
  request_id uuid,
  workspace_id uuid,
  workspace_name text,
  email text,
  frequency text,
  requested_at timestamp with time zone,
  notified_at timestamp with time zone
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
    a.id,
    a.workspace_id,
    w.name,
    u.email::text,
    a.frequency,
    a.created_at,
    a.notified_at
  FROM public.adapter_requests a
  LEFT JOIN public.workspaces w ON w.id = a.workspace_id
  LEFT JOIN auth.users u ON u.id = a.requested_by
  WHERE a.status = 'queued'
    AND lower(coalesce(nullif(a.source_label, ''), nullif(a.template_id, ''), nullif(a.record_type, ''), nullif(a.county, ''), 'unspecified')) = lower(_source_key)
  ORDER BY a.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.adapter_demand() FROM anon;
REVOKE ALL ON FUNCTION public.adapter_request_notify_list(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.adapter_demand() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.adapter_request_notify_list(text) TO authenticated, service_role;