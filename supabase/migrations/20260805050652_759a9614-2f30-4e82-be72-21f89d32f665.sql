REVOKE ALL ON FUNCTION public.grant_first_super_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_free_workspace_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rollup_lead_record() FROM PUBLIC, anon, authenticated;