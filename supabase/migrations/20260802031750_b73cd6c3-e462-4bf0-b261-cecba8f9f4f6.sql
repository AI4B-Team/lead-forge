ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS screenshot_url text;