-- Corrigir datas das vendas do dia 14/08/2025 para 13/08/2025 (ajuste de timezone para Brasília)
-- Vendas feitas entre 02:00 e 03:00 UTC no dia 14 na verdade foram feitas no final do dia 13 no horário de Brasília (UTC-3)

UPDATE quotes 
SET created_at = created_at - INTERVAL '3 hours'
WHERE DATE(created_at) = '2025-08-14' 
AND EXTRACT(HOUR FROM created_at) BETWEEN 2 AND 3;

-- Atualizar também as movimentações de caixa relacionadas
UPDATE cash_movements 
SET date = date - INTERVAL '1 day'
WHERE date = '2025-08-14' 
AND reference_type = 'venda'
AND reference_id IN (
  SELECT id FROM quotes 
  WHERE DATE(created_at) = '2025-08-13'
  AND quote_type = 'sale'
);

-- Atualizar movimentações de estoque relacionadas
UPDATE stock_movements 
SET created_at = created_at - INTERVAL '3 hours'
WHERE DATE(created_at) = '2025-08-14' 
AND EXTRACT(HOUR FROM created_at) BETWEEN 2 AND 3
AND reference_type IN ('sale', 'venda');

-- Criar função para garantir que datas sejam sempre salvas no timezone de Brasília
CREATE OR REPLACE FUNCTION public.convert_to_brazil_timezone(input_timestamp timestamp with time zone)
RETURNS timestamp with time zone
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Converte para o timezone de São Paulo (Brasília)
  RETURN input_timestamp AT TIME ZONE 'America/Sao_Paulo';
END;
$$;