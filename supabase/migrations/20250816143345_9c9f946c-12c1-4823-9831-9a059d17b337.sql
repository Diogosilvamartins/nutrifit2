-- Adicionar campo salesperson_id nas tabelas de vendas
ALTER TABLE public.quotes ADD COLUMN salesperson_id UUID REFERENCES public.profiles(user_id);
ALTER TABLE public.orders ADD COLUMN salesperson_id UUID REFERENCES public.profiles(user_id);

-- Criar tabela de comissões
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salesperson_id UUID NOT NULL REFERENCES public.profiles(user_id),
  commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  commission_type TEXT NOT NULL DEFAULT 'percentage', -- percentage, fixed
  fixed_amount DECIMAL(10,2) DEFAULT 0.00,
  product_category TEXT, -- opcional: comissão específica por categoria
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id)
);

-- Habilitar RLS na tabela de comissões
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para comissões
CREATE POLICY "Authenticated users can view commissions" 
ON public.commissions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage commissions" 
ON public.commissions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Criar tabela de registros de comissões calculadas
CREATE TABLE public.commission_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salesperson_id UUID NOT NULL REFERENCES public.profiles(user_id),
  sale_id UUID NOT NULL, -- pode ser quote ou order
  sale_type TEXT NOT NULL, -- 'quote' ou 'order'
  sale_amount DECIMAL(10,2) NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, paid
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id)
);

-- Habilitar RLS na tabela de registros de comissões
ALTER TABLE public.commission_records ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para registros de comissões
CREATE POLICY "Users can view their own commission records" 
ON public.commission_records 
FOR SELECT 
USING (salesperson_id = auth.uid());

CREATE POLICY "Admins can view all commission records" 
ON public.commission_records 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "System can insert commission records" 
ON public.commission_records 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update commission records" 
ON public.commission_records 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Função para calcular comissão
CREATE OR REPLACE FUNCTION public.calculate_commission(sale_amount DECIMAL, salesperson_id_param UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  commission_data RECORD;
  calculated_commission DECIMAL := 0;
BEGIN
  -- Buscar configuração de comissão para o vendedor
  SELECT commission_percentage, commission_type, fixed_amount 
  INTO commission_data
  FROM public.commissions 
  WHERE salesperson_id = salesperson_id_param 
    AND is_active = true
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Se não encontrar configuração, retorna 0
  IF commission_data IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calcular comissão baseada no tipo
  IF commission_data.commission_type = 'percentage' THEN
    calculated_commission := (sale_amount * commission_data.commission_percentage) / 100;
  ELSIF commission_data.commission_type = 'fixed' THEN
    calculated_commission := commission_data.fixed_amount;
  END IF;
  
  RETURN calculated_commission;
END;
$$;

-- Trigger para criar registro de comissão automaticamente
CREATE OR REPLACE FUNCTION public.create_commission_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  commission_amount DECIMAL;
  commission_percentage DECIMAL;
BEGIN
  -- Apenas para vendas completadas com vendedor definido
  IF NEW.quote_type = 'sale' AND NEW.status = 'completed' AND NEW.salesperson_id IS NOT NULL THEN
    
    -- Buscar porcentagem de comissão
    SELECT c.commission_percentage INTO commission_percentage
    FROM public.commissions c
    WHERE c.salesperson_id = NEW.salesperson_id 
      AND c.is_active = true
    ORDER BY c.created_at DESC 
    LIMIT 1;
    
    -- Calcular comissão
    commission_amount := public.calculate_commission(NEW.total_amount, NEW.salesperson_id);
    
    -- Inserir registro de comissão se houver valor
    IF commission_amount > 0 THEN
      INSERT INTO public.commission_records (
        salesperson_id,
        sale_id,
        sale_type,
        sale_amount,
        commission_percentage,
        commission_amount,
        created_by
      ) VALUES (
        NEW.salesperson_id,
        NEW.id,
        'quote',
        NEW.total_amount,
        COALESCE(commission_percentage, 0),
        commission_amount,
        NEW.created_by
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para quotes
CREATE TRIGGER create_commission_record_trigger
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_commission_record();

-- Trigger para atualizar timestamp
CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();