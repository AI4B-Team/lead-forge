CREATE TABLE IF NOT EXISTS public.lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_record_id uuid NOT NULL REFERENCES public.lead_records(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_notes_lead_idx ON public.lead_notes(workspace_id, lead_record_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_notes TO authenticated;
GRANT ALL ON public.lead_notes TO service_role;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ws lead_notes read" ON public.lead_notes;
CREATE POLICY "ws lead_notes read" ON public.lead_notes
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "ws lead_notes insert" ON public.lead_notes;
CREATE POLICY "ws lead_notes insert" ON public.lead_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "ws lead_notes delete own" ON public.lead_notes;
CREATE POLICY "ws lead_notes delete own" ON public.lead_notes
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id) AND created_by = auth.uid());