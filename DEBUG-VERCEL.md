# 🔧 Debug do Erro 500 na Vercel

## ✅ Ações Realizadas

### 1. Adicionado Logging Detalhado
- ✅ Logs em todas as funções da API de justificativas (GET, POST, PATCH)
- ✅ Logs de erros com stack trace completo
- ✅ Logs de parâmetros e dados recebidos
- ✅ Logs de sucesso com IDs e status

### 2. Melhorado Tratamento de Erros
- ✅ Mensagens de erro mais específicas
- ✅ Detalhes do erro em ambiente de desenvolvimento
- ✅ Helper function `logError()` para padronização

### 3. Scripts SQL Criados
- ✅ `supabase/desabilitar-rls.sql` - Desabilita RLS em todas as tabelas
- ✅ `supabase/desabilitar-rls.sql` já aplicado no sandbox

---

## 🎯 Próximos Passos na Vercel

### Passo 1: Verificar Variáveis de Ambiente

1. Acesse o Dashboard da Vercel
2. Vá em **Settings → Environment Variables**
3. Verifique se estas variáveis existem:
   - ✅ `DATABASE_URL` (URL do Supabase)
   - ✅ `JWT_SECRET` (chave secreta para JWT)

4. Se estiverem faltando, adicione:
   ```
   DATABASE_URL=postgresql://postgres:[SENHA]@db.[PROJETO].supabase.co:5432/postgres
   JWT_SECRET=[chave-secreta-longa-e-aleatoria]
   ```

5. **IMPORTANTE**: Após adicionar variáveis, faça um novo deploy

### Passo 2: Verificar Logs na Vercel

1. Acesse o Dashboard da Vercel
2. Vá em **Deployments**
3. Clique no deploy mais recente
4. Clique em **"View Function Logs"** ou **"Logs"**
5. Procure por erros com `[JUSTIFICATIONS API ERROR]`

### Passo 3: Testar Novamente

1. Acesse o sistema na Vercel
2. Tente solicitar uma justificativa como servidor
3. Tente analisar uma justificativa como RH
4. Verifique os logs na Vercel

---

## 🔍 Possíveis Causas do Erro 500

### Causa 1: Variáveis de Ambiente Faltando
**Sintomas:**
- Erro ao conectar com o banco de dados
- Erro ao gerar/validar JWT

**Solução:**
- Verificar se `DATABASE_URL` e `JWT_SECRET` estão configuradas
- Fazer novo deploy após adicionar as variáveis

### Causa 2: RLS (Row Level Security) Habilitado
**Sintomas:**
- Erro de permissão ao acessar tabelas
- Queries falham mesmo com credenciais corretas

**Solução:**
- Executar `supabase/desabilitar-rls.sql` no Supabase
- Verificar se `rowsecurity = false` para todas as tabelas

### Causa 3: Problema com o Schema
**Sintomas:**
- Erro ao inserir/atualizar dados
- Colunas não encontradas

**Solução:**
- Verificar se o schema está sincronizado
- Executar `npx drizzle-kit push` no Supabase

### Causa 4: Problema de Timezone
**Sintomas:**
- Datas incorretas
- Erro ao formatar datas

**Solução:**
- Verificar se a função `getCurrentBrazilDate()` está funcionando
- Testar localmente antes de fazer deploy

### Causa 5: Problema com Drizzle ORM em Produção
**Sintomas:**
- Erros de tipo
- Queries não executam

**Solução:**
- Verificar se o Drizzle está configurado corretamente
- Verificar se há problemas com tipos TypeScript

---

## 📋 Checklist de Debug

- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Novo deploy realizado após adicionar variáveis
- [ ] RLS desabilitado em todas as tabelas do Supabase
- [ ] Schema sincronizado com `drizzle-kit push`
- [ ] Logs verificados na Vercel
- [ ] Sistema testado localmente antes do deploy
- [ ] Mensagens de erro específicas identificadas

---

## 🆘 Se o Erro Persistir

### 1. Coletar Informações
- Screenshot do erro no navegador
- Logs da Vercel (Function Logs)
- Mensagem de erro completa
- Stack trace completo

### 2. Verificar no Supabase
- Tabelas existem? (`\dt` no SQL Editor)
- RLS desabilitado? (verificar `rowsecurity`)
- Dados estão sendo inseridos? (verificar tabelas)

### 3. Testar Localmente
- Sistema funciona localmente?
- Mesma versão do código?
- Mesmas variáveis de ambiente?

### 4. Enviar Informações
Com todas essas informações, posso identificar e resolver o problema rapidamente!

---

## 🔗 Links Úteis

- **Vercel Logs**: https://vercel.com/dashboard/[seu-projeto]/logs
- **Supabase SQL Editor**: https://supabase.com/dashboard/project/[seu-projeto]/sql
- **Vercel Environment Variables**: https://vercel.com/dashboard/[seu-projeto]/settings/environment-variables

---

**Com logging detalhado e tratamento de erros robusto, agora é mais fácil identificar e resolver o erro 500 na Vercel!** 🚀
