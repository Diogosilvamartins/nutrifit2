-- Create customers/leads table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT UNIQUE,
  birth_date DATE,
  gender TEXT,
  -- Address fields
  zipcode TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  -- Lead tracking
  lead_source TEXT,
  lead_status TEXT DEFAULT 'new',
  notes TEXT,
  last_contact DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies for customers
CREATE POLICY "Authenticated users can view all customers" 
ON public.customers 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update customers" 
ON public.customers 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete customers" 
ON public.customers 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_customers_cpf ON public.customers(cpf);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_lead_status ON public.customers(lead_status);
CREATE INDEX idx_customers_created_at ON public.customers(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to validate CPF
CREATE OR REPLACE FUNCTION public.validate_cpf(cpf_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  cpf TEXT;
  digit1 INTEGER;
  digit2 INTEGER;
  sum1 INTEGER := 0;
  sum2 INTEGER := 0;
  i INTEGER;
BEGIN
  -- Remove all non-digit characters
  cpf := regexp_replace(cpf_input, '\D', '', 'g');
  
  -- Check if CPF has 11 digits
  IF LENGTH(cpf) != 11 THEN
    RETURN FALSE;
  END IF;
  
  -- Check for invalid sequences (all same digits)
  IF cpf IN ('00000000000', '11111111111', '22222222222', '33333333333', 
             '44444444444', '55555555555', '66666666666', '77777777777', 
             '88888888888', '99999999999') THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate first verification digit
  FOR i IN 1..9 LOOP
    sum1 := sum1 + (SUBSTRING(cpf, i, 1)::INTEGER * (11 - i));
  END LOOP;
  
  digit1 := 11 - (sum1 % 11);
  IF digit1 >= 10 THEN
    digit1 := 0;
  END IF;
  
  -- Calculate second verification digit
  FOR i IN 1..10 LOOP
    sum2 := sum2 + (SUBSTRING(cpf, i, 1)::INTEGER * (12 - i));
  END LOOP;
  
  digit2 := 11 - (sum2 % 11);
  IF digit2 >= 10 THEN
    digit2 := 0;
  END IF;
  
  -- Check if calculated digits match the provided ones
  RETURN (digit1 = SUBSTRING(cpf, 10, 1)::INTEGER AND digit2 = SUBSTRING(cpf, 11, 1)::INTEGER);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Function to format CPF
CREATE OR REPLACE FUNCTION public.format_cpf(cpf_input TEXT)
RETURNS TEXT AS $$
DECLARE
  cpf TEXT;
BEGIN
  -- Remove all non-digit characters
  cpf := regexp_replace(cpf_input, '\D', '', 'g');
  
  -- Check if CPF has 11 digits
  IF LENGTH(cpf) != 11 THEN
    RETURN cpf_input;
  END IF;
  
  -- Format CPF as XXX.XXX.XXX-XX
  RETURN SUBSTRING(cpf, 1, 3) || '.' || 
         SUBSTRING(cpf, 4, 3) || '.' || 
         SUBSTRING(cpf, 7, 3) || '-' || 
         SUBSTRING(cpf, 10, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Update quotes table to reference customers
ALTER TABLE public.quotes ADD COLUMN customer_id UUID REFERENCES public.customers(id);
ALTER TABLE public.orders ADD COLUMN customer_id UUID REFERENCES public.orders(id);

-- Function to get or create customer from quote/order data
CREATE OR REPLACE FUNCTION public.get_or_create_customer(
  customer_name_param TEXT,
  customer_email_param TEXT DEFAULT NULL,
  customer_phone_param TEXT DEFAULT NULL,
  customer_cpf_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  customer_id UUID;
  formatted_cpf TEXT;
BEGIN
  -- Format CPF if provided
  IF customer_cpf_param IS NOT NULL THEN
    formatted_cpf := regexp_replace(customer_cpf_param, '\D', '', 'g');
    
    -- Validate CPF
    IF NOT public.validate_cpf(formatted_cpf) THEN
      RAISE EXCEPTION 'CPF inválido: %', customer_cpf_param;
    END IF;
    
    -- Try to find existing customer by CPF
    SELECT id INTO customer_id 
    FROM public.customers 
    WHERE cpf = formatted_cpf;
    
    IF customer_id IS NOT NULL THEN
      -- Update customer info if found
      UPDATE public.customers 
      SET 
        name = COALESCE(customer_name_param, name),
        email = COALESCE(customer_email_param, email),
        phone = COALESCE(customer_phone_param, phone),
        updated_at = now()
      WHERE id = customer_id;
      
      RETURN customer_id;
    END IF;
  END IF;
  
  -- Try to find by email if no CPF match
  IF customer_email_param IS NOT NULL THEN
    SELECT id INTO customer_id 
    FROM public.customers 
    WHERE email = customer_email_param;
    
    IF customer_id IS NOT NULL THEN
      -- Update customer info if found
      UPDATE public.customers 
      SET 
        name = COALESCE(customer_name_param, name),
        phone = COALESCE(customer_phone_param, phone),
        cpf = COALESCE(formatted_cpf, cpf),
        updated_at = now()
      WHERE id = customer_id;
      
      RETURN customer_id;
    END IF;
  END IF;
  
  -- Create new customer
  INSERT INTO public.customers (
    name, 
    email, 
    phone, 
    cpf,
    lead_source,
    created_by
  ) VALUES (
    customer_name_param,
    customer_email_param,
    customer_phone_param,
    formatted_cpf,
    'system',
    auth.uid()
  ) RETURNING id INTO customer_id;
  
  RETURN customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';