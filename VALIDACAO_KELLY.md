# Validação da Kelly 6.3.0

Data: 26/09/2026. Resultado local: **54 testes automatizados passaram**, mais verificação do fluxo no navegador e do servidor distribuído sem pasta `lib`.

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
| Mecânica | Fórmulas sem execução de código; aritmética exata/arredondamento; fonte e confirmação exigidas; PV de NPC calculados; variáveis ausentes não sorteiam dados; resultado real d20 + atributo; dano e mitigação separados; falha após sorteio preserva dados e bloqueia repetição até revisão. |
| Combate persistente | Pedido repetido não reaplica ataque; concorrência não altera a mesma revisão duas vezes; serviço SQL protegido; modelo não altera ficha; relatório aparece no chat; backup/restauração inclui regras, fichas, dados e PV. |
| Proteção textual | Casos do relatório (10 PV arbitrários, 14 + 2 = 16 narrado e dano/RES opacos) são detectados antes da entrega. Prosa inválida não vira narração confirmada. |
| PDF e progresso | Livros de 1/17 páginas; blocos com páginas reais; texto nativo preservado; transcrição simulada marcada; contagem baseada em páginas gravadas; falha/saída incompleta sem falsa conclusão; pausa/retomada e redução de bloco. |
| Livros persistentes | PDF original reconstruído byte a byte; proprietário isolado; execução concorrente bloqueada; fontes por página; desativação exclui recuperação; backup restaura original, metadados e extração. |
| Rolagem no chat | Oferta sem dados inventados, fórmula e fonte validadas; botão resolve uma vez; resultado e PV atômicos; ficha alterada invalida pedido; continuação ligada ao resultado salvo, com repetição idempotente. |
| Protocolo de leitura | Pedido JSON ao provedor, rejeição de resposta incompleta, bloqueada ou malformada; nenhum falso 100% por sucesso parcial. |
| Compatibilidade | Login e mensagens originais preservados no projeto; modos comuns, preferências e verificações de licenças; inicialização do pacote com dependências instaladas por npm ci. |
| Interface | Gerador com assinatura WebCrypto real; ativação privada; preparação; digitação; diário/fatos/dados; falha e retomada; exportação/restauração; mudança de modo; saída da conta; visual de celular sem transbordamento horizontal. |

Os testes de integração executaram as regras SQL em PostgreSQL local via PGlite. Chamadas à IA e autenticação externa usaram simulações controladas. Testes de regressão também verificaram leitura de anexos e o tratamento do protocolo de streaming da API com respostas simuladas. O gerador foi executado no Chromium e suas assinaturas foram verificadas pelo backend Node. O fluxo da Mesa mecânica no navegador criou regra e ficha pelas telas, resolveu ataque, conferiu mitigação e PV após recarga, validou a proteção da prosa e o layout móvel. As fórmulas usadas foram sintéticas e identificadas como teste; não representam regras de Murin.

Não foram usados seu projeto Supabase, suas credenciais Gemini ou o Render de produção. Não houve deploy nem teste de cobrança, capacidade de muitos usuários, campanhas reais de dez anos ou qualidade semântica de um modelo real. Esses resultados não garantem ausência de falhas futuras nem recordação perfeita. Siga a conferência após publicar e mantenha backups.

A correspondência das fórmulas com o Livro de Murin ainda depende do livro/edição e da revisão das páginas corretas. O filtro da prosa usa padrões; não verifica semanticamente toda a história nem garante zero alucinações. Fichas só são alteradas pelo motor do servidor ou por correção confirmada da mesa.

O fluxo novo também verificou a imagem original no menu, seleção opcional de PDF na preparação, progresso de 6/9 para 9/9 páginas com pausa/retomada, conferência de proposta de regra, botão de rolagem, continuação automática, preservação de rascunho e resultado persistido após recarga, em computador e celular. PDFs de teste contêm regras fictícias; a transcrição do modelo é simulada. Não houve validação da qualidade de OCR ou da interpretação de livros reais por Gemini.
