CREATE TABLE public.job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stage text NOT NULL,
  message text NOT NULL,
  count integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX job_events_job_id_created_at_idx ON public.job_events (job_id, created_at);

GRANT SELECT, INSERT ON public.job_events TO authenticated;
GRANT ALL ON public.job_events TO service_role;

ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read job events"
ON public.job_events FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can write job events"
ON public.job_events FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id));