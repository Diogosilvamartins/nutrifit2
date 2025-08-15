-- Verificar constraint atual
SELECT conname, pg_get_constraintdef(c.oid) 
FROM pg_constraint c 
JOIN pg_class t ON c.conrelid = t.oid 
WHERE t.relname = 'audit_logs' AND contype = 'c';

-- Remover constraint antiga se existir
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_operation_check;

-- Criar nova constraint que aceita BACKUP
ALTER TABLE public.audit_logs 
ADD CONSTRAINT audit_logs_operation_check 
CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'BACKUP', 'LOGIN', 'LOGOUT', 'CREATE', 'MODIFY', 'REMOVE'));