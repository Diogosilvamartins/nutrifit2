-- Criar tabela de fornecedores
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT,
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zipcode TEXT,
  contact_person TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Authenticated users can view all suppliers" 
ON public.suppliers 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert suppliers" 
ON public.suppliers 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update suppliers" 
ON public.suppliers 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete suppliers" 
ON public.suppliers 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar constraint para nome único
ALTER TABLE public.suppliers 
ADD CONSTRAINT suppliers_name_unique UNIQUE (name);

-- Atualizar a tabela stock_movements para referenciar fornecedor por ID
ALTER TABLE public.stock_movements 
ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id);

-- Inserir alguns fornecedores exemplo
INSERT INTO public.suppliers (name, company_name, is_active) VALUES 
('Distribuidora ABC', 'Distribuidora ABC Suplementos Ltda', true),
('Fornecedor XYZ', 'XYZ Importação e Distribuição S.A.', true),
('NutriSupplies', 'NutriSupplies Comércio de Suplementos Ltda', true);