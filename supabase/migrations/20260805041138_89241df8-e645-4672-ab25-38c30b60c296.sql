-- 1. Remove blanket authenticated SELECT on sensitive tables.
DROP POLICY IF EXISTS "Signed-in users can read the feed" ON public.distress_records;
DROP POLICY IF EXISTS "data_sources readable by members" ON public.data_sources;
DROP POLICY IF EXISTS "parcel conditions readable by signed-in users" ON public.parcel_conditions;

REVOKE SELECT ON public.distress_records FROM anon;
REVOKE SELECT ON public.data_sources FROM anon;
REVOKE SELECT ON public.parcel_conditions FROM anon;
REVOKE SELECT ON public.parcel_conditions FROM authenticated;
GRANT ALL ON public.distress_records TO service_role;
GRANT ALL ON public.data_sources TO service_role;
GRANT ALL ON public.parcel_conditions TO service_role;

-- 2. Lock down SECURITY DEFINER functions that should never be callable
-- directly through the API. Trigger functions and privileged mutations.
REVOKE ALL ON FUNCTION public.apply_credit_delta(uuid, text, integer, text, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_cron_tick(text, interval) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_dlr_outcome(uuid, uuid, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rollup_lead_record() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_free_workspace_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_first_super_admin() FROM PUBLIC, anon, authenticated;

-- Admin-only reporting RPCs: keep them callable by signed-in users (they check
-- super_admin internally) but never anonymously.
REVOKE ALL ON FUNCTION public.adapter_demand() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.adapter_request_notify_list(text) FROM PUBLIC, anon;

-- RLS helper functions must stay executable by signed-in users (policies call
-- them), but not anonymously.
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.workspace_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.workspace_role(uuid) TO authenticated, service_role;

-- 3. Public Distress Feed marketing pages: these return aggregates or masked
-- owner names only, so anonymous execute stays intentional.
REVOKE ALL ON FUNCTION public.distress_county_preview(text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.distress_county_summary(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.distress_state_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.distress_feed_totals() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.distress_top_counties(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.distress_county_preview(text, text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.distress_county_summary(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.distress_state_summary() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.distress_feed_totals() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.distress_top_counties(integer) TO anon, authenticated, service_role;

-- Workspace membership helpers: signed-in only.
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_workspace_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_workspace_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_workspace_owner(uuid) TO authenticated, service_role;