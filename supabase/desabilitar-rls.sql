-- =============================================================================
-- SCRIPT PARA DESABILITAR RLS EM TODAS AS TABELAS DO SISTEMA
-- Execute este script no Supabase para garantir que o sistema funcione
-- =============================================================================

-- Desabilitar RLS em todas as tabelas
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE justifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE day_occurrences DISABLE ROW LEVEL SECURITY;
ALTER TABLE server_absences DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entry_adjustments DISABLE ROW LEVEL SECURITY;

-- Verificar se o RLS está desabilitado
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Se alguma tabela ainda tiver rowsecurity = true, execute novamente
