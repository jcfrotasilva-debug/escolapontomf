# 📋 Guia de Configuração do Banco de Dados Supabase

## 🎯 Passo a Passo

### **PASSO 1: Criar as Tabelas**

1. Acesse seu projeto no Supabase: https://supabase.com
2. No menu lateral, clique em **SQL Editor**
3. Clique em **"+ New query"**
4. Copie **TODO** o conteúdo do arquivo `supabase/schema-completo.sql`
5. Cole na tela do SQL Editor
6. Clique em **"Run"** (botão verde no canto inferior direito)
7. Aguarde aparecer: **"Success. No rows returned"**

---

### **PASSO 2: Criar os Usuários Iniciais**

1. Ainda no SQL Editor, clique em **"+ New query"** novamente
2. Copie **TODO** o conteúdo do arquivo `supabase/seed-completo.sql`
3. Cole na tela do SQL Editor
4. Clique em **"Run"**
5. Aguarde aparecer: **"Success. No rows returned"**

---

### **PASSO 3: Verificar se Tudo Foi Criado**

No SQL Editor, execute esta query:

```sql
SELECT 
  table_name,
  COUNT(*) as registros
FROM (
  SELECT 'users' as table_name FROM users
  UNION ALL SELECT 'time_entries' FROM time_entries
  UNION ALL SELECT 'justifications' FROM justifications
  UNION ALL SELECT 'work_schedules' FROM work_schedules
  UNION ALL SELECT 'settings' FROM settings
  UNION ALL SELECT 'day_occurrences' FROM day_occurrences
  UNION ALL SELECT 'server_absences' FROM server_absences
  UNION ALL SELECT 'time_entry_adjustments' FROM time_entry_adjustments
) tables
GROUP BY table_name;
```

**Resultado esperado:**
- users: 6 registros (1 RH + 5 servidores)
- settings: 2 registros
- As outras tabelas: 0 registros (vazias, prontas para uso)

---

## 🔑 Credenciais de Acesso

### **Administrador RH:**
- **Email:** `rh@eemarlenefrattini.edu.br`
- **Senha:** `admin123`

### **Servidores (senha padrão: 123456):**
- `maria.silva@escola.sp.gov.br` - Professora de Português
- `joao.pereira@escola.sp.gov.br` - Professor de Matemática
- `ana.santos@escola.sp.gov.br` - Professora de História
- `pedro.oliveira@escola.sp.gov.br` - Servente
- `claudia.souza@escola.sp.gov.br` - Diretora

---

## ⚙️ Configurar Variáveis de Ambiente na Vercel

1. Acesse o Dashboard da Vercel: https://vercel.com
2. Clique no seu projeto
3. Vá em **Settings → Environment Variables**
4. Adicione estas variáveis:

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | `postgresql://postgres:[SENHA]@db.[PROJETO].supabase.co:5432/postgres` |
| `JWT_SECRET` | Uma string longa e aleatória (ex: `abc123def456ghi789...`) |

**Onde encontrar o DATABASE_URL:**
1. No Supabase, vá em **Settings → Database**
2. Role até **"Connection string"**
3. Selecione o formato **"Node.js"** ou **"Other"**
4. Copie a string completa
5. Substitua `[YOUR-PASSWORD]` pela senha do banco que você criou

**Como gerar JWT_SECRET:**
```bash
# No terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OU acesse:
https://www.random.org/strings/
```

5. Clique em **"Save"**

---

## 🚀 Fazer Novo Deploy

Depois de adicionar as variáveis de ambiente:

```bash
# No seu projeto:
git commit --allow-empty -m "Atualizar variáveis de ambiente"
git push
```

A Vercel vai fazer o deploy automaticamente!

---

## ✅ Teste Rápido

1. Acesse o link da Vercel
2. Faça login com: `rh@eemarlenefrattini.edu.br` / `admin123`
3. ✅ Você deve entrar no painel do RH!

---

## 🆘 Problemas Comuns

### **Erro: "relation already exists"**
- **Causa:** Tabelas já existem
- **Solução:** Ignore, as tabelas já foram criadas anteriormente

### **Erro: "permission denied"**
- **Causa:** Usuário sem permissão
- **Solução:** Use o usuário `postgres` (service_role)

### **Erro: "Database URL is required"**
- **Causa:** Variável `DATABASE_URL` não configurada na Vercel
- **Solução:** Adicione a variável em Settings → Environment Variables

### **Erro de login**
- **Causa:** Usuário não foi criado
- **Solução:** Execute o `seed-completo.sql` novamente

---

## 📊 Resumo dos Arquivos

| Arquivo | Função | Quando Executar |
|---------|--------|-----------------|
| `schema-completo.sql` | Cria todas as tabelas | **PRIMEIRO** (banco novo) |
| `seed-completo.sql` | Cria usuários iniciais | **DEPOIS** do schema |
| `GUIA-BANCO-NOVO.md` | Este guia | Sempre que precisar |

---

**Banco de dados pronto para uso! 🎉**
