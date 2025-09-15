-- Update Erick's role directly using a more direct approach
UPDATE public.profiles 
SET role = 'salesperson', updated_at = now()
WHERE full_name = 'Erick Martins' AND role = 'manager';