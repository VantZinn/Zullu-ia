ZULU V4 — LOGIN + MEMÓRIA POR CONTA + CONFIGURAÇÕES

Este pacote substitui a V3 no Render/GitHub.

ARQUIVOS PARA SUBSTITUIR NA RAIZ DO REPOSITÓRIO:
- server.js
- package.json
- index.html
- style.css
- app.js
- zulu-avatar.png

NOVO ARQUIVO SQL:
- ZULU_V4_1_ONBOARDING_PATCH.sql
  Execute uma vez no Supabase > SQL Editor > New query > Run.

VARIÁVEIS NOVAS NO RENDER:
1) SUPABASE_URL
   Use a Project URL do Supabase.

2) SUPABASE_ANON_KEY
   Use a chave pública/publishable/anon do projeto Supabase.
   Essa chave é própria para clientes, mas não coloque service_role no app.

MANTER NO RENDER:
- GEMINI_API_KEY
- GEMINI_MODEL
- NODE_VERSION=22.22.0

IMPORTANTE:
- NÃO use SUPABASE_SERVICE_ROLE_KEY neste frontend.
- A segurança dos dados é reforçada pelas políticas RLS já criadas no banco.
- Cada requisição do backend usa o token do usuário e o Supabase aplica RLS.
- Memórias, chats, mensagens, tema e nome ficam ligados à conta Supabase.
- Ao trocar de celular e entrar na mesma conta, os dados voltam.

RECURSOS DA V4:
- criar conta por e-mail + senha
- confirmação por código OTP
- login
- recuperação de senha por código
- alteração de senha com verificação por e-mail
- botões de Google e Facebook (funcionam depois de ativar/configurar os providers no Supabase)
- nome preferido obrigatório no primeiro uso
- memória global por conta
- histórico de chats por conta
- tema claro/escuro sincronizado na conta
- alterar como a Zulu chama o usuário
- logout
- menu lateral
- Zulu amigável e alegre

TESTE DEPOIS DO DEPLOY:
https://zulu-ia.onrender.com/api/health

Deve conter:
"version":"4.0"
"auth":"Supabase"
