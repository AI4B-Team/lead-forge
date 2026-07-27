
-- 1) Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "super admin read all" ON public.user_roles;
CREATE POLICY "super admin read all" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "super admin manage roles" ON public.user_roles;
CREATE POLICY "super admin manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Auto-promote the very first user to super_admin.
CREATE OR REPLACE FUNCTION public.grant_first_super_admin()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_first_admin ON auth.users;
CREATE TRIGGER on_auth_user_first_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_first_super_admin();

-- Seed super_admin for any existing users so the current project owner gets access.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role FROM auth.users
ON CONFLICT DO NOTHING;

-- 2) Billing plan on workspaces
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS billing_plan text NOT NULL DEFAULT 'trial';

DO $$ BEGIN
  ALTER TABLE public.workspaces
    ADD CONSTRAINT workspaces_billing_plan_chk
    CHECK (billing_plan IN ('trial','paid','comped','past_due'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Super admins can read/update every workspace (for the admin console).
DROP POLICY IF EXISTS "super admin read workspaces" ON public.workspaces;
CREATE POLICY "super admin read workspaces" ON public.workspaces
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "super admin update workspaces" ON public.workspaces;
CREATE POLICY "super admin update workspaces" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 3) Message threading + read state
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS thread_key text,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Backfill thread_key on existing rows (lead_id preferred, else provider_sid).
UPDATE public.messages SET thread_key = COALESCE(lead_id::text, provider_sid)
WHERE thread_key IS NULL;

CREATE INDEX IF NOT EXISTS messages_thread_idx
  ON public.messages (workspace_id, thread_key, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_unread_idx
  ON public.messages (workspace_id, read_at)
  WHERE direction = 'inbound' AND read_at IS NULL;

-- Auto-set thread_key on insert.
CREATE OR REPLACE FUNCTION public.set_message_thread_key()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.thread_key IS NULL THEN
    NEW.thread_key := COALESCE(NEW.lead_id::text, NEW.provider_sid);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS messages_thread_key_trg ON public.messages;
CREATE TRIGGER messages_thread_key_trg
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.set_message_thread_key();

-- 4) CSV imports
CREATE TABLE IF NOT EXISTS public.lead_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  filename text NOT NULL,
  rows_total integer NOT NULL DEFAULT 0,
  rows_imported integer NOT NULL DEFAULT 0,
  column_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_imports TO authenticated;
GRANT ALL ON public.lead_imports TO service_role;
ALTER TABLE public.lead_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ws lead_imports all" ON public.lead_imports;
CREATE POLICY "ws lead_imports all" ON public.lead_imports
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- 5) Workspace invites (used in Phase 4)
CREATE TABLE IF NOT EXISTS public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_invites TO authenticated;
GRANT ALL ON public.workspace_invites TO service_role;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ws invites members" ON public.workspace_invites;
CREATE POLICY "ws invites members" ON public.workspace_invites
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
