-- Disable triggers temporarily 
ALTER TABLE public.profiles DISABLE TRIGGER ALL;

-- Drop the constraint that's preventing the update
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Update manager roles to salesperson
UPDATE public.profiles 
SET role = 'salesperson' 
WHERE role = 'manager';

-- Recreate the constraint with correct valid roles
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'salesperson', 'user'));

-- Re-enable triggers
ALTER TABLE public.profiles ENABLE TRIGGER ALL;