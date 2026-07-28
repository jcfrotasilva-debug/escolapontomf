-- =============================================================================
-- SCRIPT PARA VERIFICAR E CRIAR TABELA time_entry_adjustments
-- Execute este script no Supabase para garantir que a tabela existe
-- =============================================================================

-- Verificar se a tabela existe
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'time_entry_adjustments'
) as tabela_existe;

-- Se a tabela não existir, criar agora
CREATE TABLE IF NOT EXISTS time_entry_adjustments (
  id SERIAL PRIMARY KEY,
  time_entry_id INTEGER REFERENCES time_entries(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_altered VARCHAR(20) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  adjustment_type VARCHAR(20) NOT NULL,
  requested_by_id INTEGER REFERENCES users(id),
  approved_by_id INTEGER REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  adjustment_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_adjustments_user_date 
  ON time_entry_adjustments(user_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_adjustments_status 
  ON time_entry_adjustments(status);

CREATE INDEX IF NOT EXISTS idx_adjustments_time_entry 
  ON time_entry_adjustments(time_entry_id);

-- Desabilitar RLS
ALTER TABLE time_entry_adjustments DISABLE ROW LEVEL SECURITY;

-- Verificar estrutura da tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'time_entry_adjustments'
ORDER BY ordinal_position;

-- Verificar se há dados
SELECT COUNT(*) as total_registros FROM time_entry_adjustments;

-- Se houver registros, mostrar alguns exemplos
SELECT * FROM time_entry_adjustments ORDER BY created_at DESC LIMIT 5;
