-- Comprehensive Security Hardening Migration
-- This fixes privilege escalation, data exposure, and audit vulnerabilities

-- 1. Create trigger function to prevent profile privilege escalation
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can modify role, permissions, or is_active for any profile
  IF OLD.role != NEW.role OR 
     OLD.permissions != NEW.permissions OR 
     OLD.is_active != NEW.is_active THEN
    
    -- Check if current user is admin
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only administrators can modify user roles, permissions, or active status';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger to prevent privilege escalation
DROP TRIGGER IF EXISTS prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER prevent_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2. Fix audit_logs insertion security - restrict to service role and admins only
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Only service role and admins can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role' OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 3. Tighten SELECT policies to role-based access

-- Customers: Replace broad access with role-based access
DROP POLICY IF EXISTS "Authenticated users can view all customers" ON public.customers;
CREATE POLICY "Admins and managers can view all customers"
ON public.customers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Users can view customers they created"
ON public.customers
FOR SELECT
USING (created_by = auth.uid());

-- Quotes: Replace broad access with role-based access
DROP POLICY IF EXISTS "Authenticated users can view all quotes" ON public.quotes;
CREATE POLICY "Admins and managers can view all quotes"
ON public.quotes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Users can view quotes they created or are salesperson for"
ON public.quotes
FOR SELECT
USING (created_by = auth.uid() OR salesperson_id = auth.uid());

-- Orders: Replace broad access with role-based access
DROP POLICY IF EXISTS "Authenticated users can view all orders" ON public.orders;
CREATE POLICY "Admins and managers can view all orders"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Products: Restrict authenticated access to admins and managers only
DROP POLICY IF EXISTS "Authenticated users can view all product data" ON public.products;
CREATE POLICY "Admins and managers can view all product data"
ON public.products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Suppliers: Restrict to admins and managers
DROP POLICY IF EXISTS "Authenticated users can view all suppliers" ON public.suppliers;
CREATE POLICY "Admins and managers can view all suppliers"
ON public.suppliers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Stock movements: Restrict to admins and managers
DROP POLICY IF EXISTS "Authenticated users can view stock movements" ON public.stock_movements;
CREATE POLICY "Admins and managers can view stock movements"
ON public.stock_movements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Cash movements: Restrict to admins and managers
DROP POLICY IF EXISTS "Authenticated users can view cash movements" ON public.cash_movements;
CREATE POLICY "Admins and managers can view cash movements"
ON public.cash_movements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Commissions: Replace broad access with role-based access
DROP POLICY IF EXISTS "Authenticated users can view commissions" ON public.commissions;
CREATE POLICY "Admins and managers can view commissions"
ON public.commissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- 4. Add missing search_path settings to functions for security
CREATE OR REPLACE FUNCTION public.generate_unique_quote_number()
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
    -- Gerar número base baseado na data atual
    base_number := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Loop até encontrar um número único
    LOOP
        new_number := base_number || LPAD(counter::TEXT, 4, '0');
        
        -- Verificar se o número já existe
        IF NOT EXISTS (SELECT 1 FROM quotes WHERE quote_number = new_number) THEN
            RETURN new_number;
        END IF;
        
        counter := counter + 1;
        
        -- Prevenção de loop infinito (máximo 9999 orçamentos por dia)
        IF counter > 9999 THEN
            RAISE EXCEPTION 'Limite de orçamentos diários excedido';
        END IF;
    END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_quotes_customer_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- 5. Update policies for other tables that need role-based restrictions
-- Update DELETE and UPDATE policies to match the new security model

-- Customers: Restrict deletions and updates to admins and managers
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;
CREATE POLICY "Admins and managers can delete customers"
ON public.customers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
CREATE POLICY "Admins and managers can update customers"
ON public.customers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Products: Restrict modifications to admins and managers
DROP POLICY IF EXISTS "Authenticated users can create products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

CREATE POLICY "Admins and managers can create products"
ON public.products
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can update products"
ON public.products
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can delete products"
ON public.products
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Suppliers: Restrict modifications to admins and managers
DROP POLICY IF EXISTS "Authenticated users can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can delete suppliers" ON public.suppliers;

CREATE POLICY "Admins and managers can insert suppliers"
ON public.suppliers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can update suppliers"
ON public.suppliers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can delete suppliers"
ON public.suppliers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Stock movements: Restrict creation and updates to admins and managers
DROP POLICY IF EXISTS "Authenticated users can create stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Authenticated users can update stock movements" ON public.stock_movements;

CREATE POLICY "Admins and managers can create stock movements"
ON public.stock_movements
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can update stock movements"
ON public.stock_movements
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Cash movements: Restrict modifications to admins and managers
DROP POLICY IF EXISTS "Authenticated users can insert cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Authenticated users can update cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Authenticated users can delete cash movements" ON public.cash_movements;

CREATE POLICY "Admins and managers can insert cash movements"
ON public.cash_movements
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can update cash movements"
ON public.cash_movements
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can delete cash movements"
ON public.cash_movements
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Quotes: Restrict modifications to admins, managers, and creators
DROP POLICY IF EXISTS "Authenticated users can create quotes" ON public.quotes;
DROP POLICY IF EXISTS "Authenticated users can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Authenticated users can delete quotes" ON public.quotes;

CREATE POLICY "Users can create quotes"
ON public.quotes
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can update all quotes, users can update their own"
ON public.quotes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ) OR 
  created_by = auth.uid() OR 
  salesperson_id = auth.uid()
);

CREATE POLICY "Admins and managers can delete quotes"
ON public.quotes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);