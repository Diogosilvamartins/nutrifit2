-- Adjust cash balance for 12/08/2025 to R$ 0,00 for both cash and bank
SELECT public.adjust_cash_balance('2025-08-12'::DATE, 0.00, 0.00);