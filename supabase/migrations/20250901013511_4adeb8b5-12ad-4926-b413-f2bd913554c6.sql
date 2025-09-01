-- Fix remaining security issues for shipping_options

-- Drop existing public policy and create restricted one
DROP POLICY IF EXISTS "Anyone can view active shipping options" ON public.shipping_options;

-- Create new policy that restricts access to authenticated users only
CREATE POLICY "Authenticated users can view active shipping options" 
ON public.shipping_options 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix search_path for convert_to_brazil_timezone function  
CREATE OR REPLACE FUNCTION public.convert_to_brazil_timezone(input_timestamp timestamp with time zone)
RETURNS timestamp with time zone
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Converte para o timezone de São Paulo (Brasília)
  RETURN input_timestamp AT TIME ZONE 'America/Sao_Paulo';
END;
$$;