CREATE TABLE public.provider_status (
  key TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'up' CHECK (state IN ('up','degraded','down')),
  message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.provider_status TO authenticated;
GRANT SELECT ON public.provider_status TO anon;
GRANT ALL ON public.provider_status TO service_role;
ALTER TABLE public.provider_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "provider_status_read_auth" ON public.provider_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "provider_status_read_anon" ON public.provider_status FOR SELECT TO anon USING (true);

INSERT INTO public.provider_status (key, state, message) VALUES
  ('scrape','up',NULL),
  ('lookup','up',NULL),
  ('scrub','up',NULL);

CREATE TABLE public.provider_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  email TEXT NOT NULL,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.provider_alerts TO authenticated;
GRANT ALL ON public.provider_alerts TO service_role;
ALTER TABLE public.provider_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "provider_alerts_own_read" ON public.provider_alerts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "provider_alerts_own_insert" ON public.provider_alerts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "provider_alerts_own_delete" ON public.provider_alerts FOR DELETE TO authenticated USING (user_id = auth.uid());