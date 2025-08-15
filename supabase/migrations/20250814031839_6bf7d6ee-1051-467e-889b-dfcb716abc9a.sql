-- Criar função para gerar número de orçamento único
CREATE OR REPLACE FUNCTION generate_unique_quote_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER := 1;
    base_number TEXT;
BEGIN
    -- Gerar número base baseado na data atual
    base_number := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Loop até encontrar um número único
    LOOP
        new_number := base_number || LPAD(counter::TEXT, 4, '0');
        
        -- Verificar se o número já existe
        IF NOT EXISTS (SELECT 1 FROM quotes WHERE quote_number = new_number) THEN
            RETURN new_number;
        END IF;
        
        counter := counter + 1;
        
        -- Prevenção de loop infinito (máximo 9999 orçamentos por dia)
        IF counter > 9999 THEN
            RAISE EXCEPTION 'Limite de orçamentos diários excedido';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;