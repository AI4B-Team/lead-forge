ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS card_on_file boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_records_used integer NOT NULL DEFAULT 0;