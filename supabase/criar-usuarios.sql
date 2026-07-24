-- =============================================================================
-- SQL PARA CRIAR USUÁRIOS INICIAIS NO SUPABASE
-- Sistema de Ponto - EE Profa. Marlene Frattini
-- =============================================================================
-- 
-- INSTRUÇÕES:
-- 1. Acesse seu projeto no Supabase
-- 2. Vá em SQL Editor
-- 3. Cole este código e execute
-- 4. Os usuários serão criados automaticamente
--
-- CREDENCIAIS:
-- - RH: rh@eemarlenefrattini.edu.br / admin123
-- - Servidores: senha 123456 (veja emails abaixo)
--
-- =============================================================================

-- Criar Administrador de RH
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

-- Criar Servidores (senha padrão: 123456)
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
-- VERIFICAÇÃO: Execute esta query para confirmar que os usuários foram criados
-- =============================================================================

SELECT 
  id,
  name,
  email,
  role,
  position,
  registration,
  active,
  created_at
FROM users
ORDER BY role DESC, name;

-- =============================================================================
-- RESULTADO ESPERADO:
-- =============================================================================
-- 
-- id | name                    | email                                | role   | position                  | registration | active | created_at
-- ---|-------------------------|--------------------------------------|--------|---------------------------|--------------|--------|------------
-- 1  | Administrador RH        | rh@eemarlenefrattini.edu.br         | hr     | Gestor(a) de RH          | RH-001       | true   | ...
-- 2  | Maria Aparecida Silva   | maria.silva@escola.sp.gov.br        | server | Professora de Português  | 2024-001     | true   | ...
-- 3  | João Carlos Pereira     | joao.pereira@escola.sp.gov.br       | server | Professor de Matemática  | 2024-002     | true   | ...
-- 4  | Ana Beatriz Santos      | ana.santos@escola.sp.gov.br         | server | Professora de História   | 2024-003     | true   | ...
-- 5  | Pedro Henrique Oliveira | pedro.oliveira@escola.sp.gov.br     | server | Servente                  | 2024-004     | true   | ...
-- 6  | Cláudia Regina Souza    | claudia.souza@escola.sp.gov.br      | server | Diretora                  | 2024-005     | true   | ...
--
-- =============================================================================
