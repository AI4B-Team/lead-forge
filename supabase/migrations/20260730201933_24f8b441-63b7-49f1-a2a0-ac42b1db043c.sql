CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  website text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws brands all" ON public.brands FOR ALL TO authenticated
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.campaigns ADD COLUMN brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
ALTER TABLE public.bot_knowledge ADD COLUMN brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE;
ALTER TABLE public.bot_knowledge ALTER COLUMN campaign_id DROP NOT NULL;

CREATE INDEX idx_bot_knowledge_brand ON public.bot_knowledge(brand_id);
CREATE INDEX idx_brands_workspace ON public.brands(workspace_id);