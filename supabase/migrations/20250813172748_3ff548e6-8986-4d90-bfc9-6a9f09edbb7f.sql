-- Create admin profile for diogomg14@gmail.com
INSERT INTO public.profiles (
  user_id, 
  full_name, 
  role,
  permissions,
  is_active
) VALUES (
  '86ff8d06-dd77-45b1-9148-036721b4ff5e',
  'Administrador',
  'admin',
  '{"manage_products": true, "view_sales": true, "manage_customers": true, "manage_stock": true, "view_reports": true, "manage_users": true, "system_admin": true}'::jsonb,
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  permissions = '{"manage_products": true, "view_sales": true, "manage_customers": true, "manage_stock": true, "view_reports": true, "manage_users": true, "system_admin": true}'::jsonb,
  is_active = true,
  updated_at = now();

-- Log the profile creation
INSERT INTO public.audit_logs (
  user_id,
  table_name,
  operation,
  record_id,
  new_values
) VALUES (
  '86ff8d06-dd77-45b1-9148-036721b4ff5e',
  'profiles',
  'INSERT',
  (SELECT id FROM public.profiles WHERE user_id = '86ff8d06-dd77-45b1-9148-036721b4ff5e'),
  jsonb_build_object('role', 'admin', 'created_by', 'system', 'reason', 'Admin profile creation for diogomg14@gmail.com')
);