-- =============================================================================
-- SCHEMA COMPLETO - Sistema de Ponto EE Profa. Marlene Frattini
-- Execute este script no SQL Editor do Supabase
-- =============================================================================

-- 1. TABELA DE USUÁRIOS (Servidores e RH)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'server',
  position TEXT,
  registration VARCHAR(50),
  department TEXT,
  admission_date DATE,
  phone VARCHAR(20),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE REGISTROS DE PONTO
CREATE TABLE IF NOT EXISTS time_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  lunch_out TIMESTAMPTZ,
  lunch_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

-- 3. TABELA DE JUSTIFICATIVAS DE FALTA
CREATE TABLE IF NOT EXISTS justifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  justification_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, justification_date)
);

-- 4. TABELA DE HORÁRIOS DE TRABALHO POR DIA DA SEMANA
CREATE TABLE IF NOT EXISTS work_schedules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL,
  check_in_time TIME,
  lunch_out_time TIME,
  lunch_in_time TIME,
  check_out_time TIME,
  is_workday BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, weekday)
);

-- 5. TABELA DE CONFIGURAÇÕES DO SISTEMA
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE OCORRÊNCIAS DE DIAS (Feriados, Ponto Facultativo, etc)
CREATE TABLE IF NOT EXISTS day_occurrences (
  id SERIAL PRIMARY KEY,
  occurrence_date DATE NOT NULL UNIQUE,
  type VARCHAR(30) NOT NULL,
  name TEXT NOT NULL,
  scope VARCHAR(30) NOT NULL DEFAULT 'national',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELA DE AUSÊNCIAS/BLOQUEIOS DO SERVIDOR (Férias, Licenças, etc)
CREATE TABLE IF NOT EXISTS server_absences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  document_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA DE RETIFICAÇÕES DE REGISTROS DE PONTO (Auditoria)
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

-- =============================================================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_justifications_user_date ON justifications(user_id, justification_date);
CREATE INDEX IF NOT EXISTS idx_work_schedules_user ON work_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_day_occurrences_date ON day_occurrences(occurrence_date);
CREATE INDEX IF NOT EXISTS idx_server_absences_user ON server_absences(user_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_user_date ON time_entry_adjustments(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_adjustments_status ON time_entry_adjustments(status);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE justifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entry_adjustments ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (permitir acesso total via service_role)
CREATE POLICY "Allow full access to service role" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to service role" ON time_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to service role" ON justifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to service role" ON work_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to service role" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to service role" ON day_occurrences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to service role" ON server_absences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to service role" ON time_entry_adjustments FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- VERIFICAÇÃO
-- =============================================================================

SELECT 'Tabelas criadas com sucesso!' as status, 
       COUNT(*) as total_tabelas 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'time_entries', 'justifications', 'work_schedules', 
                   'settings', 'day_occurrences', 'server_absences', 'time_entry_adjustments');
