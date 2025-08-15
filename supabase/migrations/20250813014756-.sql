-- Create table for in-store sales and quotes
CREATE TABLE public.quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  customer_cpf text,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  quote_type text NOT NULL DEFAULT 'quote', -- 'quote' or 'sale'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'converted', 'completed'
  valid_until date,
  notes text,
  payment_method text,
  payment_status text DEFAULT 'pending', -- 'pending', 'paid', 'partial'
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view all quotes" 
ON public.quotes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create quotes" 
ON public.quotes 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update quotes" 
ON public.quotes 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete quotes" 
ON public.quotes 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate quote number
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_number text;
  counter integer;
BEGIN
  -- Get current date in YYYYMMDD format
  SELECT TO_CHAR(CURRENT_DATE, 'YYYYMMDD') INTO new_number;
  
  -- Count existing quotes for today
  SELECT COUNT(*) + 1 INTO counter
  FROM public.quotes
  WHERE quote_number LIKE new_number || '%'
  AND DATE(created_at) = CURRENT_DATE;
  
  -- Generate final quote number: YYYYMMDD001, YYYYMMDD002, etc.
  new_number := new_number || LPAD(counter::text, 3, '0');
  
  RETURN new_number;
END;
$function$;