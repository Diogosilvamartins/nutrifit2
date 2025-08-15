-- Atualizar a venda com desconto de R$ 35,00
UPDATE public.quotes 
SET 
  discount_amount = 35.00,
  total_amount = subtotal - 35.00
WHERE id = '6960ac72-6a80-4a94-a496-04ff0af66337';

-- Atualizar o movimento de caixa correspondente
UPDATE public.cash_movements 
SET amount = 170.00
WHERE reference_type = 'venda' 
  AND reference_id = '6960ac72-6a80-4a94-a496-04ff0af66337';