-- Temporarily disable the trigger to allow role migration
DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trigger ON public.profiles;

-- Update all 'manager' roles to 'salesperson' to align with new role structure
UPDATE public.profiles 
SET role = 'salesperson' 
WHERE role = 'manager';

-- Recreate the trigger
CREATE TRIGGER prevent_profile_privilege_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- Add role constraint to ensure only valid roles
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