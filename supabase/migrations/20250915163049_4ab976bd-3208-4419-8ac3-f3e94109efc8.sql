-- First, check and fix the role constraint
DO $$
BEGIN
  -- Drop existing role constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_role_check' 
    AND table_name = 'profiles'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;
END $$;

-- Add the correct constraint with all valid roles
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'salesperson', 'user'));

-- Now update the manager role to salesperson
UPDATE public.profiles 
SET role = 'salesperson' 
WHERE role = 'manager';