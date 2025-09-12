-- Adicionar suporte a pagamentos parciais
CREATE TABLE IF NOT EXISTS public.payment_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('dinheiro', 'pix', 'cartao_debito', 'cartao_credito')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_splits
CREATE POLICY "Admins and managers can manage payment splits"
ON public.payment_splits
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Users can view payment splits for their quotes"
ON public.payment_splits
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quotes q
    WHERE q.id = payment_splits.quote_id
    AND (q.created_by = auth.uid() OR q.salesperson_id = auth.uid())
  )
);

CREATE POLICY "Users can create payment splits for their quotes"
ON public.payment_splits
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotes q
    WHERE q.id = payment_splits.quote_id
    AND (q.created_by = auth.uid() OR q.salesperson_id = auth.uid())
  )
);

-- Add function to register partial payment movements
CREATE OR REPLACE FUNCTION public.register_partial_payment_movements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  quote_data RECORD;
BEGIN
  -- Get quote data
  SELECT 
    q.quote_number,
    q.customer_name,
    q.sale_date,
    q.created_at,
    q.created_by
  INTO quote_data
  FROM quotes q
  WHERE q.id = NEW.quote_id;
  
  -- Register cash movement for this payment split
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
    COALESCE(quote_data.sale_date, DATE(quote_data.created_at)),
    'entrada',
    NEW.amount,
    CASE 
      WHEN NEW.payment_method = 'dinheiro' THEN 'Venda (Parcial) '
      WHEN NEW.payment_method = 'pix' THEN 'Venda PIX (Parcial) '
      WHEN NEW.payment_method = 'cartao_debito' THEN 'Venda Cartão Débito (Parcial) '
      WHEN NEW.payment_method = 'cartao_credito' THEN 'Venda Cartão Crédito (Parcial) '
    END || quote_data.quote_number || ' - ' || quote_data.customer_name,
    NEW.payment_method,
    'venda_parcial',
    NEW.quote_id,
    quote_data.created_by
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger for payment splits
CREATE OR REPLACE TRIGGER trigger_register_partial_payments
  AFTER INSERT ON public.payment_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.register_partial_payment_movements();

-- Update the register_sale_movement function to handle partial payments
CREATE OR REPLACE FUNCTION public.register_sale_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If the sale was canceled, remove all cash movements
  IF NEW.quote_type = 'sale' AND NEW.status = 'canceled' THEN
    DELETE FROM public.cash_movements 
    WHERE reference_type IN ('venda', 'venda_parcial') AND reference_id = NEW.id;
    RETURN NEW;
  END IF;
  
  -- For completed sales, check if it has partial payments
  IF NEW.quote_type = 'sale' AND NEW.status = 'completed' THEN
    
    -- Check if there are partial payments for this quote
    IF EXISTS (SELECT 1 FROM payment_splits WHERE quote_id = NEW.id) THEN
      -- Partial payments are handled by the payment_splits trigger
      -- Remove any existing single payment movement
      DELETE FROM public.cash_movements 
      WHERE reference_type = 'venda' AND reference_id = NEW.id;
    ELSE
      -- Handle single payment method (existing logic)
      IF NEW.payment_method IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.cash_movements 
        WHERE reference_type = 'venda' AND reference_id = NEW.id
      ) THEN
        
        IF NEW.payment_method = 'dinheiro' THEN
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
            COALESCE(NEW.sale_date, DATE(NEW.created_at)),
            'entrada',
            NEW.total_amount,
            'Venda ' || NEW.quote_number || ' - ' || NEW.customer_name,
            'dinheiro',
            'venda',
            NEW.id,
            NEW.created_by
          );
          
        ELSIF NEW.payment_method IN ('pix', 'cartao_debito', 'cartao_credito') THEN
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
            COALESCE(NEW.sale_date, DATE(NEW.created_at)),
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
  END IF;
  
  RETURN NEW;
END;
$function$;