-- Corrigir movimentações de caixa inconsistentes com valores das vendas
-- Atualizar movimentações de caixa que não estão sincronizadas com os valores atuais das vendas

UPDATE public.cash_movements 
SET amount = q.total_amount,
    description = CASE 
      WHEN cm.category = 'dinheiro' THEN 'Venda (Dinheiro) ' || q.quote_number || ' - ' || q.customer_name
      WHEN cm.category = 'pix' THEN 'Venda PIX ' || q.quote_number || ' - ' || q.customer_name
      WHEN cm.category = 'cartao_debito' THEN 'Venda Cartão Débito ' || q.quote_number || ' - ' || q.customer_name
      WHEN cm.category = 'cartao_credito' THEN 'Venda Cartão Crédito ' || q.quote_number || ' - ' || q.customer_name
      ELSE cm.description
    END
FROM public.quotes q, public.cash_movements cm
WHERE cm.reference_type = 'venda' 
  AND cm.reference_id = q.id 
  AND cm.amount != q.total_amount
  AND q.quote_type = 'sale' 
  AND q.status = 'completed'
  AND cm.id = cash_movements.id;

-- Melhorar a trigger para atualizar movimentações de caixa quando vendas são editadas
CREATE OR REPLACE FUNCTION public.update_cash_movement_on_sale_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Se for uma venda completada e o valor mudou, atualizar a movimentação de caixa
  IF NEW.quote_type = 'sale' AND NEW.status = 'completed' AND OLD.total_amount != NEW.total_amount THEN
    UPDATE public.cash_movements 
    SET amount = NEW.total_amount,
        description = CASE 
          WHEN category = 'dinheiro' THEN 'Venda (Dinheiro) ' || NEW.quote_number || ' - ' || NEW.customer_name
          WHEN category = 'pix' THEN 'Venda PIX ' || NEW.quote_number || ' - ' || NEW.customer_name
          WHEN category = 'cartao_debito' THEN 'Venda Cartão Débito ' || NEW.quote_number || ' - ' || NEW.customer_name
          WHEN category = 'cartao_credito' THEN 'Venda Cartão Crédito ' || NEW.quote_number || ' - ' || NEW.customer_name
          ELSE description
        END
    WHERE reference_type = 'venda' 
      AND reference_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar a trigger se não existir
DROP TRIGGER IF EXISTS update_cash_movement_on_sale_edit_trigger ON public.quotes;
CREATE TRIGGER update_cash_movement_on_sale_edit_trigger
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cash_movement_on_sale_edit();