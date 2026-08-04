-- 1. Template health -------------------------------------------------------
CREATE TABLE public.template_health (
  template_id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy','degraded','broken')),
  last_check_at timestamptz,
  last_healthy_at timestamptz,
  row_count integer NOT NULL DEFAULT 0,
  field_fill_rates jsonb NOT NULL DEFAULT '{}'::jsonb,
  baseline jsonb NOT NULL DEFAULT '{}'::jsonb,
  consecutive_failures integer NOT NULL DEFAULT 0,
  eta text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.template_health TO authenticated;
GRANT SELECT ON public.template_health TO anon;
GRANT ALL ON public.template_health TO service_role;

ALTER TABLE public.template_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Template health is readable by everyone"
  ON public.template_health FOR SELECT USING (true);

CREATE POLICY "Super admins manage template health"
  ON public.template_health FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER template_health_updated_at
  BEFORE UPDATE ON public.template_health
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.template_health_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  row_count integer,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  refunded_jobs integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.template_health_events TO authenticated;
GRANT ALL ON public.template_health_events TO service_role;

ALTER TABLE public.template_health_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins read template health events"
  ON public.template_health_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX template_health_events_template_idx
  ON public.template_health_events (template_id, created_at DESC);

-- 2. Per-number deliverability ---------------------------------------------
ALTER TABLE public.sending_numbers
  ADD COLUMN IF NOT EXISTS daily_cap_override integer,
  ADD COLUMN IF NOT EXISTS delivered_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_rate numeric,
  ADD COLUMN IF NOT EXISTS min_delivery_rate numeric NOT NULL DEFAULT 0.75,
  ADD COLUMN IF NOT EXISTS auto_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_pause_reason text;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS carrier text;

CREATE TABLE public.number_carrier_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sending_number_id uuid NOT NULL REFERENCES public.sending_numbers(id) ON DELETE CASCADE,
  carrier text NOT NULL DEFAULT 'unknown',
  sent_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sending_number_id, carrier)
);

GRANT SELECT ON public.number_carrier_stats TO authenticated;
GRANT ALL ON public.number_carrier_stats TO service_role;

ALTER TABLE public.number_carrier_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their carrier stats"
  ON public.number_carrier_stats FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE TRIGGER number_carrier_stats_updated_at
  BEFORE UPDATE ON public.number_carrier_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Negative keywords ------------------------------------------------------
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS negative_keywords text[] NOT NULL
  DEFAULT ARRAY['stop','unsubscribe','remove','lawyer','attorney','tcpa','sue']::text[];

-- 4. Atomic carrier-stat accumulation --------------------------------------
CREATE OR REPLACE FUNCTION public.record_dlr_outcome(
  _workspace_id uuid,
  _sending_number_id uuid,
  _carrier text,
  _delivered boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.number_carrier_stats (
    workspace_id, sending_number_id, carrier, sent_count, delivered_count, failed_count
  ) VALUES (
    _workspace_id, _sending_number_id, coalesce(nullif(_carrier, ''), 'unknown'), 1,
    CASE WHEN _delivered THEN 1 ELSE 0 END,
    CASE WHEN _delivered THEN 0 ELSE 1 END
  )
  ON CONFLICT (sending_number_id, carrier) DO UPDATE SET
    sent_count = public.number_carrier_stats.sent_count + 1,
    delivered_count = public.number_carrier_stats.delivered_count
      + CASE WHEN _delivered THEN 1 ELSE 0 END,
    failed_count = public.number_carrier_stats.failed_count
      + CASE WHEN _delivered THEN 0 ELSE 1 END,
    updated_at = now();

  UPDATE public.sending_numbers sn
  SET delivered_count = sn.delivered_count + CASE WHEN _delivered THEN 1 ELSE 0 END,
      failed_count = sn.failed_count + CASE WHEN _delivered THEN 0 ELSE 1 END,
      delivery_rate = (sn.delivered_count + CASE WHEN _delivered THEN 1 ELSE 0 END)::numeric
        / GREATEST(1, sn.delivered_count + sn.failed_count + 1)
  WHERE sn.id = _sending_number_id;
END;
$$;