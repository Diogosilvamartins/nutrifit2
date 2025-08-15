-- Atualizar a função de cancelamento para remover movimentos de caixa/banco
CREATE OR REPLACE FUNCTION public.cancel_sale_and_return_stock(sale_id uuid, sale_type text, user_id_param uuid, reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sale_products jsonb;
  product_item jsonb;
  movement_id uuid;
BEGIN
  -- Get the products from the sale
  IF sale_type = 'quote' OR sale_type = 'sale' THEN
    SELECT products INTO sale_products 
    FROM public.quotes 
    WHERE id = sale_id AND status != 'canceled';
    
    -- Update quote status (handles both quote and sale types)
    UPDATE public.quotes 
    SET status = 'canceled',
        canceled_at = now(),
        canceled_by = user_id_param,
        cancellation_reason = reason
    WHERE id = sale_id;
    
  ELSIF sale_type = 'order' THEN
    SELECT products INTO sale_products 
    FROM public.orders 
    WHERE id = sale_id AND status != 'canceled';
    
    -- Update order status
    UPDATE public.orders 
    SET status = 'canceled',
        canceled_at = now(),
        canceled_by = user_id_param,
        cancellation_reason = reason
    WHERE id = sale_id;
  ELSE
    RAISE EXCEPTION 'Invalid sale_type. Must be "quote", "sale", or "order"';
  END IF;
  
  -- Remove the cash movement for this sale (reverse the automatic entry)
  DELETE FROM public.cash_movements 
  WHERE reference_type = 'venda' AND reference_id = sale_id;
  
  -- Return products to stock
  FOR product_item IN SELECT * FROM jsonb_array_elements(sale_products)
  LOOP
    -- Create stock movement for returned product
    INSERT INTO public.stock_movements (
      product_id,
      movement_type,
      quantity,
      reference_type,
      reference_id,
      user_id,
      notes
    ) VALUES (
      (product_item->>'id')::uuid,
      'entrada',
      (product_item->>'quantity')::integer,
      'cancellation',
      sale_id,
      user_id_param,
      CONCAT('Cancelamento de ', sale_type, ' - ', COALESCE(reason, 'Sem motivo especificado'))
    );
  END LOOP;
  
  RETURN true;
END;
$function$;

-- Atualizar o trigger para também remover movimentos quando uma venda for cancelada
CREATE OR REPLACE FUNCTION public.register_sale_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se a venda foi cancelada, remove o movimento de caixa
  IF NEW.quote_type = 'sale' AND NEW.status = 'canceled' THEN
    DELETE FROM public.cash_movements 
    WHERE reference_type = 'venda' AND reference_id = NEW.id;
    RETURN NEW;
  END IF;
  
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

-- Limpar movimentos de vendas canceladas existentes
DELETE FROM public.cash_movements 
WHERE reference_type = 'venda' 
AND reference_id IN (
  SELECT id FROM public.quotes 
  WHERE quote_type = 'sale' AND status = 'canceled'
);