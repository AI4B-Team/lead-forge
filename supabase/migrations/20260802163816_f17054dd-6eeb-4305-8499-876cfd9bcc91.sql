ALTER TABLE public.bot_knowledge
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

CREATE INDEX IF NOT EXISTS bot_knowledge_brand_category_idx
  ON public.bot_knowledge (brand_id, category);