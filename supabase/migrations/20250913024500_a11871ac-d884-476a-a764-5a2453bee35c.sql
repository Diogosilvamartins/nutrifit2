-- Alterar horário do backup automático para 23:59 (horário de Brasília)
-- Horário UTC: 02:59 (considerando UTC-3)

-- Remover o cron job atual
SELECT extensions.cron.unschedule('daily-backup-nutrifit');

-- Criar novo cron job para 23:59 (horário de Brasília) = 02:59 UTC
SELECT extensions.cron.schedule(
  'daily-backup-nutrifit',
  '59 2 * * *', -- Todos os dias às 02:59 UTC (23:59 Brasília)
  $$
  SELECT
    extensions.net.http_post(
        url:='https://zkxkbghzlfadkpdkctkx.supabase.co/functions/v1/daily-backup',
        headers:='{"Content-Type": "application/json", "x-cron-secret": "backup-nutrifit-2024-secure-key"}'::jsonb,
        body:='{"automated": true, "timestamp": "' || now()::text || '"}'::jsonb
    ) as request_id;
  $$
);