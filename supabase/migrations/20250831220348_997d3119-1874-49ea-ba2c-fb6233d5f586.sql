-- Fix remaining security linter warnings
-- Add missing search_path to all SECURITY DEFINER functions

-- Update all functions to have proper search_path settings
CREATE OR REPLACE FUNCTION public.validate_sale_payment_method()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Se for uma venda (sale), o método de pagamento deve ser obrigatório
  IF NEW.quote_type = 'sale' AND (NEW.payment_method IS NULL OR NEW.payment_method = '') THEN
    RAISE EXCEPTION 'Método de pagamento é obrigatório para vendas';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_products()
RETURNS TABLE(id uuid, name text, description text, price numeric, image_url text, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.created_at,
    p.updated_at
  FROM public.products p
  ORDER BY p.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_commission(sale_amount numeric, salesperson_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  commission_data RECORD;
  calculated_commission DECIMAL := 0;
BEGIN
  -- Buscar configuração de comissão para o vendedor
  SELECT commission_percentage, commission_type, fixed_amount 
  INTO commission_data
  FROM public.commissions 
  WHERE salesperson_id = salesperson_id_param 
    AND is_active = true
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Se não encontrar configuração, retorna 0
  IF commission_data IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calcular comissão baseada no tipo
  IF commission_data.commission_type = 'percentage' THEN
    calculated_commission := (sale_amount * commission_data.commission_percentage) / 100;
  ELSIF commission_data.commission_type = 'fixed' THEN
    calculated_commission := commission_data.fixed_amount;
  END IF;
  
  RETURN calculated_commission;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_commission_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  commission_amount DECIMAL;
  commission_percentage DECIMAL;
BEGIN
  -- Apenas para vendas completadas com vendedor definido
  IF NEW.quote_type = 'sale' AND NEW.status = 'completed' AND NEW.salesperson_id IS NOT NULL THEN
    
    -- Buscar porcentagem de comissão
    SELECT c.commission_percentage INTO commission_percentage
    FROM public.commissions c
    WHERE c.salesperson_id = NEW.salesperson_id 
      AND c.is_active = true
    ORDER BY c.created_at DESC 
    LIMIT 1;
    
    -- Calcular comissão
    commission_amount := public.calculate_commission(NEW.total_amount, NEW.salesperson_id);
    
    -- Inserir registro de comissão se houver valor
    IF commission_amount > 0 THEN
      INSERT INTO public.commission_records (
        salesperson_id,
        sale_id,
        sale_type,
        sale_amount,
        commission_percentage,
        commission_amount,
        created_by
      ) VALUES (
        NEW.salesperson_id,
        NEW.id,
        'quote',
        NEW.total_amount,
        COALESCE(commission_percentage, 0),
        commission_amount,
        NEW.created_by
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_stock integer;
BEGIN
  -- Get current stock
  SELECT stock_quantity INTO current_stock 
  FROM public.products 
  WHERE id = NEW.product_id;
  
  IF NEW.movement_type = 'entrada' THEN
    UPDATE public.products 
    SET stock_quantity = stock_quantity + NEW.quantity
    WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'saida' THEN
    -- Check if there's enough stock before allowing the movement
    IF current_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente. Estoque atual: %, Quantidade solicitada: %', current_stock, NEW.quantity;
    END IF;
    
    UPDATE public.products 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_available_stock(product_uuid uuid, required_quantity integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  available_stock integer;
BEGIN
  SELECT stock_quantity INTO available_stock
  FROM public.products
  WHERE id = product_uuid;
  
  RETURN COALESCE(available_stock, 0) >= required_quantity;
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.validate_cpf(cpf_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.format_cpf(cpf_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.calculate_shipping_cost(shipping_type_param text, customer_zipcode text DEFAULT NULL::text, total_weight numeric DEFAULT 1.0)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;