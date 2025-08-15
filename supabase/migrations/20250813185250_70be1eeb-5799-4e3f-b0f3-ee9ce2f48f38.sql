-- Função atualizada para separar Caixa (dinheiro) e Banco (PIX, cartões)
CREATE OR REPLACE FUNCTION public.get_cash_summary_for_date(target_date date)
 RETURNS TABLE(opening_balance numeric, total_entries numeric, total_exits numeric, current_balance numeric, sales_cash numeric, sales_pix numeric, expenses numeric, bank_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH daily_movements AS (
    SELECT 
      CASE 
        WHEN cm.type = 'entrada' AND cm.category = 'dinheiro' THEN cm.amount
        WHEN cm.type = 'ajuste' AND cm.category = 'saldo_caixa' THEN cm.amount
        ELSE 0
      END as entries,
      CASE 
        WHEN cm.type = 'saida' THEN cm.amount
        ELSE 0
      END as exits,
      CASE 
        WHEN cm.type = 'saida' THEN cm.amount
        ELSE 0
      END as daily_expenses,
      CASE 
        WHEN cm.category = 'saldo_banco' AND cm.type = 'ajuste' THEN cm.amount
        WHEN cm.type = 'entrada' AND cm.category IN ('pix', 'cartao_debito', 'cartao_credito') THEN cm.amount
        ELSE 0
      END as bank_amount
    FROM public.cash_movements cm
    WHERE cm.date = target_date
  ),
  sales_data AS (
    SELECT 
      COALESCE(SUM(CASE WHEN q.payment_method = 'dinheiro' THEN q.total_amount ELSE 0 END), 0) as sales_cash_from_quotes,
      COALESCE(SUM(CASE WHEN q.payment_method IN ('pix', 'cartao_debito', 'cartao_credito') THEN q.total_amount ELSE 0 END), 0) as sales_bank_from_quotes
    FROM public.quotes q
    WHERE q.quote_type = 'sale'
    AND q.status = 'completed'
    AND DATE(q.created_at) = target_date
  ),
  aggregated_movements AS (
    SELECT 
      COALESCE(SUM(dm.entries), 0) as total_entries,
      COALESCE(SUM(dm.exits), 0) as total_exits,
      COALESCE(SUM(dm.daily_expenses), 0) as expenses,
      COALESCE(SUM(dm.bank_amount), 0) as bank_balance
    FROM daily_movements dm
  )
  SELECT 
    0::DECIMAL(10,2) as opening_balance,
    am.total_entries + sd.sales_cash_from_quotes as total_entries,
    am.total_exits as total_exits,
    am.total_entries + sd.sales_cash_from_quotes - am.total_exits as current_balance,
    sd.sales_cash_from_quotes as sales_cash,
    sd.sales_bank_from_quotes as sales_pix, -- Renomeando para manter compatibilidade, mas agora inclui todos os métodos bancários
    am.expenses as expenses,
    am.bank_balance + sd.sales_bank_from_quotes as bank_balance
  FROM aggregated_movements am
  CROSS JOIN sales_data sd;
END;
$function$;

-- Função atualizada para registrar vendas nos locais corretos
CREATE OR REPLACE FUNCTION public.register_sale_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Apenas para vendas (não orçamentos) e quando o status é 'completed'
  IF NEW.quote_type = 'sale' AND NEW.status = 'completed' AND NEW.payment_method IS NOT NULL THEN
    
    -- Verifica se já existe um movimento para esta venda
    IF NOT EXISTS (
      SELECT 1 FROM public.cash_movements 
      WHERE reference_type = 'venda' AND reference_id = NEW.id
    ) THEN
      
      -- Registra movimento baseado no método de pagamento
      IF NEW.payment_method = 'dinheiro' THEN
        -- Vendas em dinheiro vão para o caixa
        INSERT INTO public.cash_movements (
          date,
          type,
          amount,
          description,
          category,
          reference_type,
          reference_id,
          created_by
        ) VALUES (
          DATE(NEW.created_at),
          'entrada',
          NEW.total_amount,
          'Venda ' || NEW.quote_number || ' - ' || NEW.customer_name,
          'dinheiro',
          'venda',
          NEW.id,
          NEW.created_by
        );
        
      ELSIF NEW.payment_method IN ('pix', 'cartao_debito', 'cartao_credito') THEN
        -- Vendas PIX e cartões vão para o banco
        INSERT INTO public.cash_movements (
          date,
          type,
          amount,
          description,
          category,
          reference_type,
          reference_id,
          created_by
        ) VALUES (
          DATE(NEW.created_at),
          'entrada',
          NEW.total_amount,
          CASE 
            WHEN NEW.payment_method = 'pix' THEN 'Venda PIX '
            WHEN NEW.payment_method = 'cartao_debito' THEN 'Venda Cartão Débito '
            WHEN NEW.payment_method = 'cartao_credito' THEN 'Venda Cartão Crédito '
          END || NEW.quote_number || ' - ' || NEW.customer_name,
          NEW.payment_method,
          'venda',
          NEW.id,
          NEW.created_by
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Função para corrigir vendas existentes e movê-las para os locais corretos
CREATE OR REPLACE FUNCTION public.fix_sales_position()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sale_record RECORD;
  fixes_count INTEGER := 0;
  moved_to_bank INTEGER := 0;
  moved_to_cash INTEGER := 0;
  result JSONB;
BEGIN
  -- Primeiro, remove todos os movimentos automáticos de vendas para reprocessar
  FOR sale_record IN 
    SELECT cm.id as movement_id, q.id as quote_id, q.quote_number, q.customer_name, 
           q.total_amount, q.created_at, q.created_by, q.payment_method
    FROM public.cash_movements cm
    JOIN public.quotes q ON cm.reference_id = q.id
    WHERE cm.reference_type = 'venda' 
    AND q.quote_type = 'sale'
    AND q.status = 'completed'
  LOOP
    -- Remove o movimento existente
    DELETE FROM public.cash_movements WHERE id = sale_record.movement_id;
    
    -- Registra no local correto baseado no método de pagamento
    IF sale_record.payment_method = 'dinheiro' THEN
      -- Vendas em dinheiro vão para o caixa
      INSERT INTO public.cash_movements (
        date,
        type,
        amount,
        description,
        category,
        reference_type,
        reference_id,
        created_by
      ) VALUES (
        DATE(sale_record.created_at),
        'entrada',
        sale_record.total_amount,
        'Venda ' || sale_record.quote_number || ' - ' || sale_record.customer_name,
        'dinheiro',
        'venda',
        sale_record.quote_id,
        sale_record.created_by
      );
      moved_to_cash := moved_to_cash + 1;
      
    ELSIF sale_record.payment_method IN ('pix', 'cartao_debito', 'cartao_credito') THEN
      -- Vendas PIX e cartões vão para o banco
      INSERT INTO public.cash_movements (
        date,
        type,
        amount,
        description,
        category,
        reference_type,
        reference_id,
        created_by
      ) VALUES (
        DATE(sale_record.created_at),
        'entrada',
        sale_record.total_amount,
        CASE 
          WHEN sale_record.payment_method = 'pix' THEN 'Venda PIX '
          WHEN sale_record.payment_method = 'cartao_debito' THEN 'Venda Cartão Débito '
          WHEN sale_record.payment_method = 'cartao_credito' THEN 'Venda Cartão Crédito '
        END || sale_record.quote_number || ' - ' || sale_record.customer_name,
        sale_record.payment_method,
        'venda',
        sale_record.quote_id,
        sale_record.created_by
      );
      moved_to_bank := moved_to_bank + 1;
    END IF;
    
    fixes_count := fixes_count + 1;
  END LOOP;
  
  -- Retorna resumo das correções
  result := jsonb_build_object(
    'total_corrigidas', fixes_count,
    'movidas_para_banco', moved_to_bank,
    'movidas_para_caixa', moved_to_cash
  );
  
  RETURN result;
END;
$function$;

-- Executar a correção
SELECT public.fix_sales_position() as resultado_correcao;