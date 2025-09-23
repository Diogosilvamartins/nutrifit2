-- Corrigir funções com search_path mutable
ALTER FUNCTION public.create_initial_organization() SET search_path = public;
ALTER FUNCTION public.check_plan_limits(UUID, TEXT) SET search_path = public;

-- Atualizar RLS políticas para as novas tabelas com organization_id
-- Produtos devem ser filtrados por organização
DROP POLICY IF EXISTS "Admins and managers can view all product data" ON public.products;
DROP POLICY IF EXISTS "Salespersons can view basic product data" ON public.products;

CREATE POLICY "Users can view products from their organization" 
ON public.products 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
      AND p.organization_id = products.organization_id
  )
);

CREATE POLICY "Admins and managers can manage products in their organization" 
ON public.products 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
      AND p.organization_id = products.organization_id
      AND p.role IN ('admin', 'manager')
  )
);

-- Atualizar políticas para customers
DROP POLICY IF EXISTS "Ultra restricted customer access - admins and managers only" ON public.customers;
DROP POLICY IF EXISTS "Admins and managers can view all customers" ON public.customers;

CREATE POLICY "Users can view customers from their organization" 
ON public.customers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
      AND p.organization_id = customers.organization_id
  )
);

CREATE POLICY "Authorized users can manage customers in their organization" 
ON public.customers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
      AND p.organization_id = customers.organization_id
      AND p.role IN ('admin', 'manager', 'salesperson')
  )
);

-- Atualizar políticas para quotes
DROP POLICY IF EXISTS "Admins and managers can view all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can view quotes they created or are salesperson for" ON public.quotes;

CREATE POLICY "Users can view quotes from their organization" 
ON public.quotes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
      AND p.organization_id = quotes.organization_id
  )
);

CREATE POLICY "Users can manage quotes in their organization" 
ON public.quotes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
      AND p.organization_id = quotes.organization_id
  )
);

-- Função para auto-popular organization_id nas inserções
CREATE OR REPLACE FUNCTION public.set_organization_id()
RETURNS TRIGGER AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Buscar organization_id do usuário atual
  SELECT organization_id INTO user_org_id
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Definir organization_id no registro
  IF user_org_id IS NOT NULL THEN
    NEW.organization_id = user_org_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar trigger nas tabelas principais
CREATE TRIGGER set_org_id_products
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

CREATE TRIGGER set_org_id_customers
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

CREATE TRIGGER set_org_id_quotes
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

CREATE TRIGGER set_org_id_orders
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

CREATE TRIGGER set_org_id_cash_movements
  BEFORE INSERT ON public.cash_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

CREATE TRIGGER set_org_id_stock_movements
  BEFORE INSERT ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();