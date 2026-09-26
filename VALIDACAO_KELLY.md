# Validação da Kelly 6.1.0

Data: 26/09/2026. Resultado local: **32 testes automatizados passaram**, mais verificação do fluxo no navegador e do servidor distribuído sem pasta `lib`.

## Escopo coberto

| Área | Verificações |
| --- | --- |
| Acesso privado | Catálogo sem Narradora para contas comuns; chave beta não concede acesso; chave privada permanente vinculada ao UUID; assinatura, revogação e rejeição de adulteração. |
| Preparação | Campos e objeções obrigatórios, confirmação antes de qualquer geração; regras e limites atuais continuam no contexto após muitos eventos. |
| Banco | Migração idempotente; isolamento entre contas; escrita direta e execução de funções administrativas negadas ao usuário autenticado. |
| Ações | Gravação antes da IA; repetição idempotente; bloqueio entre solicitações concorrentes; revisão antiga rejeitada. |
| Falhas | Rascunho não canônico preservado; retomada sem duplicar ação; recuperação de execução abandonada; tentativa antiga impedida de concluir após cancelamento. |
| Memória | Busca de acontecimentos antigos; fontes exatas; fatos corrigidos sem apagar versões; números de eventos inventados não confirmam a resposta; paginação de fatos e histórico. |
| Dados e anexos | Rolagens dentro dos limites, sem repetir resultado em nova execução da mesma solicitação; imagens/PDF enviados como conteúdo real; DOCX/ZIP/texto e limites de arquivo. |
| Backup | Exportação com sequência/hash; restauração em outra campanha; importação parcial retomável; arquivo incompleto/alterado bloqueado; rascunho de tentativa abandonada preservado de forma visível. |
| Compatibilidade | Login e mensagens originais preservados no projeto; modos comuns, preferências e verificações de licenças; inicialização do pacote com dependências instaladas por npm ci. |
| Interface | Gerador com assinatura WebCrypto real; ativação privada; preparação; digitação; diário/fatos/dados; falha e retomada; exportação/restauração; mudança de modo; saída da conta; visual de celular sem transbordamento horizontal. |

Os testes de integração executaram as regras SQL em PostgreSQL local via PGlite. Chamadas à IA e autenticação externa usaram simulações controladas. Testes de regressão também verificaram leitura de anexos e o tratamento do protocolo de streaming da API com respostas simuladas. O gerador foi executado no Chromium e suas assinaturas foram verificadas pelo backend Node.

Não foram usados seu projeto Supabase, suas credenciais Gemini ou o Render de produção. Não houve deploy nem teste de cobrança, capacidade de muitos usuários, campanhas reais de dez anos ou qualidade semântica de um modelo real. Esses resultados não garantem ausência de falhas futuras nem recordação perfeita. Siga a conferência após publicar e mantenha backups.
