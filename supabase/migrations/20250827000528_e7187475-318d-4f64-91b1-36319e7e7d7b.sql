-- Drop and recreate the function with correct return format
DROP FUNCTION IF EXISTS public.get_public_products();

CREATE OR REPLACE FUNCTION public.get_public_products()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  image_url text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.created_at,
    p.updated_at
  FROM public.products p
  ORDER BY p.created_at DESC;
$$;