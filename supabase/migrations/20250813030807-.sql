-- Update the cancel_sale_and_return_stock function to handle sale type correctly
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