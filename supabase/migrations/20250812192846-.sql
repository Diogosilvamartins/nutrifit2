-- Fix the security issue with the function search path
-- First drop the trigger, then the function, then recreate both with proper security
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Recreate function with proper search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();