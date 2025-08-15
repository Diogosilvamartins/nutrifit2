-- Remove the old constraint and add a new one that includes 'cancellation'
ALTER TABLE stock_movements DROP CONSTRAINT stock_movements_reference_type_check;

-- Add new constraint that allows 'cancellation' as a valid reference_type
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_reference_type_check 
CHECK (reference_type = ANY (ARRAY['compra'::text, 'venda'::text, 'ajuste'::text, 'cancellation'::text]));