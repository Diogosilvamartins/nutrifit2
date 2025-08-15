-- Corrigir datas inconsistentes nos movimentos de caixa
-- As vendas devem ser registradas na data da venda, não em datas diferentes

-- 1. Primeiro, corrigir registros existentes onde a data do movimento não bate com a data da venda
UPDATE public.cash_movements 
SET date = DATE(q.created_at)
FROM public.quotes q 
WHERE cash_movements.reference_id = q.id 
  AND cash_movements.reference_type = 'venda'
  AND cash_movements.date != DATE(q.created_at);

-- 2. Atualizar o trigger para usar a data correta da criação da venda
CREATE OR REPLACE FUNCTION public.register_sale_movement()
RETURNS TRIGGER AS $$
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
      -- IMPORTANTE: usar a data da criação da venda, não a data atual
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
          DATE(NEW.created_at), -- Usar a data da venda, não CURRENT_DATE
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
          DATE(NEW.created_at), -- Usar a data da venda, não CURRENT_DATE
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';