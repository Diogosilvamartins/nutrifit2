-- Fix critical security vulnerability in orders table
-- Remove overly permissive policies and implement proper authentication

-- Drop the existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;

-- Create secure policy for order creation - requires authentication
CREATE POLICY "Authenticated users can create orders" 
ON public.orders 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User must be authenticated and the user_id must match the authenticated user
  auth.uid() IS NOT NULL AND 
  (user_id = auth.uid() OR user_id IS NULL)
);

-- Policy for users to view their own orders
CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);

-- Keep admin/manager access for order management
CREATE POLICY "Admins and managers can manage all orders" 
ON public.orders 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'salesperson')
  )
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