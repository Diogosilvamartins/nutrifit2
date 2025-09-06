-- Atualizar a estrutura de roles no sistema
-- Primeiro, vamos adicionar o novo tipo de role 'salesperson' e manter compatibilidade

-- Atualizar perfis existentes que são 'manager' para 'salesperson'
UPDATE public.profiles 
SET role = 'salesperson' 
WHERE role = 'manager';

-- Criar função para verificar se é vendedor
CREATE OR REPLACE FUNCTION public.is_salesperson()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role = 'salesperson' FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Criar função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role = 'admin' FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Criar função para verificar se é cliente (user)
CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role = 'user' FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Atualizar políticas para vendedores (antigos managers)
-- Produtos: Vendedores podem ver produtos básicos (sem custo)
DROP POLICY IF EXISTS "Salespersons can view basic product data" ON public.products;
CREATE POLICY "Salespersons can view basic product data" 
ON public.products 
FOR SELECT 
USING (public.is_salesperson());

-- Clientes: Vendedores podem ver e criar clientes
DROP POLICY IF EXISTS "Salespersons can manage customers" ON public.customers;
CREATE POLICY "Salespersons can manage customers"
ON public.customers 
FOR ALL
USING (public.is_salesperson() OR public.is_admin())
WITH CHECK (public.is_salesperson() OR public.is_admin());

-- Orçamentos: Vendedores podem criar e ver seus próprios orçamentos
DROP POLICY IF EXISTS "Salespersons can create quotes" ON public.quotes;
CREATE POLICY "Salespersons can create quotes"
ON public.quotes 
FOR INSERT
WITH CHECK (public.is_salesperson() AND salesperson_id = auth.uid());

DROP POLICY IF EXISTS "Salespersons can view their quotes" ON public.quotes;
CREATE POLICY "Salespersons can view their quotes"
ON public.quotes 
FOR SELECT
USING (public.is_salesperson() AND salesperson_id = auth.uid());

DROP POLICY IF EXISTS "Salespersons can update their quotes" ON public.quotes;
CREATE POLICY "Salespersons can update their quotes"
ON public.quotes 
FOR UPDATE
USING (public.is_salesperson() AND salesperson_id = auth.uid());

-- Comissões: Vendedores podem ver suas próprias comissões
DROP POLICY IF EXISTS "Salespersons can view their commissions" ON public.commissions;
CREATE POLICY "Salespersons can view their commissions"
ON public.commissions 
FOR SELECT
USING (public.is_salesperson() AND salesperson_id = auth.uid());

-- Registros de comissão: Vendedores podem ver seus próprios registros
DROP POLICY IF EXISTS "Salespersons can view their commission records" ON public.commission_records;
CREATE POLICY "Salespersons can view their commission records"
ON public.commission_records 
FOR SELECT
USING (public.is_salesperson() AND salesperson_id = auth.uid());

-- Atualizar políticas existentes que mencionam 'manager' para incluir 'salesperson'
-- Cash movements: Apenas admin pode acessar
DROP POLICY IF EXISTS "Admins and managers can view cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Admins and managers can insert cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Admins and managers can update cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Admins and managers can delete cash movements" ON public.cash_movements;

CREATE POLICY "Admins can manage cash movements" 
ON public.cash_movements FOR ALL
USING (public.is_admin());

-- Stock movements: Apenas admin pode acessar
DROP POLICY IF EXISTS "Admins and managers can view stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admins and managers can create stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admins and managers can update stock movements" ON public.stock_movements;

CREATE POLICY "Admins can manage stock movements" 
ON public.stock_movements FOR ALL
USING (public.is_admin());

-- Suppliers: Apenas admin pode acessar
DROP POLICY IF EXISTS "Admins and managers can view all suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins and managers can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins and managers can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins and managers can delete suppliers" ON public.suppliers;

CREATE POLICY "Admins can manage suppliers" 
ON public.suppliers FOR ALL
USING (public.is_admin());

-- Cost centers: Apenas admin pode gerenciar
DROP POLICY IF EXISTS "Admins and managers can manage cost centers" ON public.cost_centers;
CREATE POLICY "Admins can manage cost centers" 
ON public.cost_centers FOR ALL
USING (public.is_admin());

-- Chart of accounts: Apenas admin pode gerenciar
DROP POLICY IF EXISTS "Admins and managers can manage chart of accounts" ON public.chart_of_accounts;
CREATE POLICY "Admins can manage chart of accounts" 
ON public.chart_of_accounts FOR ALL
USING (public.is_admin());

-- Budgets: Apenas admin pode gerenciar
DROP POLICY IF EXISTS "Admins and managers can manage budgets" ON public.budgets;
CREATE POLICY "Admins can manage budgets" 
ON public.budgets FOR ALL
USING (public.is_admin());

-- Accounting entries: Apenas admin pode gerenciar
DROP POLICY IF EXISTS "Admins and managers can manage accounting entries" ON public.accounting_entries;
CREATE POLICY "Admins can manage accounting entries" 
ON public.accounting_entries FOR ALL
USING (public.is_admin());

-- Accounting entry items: Apenas admin pode gerenciar
DROP POLICY IF EXISTS "Admins and managers can manage entry items" ON public.accounting_entry_items;
CREATE POLICY "Admins can manage entry items" 
ON public.accounting_entry_items FOR ALL
USING (public.is_admin());

-- Clientes podem fazer pedidos (orders)
DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;
CREATE POLICY "Customers can create orders"
ON public.orders 
FOR INSERT
WITH CHECK (true); -- Qualquer pessoa pode criar pedido (incluindo não autenticados)

-- Atualizar função de verificação de sistema de saúde
CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS jsonb
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
  -- Apenas admin pode verificar saúde do sistema
  IF NOT public.is_admin() THEN
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