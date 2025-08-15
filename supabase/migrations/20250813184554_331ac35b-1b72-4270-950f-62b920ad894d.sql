-- Corrigir a venda PIX específica que foi feita hoje
DO $$
DECLARE
    sale_record RECORD;
BEGIN
    -- Buscar a venda PIX de hoje
    SELECT id, quote_number, customer_name, total_amount, created_at, created_by
    INTO sale_record
    FROM public.quotes 
    WHERE quote_type = 'sale' 
    AND payment_method = 'pix'
    AND status = 'completed'
    AND DATE(created_at) = CURRENT_DATE;

    -- Se encontrou a venda, registrar no banco (categoria pix)
    IF sale_record.id IS NOT NULL THEN
        -- Verificar se já existe movimento para esta venda
        IF NOT EXISTS (
            SELECT 1 FROM public.cash_movements 
            WHERE reference_type = 'venda' AND reference_id = sale_record.id
        ) THEN
            -- Inserir movimento PIX no banco
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
                sale_record.id,
                sale_record.created_by
            );
            
            RAISE NOTICE 'Movimento PIX registrado para venda %', sale_record.quote_number;
        ELSE
            RAISE NOTICE 'Movimento já existe para venda %', sale_record.quote_number;
        END IF;
    ELSE
        RAISE NOTICE 'Nenhuma venda PIX encontrada para hoje';
    END IF;
END $$;