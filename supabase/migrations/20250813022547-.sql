-- Create cash_movements table for tracking all cash transactions
CREATE TABLE public.cash_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('entrada', 'saida', 'ajuste')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

-- Create policies for cash movements
CREATE POLICY "Authenticated users can view cash movements" 
ON public.cash_movements 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert cash movements" 
ON public.cash_movements 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update cash movements" 
ON public.cash_movements 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete cash movements" 
ON public.cash_movements 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX idx_cash_movements_date ON public.cash_movements(date);
CREATE INDEX idx_cash_movements_type ON public.cash_movements(type);
CREATE INDEX idx_cash_movements_category ON public.cash_movements(category);

-- Create function to adjust cash balance for a specific date
CREATE OR REPLACE FUNCTION public.adjust_cash_balance(
  target_date DATE,
  cash_amount DECIMAL(10,2),
  bank_amount DECIMAL(10,2)
)
RETURNS VOID AS $$
BEGIN
  -- Remove existing balance adjustments for this date
  DELETE FROM public.cash_movements 
  WHERE date = target_date 
  AND type = 'ajuste' 
  AND category IN ('saldo_caixa', 'saldo_banco');
  
  -- Insert new cash balance adjustment if amount is not zero
  IF cash_amount != 0 THEN
    INSERT INTO public.cash_movements (date, type, amount, description, category, created_by)
    VALUES (
      target_date,
      'ajuste',
      cash_amount,
      'Ajuste de saldo em dinheiro',
      'saldo_caixa',
      auth.uid()
    );
  END IF;
  
  -- Insert new bank balance adjustment if amount is not zero
  IF bank_amount != 0 THEN
    INSERT INTO public.cash_movements (date, type, amount, description, category, created_by)
    VALUES (
      target_date,
      'ajuste',
      bank_amount,
      'Ajuste de saldo bancário',
      'saldo_banco',
      auth.uid()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get cash summary for a specific date
CREATE OR REPLACE FUNCTION public.get_cash_summary_for_date(target_date DATE)
RETURNS TABLE (
  opening_balance DECIMAL(10,2),
  total_entries DECIMAL(10,2),
  total_exits DECIMAL(10,2),
  current_balance DECIMAL(10,2),
  sales_cash DECIMAL(10,2),
  sales_pix DECIMAL(10,2),
  expenses DECIMAL(10,2),
  bank_balance DECIMAL(10,2)
) AS $$
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
  )
  SELECT 
    0::DECIMAL(10,2) as opening_balance,
    COALESCE(SUM(dm.entries), 0) + COALESCE(sd.sales_cash_from_quotes, 0) + COALESCE(sd.sales_pix_from_quotes, 0) as total_entries,
    COALESCE(SUM(dm.exits), 0) as total_exits,
    COALESCE(SUM(dm.entries), 0) + COALESCE(sd.sales_cash_from_quotes, 0) + COALESCE(sd.sales_pix_from_quotes, 0) - COALESCE(SUM(dm.exits), 0) as current_balance,
    COALESCE(SUM(dm.cash_sales), 0) + COALESCE(sd.sales_cash_from_quotes, 0) as sales_cash,
    COALESCE(SUM(dm.pix_sales), 0) + COALESCE(sd.sales_pix_from_quotes, 0) as sales_pix,
    COALESCE(SUM(dm.daily_expenses), 0) as expenses,
    COALESCE(SUM(dm.bank_amount), 0) as bank_balance
  FROM daily_movements dm
  CROSS JOIN sales_data sd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;