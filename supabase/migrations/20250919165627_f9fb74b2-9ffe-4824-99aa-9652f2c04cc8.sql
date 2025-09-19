-- Fix customer data security vulnerabilities by restricting access policies

-- First, drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Salespersons can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view customers they created" ON public.customers;

-- Create more restrictive and secure policies

-- Only admins, managers and salespersons can create customers
CREATE POLICY "Only authorized users can create customers" 
ON public.customers 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = ANY (ARRAY['admin', 'manager', 'salesperson'])
  )
);

-- For viewing customers: admins and managers can see all, salespersons can only see customers they created
CREATE POLICY "Restricted customer viewing access" 
ON public.customers 
FOR SELECT 
TO authenticated
USING (
  -- Admins and managers can view all customers
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = ANY (ARRAY['admin', 'manager'])
  )
  OR 
  -- Salespersons can only view customers they created
  (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'salesperson'
    )
    AND created_by = auth.uid()
  )
);

-- Only salespersons can update customers they created, admins and managers can update any
CREATE POLICY "Restricted customer update access" 
ON public.customers 
FOR UPDATE 
TO authenticated
USING (
  -- Admins and managers can update any customer
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = ANY (ARRAY['admin', 'manager'])
  )
  OR 
  -- Salespersons can only update customers they created
  (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'salesperson'
    )
    AND created_by = auth.uid()
  )
);

-- Add audit logging for customer access (for security monitoring)
CREATE OR REPLACE FUNCTION public.log_customer_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to sensitive customer data
  IF TG_OP = 'SELECT' THEN
    PERFORM public.log_audit_event(
      'customers_access',
      'VIEW',
      OLD.id,
      NULL,
      jsonb_build_object('accessed_customer', OLD.name, 'accessed_by', auth.uid())
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to log customer data access (optional for monitoring)
-- Note: This is commented out as it may impact performance, enable only if needed for security auditing
-- CREATE TRIGGER log_customer_access_trigger
--   AFTER SELECT ON public.customers
--   FOR EACH ROW EXECUTE FUNCTION public.log_customer_access();