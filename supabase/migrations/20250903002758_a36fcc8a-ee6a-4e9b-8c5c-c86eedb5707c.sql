-- Fix the generate_entry_number function to handle concurrent calls
CREATE OR REPLACE FUNCTION public.generate_entry_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_number TEXT;
  counter INTEGER := 1;
  base_number TEXT;
BEGIN
  -- Get current date in YYYYMM format
  base_number := TO_CHAR(CURRENT_DATE, 'YYYYMM');
  
  -- Loop until we find a unique number
  LOOP
    new_number := base_number || LPAD(counter::TEXT, 4, '0');
    
    -- Check if this number already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.accounting_entries 
      WHERE entry_number = new_number
    ) THEN
      RETURN new_number;
    END IF;
    
    counter := counter + 1;
    
    -- Prevent infinite loop (max 9999 entries per month)
    IF counter > 9999 THEN
      RAISE EXCEPTION 'Limite de lançamentos mensais excedido';
    END IF;
  END LOOP;
END;
$function$