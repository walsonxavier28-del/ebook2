# eBookly — Marketplace de Infoprodutos (Moçambique)

## Como executar localmente

1. `cp .env.example .env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
   (Project Settings → API no painel do Supabase).
2. `npm install`
3. `npm run dev`

## Configurar o Supabase

1. Crie um projeto em supabase.com.
2. Abra o **SQL Editor** e execute todo o conteúdo de `supabase_schema.sql`.
3. Faça deploy da Edge Function de e-mail:
   ```
   supabase functions deploy send-email
   supabase secrets set RESEND_API_KEY=coloque_sua_chave_da_resend_aqui
   supabase secrets set EMAIL_FROM="eBookly <onboarding@resend.dev>"
   ```
   > A chave da Resend nunca fica no frontend — só existe dentro da Edge Function,
   > do lado do servidor. Isto é essencial: uma chave secreta usada diretamente
   > no navegador fica visível a qualquer pessoa que abra as ferramentas de
   > programador do browser.
4. Confirme que o bucket `product-assets` foi criado (o script SQL já faz isto).

## Contas de administrador

Os e-mails `walsonxavier28@gmail.com` e `kristendossantos17@gmail.com` recebem
automaticamente `is_super_admin = true` ao registarem-se (trigger `on_auth_user_created`),
e têm acesso total às abas de administração dentro de `/painel`.

## Fluxo de pagamento

1. O comprador acede a `/checkout/:slug`, preenche os dados e o código de
   transação/comprovativo do M-Pesa ou e-Mola.
2. O registo cai na tabela `transactions` com `status = 'pending'`.
3. Um admin aprova em `/painel` → aba "Validar Depósitos".
4. Ao aprovar, o e-mail com o link de download do PDF é disparado via Resend.

## Estrutura

```
src/
  lib/supabase.ts        cliente Supabase + tipos
  lib/emailService.ts     chama a Edge Function de e-mail
  components/             AnimatedLogo, Navbar, Sidebar
  pages/                  Auth, ProducerDashboard, AdminDashboard, Checkout
supabase/functions/send-email/index.ts   Edge Function (Resend)
supabase_schema.sql       schema completo + RLS + triggers
```
