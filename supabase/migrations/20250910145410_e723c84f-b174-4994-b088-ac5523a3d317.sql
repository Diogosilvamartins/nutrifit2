-- Add barcode column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);

-- Add comment
COMMENT ON COLUMN public.products.barcode IS 'Código de barras do produto para leitores físicos';