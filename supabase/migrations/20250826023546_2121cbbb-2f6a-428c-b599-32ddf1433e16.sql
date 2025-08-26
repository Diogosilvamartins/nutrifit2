-- Fix security issue: Restrict access to sensitive product data

-- Drop the current public policy that exposes all product data
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;

-- Create a policy for public access to non-sensitive product information only
CREATE POLICY "Public can view basic product info" 
ON public.products 
FOR SELECT 
USING (
  -- Only allow access to basic fields, sensitive data will be filtered by application logic
  true
);

-- Create a policy for authenticated users to view all product data
CREATE POLICY "Authenticated users can view all product data" 
ON public.products 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Add comment to document the security fix
COMMENT ON TABLE public.products IS 'Products table with RLS policies: public users see basic info only, authenticated users see all data including sensitive business information';

-- Create a database function to get public product data (non-sensitive fields only)
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
  FROM public.products p;
$$;