-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar o cron job para backup diário às 2:00 da manhã (horário de Brasília)
-- Horário UTC: 5:00 (considerando UTC-3)
SELECT cron.schedule(
  'daily-backup-nutrifit',
  '0 5 * * *', -- Todos os dias às 5:00 UTC (2:00 Brasília)
  $$
  SELECT
    net.http_post(
        url:='https://zkxkbghzlfadkpdkctkx.supabase.co/functions/v1/daily-backup',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreGtiZ2h6bGZhZGtwZGtjdGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjU4ODYsImV4cCI6MjA3MDYwMTg4Nn0.9kovhayP4cSDWW2FBayEV8h9Frpi23s5-0sWmWwjOI0", "x-cron-secret": "backup-nutrifit-2024-secure-key"}'::jsonb,
        body:='{"automated": true, "timestamp": "' || now()::text || '"}'::jsonb
    ) as request_id;
  $$
);

-- Verificar se o cron job foi criado com sucesso
SELECT jobname, schedule, command, active 
FROM cron.job 
WHERE jobname = 'daily-backup-nutrifit';