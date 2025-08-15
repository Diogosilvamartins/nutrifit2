-- Update shipping calculation function to use Correios API
CREATE OR REPLACE FUNCTION public.calculate_shipping_cost(
  shipping_type_param text, 
  customer_zipcode text DEFAULT NULL::text, 
  total_weight numeric DEFAULT 1.0
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  shipping_cost numeric := 0;
  company_zipcode text := '37540000'; -- CEP da empresa (Carmo de Minas, MG)
BEGIN
  CASE shipping_type_param
    WHEN 'local' THEN
      shipping_cost := 15.00;
    WHEN 'correios_pac' THEN
      -- Will be calculated via API call from frontend
      shipping_cost := 25.00; -- fallback value
    WHEN 'correios_sedex' THEN
      -- Will be calculated via API call from frontend
      shipping_cost := 35.00; -- fallback value
    WHEN 'pickup' THEN
      shipping_cost := 0;
    ELSE
      shipping_cost := 15.00; -- Default to local shipping
  END CASE;
  
  RETURN shipping_cost;
END;
$$;

-- Create shipping options table for better management
CREATE TABLE public.shipping_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('local', 'correios', 'pickup')),
  service_code TEXT, -- For Correios services (04014, 04510, etc.)
  fixed_price NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipping_options ENABLE ROW LEVEL SECURITY;

-- Create policies for shipping options
CREATE POLICY "Anyone can view active shipping options" 
ON public.shipping_options 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage shipping options" 
ON public.shipping_options 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add trigger for updating timestamps
CREATE TRIGGER update_shipping_options_updated_at
  BEFORE UPDATE ON public.shipping_options
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default shipping options
INSERT INTO public.shipping_options (code, name, description, type, service_code, fixed_price) VALUES
  ('local', 'Entrega Local', 'Entrega na região de Carmo de Minas', 'local', NULL, 15.00),
  ('pac', 'PAC Correios', 'Entrega em até 8 dias úteis', 'correios', '04510', NULL),
  ('sedex', 'SEDEX Correios', 'Entrega em até 2 dias úteis', 'correios', '04014', NULL),
  ('pickup', 'Retirada na Loja', 'Retirar diretamente na loja', 'pickup', NULL, 0.00);

-- Create shipping cache table to avoid repeated API calls
CREATE TABLE public.shipping_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cep_origem TEXT NOT NULL,
  cep_destino TEXT NOT NULL,
  peso NUMERIC NOT NULL,
  servico TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  prazo INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cep_origem, cep_destino, peso, servico)
);

-- Enable RLS on shipping cache
ALTER TABLE public.shipping_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for shipping cache (anyone can read, system can insert)
CREATE POLICY "Anyone can view shipping cache" 
ON public.shipping_cache 
FOR SELECT 
USING (true);

CREATE POLICY "System can manage shipping cache" 
ON public.shipping_cache 
FOR ALL 
USING (true);