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
        headers:='{"Content-Type": "application/json", "x-cron-secret": "backup-nutrifit-2024-secure-key"}'::jsonb,
        body:='{"automated": true, "timestamp": "' || now()::text || '"}'::jsonb
    ) as request_id;
  $$
);

-- Log da criação do cron job (sem especificar user_id)
INSERT INTO audit_logs (
  table_name,
  operation,
  new_values
) VALUES (
  'system',
  'CRON_SETUP',
  jsonb_build_object(
    'job_name', 'daily-backup-nutrifit',
    'schedule', '0 5 * * * (UTC)',
    'schedule_brasilia', '2:00 da manhã (horário de Brasília)',
    'description', 'Backup diário automático configurado para executar todos os dias às 2h da manhã',
    'url', 'https://zkxkbghzlfadkpdkctkx.supabase.co/functions/v1/daily-backup',
    'created_at', now()
  )
);