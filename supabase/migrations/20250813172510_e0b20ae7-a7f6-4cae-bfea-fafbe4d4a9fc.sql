-- Update user role to admin for diogomg14@gmail.com
UPDATE public.profiles 
SET role = 'admin'
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'diogomg14@gmail.com'
);

-- Log the admin role assignment
INSERT INTO public.audit_logs (
  user_id,
  table_name,
  operation,
  record_id,
  new_values
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'diogomg14@gmail.com'),
  'profiles',
  'UPDATE',
  (SELECT id FROM public.profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'diogomg14@gmail.com')),
  jsonb_build_object('role', 'admin', 'updated_by', 'system', 'reason', 'Manual admin assignment')
);