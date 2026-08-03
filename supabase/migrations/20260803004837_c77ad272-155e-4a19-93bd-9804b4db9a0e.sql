ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS failed_stage text,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz;