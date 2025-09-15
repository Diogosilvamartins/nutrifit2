-- Update all 'manager' roles to 'salesperson' to align with new role structure
UPDATE public.profiles 
SET role = 'salesperson' 
WHERE role = 'manager';

-- Update role check constraint if exists to include only valid roles
DO $$
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_role_check' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;
  
  -- Add updated constraint with valid roles
  ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'salesperson', 'user'));
END $$;