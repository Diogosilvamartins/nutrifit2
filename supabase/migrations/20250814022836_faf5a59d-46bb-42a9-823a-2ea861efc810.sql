-- Corrigir problemas de segurança: definir search_path nas funções

-- Corrigir a função convert_to_brazil_timezone
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