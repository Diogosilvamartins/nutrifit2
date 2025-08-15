-- Adicionar campos de custo e estoque na tabela products
ALTER TABLE public.products 
ADD COLUMN cost_price numeric DEFAULT 0,
ADD COLUMN stock_quantity integer DEFAULT 0,
ADD COLUMN min_stock_alert integer DEFAULT 5;

-- Criar tabela para movimentações de estoque
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'saida')),
  quantity integer NOT NULL,
  unit_cost numeric,
  reference_type TEXT CHECK (reference_type IN ('compra', 'venda', 'ajuste')),
  reference_id UUID,
  notes TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Políticas para stock_movements
CREATE POLICY "Authenticated users can view stock movements" 
ON public.stock_movements 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create stock movements" 
ON public.stock_movements 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update stock movements" 
ON public.stock_movements 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at em stock_movements
CREATE TRIGGER update_stock_movements_updated_at
BEFORE UPDATE ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para atualizar estoque automaticamente
CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type = 'entrada' THEN
    UPDATE public.products 
    SET stock_quantity = stock_quantity + NEW.quantity
    WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'saida' THEN
    UPDATE public.products 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar estoque quando há movimentação
CREATE TRIGGER update_stock_trigger
AFTER INSERT ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_product_stock();

-- Criar índices para performance
CREATE INDEX idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements(created_at);
CREATE INDEX idx_products_stock_quantity ON public.products(stock_quantity);