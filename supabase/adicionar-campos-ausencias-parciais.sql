-- =============================================================================
-- SQL PARA ADICIONAR CAMPOS DE AUSÊNCIAS PARCIAIS NA TABELA time_entries
-- Execute este script no Supabase
-- =============================================================================

-- Adicionar campos para registrar ausências parciais durante o expediente
ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS partial_absence BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS partial_absence_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS partial_absence_duration VARCHAR(10),
ADD COLUMN IF NOT EXISTS partial_absence_period VARCHAR(20),
ADD COLUMN IF NOT EXISTS partial_absence_description TEXT;

-- Verificar se os campos foram adicionados
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'time_entries'
AND column_name LIKE 'partial_absence%'
ORDER BY ordinal_position;

-- =============================================================================
-- RESULTADO ESPERADO:
-- =============================================================================
-- 
-- column_name                  | data_type              | is_nullable | column_default
-- -----------------------------|------------------------|-------------|----------------
-- partial_absence              | boolean                | YES         | false
-- partial_absence_type         | character varying(50)  | YES         |
-- partial_absence_duration     | character varying(10)  | YES         |
-- partial_absence_period       | character varying(20)  | YES         |
-- partial_absence_description  | text                   | YES         |
-- 
-- =============================================================================
