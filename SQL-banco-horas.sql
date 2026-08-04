-- =============================================================================
-- Script SQL para criar tabelas de Banco de Horas
-- Execute este script no Supabase SQL Editor
-- =============================================================================

-- Tabela de Banco de Horas - Registra o saldo diário e acumulado
CREATE TABLE IF NOT EXISTS bank_of_hours (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  scheduled_hours DECIMAL(5,2) NOT NULL,
  worked_hours DECIMAL(5,2) NOT NULL,
  balance DECIMAL(5,2) NOT NULL,
  accumulated_balance DECIMAL(10,2) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debt', 'neutral')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Conversões - Registra conversões de horas em dias de folga
CREATE TABLE IF NOT EXISTS bank_of_hours_conversions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversion_date DATE NOT NULL,
  hours_converted DECIMAL(5,2) NOT NULL,
  days_earned DECIMAL(5,2) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('used', 'expired')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_bank_of_hours_user_date ON bank_of_hours(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_bank_of_hours_type ON bank_of_hours(type);
CREATE INDEX IF NOT EXISTS idx_bank_of_hours_conversions_user ON bank_of_hours_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_of_hours_conversions_date ON bank_of_hours_conversions(conversion_date);

-- Verificar se as tabelas foram criadas
SELECT 'Tabelas criadas com sucesso!' as status;
