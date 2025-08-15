-- Fix the get_cash_summary_for_date function SQL error
DROP FUNCTION IF EXISTS public.get_cash_summary_for_date(date);

CREATE OR REPLACE FUNCTION public.get_cash_summary_for_date(target_date date)
 RETURNS TABLE(opening_balance numeric, total_entries numeric, total_exits numeric, current_balance numeric, sales_cash numeric, sales_pix numeric, expenses numeric, bank_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH daily_movements AS (
    SELECT 
      CASE 
        WHEN cm.type = 'entrada' THEN cm.amount
        WHEN cm.type = 'ajuste' AND cm.category = 'saldo_caixa' THEN cm.amount
        ELSE 0
      END as entries,
      CASE 
        WHEN cm.type = 'saida' THEN cm.amount
        ELSE 0
      END as exits,
      CASE 
        WHEN cm.category = 'dinheiro' AND cm.type = 'entrada' THEN cm.amount
        ELSE 0
      END as cash_sales,
      CASE 
        WHEN cm.category = 'pix' AND cm.type = 'entrada' THEN cm.amount
        ELSE 0
      END as pix_sales,
      CASE 
        WHEN cm.type = 'saida' THEN cm.amount
        ELSE 0
      END as daily_expenses,
      CASE 
        WHEN cm.category = 'saldo_banco' AND cm.type = 'ajuste' THEN cm.amount
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
    AND DATE(q.created_at) = target_date
  ),
  aggregated_movements AS (
    SELECT 
      COALESCE(SUM(dm.entries), 0) as total_entries,
      COALESCE(SUM(dm.exits), 0) as total_exits,
      COALESCE(SUM(dm.cash_sales), 0) as cash_sales,
      COALESCE(SUM(dm.pix_sales), 0) as pix_sales,
      COALESCE(SUM(dm.daily_expenses), 0) as expenses,
      COALESCE(SUM(dm.bank_amount), 0) as bank_balance
    FROM daily_movements dm
  )
  SELECT 
    0::DECIMAL(10,2) as opening_balance,
    am.total_entries + sd.sales_cash_from_quotes + sd.sales_pix_from_quotes as total_entries,
    am.total_exits as total_exits,
    am.total_entries + sd.sales_cash_from_quotes + sd.sales_pix_from_quotes - am.total_exits as current_balance,
    am.cash_sales + sd.sales_cash_from_quotes as sales_cash,
    am.pix_sales + sd.sales_pix_from_quotes as sales_pix,
    am.expenses as expenses,
    am.bank_balance as bank_balance
  FROM aggregated_movements am
  CROSS JOIN sales_data sd;
END;
$function$;