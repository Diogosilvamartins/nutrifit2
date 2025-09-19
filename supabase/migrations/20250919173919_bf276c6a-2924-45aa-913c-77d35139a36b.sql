-- Primeiro, vamos cancelar os lançamentos duplicados da venda 202509180003
UPDATE public.accounting_entries 
SET status = 'canceled'
WHERE reference_id IN (
  SELECT id FROM quotes WHERE quote_number = '202509180003'
) 
AND entry_type = 'automatic'
AND entry_number IN ('2025090070', '2025090071');

-- Recriar o trigger para evitar duplicações futuras
DROP TRIGGER IF EXISTS create_automatic_sale_entry_trigger ON public.quotes;

-- Modificar a função para verificar se já existe lançamento
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
  existing_entry_id UUID;
BEGIN
  -- Apenas para vendas concluídas
  IF NEW.quote_type = 'sale' AND NEW.status = 'completed' THEN
    
    -- Se for UPDATE, verificar se já existe lançamento ativo
    IF TG_OP = 'UPDATE' THEN
      SELECT id INTO existing_entry_id
      FROM public.accounting_entries 
      WHERE reference_type = 'venda' 
        AND reference_id = NEW.id 
        AND entry_type = 'automatic'
        AND status = 'posted';
      
      -- Se já existe lançamento ativo e o valor mudou, cancelar o anterior
      IF existing_entry_id IS NOT NULL AND OLD.total_amount != NEW.total_amount THEN
        UPDATE public.accounting_entries 
        SET status = 'canceled'
        WHERE id = existing_entry_id;
      ELSIF existing_entry_id IS NOT NULL THEN
        -- Se já existe e o valor não mudou, não fazer nada
        RETURN NEW;
      END IF;
    END IF;
    
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

-- Recriar o trigger apenas para INSERT e UPDATE (mas agora com lógica para evitar duplicação)
CREATE TRIGGER create_automatic_sale_entry_trigger
AFTER INSERT OR UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION create_automatic_sale_entry();

-- Criar um novo lançamento correto para a venda 202509180003 com o valor atual de R$ 115,00
-- Buscar o ID da quote
DO $$
DECLARE
  quote_record RECORD;
  new_entry_id UUID;
  cash_account_id UUID;
  revenue_account_id UUID;
  entry_number TEXT;
BEGIN
  -- Buscar a venda
  SELECT * INTO quote_record 
  FROM quotes 
  WHERE quote_number = '202509180003' 
    AND quote_type = 'sale' 
    AND status = 'completed';
    
  IF quote_record.id IS NOT NULL THEN
    -- Buscar contas contábeis
    SELECT id INTO cash_account_id 
    FROM public.chart_of_accounts 
    WHERE code = CASE 
      WHEN quote_record.payment_method = 'dinheiro' THEN '1.1.01' 
      ELSE '1.1.02' 
    END AND is_active = true;
    
    SELECT id INTO revenue_account_id 
    FROM public.chart_of_accounts 
    WHERE code = '3.1.01' AND is_active = true;
    
    IF cash_account_id IS NOT NULL AND revenue_account_id IS NOT NULL THEN
      -- Gerar número do lançamento
      entry_number := public.generate_entry_number();
      
      -- Criar novo lançamento com valor correto
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
        COALESCE(quote_record.sale_date, CURRENT_DATE),
        'Venda Automática - ' || quote_record.quote_number || ' - ' || quote_record.customer_name || ' (Corrigido)',
        quote_record.total_amount,
        'posted',
        'automatic',
        'venda',
        quote_record.id,
        quote_record.created_by
      ) RETURNING id INTO new_entry_id;
      
      -- Lançamento 1: Débito em Caixa/Banco
      INSERT INTO public.accounting_entry_items (
        entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description
      ) VALUES (
        new_entry_id,
        cash_account_id,
        quote_record.total_amount,
        0,
        CASE 
          WHEN quote_record.payment_method = 'dinheiro' THEN 'Recebimento em dinheiro'
          WHEN quote_record.payment_method = 'pix' THEN 'Recebimento via PIX'
          WHEN quote_record.payment_method = 'cartao_debito' THEN 'Recebimento cartão débito'
          WHEN quote_record.payment_method = 'cartao_credito' THEN 'Recebimento cartão crédito'
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
        new_entry_id,
        revenue_account_id,
        0,
        quote_record.total_amount,
        'Receita de vendas de produtos'
      );
    END IF;
  END IF;
END $$;