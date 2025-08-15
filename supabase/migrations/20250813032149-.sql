-- Check what constraint exists on reference_type and fix it to allow 'cancellation'
SELECT conname, pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conrelid = 'stock_movements'::regclass 
AND conname LIKE '%reference_type%';