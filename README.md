# Kelly 6.0.0

Atualização da Zulu 5.0.2, com os módulos do backend incorporados em um único `server.js`. Todos os arquivos distribuídos ficam na raiz.

## Recursos

- Modo Geral livre e modos Programação, Estudante, Escrita e Planejamento ativados por chave.
- Modos são funções e instruções especializadas sobre o modelo Gemini configurado. Não são modelos GPT nem serviços separados, e o Geral continua capaz de responder perguntas sobre vários assuntos.
- Estilo adaptável, objetivo, detalhado ou acolhedor; acompanha preferências e emoções expressas sem presumir pensamentos ou concordar com erros para agradar.
- Seis temas: Aurora, Grafite, Pérola, Oceano, Jardim e Pôr do sol. Espaçamento e animações ajustáveis. Preferências e modo de cada conversa salvos na conta.
- Identidade visual no menu de conversas; respostas sem avatar ou nome repetidos.
- Upload de imagens, PDF, DOCX, ZIP e texto/código. Streaming e efeito de digitação; copiar, baixar arquivos e ZIP de respostas.
- Login Supabase, histórico, memória e recuperação de conta existentes preservados.

## Instalação

Leia `KELLY_COMO_INSTALAR.md`. Execute `KELLY_INSTALAR.sql` no seu Supabase, crie seu emissor usando o **KELLY_GERADOR.html separado** e configure `KELLY_LICENSE_PUBLIC_KEY` com o valor público mostrado nele. Preserve as demais variáveis atuais.

Use Node.js 22 ou 24. Build: `npm ci`. Início: `node server.js`. A porta segue `PORT`, depois `SERVER_PORT`, depois `3000`. Em Render, a detecção de proxy usa a variável `RENDER`; `TRUST_PROXY` pode ser definida conforme a hospedagem.

Se a migração de personalização não estiver instalada, o login e o modo Geral continuam disponíveis. Ativações e salvamento das novas preferências precisam das duas tabelas novas. A instalação não requer chave `service_role`.

## Como as licenças funcionam

O gerador offline assina códigos `KLY1` com ECDSA P-256. O servidor recebe apenas uma chave pública JWK codificada em base64url. Ele verifica assinatura, conta vinculada, validade, modos permitidos e revogação em cada mensagem especializada. Alterar o front-end, o modo armazenado ou dados de preferências não dispensa essa verificação.

A tabela `kelly_preferences` guarda o comprovante assinado sob RLS por usuário. Esse conteúdo não é confiado como autorização sem verificar a assinatura. A chave beta pode ser compartilhada entre contas; a individual é vinculada ao UUID de uma conta. Ativar outra chave substitui a licença vigente; as permissões não são somadas. Revogações são IDs separados por vírgulas em `KELLY_REVOKED_LICENSE_IDS`.

O backup privado do emissor usa PBKDF2-SHA256 e AES-256-GCM. Ele não vai para o site. O pagamento e a emissão automática após compra ainda não estão implementados.

## Limites e armazenamento

- Até 6 anexos, 5 MB por arquivo e 10 MB somados por mensagem.
- Até 60 mil caracteres digitados; envie códigos maiores como arquivos.
- PNG, JPEG e WebP e PDFs são enviados ao modelo. DOCX fornece texto. ZIP é inspecionado em memória, sem executar nem extrair caminhos no servidor; há limites de expansão e arquivos binários/subpastas de dependências são omitidos.
- Anexos ficam no conteúdo da mensagem na base existente, em base64. Isso usa aproximadamente um terço de espaço extra e está sujeito ao espaço/plano do Supabase.
- Respostas geram arquivos de texto/código e ZIP desses arquivos; não geram automaticamente PDFs, DOCX ou outros binários.
- `GEMINI_MAX_OUTPUT_TOKENS` tem padrão 32768, limitado pela capacidade do modelo configurado. O modelo padrão foi preservado. O servidor não oferece execução de código nem navegação web à IA.
- Uma geração ativa por conta por processo; rate limit de ativação e solicitações. Múltiplas réplicas exigirão coordenação compartilhada de cotas/limites em uma etapa futura.

## Manutenção e segurança do servidor

Somente a interface e bibliotecas públicas são servidas por HTTP. O gerador, SQL, código do servidor e variáveis de ambiente não são rotas públicas. O pacote usa dependências travadas pelo `package-lock.json`.

`server.js` é autocontido quanto aos módulos internos. Os `gemini.js`, `prompt.js`, `chat-route.js` e `attachments.js` antigos na raiz são ignorados. Não é necessário enviar uma pasta `lib`. Mantenha as credenciais em variáveis de ambiente; `.env.example` é somente um modelo.

O nome da empresa e do criador só deve aparecer em respostas se houver pergunta explícita sobre eles. Essa regra e a adaptação de conversa são instruções do modelo, e dependem de seu comportamento; não são garantias absolutas de saída.
