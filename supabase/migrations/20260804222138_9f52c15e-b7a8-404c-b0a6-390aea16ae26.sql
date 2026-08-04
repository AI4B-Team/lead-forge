CREATE TABLE public.lead_sequence_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  current_step integer NOT NULL DEFAULT 0,
  next_send_at timestamptz,
  anchor_date date,
  anchor_type text NOT NULL DEFAULT 'none',
  status text NOT NULL DEFAULT 'active',
  paused_until timestamptz,
  paused_reason text,
  disposition text,
  last_sent_at timestamptz,
  sends_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_sequence_state_unique UNIQUE (lead_id, campaign_id),
  CONSTRAINT lead_sequence_state_status_check CHECK (status IN (
    'active','paused_human','paused_signal','completed','opted_out','converted','failed'
  )),
  CONSTRAINT lead_sequence_state_anchor_check CHECK (anchor_type IN (
    'auction','hearing','redemption','filed','none'
  ))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_sequence_state TO authenticated;
GRANT ALL ON public.lead_sequence_state TO service_role;
ALTER TABLE public.lead_sequence_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members read sequence state" ON public.lead_sequence_state
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Workspace admins manage sequence state" ON public.lead_sequence_state
  FOR ALL TO authenticated
  USING (public.is_workspace_admin(workspace_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_workspace_admin(workspace_id) OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX lead_sequence_state_due_idx
  ON public.lead_sequence_state (next_send_at)
  WHERE status = 'active';
CREATE INDEX lead_sequence_state_campaign_idx ON public.lead_sequence_state (campaign_id, status);
CREATE INDEX lead_sequence_state_lead_idx ON public.lead_sequence_state (lead_id);
CREATE INDEX lead_sequence_state_paused_idx
  ON public.lead_sequence_state (paused_until)
  WHERE status = 'paused_human';

CREATE TRIGGER lead_sequence_state_updated_at BEFORE UPDATE ON public.lead_sequence_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS human_pause_days integer NOT NULL DEFAULT 4;