ALTER TABLE public.adapter_requests
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'county';

ALTER TABLE public.adapter_requests
  ADD CONSTRAINT adapter_requests_type_check CHECK (type IN ('county', 'record_type'));