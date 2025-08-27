-- Fix the get_public_products function to return proper format
DROP FUNCTION IF EXISTS public.get_public_products();

-- Create the function with proper return format for JavaScript client
CREATE OR REPLACE FUNCTION public.get_public_products()
RETURNS SETOF public.products 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    name,
    description,
    price,
    image_url,
    created_at,
    updated_at,
    null::numeric as cost_price,
    null::integer as stock_quantity,
    null::integer as min_stock_alert,
    null::uuid as supplier_id
  FROM public.products
  ORDER BY created_at DESC;
$$;