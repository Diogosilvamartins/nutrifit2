-- Desativar temporariamente os triggers de auditoria
DROP TRIGGER IF EXISTS audit_customer_access_trigger ON public.customers;

-- Primeiro, criar uma organização padrão para todos os dados existentes
INSERT INTO public.organizations (
  id,
  name, 
  slug, 
  owner_id,
  subscription_status,
  subscription_plan,
  max_users,
  max_products,
  max_monthly_sales,
  features
) VALUES (
  'ced5b957-6c94-4b72-9f4c-8e8b4a2d1e3f'::uuid,
  'Nutri & Fit - Loja Principal',
  'nutri-fit-principal',
  '86ff8d06-dd77-45b1-9148-036721b4ff5e'::uuid,
  'active',
  'unlimited',
  -1,
  -1,
  -1,
  '{"api": true, "pos": true, "reports": true, "inventory": true, "accounting": true, "multi_tenant": false}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Atualizar o perfil do admin para ter organization_id
UPDATE public.profiles 
SET organization_id = 'ced5b957-6c94-4b72-9f4c-8e8b4a2d1e3f'::uuid,
    organization_role = 'owner'
WHERE user_id = '86ff8d06-dd77-45b1-9148-036721b4ff5e'::uuid;

-- Atualizar todos os produtos existentes
UPDATE public.products 
SET organization_id = 'ced5b957-6c94-4b72-9f4c-8e8b4a2d1e3f'::uuid
WHERE organization_id IS NULL;

-- Atualizar todas as quotes existentes
UPDATE public.quotes 
SET organization_id = 'ced5b957-6c94-4b72-9f4c-8e8b4a2d1e3f'::uuid
WHERE organization_id IS NULL;

-- Atualizar todos os customers existentes
UPDATE public.customers 
SET organization_id = 'ced5b957-6c94-4b72-9f4c-8e8b4a2d1e3f'::uuid
WHERE organization_id IS NULL;

-- Atualizar todos os orders existentes
UPDATE public.orders 
SET organization_id = 'ced5b957-6c94-4b72-9f4c-8e8b4a2d1e3f'::uuid
WHERE organization_id IS NULL;

-- Atualizar todos os cash_movements existentes
UPDATE public.cash_movements 
SET organization_id = 'ced5b957-6c94-4b72-9f4c-8e8b4a2d1e3f'::uuid
WHERE organization_id IS NULL;

-- Atualizar todos os stock_movements existentes
UPDATE public.stock_movements 
SET organization_id = 'ced5b957-6c94-4b72-9f4c-8e8b4a2d1e3f'::uuid
WHERE organization_id IS NULL;

-- Atualizar outros perfis para terem a mesma organização (se existirem)
UPDATE public.profiles 
SET organization_id = 'ced5b957-6c94-4b72-9f4c-8e8b4a2d1e3f'::uuid
WHERE organization_id IS NULL AND role IN ('manager', 'salesperson');