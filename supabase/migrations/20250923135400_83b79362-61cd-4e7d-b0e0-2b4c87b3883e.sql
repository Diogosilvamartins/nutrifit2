-- Criar tabela de organizações (lojas/empresas)
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  subscription_plan TEXT NOT NULL DEFAULT 'free',
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '14 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  settings JSONB DEFAULT '{}'::jsonb,
  -- Dados da empresa
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zipcode TEXT,
  -- Limites do plano
  max_users INTEGER NOT NULL DEFAULT 1,
  max_products INTEGER NOT NULL DEFAULT 100,
  max_monthly_sales INTEGER NOT NULL DEFAULT 50,
  -- Features habilitadas
  features JSONB DEFAULT '{"pos": true, "inventory": true, "reports": false, "api": false}'::jsonb
);

-- Habilitar RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Criar planos de assinatura
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  max_users INTEGER NOT NULL DEFAULT 1,
  max_products INTEGER NOT NULL DEFAULT 100,
  max_monthly_sales INTEGER NOT NULL DEFAULT 50,
  features JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir planos básicos
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly, max_users, max_products, max_monthly_sales, features) VALUES
('Gratuito', 'free', 'Plano gratuito com funcionalidades básicas', 0, 0, 1, 50, 20, '{"pos": true, "inventory": true, "reports": false, "api": false, "whatsapp": false}'::jsonb),
('Básico', 'basic', 'Ideal para pequenos negócios', 29.90, 299, 3, 500, 200, '{"pos": true, "inventory": true, "reports": true, "api": false, "whatsapp": true}'::jsonb),
('Profissional', 'professional', 'Para negócios em crescimento', 69.90, 699, 10, 2000, 1000, '{"pos": true, "inventory": true, "reports": true, "api": true, "whatsapp": true, "accounting": true}'::jsonb),
('Enterprise', 'enterprise', 'Para grandes operações', 149.90, 1499, -1, -1, -1, '{"pos": true, "inventory": true, "reports": true, "api": true, "whatsapp": true, "accounting": true, "multi_store": true}'::jsonb);

-- Modificar tabela profiles para incluir organização
ALTER TABLE public.profiles ADD COLUMN organization_id UUID;
ALTER TABLE public.profiles ADD COLUMN organization_role TEXT DEFAULT 'member';

-- Criar política para organizações
CREATE POLICY "Users can view their organization" 
ON public.organizations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.organization_id = organizations.id
  )
);

CREATE POLICY "Organization owners can update their organization" 
ON public.organizations 
FOR UPDATE 
USING (owner_id = auth.uid());

CREATE POLICY "Users can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

-- Políticas para planos
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" 
ON public.subscription_plans 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Only admins can manage plans" 
ON public.subscription_plans 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Função para criar organização inicial
CREATE OR REPLACE FUNCTION public.create_initial_organization()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Criar organização para novos usuários que não são admin
  IF NEW.role != 'admin' THEN
    INSERT INTO public.organizations (
      name, 
      slug, 
      owner_id,
      subscription_status,
      subscription_plan
    ) VALUES (
      COALESCE(NEW.full_name, 'Minha Loja') || ' - Loja',
      'loja-' || LOWER(REPLACE(COALESCE(NEW.full_name, generate_random_uuid()::text), ' ', '-')),
      NEW.user_id,
      'trial',
      'free'
    ) RETURNING id INTO org_id;
    
    -- Atualizar o perfil com a organização
    UPDATE public.profiles 
    SET organization_id = org_id, organization_role = 'owner'
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar organização
CREATE TRIGGER create_organization_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_initial_organization();

-- Função para verificar limites do plano
CREATE OR REPLACE FUNCTION public.check_plan_limits(org_id UUID, limit_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  org_data RECORD;
  current_count INTEGER;
BEGIN
  -- Buscar dados da organização
  SELECT o.*, sp.max_users, sp.max_products, sp.max_monthly_sales, sp.features
  INTO org_data
  FROM public.organizations o
  JOIN public.subscription_plans sp ON sp.slug = o.subscription_plan
  WHERE o.id = org_id;
  
  -- Verificar limites específicos
  CASE limit_type
    WHEN 'users' THEN
      SELECT COUNT(*) INTO current_count
      FROM public.profiles p
      WHERE p.organization_id = org_id;
      
      RETURN (org_data.max_users = -1 OR current_count < org_data.max_users);
      
    WHEN 'products' THEN
      SELECT COUNT(*) INTO current_count
      FROM public.products p
      WHERE p.organization_id = org_id;
      
      RETURN (org_data.max_products = -1 OR current_count < org_data.max_products);
      
    WHEN 'monthly_sales' THEN
      SELECT COUNT(*) INTO current_count
      FROM public.quotes q
      WHERE q.organization_id = org_id 
        AND q.quote_type = 'sale' 
        AND q.created_at >= date_trunc('month', now());
      
      RETURN (org_data.max_monthly_sales = -1 OR current_count < org_data.max_monthly_sales);
      
    ELSE
      RETURN true;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar organization_id às principais tabelas
ALTER TABLE public.products ADD COLUMN organization_id UUID;
ALTER TABLE public.customers ADD COLUMN organization_id UUID;
ALTER TABLE public.quotes ADD COLUMN organization_id UUID;
ALTER TABLE public.orders ADD COLUMN organization_id UUID;
ALTER TABLE public.cash_movements ADD COLUMN organization_id UUID;
ALTER TABLE public.stock_movements ADD COLUMN organization_id UUID;