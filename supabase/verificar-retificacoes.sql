-- =============================================================================
-- VERIFICAÇÃO E CRIAÇÃO DA TABELA DE RETIFICAÇÕES
-- Execute este script no Supabase se estiver recebendo erro 500 na folha ponto
-- =============================================================================

-- Criar tabela de retificações se não existir
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
CREATE INDEX IF NOT EXISTS idx_adjustments_user_date ON time_entry_adjustments(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_adjustments_status ON time_entry_adjustments(status);

-- Habilitar Row Level Security
ALTER TABLE time_entry_adjustments ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso
CREATE POLICY "Allow full access to service role" ON time_entry_adjustments 
  FOR ALL USING (true) WITH CHECK (true);

-- Verificação
SELECT 
  'Tabela time_entry_adjustments' as tabela,
  COUNT(*) as total_registros
FROM time_entry_adjustments;
