-- Função atualizada para separar corretamente vendas PIX (banco) e dinheiro (caixa)
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
        WHEN cm.type = 'entrada' AND cm.category = 'pix' THEN cm.amount
        ELSE 0
      END as bank_amount
    FROM public.cash_movements cm
    WHERE cm.date = target_date
  ),
  sales_data AS (
    SELECT 
      COALESCE(SUM(CASE WHEN q.payment_method = 'dinheiro' THEN q.total_amount ELSE 0 END), 0) as sales_cash_from_quotes,
      COALESCE(SUM(CASE WHEN q.payment_method = 'pix' THEN q.total_amount ELSE 0 END), 0) as sales_pix_from_quotes
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
    sd.sales_pix_from_quotes as sales_pix,
    am.expenses as expenses,
    am.bank_balance + sd.sales_pix_from_quotes as bank_balance
  FROM aggregated_movements am
  CROSS JOIN sales_data sd;
END;
$function$;

-- Função para registrar vendas automaticamente nos movimentos de caixa
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
        
      ELSIF NEW.payment_method = 'pix' THEN
        -- Vendas PIX vão para o banco
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
          'Venda PIX ' || NEW.quote_number || ' - ' || NEW.customer_name,
          'pix',
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

-- Criar trigger para registrar vendas automaticamente
DROP TRIGGER IF EXISTS trigger_register_sale_movement ON public.quotes;
CREATE TRIGGER trigger_register_sale_movement
  AFTER INSERT OR UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.register_sale_movement();

-- Função para corrigir vendas existentes
CREATE OR REPLACE FUNCTION public.fix_pix_sales_to_bank()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sale_record RECORD;
  fixes_count INTEGER := 0;
BEGIN
  -- Corrige vendas PIX que foram registradas como dinheiro no caixa
  FOR sale_record IN 
    SELECT cm.id as movement_id, q.id as quote_id, q.quote_number, q.customer_name, q.total_amount, q.created_at, q.created_by
    FROM public.cash_movements cm
    JOIN public.quotes q ON cm.reference_id = q.id
    WHERE cm.reference_type = 'venda' 
    AND cm.category = 'dinheiro'
    AND q.payment_method = 'pix'
    AND q.quote_type = 'sale'
    AND q.status = 'completed'
  LOOP
    -- Remove o movimento incorreto (PIX registrado como dinheiro)
    DELETE FROM public.cash_movements WHERE id = sale_record.movement_id;
    
    -- Registra corretamente como PIX no banco
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
      'Venda PIX ' || sale_record.quote_number || ' - ' || sale_record.customer_name,
      'pix',
      'venda',
      sale_record.quote_id,
      sale_record.created_by
    );
    
    fixes_count := fixes_count + 1;
  END LOOP;
  
  RETURN fixes_count;
END;
$function$;

-- Executar a correção
SELECT public.fix_pix_sales_to_bank() as vendas_corrigidas;