CREATE TABLE public.thread_states (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  thread_key text NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  starred boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  archived_reason text,
  status text,
  status_set_by uuid,
  status_set_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, thread_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_states TO authenticated;
GRANT ALL ON public.thread_states TO service_role;

ALTER TABLE public.thread_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage thread state in their workspace"
ON public.thread_states FOR ALL TO authenticated
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE TRIGGER thread_states_updated_at
BEFORE UPDATE ON public.thread_states
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX thread_states_ws_archived_idx ON public.thread_states (workspace_id, archived_at);

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS refund_email_threshold integer NOT NULL DEFAULT 100;