-- Atualizar a venda com desconto de R$ 5,00
UPDATE public.quotes 
SET 
  discount_amount = 5.00,
  total_amount = subtotal - 5.00
WHERE id = '6d9626b5-ecd8-4656-a48c-1eb1e6032e91';

-- Atualizar o movimento de caixa correspondente
UPDATE public.cash_movements 
SET amount = 170.00
WHERE reference_type = 'venda' 
  AND reference_id = '6d9626b5-ecd8-4656-a48c-1eb1e6032e91';