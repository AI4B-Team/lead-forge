ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS real_elite_org_id uuid,
  ADD COLUMN IF NOT EXISTS real_elite_linked_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_real_elite_org_id_key
  ON public.workspaces (real_elite_org_id) WHERE real_elite_org_id IS NOT NULL;

ALTER TABLE public.user_prefs
  ADD COLUMN IF NOT EXISTS real_elite_user_id uuid;

CREATE INDEX IF NOT EXISTS user_prefs_real_elite_user_id_idx
  ON public.user_prefs (real_elite_user_id) WHERE real_elite_user_id IS NOT NULL;