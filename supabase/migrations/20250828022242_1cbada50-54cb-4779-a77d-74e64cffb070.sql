-- Create WhatsApp templates table
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'geral',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view all templates" 
ON public.whatsapp_templates 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create templates" 
ON public.whatsapp_templates 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can update their own templates" 
ON public.whatsapp_templates 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates" 
ON public.whatsapp_templates 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create trigger for updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.whatsapp_templates (name, message, variables, category) VALUES
('Orçamento Aprovado', 'Olá {nome}! Seu orçamento #{numero} no valor de R$ {valor} foi aprovado! Quando podemos agendar a entrega? 📦✨', '["nome", "numero", "valor"]'::jsonb, 'vendas'),
('Follow-up Cliente', 'Oi {nome}! Como você está? Vi que você teve interesse nos nossos suplementos. Posso te ajudar com alguma dúvida? 💪', '["nome"]'::jsonb, 'relacionamento'),
('Produto em Estoque', '🎉 Boa notícia {nome}! O produto {produto} que você estava procurando acabou de chegar. Quer garantir o seu?', '["nome", "produto"]'::jsonb, 'estoque'),
('Entrega', 'Infelizmente não faço entrega, pode retirar aqui na Av. Rio Doce, 1075 - Ilna, ou se preferir posso te indicar um entregador e você combina com ele, (33) 99990-9696 - André.', '[]'::jsonb, 'vendas');