-- Fix critical security issue: Remove SECURITY DEFINER view and implement safer approach

-- Drop the problematic SECURITY DEFINER view
DROP VIEW IF EXISTS public.secure_customers;

-- Revoke permissions that are no longer needed
-- (Note: REVOKE statement might fail if permissions don't exist, that's OK)

-- Alternative approach: Create RPC functions for secure data access instead of views
CREATE OR REPLACE FUNCTION public.get_customers_rpc()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  result jsonb;
BEGIN
  -- Get current user role
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF user_role = 'admin' OR user_role = 'manager' THEN
    -- Admins and managers get full customer list with full data
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'email', c.email,
        'phone', c.phone,
        'cpf', c.cpf,
        'city', c.city,
        'state', c.state,
        'lead_status', c.lead_status,
        'created_at', c.created_at,
        'created_by', c.created_by,
        'access_level', 'full'
      )
    ) INTO result
    FROM public.customers c
    ORDER BY c.created_at DESC;
    
  ELSIF user_role = 'salesperson' THEN
    -- Salespersons get masked data for customers they created only
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'email', CASE 
          WHEN c.email IS NOT NULL THEN 
            SUBSTRING(c.email FROM 1 FOR 3) || '***@' || SPLIT_PART(c.email, '@', 2)
          ELSE NULL 
        END,
        'phone', CASE 
          WHEN c.phone IS NOT NULL THEN 
            '****-' || RIGHT(REGEXP_REPLACE(c.phone, '\D', '', 'g'), 4)
          ELSE NULL 
        END,
        'cpf', CASE 
          WHEN c.cpf IS NOT NULL THEN 
            LEFT(REGEXP_REPLACE(c.cpf, '\D', '', 'g'), 3) || '.***.***-' || 
            RIGHT(REGEXP_REPLACE(c.cpf, '\D', '', 'g'), 2)
          ELSE NULL 
        END,
        'city', c.city,
        'state', c.state,
        'lead_status', c.lead_status,
        'created_at', c.created_at,
        'created_by', c.created_by,
        'access_level', 'masked'
      )
    ) INTO result
    FROM public.customers c
    WHERE c.created_by = auth.uid()
    ORDER BY c.created_at DESC;
  ELSE
    -- No access for other roles
    result := '[]'::jsonb;
  END IF;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Create RPC function to get single customer data safely
CREATE OR REPLACE FUNCTION public.get_customer_rpc(customer_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  is_creator BOOLEAN := false;
  result jsonb;
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
    SELECT jsonb_build_object(
      'id', c.id, 'name', c.name, 'email', c.email, 'phone', c.phone, 
      'cpf', c.cpf, 'gender', c.gender, 'zipcode', c.zipcode, 
      'street', c.street, 'number', c.number, 'complement', c.complement, 
      'neighborhood', c.neighborhood, 'city', c.city, 'state', c.state,
      'lead_source', c.lead_source, 'lead_status', c.lead_status, 
      'notes', c.notes, 'created_at', c.created_at, 'updated_at', c.updated_at, 
      'created_by', c.created_by, 'access_level', 'full'
    ) INTO result
    FROM public.customers c
    WHERE c.id = customer_id;
    
  ELSIF user_role = 'salesperson' AND is_creator THEN
    -- Salespersons get masked sensitive data for customers they created
    SELECT jsonb_build_object(
      'id', c.id, 'name', c.name,
      'email', CASE 
        WHEN c.email IS NOT NULL THEN 
          SUBSTRING(c.email FROM 1 FOR 3) || '***@' || SPLIT_PART(c.email, '@', 2)
        ELSE NULL 
      END,
      'phone', CASE 
        WHEN c.phone IS NOT NULL THEN 
          '****-' || RIGHT(REGEXP_REPLACE(c.phone, '\D', '', 'g'), 4)
        ELSE NULL 
      END,
      'cpf', CASE 
        WHEN c.cpf IS NOT NULL THEN 
          LEFT(REGEXP_REPLACE(c.cpf, '\D', '', 'g'), 3) || '.***.***-' || 
          RIGHT(REGEXP_REPLACE(c.cpf, '\D', '', 'g'), 2)
        ELSE NULL 
      END,
      'gender', c.gender, 'zipcode', c.zipcode, 'street', c.street, 
      'number', c.number, 'complement', c.complement, 'neighborhood', c.neighborhood, 
      'city', c.city, 'state', c.state, 'lead_source', c.lead_source, 
      'lead_status', c.lead_status, 'notes', c.notes, 'created_at', c.created_at, 
      'updated_at', c.updated_at, 'created_by', c.created_by, 'access_level', 'masked'
    ) INTO result
    FROM public.customers c
    WHERE c.id = customer_id;
  ELSE
    -- No access for other roles
    result := '{}'::jsonb;
  END IF;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;