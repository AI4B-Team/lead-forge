ALTER TABLE public.adapter_requests DROP CONSTRAINT IF EXISTS adapter_requests_type_check;
ALTER TABLE public.adapter_requests ADD CONSTRAINT adapter_requests_type_check CHECK (type IN ('county', 'record_type', 'template_adapter'));
ALTER TABLE public.adapter_requests ADD COLUMN IF NOT EXISTS template_id text;