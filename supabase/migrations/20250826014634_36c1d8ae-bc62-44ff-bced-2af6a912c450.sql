-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Create storage bucket for backups if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for backups (admin only)
CREATE POLICY "Admins can manage backups" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'backups' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);