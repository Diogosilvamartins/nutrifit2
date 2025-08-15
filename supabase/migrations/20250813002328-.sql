-- Corrigir função para ter search_path seguro
CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.movement_type = 'entrada' THEN
    UPDATE public.products 
    SET stock_quantity = stock_quantity + NEW.quantity
    WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'saida' THEN
    UPDATE public.products 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$;