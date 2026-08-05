-- Credit balances: read-only for members; all writes via service role / apply_credit_delta.
DROP POLICY IF EXISTS "ws credit write" ON public.credit_balances;
REVOKE INSERT, UPDATE, DELETE ON public.credit_balances FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.credit_balances FROM anon;

-- Credit ledger: read-only for members; inserts only via service role.
DROP POLICY IF EXISTS "ws ledger write" ON public.credit_ledger;
REVOKE INSERT, UPDATE, DELETE ON public.credit_ledger FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.credit_ledger FROM anon;

-- Workspace members: admin-only management, owner role only assignable by an owner.
DROP POLICY IF EXISTS "insert self membership" ON public.workspace_members;
DROP POLICY IF EXISTS "members manage" ON public.workspace_members;
DROP POLICY IF EXISTS "members remove" ON public.workspace_members;

CREATE POLICY "admins add members" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_admin(workspace_id)
    AND (role <> 'owner' OR public.is_workspace_owner(workspace_id))
  );

CREATE POLICY "admins update members" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (
    public.is_workspace_admin(workspace_id)
    AND (role <> 'owner' OR public.is_workspace_owner(workspace_id))
  )
  WITH CHECK (
    public.is_workspace_admin(workspace_id)
    AND (role <> 'owner' OR public.is_workspace_owner(workspace_id))
  );

CREATE POLICY "admins remove members" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (
    public.is_workspace_admin(workspace_id)
    AND (role <> 'owner' OR public.is_workspace_owner(workspace_id))
  );

-- Privileged SECURITY DEFINER functions must not be callable from the API roles.
REVOKE ALL ON FUNCTION public.apply_credit_delta(uuid, text, integer, text, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_cron_tick(text, interval) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_dlr_outcome(uuid, uuid, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.adapter_demand() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.adapter_request_notify_list(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_credit_delta(uuid, text, integer, text, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_cron_tick(text, interval) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_dlr_outcome(uuid, uuid, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.adapter_demand() TO service_role;
GRANT EXECUTE ON FUNCTION public.adapter_request_notify_list(text) TO service_role;