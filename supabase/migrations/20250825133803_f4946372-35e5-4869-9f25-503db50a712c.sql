-- Create storage bucket for backups
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

-- Schedule daily backup at 2 AM
SELECT cron.schedule(
  'daily-backup',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT
    net.http_post(
        url:='https://zkxkbghzlfadkpdkctkx.supabase.co/functions/v1/daily-backup',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreGtiZ2h6bGZhZGtwZGtjdGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjU4ODYsImV4cCI6MjA3MDYwMTg4Nn0.9kovhayP4cSDWW2FBayEV8h9Frpi23s5-0sWmWwjOI0"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);