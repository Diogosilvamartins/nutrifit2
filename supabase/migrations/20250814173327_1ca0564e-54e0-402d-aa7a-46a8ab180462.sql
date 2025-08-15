-- Adicionar campo fornecedor na tabela de movimentações de estoque

ALTER TABLE public.stock_movements 
ADD COLUMN supplier_name TEXT;