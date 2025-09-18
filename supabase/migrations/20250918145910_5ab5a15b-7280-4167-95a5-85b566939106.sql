-- Adicionar campos de endereço na tabela quotes
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS customer_zipcode TEXT,
ADD COLUMN IF NOT EXISTS customer_street TEXT,
ADD COLUMN IF NOT EXISTS customer_number TEXT,
ADD COLUMN IF NOT EXISTS customer_complement TEXT,
ADD COLUMN IF NOT EXISTS customer_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS customer_city TEXT,
ADD COLUMN IF NOT EXISTS customer_state TEXT;