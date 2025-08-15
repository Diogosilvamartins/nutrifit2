-- Criar função para calcular saldo acumulado por período
CREATE OR REPLACE FUNCTION public.get_accumulated_cash_summary(start_date date, end_date date)
RETURNS TABLE(
  period_start date,
  period_end date,
  total_cash_entries numeric,
  total_cash_exits numeric,
  accumulated_cash_balance numeric,
  total_bank_entries numeric,
  total_bank_exits numeric,
  accumulated_bank_balance numeric,
  total_sales numeric,
  total_expenses numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH period_movements AS (
    SELECT 
      CASE 
        WHEN cm.type = 'entrada' AND cm.category = 'dinheiro' THEN cm.amount
        ELSE 0
      END as cash_entries,
      CASE 
        WHEN cm.type = 'saida' AND cm.category = 'dinheiro' THEN cm.amount
        ELSE 0
      END as cash_exits,
      CASE 
        WHEN cm.type = 'entrada' AND cm.category IN ('pix', 'cartao_debito', 'cartao_credito') THEN cm.amount
        ELSE 0
      END as bank_entries,
      CASE 
        WHEN cm.type = 'saida' AND cm.category IN ('pix', 'cartao_debito', 'cartao_credito') THEN cm.amount
        ELSE 0
      END as bank_exits,
      CASE 
        WHEN cm.reference_type = 'venda' THEN cm.amount
        ELSE 0
      END as sales,
      CASE 
        WHEN cm.type = 'saida' AND cm.category NOT IN ('pix', 'cartao_debito', 'cartao_credito', 'dinheiro') THEN cm.amount
        ELSE 0
      END as expenses
    FROM public.cash_movements cm
    WHERE cm.date >= start_date AND cm.date <= end_date
  ),
  aggregated_data AS (
    SELECT 
      COALESCE(SUM(pm.cash_entries), 0) as total_cash_entries,
      COALESCE(SUM(pm.cash_exits), 0) as total_cash_exits,
      COALESCE(SUM(pm.bank_entries), 0) as total_bank_entries,
      COALESCE(SUM(pm.bank_exits), 0) as total_bank_exits,
      COALESCE(SUM(pm.sales), 0) as total_sales,
      COALESCE(SUM(pm.expenses), 0) as total_expenses
    FROM period_movements pm
  )
  SELECT 
    start_date as period_start,
    end_date as period_end,
    ad.total_cash_entries,
    ad.total_cash_exits,
    ad.total_cash_entries - ad.total_cash_exits as accumulated_cash_balance,
    ad.total_bank_entries,
    ad.total_bank_exits,
    ad.total_bank_entries - ad.total_bank_exits as accumulated_bank_balance,
    ad.total_sales,
    ad.total_expenses
  FROM aggregated_data ad;
END;
$function$;