-- =============================================================================
-- DADOS INICIAIS - Sistema de Ponto EE Profa. Marlene Frattini
-- Execute este script APÓS criar as tabelas (schema-completo.sql)
-- =============================================================================

-- =============================================================================
-- USUÁRIO ADMINISTRADOR DE RH
-- Email: rh@eemarlenefrattini.edu.br
-- Senha: admin123
-- =============================================================================

INSERT INTO users (name, email, password, role, position, registration, active)
VALUES (
  'Administrador RH',
  'rh@eemarlenefrattini.edu.br',
  '$2b$10$68RENwIOKBPf8w9GkHWWSOLOoYyXB/l3fp9p2TgygqorZ8f9PdW4O',
  'hr',
  'Gestor(a) de Recursos Humanos',
  'RH-001',
  true
) ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- SERVIDORES DE EXEMPLO
-- Senha padrão: 123456
-- =============================================================================

INSERT INTO users (name, email, password, role, position, registration, active) VALUES
  (
    'Maria Aparecida Silva',
    'maria.silva@escola.sp.gov.br',
    '$2b$10$eFrdsOVBa4OV7x/s/K1fwe53zjDNVeRqmm9UGp8XQ.Tmbv1vZbWOy',
    'server',
    'Professora de Português',
    '2024-001',
    true
  ),
  (
    'João Carlos Pereira',
    'joao.pereira@escola.sp.gov.br',
    '$2b$10$eFrdsOVBa4OV7x/s/K1fwe53zjDNVeRqmm9UGp8XQ.Tmbv1vZbWOy',
    'server',
    'Professor de Matemática',
    '2024-002',
    true
  ),
  (
    'Ana Beatriz Santos',
    'ana.santos@escola.sp.gov.br',
    '$2b$10$eFrdsOVBa4OV7x/s/K1fwe53zjDNVeRqmm9UGp8XQ.Tmbv1vZbWOy',
    'server',
    'Professora de História',
    '2024-003',
    true
  ),
  (
    'Pedro Henrique Oliveira',
    'pedro.oliveira@escola.sp.gov.br',
    '$2b$10$eFrdsOVBa4OV7x/s/K1fwe53zjDNVeRqmm9UGp8XQ.Tmbv1vZbWOy',
    'server',
    'Servente',
    '2024-004',
    true
  ),
  (
    'Cláudia Regina Souza',
    'claudia.souza@escola.sp.gov.br',
    '$2b$10$eFrdsOVBa4OV7x/s/K1fwe53zjDNVeRqmm9UGp8XQ.Tmbv1vZbWOy',
    'server',
    'Diretora',
    '2024-005',
    true
  )
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- CONFIGURAÇÕES INICIAIS
-- =============================================================================

INSERT INTO settings (key, value) VALUES
  ('school_name', 'EE Profa. Marlene Frattini'),
  ('brasaoUrl', NULL)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- VERIFICAÇÃO
-- =============================================================================

SELECT 
  'Usuários criados com sucesso!' as status,
  COUNT(*) as total_usuarios,
  SUM(CASE WHEN role = 'hr' THEN 1 ELSE 0 END) as total_rh,
  SUM(CASE WHEN role = 'server' THEN 1 ELSE 0 END) as total_servidores
FROM users;

-- =============================================================================
-- CREDENCIAIS DE ACESSO
-- =============================================================================
-- 
-- ADMINISTRADOR RH:
-- Email: rh@eemarlenefrattini.edu.br
-- Senha: admin123
-- 
-- SERVIDORES (senha: 123456):
-- - maria.silva@escola.sp.gov.br (Professora de Português)
-- - joao.pereira@escola.sp.gov.br (Professor de Matemática)
-- - ana.santos@escola.sp.gov.br (Professora de História)
-- - pedro.oliveira@escola.sp.gov.br (Servente)
-- - claudia.souza@escola.sp.gov.br (Diretora)
-- 
-- =============================================================================
