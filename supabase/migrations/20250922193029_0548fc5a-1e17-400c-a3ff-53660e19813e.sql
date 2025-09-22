-- Fix duplicate accounting entries when editing stock movements
-- The issue is that the trigger creates entries on both INSERT and UPDATE

CREATE OR REPLACE FUNCTION public.create_automatic_purchase_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  entry_id UUID;
  supplier_account_id UUID;
  inventory_account_id UUID;
  entry_number TEXT;
  existing_entry_id UUID;
BEGIN
  -- Para movimentos de entrada de estoque com fornecedor
  IF NEW.movement_type = 'entrada' AND NEW.supplier_id IS NOT NULL THEN
    
    -- Se for UPDATE, verificar se já existe lançamento ativo
    IF TG_OP = 'UPDATE' THEN
      SELECT id INTO existing_entry_id
      FROM public.accounting_entries 
      WHERE reference_type = 'compra' 
        AND reference_id = NEW.id 
        AND entry_type = 'automatic'
        AND status = 'posted';
      
      -- Se já existe lançamento ativo e algum valor mudou, cancelar o anterior
      IF existing_entry_id IS NOT NULL AND (
        OLD.unit_cost != NEW.unit_cost OR 
        OLD.quantity != NEW.quantity OR
        OLD.supplier_id != NEW.supplier_id
      ) THEN
        UPDATE public.accounting_entries 
        SET status = 'canceled'
        WHERE id = existing_entry_id;
      ELSIF existing_entry_id IS NOT NULL THEN
        -- Se já existe e nada mudou, não fazer nada
        RETURN NEW;
      END IF;
    END IF;
    
    -- Buscar contas necessárias
    SELECT id INTO supplier_account_id 
    FROM public.chart_of_accounts 
    WHERE code = '2.1.01' AND is_active = true; -- Fornecedores
    
    SELECT id INTO inventory_account_id 
    FROM public.chart_of_accounts 
    WHERE code = '1.2.01' AND is_active = true; -- Estoque
    
    -- Se encontrar as contas, criar lançamento
    IF supplier_account_id IS NOT NULL AND inventory_account_id IS NOT NULL THEN
      
      entry_number := public.generate_entry_number();
      
      -- Criar lançamento contábil
      INSERT INTO public.accounting_entries (
        entry_number,
        entry_date,
        description,
        total_amount,
        status,
        entry_type,
        reference_type,
        reference_id,
        created_by
      ) VALUES (
        entry_number,
        DATE(NEW.created_at),
        'Compra Automática - ' || COALESCE(NEW.supplier_name, 'Fornecedor') || ' - Lote: ' || COALESCE(NEW.batch_number, 'S/N'),
        COALESCE(NEW.unit_cost * NEW.quantity, 0),
        'posted',
        'automatic',
        'compra',
        NEW.id,
        NEW.user_id
      ) RETURNING id INTO entry_id;
      
      -- Débito em Estoque
      INSERT INTO public.accounting_entry_items (
        entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description
      ) VALUES (
        entry_id,
        inventory_account_id,
        COALESCE(NEW.unit_cost * NEW.quantity, 0),
        0,
        'Entrada de estoque - ' || NEW.quantity::TEXT || ' unidades'
      );
      
      -- Crédito em Fornecedores
      INSERT INTO public.accounting_entry_items (
        entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description
      ) VALUES (
        entry_id,
        supplier_account_id,
        0,
        COALESCE(NEW.unit_cost * NEW.quantity, 0),
        'Compra de ' || COALESCE(NEW.supplier_name, 'fornecedor')
      );
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;