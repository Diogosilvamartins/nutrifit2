-- Modify the update_product_stock function to prevent negative stock
CREATE OR REPLACE FUNCTION public.update_product_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_stock integer;
BEGIN
  -- Get current stock
  SELECT stock_quantity INTO current_stock 
  FROM public.products 
  WHERE id = NEW.product_id;
  
  IF NEW.movement_type = 'entrada' THEN
    UPDATE public.products 
    SET stock_quantity = stock_quantity + NEW.quantity
    WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'saida' THEN
    -- Check if there's enough stock before allowing the movement
    IF current_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente. Estoque atual: %, Quantidade solicitada: %', current_stock, NEW.quantity;
    END IF;
    
    UPDATE public.products 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add batch_number and expiry_date columns to stock_movements for FIFO control
ALTER TABLE public.stock_movements 
ADD COLUMN IF NOT EXISTS batch_number text,
ADD COLUMN IF NOT EXISTS expiry_date date,
ADD COLUMN IF NOT EXISTS remaining_quantity integer DEFAULT 0;

-- Create index for FIFO queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_fifo ON public.stock_movements(product_id, created_at, remaining_quantity) WHERE movement_type = 'entrada';

-- Function to check available stock for a product
CREATE OR REPLACE FUNCTION public.check_available_stock(product_uuid uuid, required_quantity integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  available_stock integer;
BEGIN
  SELECT stock_quantity INTO available_stock
  FROM public.products
  WHERE id = product_uuid;
  
  RETURN COALESCE(available_stock, 0) >= required_quantity;
END;
$function$;