-- Criar função para gerar lançamentos contábeis automáticos de vendas
CREATE OR REPLACE FUNCTION public.create_automatic_sale_entry()
RETURNS TRIGGER AS $$
DECLARE
  entry_id UUID;
  cash_account_id UUID;
  revenue_account_id UUID;
  cogs_account_id UUID;
  inventory_account_id UUID;
  entry_number TEXT;
  product_item JSONB;
  total_cost NUMERIC := 0;
BEGIN
  -- Apenas para vendas concluídas
  IF NEW.quote_type = 'sale' AND NEW.status = 'completed' THEN
    
    -- Buscar contas contábeis necessárias
    SELECT id INTO cash_account_id 
    FROM public.chart_of_accounts 
    WHERE code = CASE 
      WHEN NEW.payment_method = 'dinheiro' THEN '1.1.01' 
      ELSE '1.1.02' 
    END AND is_active = true;
    
    SELECT id INTO revenue_account_id 
    FROM public.chart_of_accounts 
    WHERE code = '3.1.01' AND is_active = true;
    
    SELECT id INTO cogs_account_id 
    FROM public.chart_of_accounts 
    WHERE code = '4.1.01' AND is_active = true;
    
    SELECT id INTO inventory_account_id 
    FROM public.chart_of_accounts 
    WHERE code = '1.2.01' AND is_active = true;
    
    -- Se não encontrar as contas, criar um log de erro mas não bloquear a venda
    IF cash_account_id IS NULL OR revenue_account_id IS NULL THEN
      INSERT INTO public.audit_logs (
        user_id, table_name, operation, record_id, new_values
      ) VALUES (
        NEW.created_by, 'accounting_entries', 'ERROR', NEW.id,
        jsonb_build_object('error', 'Contas contábeis não encontradas para venda automática')
      );
      RETURN NEW;
    END IF;
    
    -- Gerar número do lançamento
    entry_number := public.generate_entry_number();
    
    -- Criar lançamento contábil principal
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
      COALESCE(NEW.sale_date, CURRENT_DATE),
      'Venda Automática - ' || NEW.quote_number || ' - ' || NEW.customer_name,
      NEW.total_amount,
      'posted',
      'automatic',
      'venda',
      NEW.id,
      NEW.created_by
    ) RETURNING id INTO entry_id;
    
    -- Lançamento 1: Débito em Caixa/Banco
    INSERT INTO public.accounting_entry_items (
      entry_id,
      account_id,
      debit_amount,
      credit_amount,
      description
    ) VALUES (
      entry_id,
      cash_account_id,
      NEW.total_amount,
      0,
      CASE 
        WHEN NEW.payment_method = 'dinheiro' THEN 'Recebimento em dinheiro'
        WHEN NEW.payment_method = 'pix' THEN 'Recebimento via PIX'
        WHEN NEW.payment_method = 'cartao_debito' THEN 'Recebimento cartão débito'
        WHEN NEW.payment_method = 'cartao_credito' THEN 'Recebimento cartão crédito'
        ELSE 'Recebimento de venda'
      END
    );
    
    -- Lançamento 2: Crédito em Receita de Vendas
    INSERT INTO public.accounting_entry_items (
      entry_id,
      account_id,
      debit_amount,
      credit_amount,
      description
    ) VALUES (
      entry_id,
      revenue_account_id,
      0,
      NEW.total_amount,
      'Receita de vendas de produtos'
    );
    
    -- Se existirem as contas de CPV e Estoque, calcular e lançar o custo
    IF cogs_account_id IS NOT NULL AND inventory_account_id IS NOT NULL THEN
      -- Calcular custo total dos produtos vendidos
      FOR product_item IN SELECT * FROM jsonb_array_elements(NEW.products)
      LOOP
        SELECT COALESCE(cost_price, 0) * (product_item->>'quantity')::INTEGER 
        INTO total_cost 
        FROM public.products 
        WHERE id = (product_item->>'id')::UUID;
        
        total_cost := total_cost + COALESCE(total_cost, 0);
      END LOOP;
      
      -- Se houver custo, fazer o lançamento de CPV
      IF total_cost > 0 THEN
        -- Atualizar o valor total do lançamento
        UPDATE public.accounting_entries 
        SET total_amount = NEW.total_amount + total_cost 
        WHERE id = entry_id;
        
        -- Débito em CPV
        INSERT INTO public.accounting_entry_items (
          entry_id,
          account_id,
          debit_amount,
          credit_amount,
          description
        ) VALUES (
          entry_id,
          cogs_account_id,
          total_cost,
          0,
          'Custo dos produtos vendidos'
        );
        
        -- Crédito em Estoque
        INSERT INTO public.accounting_entry_items (
          entry_id,
          account_id,
          debit_amount,
          credit_amount,
          description
        ) VALUES (
          entry_id,
          inventory_account_id,
          0,
          total_cost,
          'Baixa do estoque por venda'
        );
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para lançamentos automáticos
DROP TRIGGER IF EXISTS create_automatic_sale_entry_trigger ON public.quotes;
CREATE TRIGGER create_automatic_sale_entry_trigger
  AFTER INSERT OR UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_automatic_sale_entry();

-- Inserir contas contábeis básicas necessárias se não existirem
INSERT INTO public.chart_of_accounts (code, name, account_type, account_subtype, is_active) 
VALUES 
  ('1.1.01', 'Caixa', 'ativo', 'ativo_circulante', true),
  ('1.1.02', 'Bancos', 'ativo', 'ativo_circulante', true),
  ('1.2.01', 'Estoque de Produtos', 'ativo', 'ativo_circulante', true),
  ('3.1.01', 'Receita de Vendas', 'receita', 'receita_operacional', true),
  ('4.1.01', 'CPV - Custo dos Produtos Vendidos', 'custo', 'custo_variavel', true)
ON CONFLICT (code) DO NOTHING;

-- Criar função para cancelamento automático de lançamentos
CREATE OR REPLACE FUNCTION public.cancel_automatic_sale_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a venda foi cancelada, cancelar o lançamento contábil
  IF NEW.status = 'canceled' AND OLD.status != 'canceled' THEN
    UPDATE public.accounting_entries 
    SET status = 'canceled'
    WHERE reference_type = 'venda' 
      AND reference_id = NEW.id 
      AND entry_type = 'automatic';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para cancelamento automático
DROP TRIGGER IF EXISTS cancel_automatic_sale_entry_trigger ON public.quotes;
CREATE TRIGGER cancel_automatic_sale_entry_trigger
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.cancel_automatic_sale_entry();