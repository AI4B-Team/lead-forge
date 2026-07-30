CREATE TABLE public.bot_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'text',
  title TEXT NOT NULL,
  source_url TEXT,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bot_knowledge_campaign_idx ON public.bot_knowledge (campaign_id, created_at DESC);
CREATE INDEX bot_knowledge_workspace_idx ON public.bot_knowledge (workspace_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_knowledge TO authenticated;
GRANT ALL ON public.bot_knowledge TO service_role;

ALTER TABLE public.bot_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws bot knowledge all" ON public.bot_knowledge FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));