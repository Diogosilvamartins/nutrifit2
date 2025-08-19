-- Add sale_date column to quotes to store the intended sale date
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS sale_date date;

-- Backfill existing records so reports remain consistent
UPDATE public.quotes
SET sale_date = DATE(created_at)
WHERE sale_date IS NULL;

-- Update the register_sale_movement function to use sale_date when available
CREATE OR REPLACE FUNCTION public.register_sale_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If the sale was canceled, remove the cash movement
  IF NEW.quote_type = 'sale' AND NEW.status = 'canceled' THEN
    DELETE FROM public.cash_movements 
    WHERE reference_type = 'venda' AND reference_id = NEW.id;
    RETURN NEW;
  END IF;
  
  -- For completed sales, create movement if not exists
  IF NEW.quote_type = 'sale' AND NEW.status = 'completed' AND NEW.payment_method IS NOT NULL THEN
    
    IF NOT EXISTS (
      SELECT 1 FROM public.cash_movements 
      WHERE reference_type = 'venda' AND reference_id = NEW.id
    ) THEN
      
      -- Determine the correct date for the movement (prefer sale_date)
      -- Use COALESCE to fall back to the creation date when sale_date is null
      
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
  
  RETURN NEW;
END;
$function$;