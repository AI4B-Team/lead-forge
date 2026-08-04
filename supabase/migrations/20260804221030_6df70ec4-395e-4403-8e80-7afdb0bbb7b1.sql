ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS data_provenance text NOT NULL DEFAULT 'verified_source';

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS data_provenance text NOT NULL DEFAULT 'verified_source',
  ADD COLUMN IF NOT EXISTS provenance_banner_dismissed boolean NOT NULL DEFAULT false;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_data_provenance_chk;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_data_provenance_chk
  CHECK (data_provenance IN ('verified_source','mock_legacy','user_upload','unknown'));

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_data_provenance_chk;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_data_provenance_chk
  CHECK (data_provenance IN ('verified_source','mock_legacy','user_upload','unknown'));

CREATE INDEX IF NOT EXISTS leads_ws_provenance_idx ON public.leads (workspace_id, data_provenance);
CREATE INDEX IF NOT EXISTS jobs_ws_provenance_idx ON public.jobs (workspace_id, data_provenance);