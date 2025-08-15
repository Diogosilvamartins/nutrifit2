-- Atualizar a função register_sale_movement para usar uma data customizada
CREATE OR REPLACE FUNCTION public.register_sale_movement()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o trigger se não existir
DROP TRIGGER IF EXISTS trigger_register_sale_movement ON public.quotes;
CREATE TRIGGER trigger_register_sale_movement
  AFTER INSERT OR UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.register_sale_movement();