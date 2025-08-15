-- Tornar o campo payment_method obrigatório para vendas (não orçamentos)
-- Adiciona uma constraint para garantir que vendas tenham método de pagamento

-- Primeiro, vamos atualizar registros existentes que são vendas mas não têm método de pagamento
UPDATE public.quotes 
SET payment_method = 'dinheiro' 
WHERE quote_type = 'sale' 
AND (payment_method IS NULL OR payment_method = '');

-- Criar uma função para validar se vendas têm método de pagamento
CREATE OR REPLACE FUNCTION public.validate_sale_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  -- Se for uma venda (sale), o método de pagamento deve ser obrigatório
  IF NEW.quote_type = 'sale' AND (NEW.payment_method IS NULL OR NEW.payment_method = '') THEN
    RAISE EXCEPTION 'Método de pagamento é obrigatório para vendas';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validar método de pagamento em vendas
DROP TRIGGER IF EXISTS validate_payment_method_trigger ON public.quotes;
CREATE TRIGGER validate_payment_method_trigger
  BEFORE INSERT OR UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_sale_payment_method();