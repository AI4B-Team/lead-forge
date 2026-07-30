-- Tags (colored, workspace-scoped)
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#CC0000',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage workspace tags" ON public.tags FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- Campaign back-office columns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS tag_id uuid REFERENCES public.tags(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS drop_size integer NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS drop_times text[] NOT NULL DEFAULT ARRAY['10:00','12:00','15:00','17:00'],
  ADD COLUMN IF NOT EXISTS duplicate_policy text NOT NULL DEFAULT 'skip',
  ADD COLUMN IF NOT EXISTS bot_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS regulated_vertical boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bot_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Scheduled 500-contact drops
CREATE TABLE public.campaign_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  drop_index integer NOT NULL,
  scheduled_at timestamptz NOT NULL,
  size integer NOT NULL DEFAULT 500,
  sent_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_drops TO authenticated;
GRANT ALL ON public.campaign_drops TO service_role;
ALTER TABLE public.campaign_drops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage workspace drops" ON public.campaign_drops FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE INDEX campaign_drops_campaign_idx ON public.campaign_drops (campaign_id, drop_index);

-- Bot attribution on messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS handoff_reason text;

-- Operator-approved quick reply snippets
CREATE TABLE public.quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quick_replies TO authenticated;
GRANT ALL ON public.quick_replies TO service_role;
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage workspace snippets" ON public.quick_replies FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- Per-user UI preferences (theme)
CREATE TABLE public.user_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'light',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_prefs TO authenticated;
GRANT ALL ON public.user_prefs TO service_role;
ALTER TABLE public.user_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prefs" ON public.user_prefs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);