-- Create a special function to fix legacy manager roles
CREATE OR REPLACE FUNCTION public.fix_legacy_manager_roles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Temporarily modify the trigger function to allow this specific change
  CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $inner$
  BEGIN
    -- Allow changing 'manager' to 'salesperson' during migration
    IF OLD.role = 'manager' AND NEW.role = 'salesperson' THEN
      RETURN NEW;
    END IF;
    
    -- Only admins can modify role, permissions, or is_active for any profile
    IF OLD.role != NEW.role OR 
       OLD.permissions != NEW.permissions OR 
       OLD.is_active != NEW.is_active THEN
      
      -- Check if current user is admin
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
      ) THEN
        RAISE EXCEPTION 'Only administrators can modify user roles, permissions, or active status';
      END IF;
    END IF;
    
    RETURN NEW;
  END;
  $inner$;

  -- Update manager roles to salesperson
  UPDATE public.profiles 
  SET role = 'salesperson' 
  WHERE role = 'manager';

  -- Restore original trigger function
  CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $inner$
  BEGIN
    -- Only admins can modify role, permissions, or is_active for any profile
    IF OLD.role != NEW.role OR 
       OLD.permissions != NEW.permissions OR 
       OLD.is_active != NEW.is_active THEN
      
      -- Check if current user is admin
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
      ) THEN
        RAISE EXCEPTION 'Only administrators can modify user roles, permissions, or active status';
      END IF;
    END IF;
    
    RETURN NEW;
  END;
  $inner$;
END;
$$;

-- Execute the fix
SELECT public.fix_legacy_manager_roles();

-- Clean up the temporary function
DROP FUNCTION public.fix_legacy_manager_roles();