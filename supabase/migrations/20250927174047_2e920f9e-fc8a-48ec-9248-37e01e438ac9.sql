-- Criar tabelas para módulo fiscal

-- Tabela para armazenar notas fiscais
CREATE TABLE public.fiscal_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  
  -- Dados da NFe
  chave_nfe TEXT NOT NULL UNIQUE, -- chave de 44 dígitos
  numero_nfe TEXT NOT NULL,
  serie TEXT NOT NULL,
  natureza_operacao TEXT NOT NULL,
  dhemi TIMESTAMP WITH TIME ZONE NOT NULL,
  dhsaient TIMESTAMP WITH TIME ZONE,
  tipo_nf INTEGER NOT NULL, -- 0=entrada, 1=saida
  
  -- Dados do emitente
  emit_cnpj TEXT,
  emit_nome TEXT NOT NULL,
  emit_fantasia TEXT,
  emit_endereco JSONB,
  emit_ie TEXT,
  
  -- Dados do destinatário
  dest_cnpj_cpf TEXT,
  dest_nome TEXT NOT NULL,
  dest_endereco JSONB,
  
  -- Totais
  valor_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_produtos NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_icms NUMERIC(15,2) DEFAULT 0,
  valor_ipi NUMERIC(15,2) DEFAULT 0,
  valor_pis NUMERIC(15,2) DEFAULT 0,
  valor_cofins NUMERIC(15,2) DEFAULT 0,
  valor_frete NUMERIC(15,2) DEFAULT 0,
  valor_desconto NUMERIC(15,2) DEFAULT 0,
  
  -- Dados adicionais
  situacao TEXT NOT NULL DEFAULT 'autorizada', -- autorizada, cancelada, etc
  protocolo TEXT,
  xml_content TEXT, -- armazenar o XML completo
  
  -- Controle
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para itens da nota fiscal
CREATE TABLE public.fiscal_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.fiscal_invoices(id) ON DELETE CASCADE,
  
  -- Dados do produto
  numero_item INTEGER NOT NULL,
  codigo_produto TEXT NOT NULL,
  ean TEXT,
  descricao TEXT NOT NULL,
  ncm TEXT,
  cfop TEXT,
  unidade TEXT NOT NULL,
  
  -- Quantidades e valores
  quantidade NUMERIC(15,4) NOT NULL,
  valor_unitario NUMERIC(15,10) NOT NULL,
  valor_total NUMERIC(15,2) NOT NULL,
  
  -- Impostos
  valor_icms NUMERIC(15,2) DEFAULT 0,
  valor_ipi NUMERIC(15,2) DEFAULT 0,
  valor_pis NUMERIC(15,2) DEFAULT 0,
  valor_cofins NUMERIC(15,2) DEFAULT 0,
  
  -- Controle
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_fiscal_invoices_chave ON public.fiscal_invoices(chave_nfe);
CREATE INDEX idx_fiscal_invoices_org ON public.fiscal_invoices(organization_id);
CREATE INDEX idx_fiscal_invoices_emit_cnpj ON public.fiscal_invoices(emit_cnpj);
CREATE INDEX idx_fiscal_invoices_dest_cnpj_cpf ON public.fiscal_invoices(dest_cnpj_cpf);
CREATE INDEX idx_fiscal_invoices_dhemi ON public.fiscal_invoices(dhemi);
CREATE INDEX idx_fiscal_invoice_items_invoice ON public.fiscal_invoice_items(invoice_id);
CREATE INDEX idx_fiscal_invoice_items_codigo ON public.fiscal_invoice_items(codigo_produto);

-- Trigger para organization_id
CREATE TRIGGER set_fiscal_invoices_organization_id
  BEFORE INSERT ON public.fiscal_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

-- RLS Policies
ALTER TABLE public.fiscal_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_invoice_items ENABLE ROW LEVEL SECURITY;

-- Políticas para fiscal_invoices
CREATE POLICY "Users can view invoices from their organization" 
ON public.fiscal_invoices 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.organization_id = fiscal_invoices.organization_id
));

CREATE POLICY "Admins and managers can manage invoices in their organization" 
ON public.fiscal_invoices 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.organization_id = fiscal_invoices.organization_id 
  AND p.role IN ('admin', 'manager')
));

-- Políticas para fiscal_invoice_items
CREATE POLICY "Users can view invoice items from their organization" 
ON public.fiscal_invoice_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM fiscal_invoices fi 
  JOIN profiles p ON p.organization_id = fi.organization_id 
  WHERE fi.id = fiscal_invoice_items.invoice_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Admins and managers can manage invoice items in their organization" 
ON public.fiscal_invoice_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM fiscal_invoices fi 
  JOIN profiles p ON p.organization_id = fi.organization_id 
  WHERE fi.id = fiscal_invoice_items.invoice_id 
  AND p.user_id = auth.uid() 
  AND p.role IN ('admin', 'manager')
));

-- Trigger para updated_at
CREATE TRIGGER update_fiscal_invoices_updated_at
  BEFORE UPDATE ON public.fiscal_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();