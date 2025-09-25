-- Fix get_customers_rpc to order inside jsonb_agg and avoid 42803 errors
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
    SELECT jsonb_agg(obj ORDER BY created_at DESC) INTO result
    FROM (
      SELECT 
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
        ) AS obj,
        c.created_at
      FROM public.customers c
    ) s;
    
  ELSIF user_role = 'salesperson' THEN
    -- Salespersons get masked data for customers they created only
    SELECT jsonb_agg(obj ORDER BY created_at DESC) INTO result
    FROM (
      SELECT 
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          -- Masked email
          'email', CASE 
            WHEN c.email IS NOT NULL THEN 
              SUBSTRING(c.email FROM 1 FOR 3) || '***@' || SPLIT_PART(c.email, '@', 2)
            ELSE NULL 
          END,
          -- Masked phone
          'phone', CASE 
            WHEN c.phone IS NOT NULL THEN 
              '****-' || RIGHT(REGEXP_REPLACE(c.phone, '\\D', '', 'g'), 4)
            ELSE NULL 
          END,
          -- Masked CPF
          'cpf', CASE 
            WHEN c.cpf IS NOT NULL THEN 
              LEFT(REGEXP_REPLACE(c.cpf, '\\D', '', 'g'), 3) || '.***.***-' || 
              RIGHT(REGEXP_REPLACE(c.cpf, '\\D', '', 'g'), 2)
            ELSE NULL 
          END,
          'city', c.city,
          'state', c.state,
          'lead_status', c.lead_status,
          'created_at', c.created_at,
          'created_by', c.created_by,
          'access_level', 'masked'
        ) AS obj,
        c.created_at
      FROM public.customers c
      WHERE c.created_by = auth.uid()
    ) s;
  ELSE
    -- No access for other roles
    result := '[]'::jsonb;
  END IF;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;