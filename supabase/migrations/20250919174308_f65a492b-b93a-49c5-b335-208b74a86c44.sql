-- Criar lançamentos contábeis para vendas que não têm lançamento

DO $$
DECLARE
  quote_record RECORD;
  new_entry_id UUID;
  cash_account_id UUID;
  revenue_account_id UUID;
  entry_number TEXT;
  created_count INTEGER := 0;
BEGIN
  -- Buscar contas contábeis necessárias
  SELECT id INTO cash_account_id 
  FROM public.chart_of_accounts 
  WHERE code = '1.1.02' AND is_active = true; -- Conta banco (padrão)
  
  SELECT id INTO revenue_account_id 
  FROM public.chart_of_accounts 
  WHERE code = '3.1.01' AND is_active = true; -- Receita de vendas
  
  -- Se não encontrar as contas, não continuar
  IF cash_account_id IS NULL OR revenue_account_id IS NULL THEN
    RAISE EXCEPTION 'Contas contábeis necessárias não encontradas';
  END IF;
  
  -- Loop através de todas as vendas sem lançamento contábil
  FOR quote_record IN 
    SELECT q.*
    FROM quotes q
    LEFT JOIN accounting_entries ae ON q.id = ae.reference_id 
      AND ae.reference_type = 'venda'
      AND ae.entry_type = 'automatic'
      AND ae.status = 'posted'
    WHERE q.quote_type = 'sale'
      AND q.status = 'completed'
      AND ae.id IS NULL
    ORDER BY q.created_at
  LOOP
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
      COALESCE(quote_record.sale_date, DATE(quote_record.created_at)),
      'Venda Automática - ' || quote_record.quote_number || ' - ' || quote_record.customer_name || ' (Retroativo)',
      quote_record.total_amount,
      'posted',
      'automatic',
      'venda',
      quote_record.id,
      quote_record.created_by
    ) RETURNING id INTO new_entry_id;
    
    -- Escolher conta correta baseada no método de pagamento
    IF quote_record.payment_method = 'dinheiro' THEN
      SELECT id INTO cash_account_id 
      FROM public.chart_of_accounts 
      WHERE code = '1.1.01' AND is_active = true; -- Caixa
    ELSE
      SELECT id INTO cash_account_id 
      FROM public.chart_of_accounts 
      WHERE code = '1.1.02' AND is_active = true; -- Banco
    END IF;
    
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
        WHEN quote_record.payment_method = 'dinheiro' THEN 'Recebimento em dinheiro (Retroativo)'
        WHEN quote_record.payment_method = 'pix' THEN 'Recebimento via PIX (Retroativo)'
        WHEN quote_record.payment_method = 'cartao_debito' THEN 'Recebimento cartão débito (Retroativo)'
        WHEN quote_record.payment_method = 'cartao_credito' THEN 'Recebimento cartão crédito (Retroativo)'
        ELSE 'Recebimento de venda (Retroativo)'
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
      'Receita de vendas de produtos (Retroativo)'
    );
    
    created_count := created_count + 1;
    
    -- Fazer commit a cada 50 registros para evitar travamento
    IF created_count % 50 = 0 THEN
      COMMIT;
    END IF;
    
  END LOOP;
  
  -- Log da criação dos lançamentos retroativos
  INSERT INTO public.audit_logs (
    user_id, table_name, operation, record_id, new_values
  ) VALUES (
    (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1),
    'accounting_entries',
    'CREATE',
    NULL,
    jsonb_build_object(
      'action', 'Criação de lançamentos contábeis retroativos',
      'timestamp', NOW(),
      'entries_created', created_count
    )
  );
  
  RAISE NOTICE 'Criados % lançamentos contábeis retroativos', created_count;
END $$;