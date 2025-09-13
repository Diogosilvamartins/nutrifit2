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
        headers:='{"Content-Type": "application/json", "x-cron-secret": "' || current_setting('app.cron_secret', true) || '"}'::jsonb,
        body:='{"automated": true, "timestamp": "' || now()::text || '"}'::jsonb
    ) as request_id;
  $$
);

-- Criar uma configuração de sistema para armazenar o CRON_SECRET
-- (Isso será usado pelo cron job)
INSERT INTO system_settings (setting_key, setting_value, description, updated_by)
VALUES (
  'cron_secret', 
  jsonb_build_object('value', 'backup-nutrifit-2024-secure-key'),
  'Secret key para autenticação de cron jobs automatizados',
  '00000000-0000-0000-0000-000000000000'::uuid
) ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();

-- Configurar a variável de sessão que será usada pelo cron
-- Isso deve ser feito em cada sessão, mas vamos criar uma função para isso
CREATE OR REPLACE FUNCTION setup_cron_config()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_value text;
BEGIN
  -- Buscar o secret das configurações do sistema
  SELECT (setting_value->>'value') INTO secret_value
  FROM system_settings 
  WHERE setting_key = 'cron_secret';
  
  -- Configurar a variável de sessão
  IF secret_value IS NOT NULL THEN
    PERFORM set_config('app.cron_secret', secret_value, false);
  END IF;
END;
$$;

-- Executar a configuração inicial
SELECT setup_cron_config();

-- Log da criação do cron job
INSERT INTO audit_logs (
  user_id,
  table_name,
  operation,
  record_id,
  new_values
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'system',
  'CRON_SETUP',
  null,
  jsonb_build_object(
    'job_name', 'daily-backup-nutrifit',
    'schedule', '0 5 * * *',
    'description', 'Backup diário automático configurado',
    'created_at', now()
  )
);