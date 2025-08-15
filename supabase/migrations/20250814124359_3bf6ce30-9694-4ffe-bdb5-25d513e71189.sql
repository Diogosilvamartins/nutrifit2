-- Criar função para atualizar dados do cliente em orçamentos existentes
CREATE OR REPLACE FUNCTION update_quotes_customer_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar orçamentos que referenciam este cliente
  UPDATE quotes 
  SET 
    customer_name = NEW.name,
    customer_phone = NEW.phone,
    customer_email = NEW.email,
    customer_cpf = NEW.cpf,
    updated_at = now()
  WHERE customer_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para executar a função quando um cliente for atualizado
DROP TRIGGER IF EXISTS sync_customer_data_in_quotes ON customers;
CREATE TRIGGER sync_customer_data_in_quotes
  AFTER UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_quotes_customer_data();