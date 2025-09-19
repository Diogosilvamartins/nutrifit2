-- Enhanced security: Implement data masking and ultra-restrictive access controls for customer data

-- Create a secure function to mask sensitive customer data based on user role
CREATE OR REPLACE FUNCTION public.get_customer_safe_data(customer_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  gender TEXT,
  zipcode TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  lead_source TEXT,
  lead_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  is_creator BOOLEAN := false;
BEGIN
  -- Get current user role
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Check if user created this customer
  SELECT EXISTS(
    SELECT 1 FROM public.customers c 
    WHERE c.id = customer_id AND c.created_by = auth.uid()
  ) INTO is_creator;
  
  -- Return data based on role and ownership
  IF user_role = 'admin' OR user_role = 'manager' THEN
    -- Admins and managers get full access
    RETURN QUERY
    SELECT c.id, c.name, c.email, c.phone, c.cpf, c.gender, c.zipcode, 
           c.street, c.number, c.complement, c.neighborhood, c.city, c.state,
           c.lead_source, c.lead_status, c.notes, c.created_at, c.updated_at, c.created_by
    FROM public.customers c
    WHERE c.id = customer_id;
    
  ELSIF user_role = 'salesperson' AND is_creator THEN
    -- Salespersons get masked sensitive data for customers they created
    RETURN QUERY
    SELECT c.id, c.name, 
           -- Mask email (show only first 3 chars + domain)
           CASE 
             WHEN c.email IS NOT NULL THEN 
               SUBSTRING(c.email FROM 1 FOR 3) || '***@' || SPLIT_PART(c.email, '@', 2)
             ELSE NULL 
           END as email,
           -- Mask phone (show only last 4 digits)
           CASE 
             WHEN c.phone IS NOT NULL THEN 
               '****-' || RIGHT(REGEXP_REPLACE(c.phone, '\D', '', 'g'), 4)
             ELSE NULL 
           END as phone,
           -- Mask CPF (show only first 3 and last 2 digits)
           CASE 
             WHEN c.cpf IS NOT NULL THEN 
               LEFT(REGEXP_REPLACE(c.cpf, '\D', '', 'g'), 3) || '.***.***-' || 
               RIGHT(REGEXP_REPLACE(c.cpf, '\D', '', 'g'), 2)
             ELSE NULL 
           END as cpf,
           c.gender, c.zipcode, c.street, c.number, c.complement, 
           c.neighborhood, c.city, c.state, c.lead_source, c.lead_status, 
           c.notes, c.created_at, c.updated_at, c.created_by
    FROM public.customers c
    WHERE c.id = customer_id;
  ELSE
    -- No access for other roles
    RETURN;
  END IF;
END;
$$;

-- Create a function to get customer list with appropriate access controls
CREATE OR REPLACE FUNCTION public.get_customers_list()
RETURNS TABLE(
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  city TEXT,
  state TEXT,
  lead_status TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  access_level TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get current user role
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF user_role = 'admin' OR user_role = 'manager' THEN
    -- Admins and managers get full customer list with full data
    RETURN QUERY
    SELECT c.id, c.name, c.email, c.phone, c.cpf, c.city, c.state, 
           c.lead_status, c.created_at, c.created_by, 'full'::TEXT as access_level
    FROM public.customers c
    ORDER BY c.created_at DESC;
    
  ELSIF user_role = 'salesperson' THEN
    -- Salespersons get masked data for customers they created only
    RETURN QUERY
    SELECT c.id, c.name,
           -- Masked email
           CASE 
             WHEN c.email IS NOT NULL THEN 
               SUBSTRING(c.email FROM 1 FOR 3) || '***@' || SPLIT_PART(c.email, '@', 2)
             ELSE NULL 
           END as email,
           -- Masked phone
           CASE 
             WHEN c.phone IS NOT NULL THEN 
               '****-' || RIGHT(REGEXP_REPLACE(c.phone, '\D', '', 'g'), 4)
             ELSE NULL 
           END as phone,
           -- Masked CPF
           CASE 
             WHEN c.cpf IS NOT NULL THEN 
               LEFT(REGEXP_REPLACE(c.cpf, '\D', '', 'g'), 3) || '.***.***-' || 
               RIGHT(REGEXP_REPLACE(c.cpf, '\D', '', 'g'), 2)
             ELSE NULL 
           END as cpf,
           c.city, c.state, c.lead_status, c.created_at, c.created_by, 
           'masked'::TEXT as access_level
    FROM public.customers c
    WHERE c.created_by = auth.uid()
    ORDER BY c.created_at DESC;
  ELSE
    -- No access for other roles
    RETURN;
  END IF;
END;
$$;

-- Drop the old overly permissive policies and create ultra-restrictive ones
DROP POLICY IF EXISTS "Restricted customer viewing access" ON public.customers;
DROP POLICY IF EXISTS "Restricted customer update access" ON public.customers;

-- Ultra-restrictive policy: Only admins and managers can directly access customer table
CREATE POLICY "Ultra restricted customer access - admins and managers only" 
ON public.customers 
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = ANY (ARRAY['admin', 'manager'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = ANY (ARRAY['admin', 'manager'])
  )
);

-- Create a secure view for customer data that respects access controls
CREATE OR REPLACE VIEW public.secure_customers AS
SELECT * FROM public.get_customers_list();

-- Grant appropriate permissions
GRANT SELECT ON public.secure_customers TO authenticated;

-- Create audit trigger for customer data access
CREATE OR REPLACE FUNCTION public.audit_customer_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log any direct access to customer table
  PERFORM public.log_audit_event(
    'customers_direct_access',
    'DIRECT_TABLE_ACCESS',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN OLD IS NOT NULL THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN NEW IS NOT NULL THEN row_to_json(NEW)::jsonb ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add audit trigger to monitor direct table access
CREATE TRIGGER audit_customer_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.audit_customer_access();

-- Add function to safely create customers with automatic role validation
CREATE OR REPLACE FUNCTION public.create_customer_safe(
  p_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_cpf TEXT DEFAULT NULL,
  p_zipcode TEXT DEFAULT NULL,
  p_street TEXT DEFAULT NULL,
  p_number TEXT DEFAULT NULL,
  p_complement TEXT DEFAULT NULL,
  p_neighborhood TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  new_customer_id UUID;
  formatted_cpf TEXT;
BEGIN
  -- Get current user role
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Only admins, managers, and salespersons can create customers
  IF user_role NOT IN ('admin', 'manager', 'salesperson') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores, gerentes e vendedores podem criar clientes';
  END IF;
  
  -- Validate and format CPF if provided
  IF p_cpf IS NOT NULL THEN
    formatted_cpf := regexp_replace(p_cpf, '\D', '', 'g');
    IF NOT public.validate_cpf(formatted_cpf) THEN
      RAISE EXCEPTION 'CPF inválido';
    END IF;
    formatted_cpf := public.format_cpf(formatted_cpf);
  END IF;
  
  -- Insert customer
  INSERT INTO public.customers (
    name, email, phone, cpf, zipcode, street, number, complement,
    neighborhood, city, state, notes, created_by, lead_source
  ) VALUES (
    p_name, p_email, p_phone, formatted_cpf, p_zipcode, p_street, 
    p_number, p_complement, p_neighborhood, p_city, p_state, 
    p_notes, auth.uid(), 'system'
  ) RETURNING id INTO new_customer_id;
  
  -- Log customer creation
  PERFORM public.log_audit_event(
    'customers_secure_creation',
    'CREATE',
    new_customer_id,
    NULL,
    jsonb_build_object('name', p_name, 'created_by_role', user_role)
  );
  
  RETURN new_customer_id;
END;
$$;