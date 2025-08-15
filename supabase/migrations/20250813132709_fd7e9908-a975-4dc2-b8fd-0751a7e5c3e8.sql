-- Configure security settings and create audit system

-- First, let's create an audit trail table for tracking all important actions
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit logs (only admins can view)
CREATE POLICY "Admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create policy for system to insert audit logs
CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  table_name_param TEXT,
  operation_param TEXT,
  record_id_param UUID DEFAULT NULL,
  old_values_param JSONB DEFAULT NULL,
  new_values_param JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    table_name_param,
    operation_param,
    record_id_param,
    old_values_param,
    new_values_param
  );
END;
$$;

-- Create backup/export functions
CREATE OR REPLACE FUNCTION public.create_data_backup()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  backup_data JSONB;
BEGIN
  -- Only admins can create backups
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem criar backups';
  END IF;

  SELECT jsonb_build_object(
    'timestamp', now(),
    'created_by', auth.uid(),
    'products', (SELECT jsonb_agg(to_jsonb(p)) FROM products p),
    'customers', (SELECT jsonb_agg(to_jsonb(c)) FROM customers c),
    'orders', (SELECT jsonb_agg(to_jsonb(o)) FROM orders o),
    'quotes', (SELECT jsonb_agg(to_jsonb(q)) FROM quotes q),
    'stock_movements', (SELECT jsonb_agg(to_jsonb(s)) FROM stock_movements s),
    'cash_movements', (SELECT jsonb_agg(to_jsonb(cm)) FROM cash_movements cm),
    'profiles', (SELECT jsonb_agg(to_jsonb(pr)) FROM profiles pr)
  ) INTO backup_data;

  -- Log the backup creation
  PERFORM public.log_audit_event('system', 'BACKUP', NULL, NULL, 
    jsonb_build_object('backup_size', pg_size_pretty(length(backup_data::text)::bigint))
  );

  RETURN backup_data;
END;
$$;

-- Create system health check function
CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  health_data JSONB;
  low_stock_count INTEGER;
  total_products INTEGER;
  active_users INTEGER;
  recent_sales INTEGER;
BEGIN
  -- Only admin/manager can check system health
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'Acesso negado para verificação de sistema';
  END IF;

  -- Get low stock products count
  SELECT COUNT(*) INTO low_stock_count
  FROM products 
  WHERE stock_quantity <= min_stock_alert;

  -- Get total products
  SELECT COUNT(*) INTO total_products FROM products;

  -- Get active users count
  SELECT COUNT(*) INTO active_users
  FROM profiles 
  WHERE is_active = true;

  -- Get recent sales (last 7 days)
  SELECT COUNT(*) INTO recent_sales
  FROM quotes 
  WHERE quote_type = 'sale' 
    AND created_at >= now() - interval '7 days';

  SELECT jsonb_build_object(
    'timestamp', now(),
    'database_size', pg_size_pretty(pg_database_size(current_database())),
    'low_stock_products', low_stock_count,
    'total_products', total_products,
    'active_users', active_users,
    'recent_sales_7d', recent_sales,
    'last_backup', (
      SELECT created_at 
      FROM audit_logs 
      WHERE operation = 'BACKUP' 
      ORDER BY created_at DESC 
      LIMIT 1
    )
  ) INTO health_data;

  RETURN health_data;
END;
$$;

-- Create triggers for audit logging on important tables
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Add audit triggers to important tables
CREATE TRIGGER audit_products_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_customers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_quotes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Create system settings table for configuration
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on system settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for system settings (only admins)
CREATE POLICY "Admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add trigger for updating timestamps
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
  ('auto_backup_enabled', 'true', 'Habilitar backup automático diário'),
  ('low_stock_alert_email', 'true', 'Enviar email quando estoque baixo'),
  ('audit_retention_days', '365', 'Dias para manter logs de auditoria'),
  ('max_login_attempts', '5', 'Máximo de tentativas de login'),
  ('session_timeout_hours', '8', 'Timeout de sessão em horas');