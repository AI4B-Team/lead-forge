
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('leadtrace-tick-campaigns') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'leadtrace-tick-campaigns');

SELECT cron.schedule(
  'leadtrace-tick-campaigns',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--c17f89b5-abf1-402a-95e3-1ace02324806.lovable.app/api/public/hooks/tick-campaigns',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_5exfdRI2AfLl3swnaQozSQ_zZVoSPUQ"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
