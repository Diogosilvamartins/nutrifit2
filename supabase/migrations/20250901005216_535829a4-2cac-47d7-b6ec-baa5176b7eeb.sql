-- Fix remaining security issues

-- 1. Fix shipping_cache table to be accessible only to authenticated users
-- Drop existing public policies
DROP POLICY IF EXISTS "Anyone can view shipping cache" ON public.shipping_cache;
DROP POLICY IF EXISTS "System can manage shipping cache" ON public.shipping_cache;

-- Create new restricted policies
CREATE POLICY "Authenticated users can view shipping cache" 
ON public.shipping_cache 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "System can insert shipping cache" 
ON public.shipping_cache 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "System can update shipping cache" 
ON public.shipping_cache 
FOR UPDATE 
TO authenticated
USING (true);

-- 2. Set search_path for remaining functions that might be missing it
-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE 
      WHEN NEW.email = 'admin@nutrifit.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$;

-- Update audit_trigger_function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      TG_TABLE_NAME,
      TG_OP,
      OLD.id,
      row_to_json(OLD)::jsonb,
      NULL
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event(
      TG_TABLE_NAME,
      TG_OP,
      NEW.id,
      row_to_json(OLD)::jsonb,
      row_to_json(NEW)::jsonb
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      TG_TABLE_NAME,
      TG_OP,
      NEW.id,
      NULL,
      row_to_json(NEW)::jsonb
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Update register_sale_movement
CREATE OR REPLACE FUNCTION public.register_sale_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If the sale was canceled, remove the cash movement
  IF NEW.quote_type = 'sale' AND NEW.status = 'canceled' THEN
    DELETE FROM public.cash_movements 
    WHERE reference_type = 'venda' AND reference_id = NEW.id;
    RETURN NEW;
  END IF;
  
  -- For completed sales, create movement if not exists
  IF NEW.quote_type = 'sale' AND NEW.status = 'completed' AND NEW.payment_method IS NOT NULL THEN
    
    IF NOT EXISTS (
      SELECT 1 FROM public.cash_movements 
      WHERE reference_type = 'venda' AND reference_id = NEW.id
    ) THEN
      
      IF NEW.payment_method = 'dinheiro' THEN
        INSERT INTO public.cash_movements (
          date,
          type,
          amount,
          description,
          category,
          reference_type,
          reference_id,
          created_by
        ) VALUES (
          COALESCE(NEW.sale_date, DATE(NEW.created_at)),
          'entrada',
          NEW.total_amount,
          'Venda ' || NEW.quote_number || ' - ' || NEW.customer_name,
          'dinheiro',
          'venda',
          NEW.id,
          NEW.created_by
        );
        
      ELSIF NEW.payment_method IN ('pix', 'cartao_debito', 'cartao_credito') THEN
        INSERT INTO public.cash_movements (
          date,
          type,
          amount,
          description,
          category,
          reference_type,
          reference_id,
          created_by
        ) VALUES (
          COALESCE(NEW.sale_date, DATE(NEW.created_at)),
          'entrada',
          NEW.total_amount,
          CASE 
            WHEN NEW.payment_method = 'pix' THEN 'Venda PIX '
            WHEN NEW.payment_method = 'cartao_debito' THEN 'Venda Cartão Débito '
            WHEN NEW.payment_method = 'cartao_credito' THEN 'Venda Cartão Crédito '
          END || NEW.quote_number || ' - ' || NEW.customer_name,
          NEW.payment_method,
          'venda',
          NEW.id,
          NEW.created_by
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update update_quotes_customer_data
CREATE OR REPLACE FUNCTION public.update_quotes_customer_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Atualizar orçamentos que referenciam este cliente
  UPDATE quotes 
  SET 
    customer_name = NEW.name,
    customer_phone = NEW.phone,
    customer_email = NEW.email,
    customer_cpf = NEW.cpf,
    updated_at = now()
  WHERE customer_id = NEW.id;
  
  RETURN NEW;
END;
$$;