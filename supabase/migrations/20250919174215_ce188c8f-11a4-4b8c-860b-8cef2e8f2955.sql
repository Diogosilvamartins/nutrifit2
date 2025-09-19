-- Corrigir todas as duplicações de lançamentos contábeis

-- 1. Primeiro, identificar e cancelar lançamentos duplicados
-- Para cada referência com múltiplos lançamentos ativos, manter apenas o mais recente

WITH duplicated_entries AS (
  SELECT 
    ae.reference_id,
    ae.id,
    ae.entry_number,
    ae.created_at,
    ROW_NUMBER() OVER (PARTITION BY ae.reference_id ORDER BY ae.created_at DESC) as rn
  FROM accounting_entries ae
  WHERE ae.reference_type = 'venda'
    AND ae.entry_type = 'automatic'
    AND ae.status = 'posted'
    AND ae.reference_id IN (
      SELECT reference_id
      FROM accounting_entries
      WHERE reference_type = 'venda'
        AND entry_type = 'automatic'
        AND status = 'posted'
      GROUP BY reference_id
      HAVING COUNT(*) > 1
    )
)
UPDATE accounting_entries 
SET status = 'canceled'
WHERE id IN (
  SELECT id 
  FROM duplicated_entries 
  WHERE rn > 1
);

-- 2. Verificar e corrigir lançamentos com valores incorretos
-- Atualizar lançamentos onde o valor não confere com a venda atual

UPDATE accounting_entries ae
SET total_amount = q.total_amount,
    description = 'Venda Automática - ' || q.quote_number || ' - ' || q.customer_name || ' (Valor Corrigido)'
FROM quotes q
WHERE ae.reference_id = q.id
  AND ae.reference_type = 'venda'
  AND ae.entry_type = 'automatic'
  AND ae.status = 'posted'
  AND ae.total_amount != q.total_amount
  AND q.quote_type = 'sale'
  AND q.status = 'completed';

-- 3. Atualizar os itens de lançamento para refletir os valores corretos
UPDATE accounting_entry_items aei
SET debit_amount = ae.total_amount,
    credit_amount = ae.total_amount
FROM accounting_entries ae
WHERE aei.entry_id = ae.id
  AND ae.reference_type = 'venda'
  AND ae.entry_type = 'automatic'
  AND ae.status = 'posted'
  AND ae.description LIKE '%Valor Corrigido%';

-- 4. Log da correção usando operation válida
INSERT INTO public.audit_logs (
  user_id, table_name, operation, record_id, new_values
) VALUES (
  (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1),
  'accounting_entries',
  'UPDATE',
  NULL,
  jsonb_build_object(
    'action', 'Correção automática de duplicações e valores incorretos',
    'timestamp', NOW(),
    'corrections_made', 'Cancelados lançamentos duplicados e corrigidos valores divergentes'
  )
);