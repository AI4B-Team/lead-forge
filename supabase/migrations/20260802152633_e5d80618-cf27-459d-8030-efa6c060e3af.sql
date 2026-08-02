ALTER TABLE public.suppression ADD COLUMN IF NOT EXISTS source text, ADD COLUMN IF NOT EXISTS note text;

CREATE TABLE public.compliance_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  phone text,
  lead_id uuid,
  thread_key text,
  path text NOT NULL DEFAULT 'unknown',
  reason text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.compliance_events TO authenticated;
GRANT ALL ON public.compliance_events TO service_role;

ALTER TABLE public.compliance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace compliance events"
  ON public.compliance_events FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can add workspace compliance events"
  ON public.compliance_events FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX compliance_events_ws_created_idx ON public.compliance_events (workspace_id, created_at DESC);
CREATE INDEX compliance_events_ws_phone_idx ON public.compliance_events (workspace_id, phone);