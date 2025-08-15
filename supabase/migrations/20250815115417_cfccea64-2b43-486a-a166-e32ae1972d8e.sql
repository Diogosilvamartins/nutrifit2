-- Adicionar coluna supplier_id na tabela products
ALTER TABLE public.products 
ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id);