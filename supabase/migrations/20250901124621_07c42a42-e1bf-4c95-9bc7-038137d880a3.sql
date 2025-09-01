-- Criar módulo contábil completo
-- Tabela para plano de contas
CREATE TABLE public.chart_of_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('ativo', 'passivo', 'patrimonio_liquido', 'receita', 'despesa', 'custo')),
  account_subtype TEXT NOT NULL CHECK (account_subtype IN ('ativo_circulante', 'ativo_nao_circulante', 'passivo_circulante', 'passivo_nao_circulante', 'patrimonio_liquido', 'receita_operacional', 'receita_nao_operacional', 'despesa_operacional', 'despesa_nao_operacional', 'custo_fixo', 'custo_variavel')),
  parent_id UUID REFERENCES public.chart_of_accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela para lançamentos contábeis
CREATE TABLE public.accounting_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_number TEXT NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'canceled')),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('manual', 'automatic', 'adjustment')),
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela para itens dos lançamentos contábeis (débito/crédito)
CREATE TABLE public.accounting_entry_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.accounting_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  debit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para centros de custo
CREATE TABLE public.cost_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela para orçamentos
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_year INTEGER NOT NULL,
  budget_month INTEGER CHECK (budget_month BETWEEN 1 AND 12),
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  budgeted_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  actual_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  variance_amount NUMERIC(15,2) GENERATED ALWAYS AS (actual_amount - budgeted_amount) STORED,
  variance_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN budgeted_amount = 0 THEN NULL
      ELSE ((actual_amount - budgeted_amount) / budgeted_amount) * 100
    END
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(budget_year, budget_month, account_id, cost_center_id)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_entry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para chart_of_accounts
CREATE POLICY "Admins and managers can manage chart of accounts" 
ON public.chart_of_accounts 
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
));

CREATE POLICY "Users can view chart of accounts" 
ON public.chart_of_accounts 
FOR SELECT
TO authenticated
USING (is_active = true);

-- Políticas RLS para accounting_entries
CREATE POLICY "Admins and managers can manage accounting entries" 
ON public.accounting_entries 
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
));

CREATE POLICY "Users can view accounting entries" 
ON public.accounting_entries 
FOR SELECT
TO authenticated
USING (status = 'posted' OR created_by = auth.uid());

-- Políticas RLS para accounting_entry_items
CREATE POLICY "Admins and managers can manage entry items" 
ON public.accounting_entry_items 
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
));

CREATE POLICY "Users can view entry items" 
ON public.accounting_entry_items 
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.accounting_entries ae 
  WHERE ae.id = entry_id AND (ae.status = 'posted' OR ae.created_by = auth.uid())
));

-- Políticas RLS para cost_centers
CREATE POLICY "Admins and managers can manage cost centers" 
ON public.cost_centers 
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
));

CREATE POLICY "Users can view cost centers" 
ON public.cost_centers 
FOR SELECT
TO authenticated
USING (is_active = true);

-- Políticas RLS para budgets
CREATE POLICY "Admins and managers can manage budgets" 
ON public.budgets 
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
));

-- Triggers para updated_at
CREATE TRIGGER update_chart_of_accounts_updated_at
  BEFORE UPDATE ON public.chart_of_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounting_entries_updated_at
  BEFORE UPDATE ON public.accounting_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cost_centers_updated_at
  BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar número do lançamento contábil
CREATE OR REPLACE FUNCTION public.generate_entry_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  -- Get current date in YYYYMM format
  SELECT TO_CHAR(CURRENT_DATE, 'YYYYMM') INTO new_number;
  
  -- Count existing entries for this month
  SELECT COUNT(*) + 1 INTO counter
  FROM public.accounting_entries
  WHERE entry_number LIKE new_number || '%'
  AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM entry_date) = EXTRACT(MONTH FROM CURRENT_DATE);
  
  -- Generate final entry number: YYYYMM0001, YYYYMM0002, etc.
  new_number := new_number || LPAD(counter::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$;

-- Função para validar lançamento contábil (débito = crédito)
CREATE OR REPLACE FUNCTION public.validate_accounting_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_debits NUMERIC := 0;
  total_credits NUMERIC := 0;
BEGIN
  -- Calculate totals
  SELECT 
    COALESCE(SUM(debit_amount), 0),
    COALESCE(SUM(credit_amount), 0)
  INTO total_debits, total_credits
  FROM public.accounting_entry_items
  WHERE entry_id = NEW.id;
  
  -- Update entry total amount
  UPDATE public.accounting_entries
  SET total_amount = total_debits
  WHERE id = NEW.id;
  
  -- Validate that debits equal credits
  IF total_debits != total_credits THEN
    RAISE EXCEPTION 'Lançamento contábil inválido: débitos (%) não conferem com créditos (%)', total_debits, total_credits;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para validar lançamentos
CREATE TRIGGER validate_accounting_entry_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.accounting_entry_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_accounting_entry();

-- Inserir plano de contas básico
INSERT INTO public.chart_of_accounts (code, name, account_type, account_subtype) VALUES
-- ATIVO
('1', 'ATIVO', 'ativo', 'ativo_circulante'),
('1.1', 'ATIVO CIRCULANTE', 'ativo', 'ativo_circulante'),
('1.1.1', 'Caixa e Equivalentes', 'ativo', 'ativo_circulante'),
('1.1.1.001', 'Caixa', 'ativo', 'ativo_circulante'),
('1.1.1.002', 'Bancos Conta Movimento', 'ativo', 'ativo_circulante'),
('1.1.2', 'Contas a Receber', 'ativo', 'ativo_circulante'),
('1.1.2.001', 'Clientes', 'ativo', 'ativo_circulante'),
('1.1.3', 'Estoques', 'ativo', 'ativo_circulante'),
('1.1.3.001', 'Estoque de Produtos', 'ativo', 'ativo_circulante'),
('1.2', 'ATIVO NÃO CIRCULANTE', 'ativo', 'ativo_nao_circulante'),
('1.2.1', 'Imobilizado', 'ativo', 'ativo_nao_circulante'),
('1.2.1.001', 'Máquinas e Equipamentos', 'ativo', 'ativo_nao_circulante'),

-- PASSIVO
('2', 'PASSIVO', 'passivo', 'passivo_circulante'),
('2.1', 'PASSIVO CIRCULANTE', 'passivo', 'passivo_circulante'),
('2.1.1', 'Fornecedores', 'passivo', 'passivo_circulante'),
('2.1.1.001', 'Fornecedores Nacionais', 'passivo', 'passivo_circulante'),
('2.1.2', 'Obrigações Trabalhistas', 'passivo', 'passivo_circulante'),
('2.1.2.001', 'Salários a Pagar', 'passivo', 'passivo_circulante'),
('2.2', 'PASSIVO NÃO CIRCULANTE', 'passivo', 'passivo_nao_circulante'),
('2.2.1', 'Financiamentos', 'passivo', 'passivo_nao_circulante'),

-- PATRIMÔNIO LÍQUIDO
('3', 'PATRIMÔNIO LÍQUIDO', 'patrimonio_liquido', 'patrimonio_liquido'),
('3.1', 'Capital Social', 'patrimonio_liquido', 'patrimonio_liquido'),
('3.2', 'Lucros Acumulados', 'patrimonio_liquido', 'patrimonio_liquido'),

-- RECEITAS
('4', 'RECEITAS', 'receita', 'receita_operacional'),
('4.1', 'RECEITAS OPERACIONAIS', 'receita', 'receita_operacional'),
('4.1.1', 'Vendas de Produtos', 'receita', 'receita_operacional'),
('4.1.1.001', 'Vendas de Suplementos', 'receita', 'receita_operacional'),
('4.2', 'OUTRAS RECEITAS', 'receita', 'receita_nao_operacional'),
('4.2.1', 'Receitas Financeiras', 'receita', 'receita_nao_operacional'),

-- DESPESAS
('5', 'DESPESAS', 'despesa', 'despesa_operacional'),
('5.1', 'DESPESAS OPERACIONAIS', 'despesa', 'despesa_operacional'),
('5.1.1', 'Despesas Administrativas', 'despesa', 'despesa_operacional'),
('5.1.1.001', 'Salários e Encargos', 'despesa', 'despesa_operacional'),
('5.1.1.002', 'Aluguel', 'despesa', 'despesa_operacional'),
('5.1.1.003', 'Energia Elétrica', 'despesa', 'despesa_operacional'),
('5.1.2', 'Despesas Comerciais', 'despesa', 'despesa_operacional'),
('5.1.2.001', 'Marketing e Publicidade', 'despesa', 'despesa_operacional'),
('5.2', 'DESPESAS FINANCEIRAS', 'despesa', 'despesa_nao_operacional'),
('5.2.1', 'Juros e Multas', 'despesa', 'despesa_nao_operacional'),

-- CUSTOS
('6', 'CUSTOS', 'custo', 'custo_variavel'),
('6.1', 'CUSTO DOS PRODUTOS VENDIDOS', 'custo', 'custo_variavel'),
('6.1.1', 'Custo de Aquisição', 'custo', 'custo_variavel'),
('6.2', 'CUSTOS FIXOS', 'custo', 'custo_fixo'),
('6.2.1', 'Depreciação', 'custo', 'custo_fixo');

-- Inserir centros de custo básicos
INSERT INTO public.cost_centers (code, name, description) VALUES
('001', 'Administrativo', 'Centro de custo administrativo'),
('002', 'Vendas', 'Centro de custo de vendas'),
('003', 'Produção', 'Centro de custo de produção'),
('004', 'Marketing', 'Centro de custo de marketing');