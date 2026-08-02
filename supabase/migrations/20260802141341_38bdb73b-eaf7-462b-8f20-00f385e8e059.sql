ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS custom_interval_minutes integer,
  ADD COLUMN IF NOT EXISTS auto_launch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS schedule_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'sms',
  ADD COLUMN IF NOT EXISTS net_new_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS jobs_due_scans_idx
  ON public.jobs (next_run_at)
  WHERE schedule_active AND schedule <> 'one_time';

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'run_complete',
  title text NOT NULL,
  body text,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can mark workspace notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX IF NOT EXISTS notifications_workspace_created_idx
  ON public.notifications (workspace_id, created_at DESC);