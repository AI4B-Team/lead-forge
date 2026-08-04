CREATE UNIQUE INDEX IF NOT EXISTS lead_outcomes_lead_record_uniq
  ON public.lead_outcomes (lead_record_id)
  WHERE lead_record_id IS NOT NULL;