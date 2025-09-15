-- Adicionar suporte completo para as 4 roles no sistema
-- Atualizar constraint para permitir as 4 roles: admin, manager, salesperson, user

-- Dropar constraint existente se houver
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Adicionar nova constraint permitindo todas as 4 roles
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'manager', 'salesperson', 'user'));