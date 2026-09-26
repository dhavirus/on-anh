-- M6: run weekly-insight every Monday 01:00 Vietnam time (Sun 18:00 UTC).
-- The function URL and shared secret differ per environment and must not
-- be committed, so they live in Vault. One-time setup per environment
-- (run in the SQL editor, not a migration):
--   select vault.create_secret('<https://<ref>.supabase.co/functions/v1/weekly-insight>', 'weekly_insight_url');
--   select vault.create_secret('<same value as the CRON_SECRET function secret>', 'cron_secret');
-- Until both exist the job fires and posts nowhere (url is null -> pg_net error, logged, harmless).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'weekly-insight',
  '0 18 * * 0',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'weekly_insight_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000)
  $$
);
