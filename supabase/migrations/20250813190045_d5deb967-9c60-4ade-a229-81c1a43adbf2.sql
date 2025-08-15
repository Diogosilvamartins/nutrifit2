-- Vou corrigir a função para evitar duplicação
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
    am.total_entries as total_entries,
    am.total_exits as total_exits,
    am.total_entries - am.total_exits as current_balance,
    am.total_entries as sales_cash, -- Apenas entradas em dinheiro (caixa)
    am.bank_balance as sales_pix,   -- Renomeando para manter compatibilidade, mas são todas as entradas bancárias
    am.expenses as expenses,
    am.bank_balance as bank_balance -- Apenas entradas bancárias, sem duplicação
  FROM aggregated_movements am;
END;
$function$;