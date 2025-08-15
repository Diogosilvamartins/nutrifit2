-- Aplicar mais R$ 5,00 de desconto (total de R$ 40,00)
UPDATE public.quotes 
SET 
  discount_amount = 40.00,
  total_amount = subtotal - 40.00
WHERE id = '6960ac72-6a80-4a94-a496-04ff0af66337';

-- Atualizar o movimento de caixa correspondente
UPDATE public.cash_movements 
SET amount = 165.00
WHERE reference_type = 'venda' 
  AND reference_id = '6960ac72-6a80-4a94-a496-04ff0af66337';