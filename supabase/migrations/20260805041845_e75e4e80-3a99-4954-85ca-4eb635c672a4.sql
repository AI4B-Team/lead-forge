-- 1. distress_pulls: super admins only.
DROP POLICY IF EXISTS "Signed-in users can read pull history" ON public.distress_pulls;

-- 2. user_prefs.real_elite_user_id is an identity/trust field used by the hub SSO
-- callback to resolve an existing account, so end users must not be able to set it.
CREATE UNIQUE INDEX IF NOT EXISTS user_prefs_real_elite_user_id_key
  ON public.user_prefs (real_elite_user_id)
  WHERE real_elite_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_real_elite_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Trusted server paths (service_role) may set the link. Anyone else keeps the
  -- stored value, so a self-serve write can never claim another hub identity.
  IF current_setting('role', true) = 'service_role'
     OR current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.real_elite_user_id := NULL;
  ELSIF NEW.real_elite_user_id IS DISTINCT FROM OLD.real_elite_user_id THEN
    NEW.real_elite_user_id := OLD.real_elite_user_id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_real_elite_link() FROM anon, authenticated;

DROP TRIGGER IF EXISTS user_prefs_guard_real_elite_link ON public.user_prefs;
CREATE TRIGGER user_prefs_guard_real_elite_link
  BEFORE INSERT OR UPDATE ON public.user_prefs
  FOR EACH ROW EXECUTE FUNCTION public.guard_real_elite_link();

-- 3. Privileged SECURITY DEFINER reporting helpers: server-side callers only.
REVOKE EXECUTE ON FUNCTION public.adapter_demand() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.adapter_request_notify_list(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adapter_demand() TO service_role;
GRANT EXECUTE ON FUNCTION public.adapter_request_notify_list(text) TO service_role;