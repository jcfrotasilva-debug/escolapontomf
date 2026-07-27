# 🔧 Guia de Diagnóstico - Erros 403 e 500

## 📋 Diagnóstico Completo

### **Erro 403** (Forbidden) em `/api/adjustments`
**Causa provável:**
- Usuário não está autenticado, OU
- Usuário não tem role `hr`, OU
- Problema com cookies/sessão

### **Erro 500** (Internal Server Error) em `/api/adjustments/1`
**Causa provável:**
- Tabela `timeEntryAdjustments` não existe no banco de dados, OU
- Coluna faltando na tabela, OU
- Problema com tipos de dados, OU
- Erro na lógica de atualização

---

## 🔍 Passos para Diagnóstico

### **PASSO 1: Verificar Autenticação**

1. Acesse o sistema e faça login como RH
2. Abra o Console do navegador (F12)
3. Vá na aba "Application" ou "Storage"
4. Verifique se o cookie `auth_token` existe
5. Se não existir, há problema com autenticação

### **PASSO 2: Testar API Diretamente**

No terminal, execute:

```bash
# 1. Login como RH
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rh@eemarlenefrattini.edu.br","password":"admin123"}' \
  -c /tmp/cookies.txt

# 2. Listar retificações (deve funcionar)
curl http://localhost:3000/api/adjustments -b /tmp/cookies.txt

# 3. Tentar aprovar retificação ID 1 (pode dar erro 500)
curl -X PATCH http://localhost:3000/api/adjustments/1 \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
  -d '{"status":"approved"}'
```

### **PASSO 3: Verificar Tabela no Supabase**

No Supabase → SQL Editor, execute:

```sql
-- Verificar se a tabela existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'time_entry_adjustments';

-- Ver estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'time_entry_adjustments'
ORDER BY ordinal_position;

-- Ver dados da tabela
SELECT * FROM time_entry_adjustments LIMIT 5;
```

---

## 🛠️ Soluções Possíveis

### **Solução 1: Recriar Tabela**

Se a tabela não existe ou está corrompida:

```sql
-- Remover tabela se existir
DROP TABLE IF EXISTS time_entry_adjustments;

-- Criar tabela novamente
CREATE TABLE time_entry_adjustments (
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

-- Criar índices
CREATE INDEX idx_adjustments_user_date 
  ON time_entry_adjustments(user_id, entry_date);

CREATE INDEX idx_adjustments_status 
  ON time_entry_adjustments(status);

-- Habilitar RLS
ALTER TABLE time_entry_adjustments ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Allow full access to service role" 
  ON time_entry_adjustments 
  FOR ALL USING (true) WITH CHECK (true);
```

### **Solução 2: Verificar Permissões**

```sql
-- Ver permissões da tabela
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'time_entry_adjustments';

-- Conceder permissões se necessário
GRANT ALL PRIVILEGES ON time_entry_adjustments TO postgres;
GRANT ALL PRIVILEGES ON time_entry_adjustments TO authenticated;
GRANT ALL PRIVILEGES ON time_entry_adjustments TO anon;
```

### **Solução 3: Verificar Logs da Vercel**

1. Acesse o Dashboard da Vercel
2. Vá em **Deployments**
3. Clique no deploy mais recente
4. Clique em **"View Function Logs"**
5. Procure por mensagens de erro detalhadas

---

## 📊 Checklist de Verificação

- [ ] Tabela `time_entry_adjustments` existe
- [ ] Tabela tem todas as colunas necessárias
- [ ] Índices foram criados
- [ ] RLS está habilitado
- [ ] Política de acesso foi criada
- [ ] Usuário está autenticado
- [ ] Usuário tem role `hr`
- [ ] Cookie `auth_token` existe
- [ ] Logs mostram mensagens detalhadas

---

## 🆘 Se Nada Funcionar

1. **Recriar a tabela** (Solução 1)
2. **Reiniciar o servidor** (build_and_start)
3. **Fazer novo deploy** na Vercel
4. **Verificar logs detalhados** no Console do navegador
5. **Enviar logs completos** para análise

---

## 📝 Informações Úteis para Debug

Se precisar enviar logs, inclua:

1. **Mensagem de erro completa** do console
2. **Status da requisição** (403, 500, etc)
3. **Response body** (detalhes do erro)
4. **Resultado do SQL** de verificação da tabela
5. **Versão do deploy** na Vercel

---

**Execute os comandos de diagnóstico e me envie os resultados!** 🔍
