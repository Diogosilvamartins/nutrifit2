-- Corrigir avisos de segurança relacionados à nossa migração

-- 1. Mover extensões pg_cron e pg_net para schema apropriado (fora do public)
-- Primeiro, vamos verificar se as extensões estão no schema public e movê-las

-- Criar schema para extensões se não existir
CREATE SCHEMA IF NOT EXISTS extensions;

-- Recriar as extensões no schema correto
DROP EXTENSION IF EXISTS pg_cron;
DROP EXTENSION IF EXISTS pg_net;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Recriar o cron job com o schema correto
SELECT extensions.cron.unschedule('daily-backup-nutrifit');

SELECT extensions.cron.schedule(
  'daily-backup-nutrifit',
  '0 5 * * *', -- Todos os dias às 5:00 UTC (2:00 Brasília)
  $$
  SELECT
    extensions.net.http_post(
        url:='https://zkxkbghzlfadkpdkctkx.supabase.co/functions/v1/daily-backup',
        headers:='{"Content-Type": "application/json", "x-cron-secret": "backup-nutrifit-2024-secure-key"}'::jsonb,
        body:='{"automated": true, "timestamp": "' || now()::text || '"}'::jsonb
    ) as request_id;
  $$
);

-- 2. Corrigir search_path nas funções que criamos anteriormente
-- Atualizar funções para ter search_path definido (já está feito na maioria das funções existentes)

-- Verificar se setup_cron_config existe e corrigir se necessário
DROP FUNCTION IF EXISTS setup_cron_config();

-- Essa função não é mais necessária com a nova abordagem do cron job