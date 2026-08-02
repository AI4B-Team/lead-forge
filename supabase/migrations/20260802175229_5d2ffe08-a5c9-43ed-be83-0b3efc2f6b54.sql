-- Attribution on credit history
ALTER TABLE public.credit_ledger ADD COLUMN IF NOT EXISTS actor_user_id uuid;
CREATE INDEX IF NOT EXISTS credit_ledger_actor_idx ON public.credit_ledger (workspace_id, actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_actor_idx ON public.activity_events (workspace_id, actor_id, created_at DESC);

-- Role helper: 'owner' | 'admin' | 'member' | 'viewer' | null
CREATE OR REPLACE FUNCTION public.workspace_role(_workspace_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = _workspace_id AND user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = auth.uid() AND role IN ('owner','admin')
  )
$$;

-- Per-member caps
CREATE TABLE IF NOT EXISTS public.member_limits (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  monthly_credit_cap integer,
  monthly_export_row_cap integer,
  approval_threshold_credits integer,
  export_approval_threshold_rows integer,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_limits TO authenticated;
GRANT ALL ON public.member_limits TO service_role;
ALTER TABLE public.member_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read limits in their workspace" ON public.member_limits
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "admins manage limits" ON public.member_limits
  FOR ALL TO authenticated
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));
CREATE TRIGGER member_limits_updated_at BEFORE UPDATE ON public.member_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Append-only export log
CREATE TABLE IF NOT EXISTS public.export_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL,
  scope text NOT NULL,
  ref_id text,
  row_count integer NOT NULL DEFAULT 0,
  file_type text NOT NULL DEFAULT 'csv',
  watermark text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS export_events_ws_actor_idx ON public.export_events (workspace_id, actor_user_id, created_at DESC);
GRANT SELECT, INSERT ON public.export_events TO authenticated;
GRANT ALL ON public.export_events TO service_role;
ALTER TABLE public.export_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read all exports, members read own" ON public.export_events
  FOR SELECT TO authenticated
  USING (public.is_workspace_admin(workspace_id) OR (public.is_workspace_member(workspace_id) AND actor_user_id = auth.uid()));
CREATE POLICY "members log their own exports" ON public.export_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id) AND actor_user_id = auth.uid());

-- Approval requests for over-threshold spends/exports
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  kind text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  summary text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS approval_requests_ws_status_idx ON public.approval_requests (workspace_id, status, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read all approvals, members read own" ON public.approval_requests
  FOR SELECT TO authenticated
  USING (public.is_workspace_admin(workspace_id) OR (public.is_workspace_member(workspace_id) AND requested_by = auth.uid()));
CREATE POLICY "members request approvals" ON public.approval_requests
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id) AND requested_by = auth.uid());
CREATE POLICY "admins decide approvals" ON public.approval_requests
  FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));
CREATE TRIGGER approval_requests_updated_at BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seat revocations (force sign-out of removed members)
CREATE TABLE IF NOT EXISTS public.seat_revocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  revoked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS seat_revocations_user_idx ON public.seat_revocations (user_id, created_at DESC);
GRANT SELECT ON public.seat_revocations TO authenticated;
GRANT ALL ON public.seat_revocations TO service_role;
ALTER TABLE public.seat_revocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read their own revocations" ON public.seat_revocations
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_workspace_admin(workspace_id));