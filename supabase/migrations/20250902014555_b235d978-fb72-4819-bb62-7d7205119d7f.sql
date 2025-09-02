-- Criar plano de contas completo para lançamentos automáticos
-- Limpar contas existentes que podem conflitar
DELETE FROM public.chart_of_accounts WHERE code IN (
  '1.1.01', '1.1.02', '1.2.01', '3.1.01', '4.1.01'
);

-- ATIVO CIRCULANTE
INSERT INTO public.chart_of_accounts (code, name, account_type, account_subtype, is_active) VALUES
  ('1.1.01', 'Caixa', 'ativo', 'ativo_circulante', true),
  ('1.1.02', 'Bancos Conta Movimento', 'ativo', 'ativo_circulante', true),
  ('1.1.03', 'Aplicações Financeiras', 'ativo', 'ativo_circulante', true),
  ('1.1.04', 'Contas a Receber', 'ativo', 'ativo_circulante', true),
  ('1.1.05', 'Duplicatas a Receber', 'ativo', 'ativo_circulante', true),
  ('1.1.06', 'Adiantamentos a Fornecedores', 'ativo', 'ativo_circulante', true),
  ('1.1.07', 'Impostos a Recuperar', 'ativo', 'ativo_circulante', true),
  ('1.1.08', 'Adiantamentos a Funcionários', 'ativo', 'ativo_circulante', true),
  ('1.2.01', 'Estoque de Produtos', 'ativo', 'ativo_circulante', true),
  ('1.2.02', 'Estoque de Matéria Prima', 'ativo', 'ativo_circulante', true),
  ('1.2.03', 'Estoque de Embalagens', 'ativo', 'ativo_circulante', true);

-- ATIVO NÃO CIRCULANTE
INSERT INTO public.chart_of_accounts (code, name, account_type, account_subtype, is_active) VALUES
  ('1.3.01', 'Imóveis', 'ativo', 'ativo_nao_circulante', true),
  ('1.3.02', 'Móveis e Utensílios', 'ativo', 'ativo_nao_circulante', true),
  ('1.3.03', 'Equipamentos', 'ativo', 'ativo_nao_circulante', true),
  ('1.3.04', 'Veículos', 'ativo', 'ativo_nao_circulante', true),
  ('1.3.05', 'Computadores e Periféricos', 'ativo', 'ativo_nao_circulante', true),
  ('1.3.06', 'Instalações', 'ativo', 'ativo_nao_circulante', true),
  ('1.3.07', '(-) Depreciação Acumulada Móveis', 'ativo', 'ativo_nao_circulante', true),
  ('1.3.08', '(-) Depreciação Acumulada Equipamentos', 'ativo', 'ativo_nao_circulante', true),
  ('1.3.09', '(-) Depreciação Acumulada Veículos', 'ativo', 'ativo_nao_circulante', true),
  ('1.3.10', '(-) Depreciação Acumulada Computadores', 'ativo', 'ativo_nao_circulante', true);

-- PASSIVO CIRCULANTE
INSERT INTO public.chart_of_accounts (code, name, account_type, account_subtype, is_active) VALUES
  ('2.1.01', 'Fornecedores', 'passivo', 'passivo_circulante', true),
  ('2.1.02', 'Contas a Pagar', 'passivo', 'passivo_circulante', true),
  ('2.1.03', 'Salários a Pagar', 'passivo', 'passivo_circulante', true),
  ('2.1.04', 'Encargos Sociais a Pagar', 'passivo', 'passivo_circulante', true),
  ('2.1.05', 'FGTS a Recolher', 'passivo', 'passivo_circulante', true),
  ('2.1.06', 'INSS a Recolher', 'passivo', 'passivo_circulante', true),
  ('2.1.07', 'IRRF a Recolher', 'passivo', 'passivo_circulante', true),
  ('2.1.08', 'ICMS a Recolher', 'passivo', 'passivo_circulante', true),
  ('2.1.09', 'PIS a Recolher', 'passivo', 'passivo_circulante', true),
  ('2.1.10', 'COFINS a Recolher', 'passivo', 'passivo_circulante', true),
  ('2.1.11', 'Simples Nacional a Recolher', 'passivo', 'passivo_circulante', true),
  ('2.1.12', 'Empréstimos Bancários', 'passivo', 'passivo_circulante', true),
  ('2.1.13', 'Financiamentos', 'passivo', 'passivo_circulante', true);

-- PASSIVO NÃO CIRCULANTE
INSERT INTO public.chart_of_accounts (code, name, account_type, account_subtype, is_active) VALUES
  ('2.2.01', 'Empréstimos de Longo Prazo', 'passivo', 'passivo_nao_circulante', true),
  ('2.2.02', 'Financiamentos de Longo Prazo', 'passivo', 'passivo_nao_circulante', true);

-- PATRIMÔNIO LÍQUIDO
INSERT INTO public.chart_of_accounts (code, name, account_type, account_subtype, is_active) VALUES
  ('3.0.01', 'Capital Social', 'patrimonio_liquido', 'patrimonio_liquido', true),
  ('3.0.02', 'Reservas de Lucros', 'patrimonio_liquido', 'patrimonio_liquido', true),
  ('3.0.03', 'Lucros ou Prejuízos Acumulados', 'patrimonio_liquido', 'patrimonio_liquido', true),
  ('3.0.04', 'Resultado do Exercício', 'patrimonio_liquido', 'patrimonio_liquido', true);

-- RECEITAS OPERACIONAIS
INSERT INTO public.chart_of_accounts (code, name, account_type, account_subtype, is_active) VALUES
  ('3.1.01', 'Receita de Vendas de Produtos', 'receita', 'receita_operacional', true),
  ('3.1.02', 'Receita de Prestação de Serviços', 'receita', 'receita_operacional', true),
  ('3.1.03', '(-) Devoluções de Vendas', 'receita', 'receita_operacional', true),
  ('3.1.04', '(-) Abatimentos sobre Vendas', 'receita', 'receita_operacional', true),
  ('3.1.05', '(-) Descontos Concedidos', 'receita', 'receita_operacional', true);

-- RECEITAS NÃO OPERACIONAIS
INSERT INTO public.chart_of_accounts (code, name, account_type, account_subtype, is_active) VALUES
  ('3.2.01', 'Receitas Financeiras', 'receita', 'receita_nao_operacional', true),
  ('3.2.02', 'Descontos Obtidos', 'receita', 'receita_nao_operacional', true),
  ('3.2.03', 'Receitas Eventuais', 'receita', 'receita_nao_operacional', true),
  ('3.2.04', 'Juros Recebidos', 'receita', 'receita_nao_operacional', true);

-- CUSTOS FIXOS
INSERT INTO public.chart_of_accounts (code, name, account_type, account_subtype, is_active) VALUES
  ('4.1.01', 'CPV - Custo dos Produtos Vendidos', 'custo', 'custo_variavel', true),
  ('4.1.02', 'Custo de Matéria Prima', 'custo', 'custo_variavel', true),
  ('4.1.03', 'Custo de Embalagens', 'custo', 'custo_variavel', true),
  ('4.1.04', 'Fretes sobre Compras', 'custo', 'custo_variavel', true),
  ('4.2.01', 'Aluguel da Produção', 'custo', 'custo_fixo', true),
  ('4.2.02', 'Salários da Produção', 'custo', 'custo_fixo', true),
  ('4.2.03', 'Encargos Sociais da Produção', 'custo', 'custo_fixo', true),
  ('4.2.04', 'Energia Elétrica da Produção', 'custo', 'custo_fixo', true),
  ('4.2.05', 'Depreciação de Equipamentos', 'custo', 'custo_fixo', true);

-- DESPESAS OPERACIONAIS
INSERT INTO public.chart_of_accounts (code, name, account_type, account_subtype, is_active) VALUES
  ('5.1.01', 'Salários Administrativos', 'despesa', 'despesa_operacional', true),
  ('5.1.02', 'Encargos Sociais Administrativos', 'despesa', 'despesa_operacional', true),
  ('5.1.03', 'Pró-Labore', 'despesa', 'despesa_operacional', true),
  ('5.1.04', 'Honorários Profissionais', 'despesa', 'despesa_operacional', true),
  ('5.1.05', 'Aluguéis', 'despesa', 'despesa_operacional', true),
  ('5.1.06', 'Energia Elétrica', 'despesa', 'despesa_operacional', true),
  ('5.1.07', 'Telefone e Internet', 'despesa', 'despesa_operacional', true),
  ('5.1.08', 'Material de Escritório', 'despesa', 'despesa_operacional', true),
  ('5.1.09', 'Material de Limpeza', 'despesa', 'despesa_operacional', true),
  ('5.1.10', 'Combustíveis', 'despesa', 'despesa_operacional', true),
  ('5.1.11', 'Manutenção e Reparos', 'despesa', 'despesa_operacional', true),
  ('5.1.12', 'Seguros', 'despesa', 'despesa_operacional', true),
  ('5.1.13', 'Propaganda e Marketing', 'despesa', 'despesa_operacional', true),
  ('5.1.14', 'Viagens e Estadias', 'despesa', 'despesa_operacional', true),
  ('5.1.15', 'Despesas Bancárias', 'despesa', 'despesa_operacional', true),
  ('5.1.16', 'Impostos e Taxas', 'despesa', 'despesa_operacional', true),
  ('5.1.17', 'Depreciação', 'despesa', 'despesa_operacional', true);

-- DESPESAS NÃO OPERACIONAIS
INSERT INTO public.chart_of_accounts (code, name, account_type, account_subtype, is_active) VALUES
  ('5.2.01', 'Despesas Financeiras', 'despesa', 'despesa_nao_operacional', true),
  ('5.2.02', 'Juros Pagos', 'despesa', 'despesa_nao_operacional', true),
  ('5.2.03', 'Multas e Juros de Mora', 'despesa', 'despesa_nao_operacional', true),
  ('5.2.04', 'Descontos Concedidos', 'despesa', 'despesa_nao_operacional', true),
  ('5.2.05', 'Perdas Eventuais', 'despesa', 'despesa_nao_operacional', true);

-- Criar função para lançamentos automáticos de compras
CREATE OR REPLACE FUNCTION public.create_automatic_purchase_entry()
RETURNS TRIGGER AS $$
DECLARE
  entry_id UUID;
  supplier_account_id UUID;
  inventory_account_id UUID;
  entry_number TEXT;
BEGIN
  -- Para movimentos de entrada de estoque com fornecedor
  IF NEW.movement_type = 'entrada' AND NEW.supplier_id IS NOT NULL THEN
    
    -- Buscar contas necessárias
    SELECT id INTO supplier_account_id 
    FROM public.chart_of_accounts 
    WHERE code = '2.1.01' AND is_active = true; -- Fornecedores
    
    SELECT id INTO inventory_account_id 
    FROM public.chart_of_accounts 
    WHERE code = '1.2.01' AND is_active = true; -- Estoque
    
    -- Se encontrar as contas, criar lançamento
    IF supplier_account_id IS NOT NULL AND inventory_account_id IS NOT NULL THEN
      
      entry_number := public.generate_entry_number();
      
      -- Criar lançamento contábil
      INSERT INTO public.accounting_entries (
        entry_number,
        entry_date,
        description,
        total_amount,
        status,
        entry_type,
        reference_type,
        reference_id,
        created_by
      ) VALUES (
        entry_number,
        DATE(NEW.created_at),
        'Compra Automática - ' || COALESCE(NEW.supplier_name, 'Fornecedor') || ' - Lote: ' || COALESCE(NEW.batch_number, 'S/N'),
        COALESCE(NEW.unit_cost * NEW.quantity, 0),
        'posted',
        'automatic',
        'compra',
        NEW.id,
        NEW.user_id
      ) RETURNING id INTO entry_id;
      
      -- Débito em Estoque
      INSERT INTO public.accounting_entry_items (
        entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description
      ) VALUES (
        entry_id,
        inventory_account_id,
        COALESCE(NEW.unit_cost * NEW.quantity, 0),
        0,
        'Entrada de estoque - ' || NEW.quantity::TEXT || ' unidades'
      );
      
      -- Crédito em Fornecedores
      INSERT INTO public.accounting_entry_items (
        entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description
      ) VALUES (
        entry_id,
        supplier_account_id,
        0,
        COALESCE(NEW.unit_cost * NEW.quantity, 0),
        'Compra de ' || COALESCE(NEW.supplier_name, 'fornecedor')
      );
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para compras automáticas
DROP TRIGGER IF EXISTS create_automatic_purchase_entry_trigger ON public.stock_movements;
CREATE TRIGGER create_automatic_purchase_entry_trigger
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.create_automatic_purchase_entry();