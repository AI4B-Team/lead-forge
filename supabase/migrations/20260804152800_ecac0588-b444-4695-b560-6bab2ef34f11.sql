ALTER TABLE public.workspaces ALTER COLUMN billing_plan SET DEFAULT 'free';

CREATE OR REPLACE FUNCTION public.enforce_free_workspace_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_confirmed timestamptz;
  v_free_owned integer;
BEGIN
  IF NEW.role <> 'owner' THEN
    RETURN NEW;
  END IF;

  SELECT billing_plan INTO v_plan FROM public.workspaces WHERE id = NEW.workspace_id;
  IF coalesce(v_plan, 'free') <> 'free' THEN
    RETURN NEW;
  END IF;

  SELECT email_confirmed_at INTO v_confirmed FROM auth.users WHERE id = NEW.user_id;
  IF v_confirmed IS NULL THEN
    RAISE EXCEPTION 'Confirm your email address before creating a free workspace.';
  END IF;

  SELECT count(*) INTO v_free_owned
  FROM public.workspace_members m
  JOIN public.workspaces w ON w.id = m.workspace_id
  WHERE m.user_id = NEW.user_id
    AND m.role = 'owner'
    AND coalesce(w.billing_plan, 'free') = 'free'
    AND m.workspace_id <> NEW.workspace_id;

  IF v_free_owned >= 1 THEN
    RAISE EXCEPTION 'The free plan includes one workspace. Add a payment method to create more.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspace_members_free_limit ON public.workspace_members;
CREATE TRIGGER workspace_members_free_limit
  BEFORE INSERT ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_workspace_limit();