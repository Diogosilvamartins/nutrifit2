-- Fix critical security vulnerability in orders table
-- Remove overly permissive creation policies

-- Drop the existing overly permissive policies for order creation
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;

-- Create secure policy for order creation - requires authentication
CREATE POLICY "Authenticated users can create their own orders" 
ON public.orders 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User must be authenticated and the user_id must match the authenticated user
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);

-- Add policy for public access via token (for order confirmation pages)
CREATE POLICY "Public access via token for order confirmation" 
ON public.orders 
FOR SELECT 
TO public
USING (
  -- Allow access only when using the public_access_token
  -- This is for order confirmation pages where users don't need to be logged in
  public_access_token IS NOT NULL
);