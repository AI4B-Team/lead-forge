SELECT cron.unschedule('leadtrace-tick-sequences')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'leadtrace-tick-sequences');

SELECT cron.schedule(
  'leadtrace-tick-sequences',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--c17f89b5-abf1-402a-95e3-1ace02324806.lovable.app/api/public/hooks/tick-sequences',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT secret FROM public.cron_credentials WHERE key = 'default')
    ),
    body := '{}'::jsonb
  );
  $$
);