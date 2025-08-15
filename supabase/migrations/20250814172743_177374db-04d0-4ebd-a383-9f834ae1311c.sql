-- Ajustar a data da venda do Madson para 13/08/2025

-- 1. Atualizar a data de criação da venda para 13/08/2025
UPDATE public.quotes 
SET created_at = '2025-08-13 23:20:02.613232+00',
    updated_at = now()
WHERE quote_number = '202508140001' 
  AND customer_name = 'Madson';

-- 2. Atualizar a data do movimento de caixa correspondente
UPDATE public.cash_movements 
SET date = '2025-08-13'
WHERE reference_id = (
  SELECT id FROM public.quotes 
  WHERE quote_number = '202508140001' 
    AND customer_name = 'Madson'
) AND reference_type = 'venda';