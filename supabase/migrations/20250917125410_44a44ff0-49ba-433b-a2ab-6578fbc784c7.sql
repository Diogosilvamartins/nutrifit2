-- Policies to allow admins to manage WhatsApp templates
-- Enable RLS (already enabled, but safe if rerun)
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Allow admins to update any template
DROP POLICY IF EXISTS "Admins can update all whatsapp templates" ON public.whatsapp_templates;
CREATE POLICY "Admins can update all whatsapp templates"
ON public.whatsapp_templates
FOR UPDATE
USING (public.is_admin());

-- Allow admins to delete any template
DROP POLICY IF EXISTS "Admins can delete all whatsapp templates" ON public.whatsapp_templates;
CREATE POLICY "Admins can delete all whatsapp templates"
ON public.whatsapp_templates
FOR DELETE
USING (public.is_admin());