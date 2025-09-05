-- Add public access token to orders table for secure access
ALTER TABLE public.orders 
ADD COLUMN public_access_token TEXT DEFAULT encode(gen_random_bytes(32), 'hex');

-- Update existing orders with tokens
UPDATE public.orders 
SET public_access_token = encode(gen_random_bytes(32), 'hex') 
WHERE public_access_token IS NULL;

-- Make the column NOT NULL
ALTER TABLE public.orders 
ALTER COLUMN public_access_token SET NOT NULL;

-- Add unique constraint for security
ALTER TABLE public.orders 
ADD CONSTRAINT orders_public_access_token_unique UNIQUE (public_access_token);

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Create new secure policy that only allows authenticated users to view their own orders
CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Create secure function to get order by public token
CREATE OR REPLACE FUNCTION public.get_order_by_public_token(token TEXT)
RETURNS TABLE(
  id UUID,
  customer_name TEXT,
  customer_email TEXT,
  customer_cpf TEXT,
  customer_phone TEXT,
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_state TEXT,
  delivery_zipcode TEXT,
  delivery_complement TEXT,
  products JSONB,
  total_amount NUMERIC,
  shipping_cost NUMERIC,
  status TEXT,
  pix_phone TEXT,
  payment_method TEXT,
  shipping_type TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.customer_name,
    o.customer_email,
    o.customer_cpf,
    o.customer_phone,
    o.delivery_address,
    o.delivery_city,
    o.delivery_state,
    o.delivery_zipcode,
    o.delivery_complement,
    o.products,
    o.total_amount,
    o.shipping_cost,
    o.status,
    o.pix_phone,
    o.payment_method,
    o.shipping_type,
    o.created_at
  FROM public.orders o
  WHERE o.public_access_token = token;
END;
$$;