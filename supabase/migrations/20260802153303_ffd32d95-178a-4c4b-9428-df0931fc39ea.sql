CREATE TABLE public.activity_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type text NOT NULL,
  summary text NOT NULL,
  detail text,
  ref_id text,
  ref_type text,
  actor_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace activity"
ON public.activity_events FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can add workspace activity"
ON public.activity_events FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX activity_events_ws_created_idx ON public.activity_events (workspace_id, created_at DESC);
CREATE INDEX activity_events_ws_type_idx ON public.activity_events (workspace_id, type);