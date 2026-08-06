REVOKE EXECUTE ON FUNCTION public.distress_feed_totals() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.distress_state_summary() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.distress_county_summary(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.distress_county_preview(text, text, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.distress_top_counties(integer) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.workspace_role(uuid) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_workspace_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_workspace_owner(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
    )
  END
$function$;

DROP POLICY IF EXISTS "ws invites members" ON public.workspace_invites;

CREATE POLICY "ws invites admin read"
ON public.workspace_invites FOR SELECT TO authenticated
USING (public.is_workspace_admin(workspace_id) OR invited_by = auth.uid());

CREATE POLICY "ws invites admin insert"
ON public.workspace_invites FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "ws invites admin update"
ON public.workspace_invites FOR UPDATE TO authenticated
USING (public.is_workspace_admin(workspace_id))
WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "ws invites admin delete"
ON public.workspace_invites FOR DELETE TO authenticated
USING (public.is_workspace_admin(workspace_id));