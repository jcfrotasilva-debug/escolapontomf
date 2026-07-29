# 🔧 Guia Completo para Resolver Erro 500 em /api/adjustments

## ✅ Diagnóstico

O erro 500 persiste apesar dos logs detalhados. Isso indica que:
1. ✅ O tratamento de erros está funcionando
2. ❌ Mas há um erro no backend que não está sendo capturado corretamente
3. ❌ Provavelmente a tabela `time_entry_adjustments` **NÃO EXISTE** no Supabase

---

## 🎯 Solução Definitiva

### **PASSO 1: Verificar Todas as Tabelas no Supabase**

1. Acesse o **SQL Editor** do Supabase
2. Execute este script para verificar todas as tabelas:

```sql
-- Listar todas as tabelas do sistema
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Tabelas que DEVEM existir:**
- ✅ `users`
- ✅ `time_entries`
- ✅ `justifications`
- ✅ `work_schedules`
- ✅ `settings`
- ✅ `day_occurrences`
- ✅ `server_absences`
- ✅ `time_entry_adjustments` ← **VERIFICAR ESTA!**

### **PASSO 2: Criar Tabela time_entry_adjustments (Se Não Existir)**

Se a tabela `time_entry_adjustments` não aparecer na lista, execute:

```sql
-- Criar tabela de retificações
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

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_adjustments_user_date 
  ON time_entry_adjustments(user_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_adjustments_status 
  ON time_entry_adjustments(status);

CREATE INDEX IF NOT EXISTS idx_adjustments_time_entry 
  ON time_entry_adjustments(time_entry_id);

-- Desabilitar RLS
ALTER TABLE time_entry_adjustments DISABLE ROW LEVEL SECURITY;

-- Verificar se foi criada
SELECT COUNT(*) as total FROM time_entry_adjustments;
```

### **PASSO 3: Verificar Estrutura da Tabela**

Após criar a tabela, verifique a estrutura:

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'time_entry_adjustments'
ORDER BY ordinal_position;
```

**Colunas que devem existir:**
- ✅ `id` (integer, not null)
- ✅ `time_entry_id` (integer, nullable)
- ✅ `entry_date` (date, not null)
- ✅ `user_id` (integer, not null)
- ✅ `field_altered` (varchar(20), not null)
- ✅ `old_value` (text, nullable)
- ✅ `new_value` (text, nullable)
- ✅ `reason` (text, not null)
- ✅ `adjustment_type` (varchar(20), not null)
- ✅ `requested_by_id` (integer, nullable)
- ✅ `approved_by_id` (integer, nullable)
- ✅ `status` (varchar(20), not null)
- ✅ `adjustment_date` (timestamptz, nullable)
- ✅ `created_at` (timestamptz, nullable)

### **PASSO 4: Testar Inserção Manual**

Teste se consegue inserir dados manualmente:

```sql
-- Testar inserção
INSERT INTO time_entry_adjustments (
  entry_date,
  user_id,
  field_altered,
  reason,
  adjustment_type,
  status
) VALUES (
  '2026-07-24',
  14,  -- Substitua pelo ID de um servidor existente
  'checkIn',
  'Teste de inserção manual',
  'hr_direct',
  'approved'
) RETURNING *;
```

Se funcionar, a tabela está correta!

### **PASSO 5: Verificar Chaves Estrangeiras**

Se houver erro de chave estrangeira, execute:

```sql
-- Verificar usuários existentes
SELECT id, name, role FROM users LIMIT 5;

-- Verificar registros de ponto existentes
SELECT id, user_id, entry_date FROM time_entries LIMIT 5;
```

---

## 🔍 Logs do Backend na Vercel

### **Como Ver os Logs Completos**

1. Acesse o **Dashboard da Vercel**
2. Vá em **Deployments**
3. Clique no deploy mais recente
4. Clique em **"View Function Logs"**
5. Procure por mensagens com:
   - `[ADJUSTMENTS POST]` - Logs da operação
   - `[ADJUSTMENTS POST ERROR]` - Logs de erro
   - `[ADJUSTMENTS POST ERROR - INSERT]` - Erro específico de inserção

### **Mensagens de Erro Comuns**

| Erro | Causa | Solução |
|------|-------|---------|
| `relation "time_entry_adjustments" does not exist` | Tabela não existe | Executar script de criação |
| `duplicate key value violates unique constraint` | Dados duplicados | Verificar constraints |
| `violates foreign key constraint` | ID inválido | Verificar IDs de usuários |
| `null value in column "entry_date" violates not-null constraint` | Dados faltando | Verificar dados enviados |

---

## 📋 Checklist Final

- [ ] Tabela `time_entry_adjustments` existe
- [ ] Estrutura da tabela está correta (14 colunas)
- [ ] Índices foram criados
- [ ] RLS está desabilitado
- [ ] Inserção manual funciona
- [ ] Chaves estrangeiras estão corretas
- [ ] Logs do backend foram verificados
- [ ] Mensagem de erro específica foi identificada

---

## 🆘 Se o Erro Persistir

### **Colete Estas Informações:**

1. **Resultado do Passo 1** (lista de tabelas)
2. **Resultado do Passo 3** (estrutura da tabela)
3. **Resultado do Passo 4** (teste de inserção)
4. **Logs completos do backend** na Vercel
5. **Mensagem de erro específica** dos logs

**Envie todas essas informações** para que eu possa identificar o problema exato!

---

## 🔗 Links Úteis

- **Supabase SQL Editor**: https://supabase.com/dashboard/project/[seu-projeto]/sql
- **Vercel Function Logs**: https://vercel.com/dashboard/[seu-projeto]/logs
- **Supabase Table Editor**: https://supabase.com/dashboard/project/[seu-projeto]/editor

---

**Com este guia, você pode resolver o erro 500 definitivamente!** 🚀
