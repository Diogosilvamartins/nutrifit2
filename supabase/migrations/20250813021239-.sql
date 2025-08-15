-- Add shipping fields to quotes and orders tables
ALTER TABLE public.quotes 
ADD COLUMN shipping_type text DEFAULT 'local',
ADD COLUMN shipping_cost numeric DEFAULT 0,
ADD COLUMN canceled_at timestamp with time zone,
ADD COLUMN canceled_by uuid,
ADD COLUMN cancellation_reason text;

ALTER TABLE public.orders
ADD COLUMN shipping_type text DEFAULT 'local',
ADD COLUMN shipping_cost numeric DEFAULT 0,
ADD COLUMN canceled_at timestamp with time zone,
ADD COLUMN canceled_by uuid,
ADD COLUMN cancellation_reason text;

-- Create function to handle order/quote cancellation and stock return
CREATE OR REPLACE FUNCTION public.cancel_sale_and_return_stock(
  sale_id uuid,
  sale_type text, -- 'quote' or 'order'
  user_id_param uuid,
  reason text DEFAULT NULL
)
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
  IF sale_type = 'quote' THEN
    SELECT products INTO sale_products 
    FROM public.quotes 
    WHERE id = sale_id AND status != 'canceled';
    
    -- Update quote status
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
    RAISE EXCEPTION 'Invalid sale_type. Must be "quote" or "order"';
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

-- Create function to calculate shipping cost
CREATE OR REPLACE FUNCTION public.calculate_shipping_cost(
  shipping_type_param text,
  customer_zipcode text DEFAULT NULL,
  total_weight numeric DEFAULT 1.0
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  shipping_cost numeric := 0;
BEGIN
  CASE shipping_type_param
    WHEN 'local' THEN
      shipping_cost := 15.00;
    WHEN 'correios' THEN
      -- For now, return a placeholder. Will be replaced with Correios API integration
      shipping_cost := 25.00;
    WHEN 'pickup' THEN
      shipping_cost := 0;
    ELSE
      shipping_cost := 15.00; -- Default to local shipping
  END CASE;
  
  RETURN shipping_cost;
END;
$function$;