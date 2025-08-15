-- Create orders table for PIX payments
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Customer data
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_cpf TEXT NOT NULL,
  customer_phone TEXT,
  
  -- Delivery address
  delivery_address TEXT NOT NULL,
  delivery_city TEXT NOT NULL,
  delivery_state TEXT NOT NULL,
  delivery_zipcode TEXT NOT NULL,
  delivery_complement TEXT,
  
  -- Order data
  products JSONB NOT NULL, -- Array of products with quantities and prices
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, shipped, delivered, cancelled
  
  -- PIX payment data
  pix_phone TEXT DEFAULT '33999799138',
  payment_method TEXT DEFAULT 'pix',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own orders (if logged in)
CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (user_id = auth.uid() OR user_id IS NULL);

-- Policy for anyone to create orders (guest checkout)
CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Policy for admin to view all orders (when admin functionality is needed)
CREATE POLICY "Authenticated users can view all orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();