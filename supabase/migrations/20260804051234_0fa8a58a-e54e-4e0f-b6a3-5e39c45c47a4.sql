CREATE TABLE public.cron_credentials (
  key text PRIMARY KEY,
  secret text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.cron_credentials TO service_role;
ALTER TABLE public.cron_credentials ENABLE ROW LEVEL SECURITY;

INSERT INTO public.cron_credentials (key) VALUES ('default') ON CONFLICT DO NOTHING;