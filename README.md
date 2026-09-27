# Kelly 6.3.0

Atualização da Kelly 6 com logo restaurada no menu, livros de RPG em PDF com progresso real e rolador integrado à conversa. Mantém Narradora privada, preparação de RPG, diário persistente e backup/restauração. Todos os arquivos distribuídos ficam na raiz; `server.js` incorpora seus módulos internos.

## Instalação

Siga **KELLY_COMO_INSTALAR.md**. Execute `KELLY_INSTALAR.sql`, `KELLY_NARRADORA.sql`, `KELLY_COMBATE.sql` e `KELLY_LIVROS.sql`, nessa ordem. Se já instalou 6.2, execute somente `KELLY_LIVROS.sql`; na 6.1, execute antes `KELLY_COMBATE.sql`. Preserve seu login Supabase e a configuração Gemini. Configure a chave pública do emissor e a chave secreta Supabase somente no servidor. Node 22.13+ da série 22 ou Node 24; `npm ci`; `node server.js`.

A porta segue `PORT`, depois `SERVER_PORT`, depois 3000. Em Render, o proxy é detectado pela variável `RENDER`; `TRUST_PROXY` pode ser definida conforme a hospedagem. `/api/health` informa a versão 6.3.0.

## Acesso e interface

- Geral livre; Programação, Estudante, Escrita e Planejamento por chave beta/individual.
- Narradora fora do catálogo comum. Sua chave privada não expira, exige UUID da conta e não é concedida por uma chave beta comum.
- Chaves comuns e privadas coexistem. O gerador offline é entregue separadamente; seu backup privado fica com o administrador.
- Seis temas, densidade e animações; nome/avatar somente no menu; anexos, digitação, copiar, downloads de código/texto e ZIP preservados.
- Os modos comuns especializam as instruções do modelo. A Narradora também oferece Mesa mecânica determinística para fichas e ataques; exige regras e fontes confirmadas pela mesa.

## Diário de RPG

A migração cria `kelly_rpg_campaigns`, `kelly_rpg_links`, `kelly_rpg_events`, `kelly_rpg_facts` e `kelly_rpg_turns`. A campanha é independente da exclusão de chats. Não há TTL. RLS limita leituras à conta; o navegador não pode escrever diretamente no diário. Escritas usam funções do servidor com verificação de proprietário e bloqueio transacional da campanha.

A preparação e os limites atuais sempre entram no contexto. Até 100 fatos fixados/80 mil caracteres, eventos recentes, busca textual e referências explícitas `[E123]` compõem o contexto recuperado. Os registros originais permanecem completos no banco. Não há garantia de recuperação perfeita, ausência total de alucinações ou preservação durante dez anos sem manutenção/backups.

A ação é persistida antes da chamada ao modelo. A Narradora retém a prosa gerada para conferir referências e padrões de afirmações mecânicas. A resposta completa é gravada antes da entrega; a digitação é animada no cliente. Encerramento abrupto do processo pode perder a prosa provisória ainda não confirmada, preservando a ação do usuário. Uma tentativa tem UUID, revisão e concessão temporária de execução. Repetições idênticas não duplicam eventos; cancelamento invalida a tentativa; falhas mantêm a ação recuperável. Há exclusão mútua por campanha entre processos. As cotas gerais por conta dos modos comuns continuam locais a cada processo.

Backup `.ndjson` é transmitido em lotes, com cadeia SHA-256 e rodapé de conferência. A importação restaura em nova campanha, permanece bloqueada até a conferência e pode ser retomada no mesmo navegador. É uma verificação de integridade, não assinatura/autoria nem criptografia.

## Mesa mecânica

Regras confirmadas com fórmula/fonte/trecho; PV máximos calculados; fichas de NPC e jogador; dados com `crypto.randomInt`; ataque, defesa, acerto, dano bruto, mitigação, dano final e atualização de PV separados. Motor aritmético próprio sem `eval`, com frações exatas e arredondamento explícito. Eventos `mechanic` guardam o estado e o relatório no diário; `kelly_rpg_mechanics_commit` aplica cada pedido uma única vez, com bloqueio de revisão e proprietário. Restauração reconstrói o estado a partir dos mesmos eventos.

O modelo não altera fichas. Prosa com afirmações numéricas mecânicas detectadas é substituída por orientação para usar a Mesa mecânica. Uma falha após sorteio registra dados e uma pendência com PV preservados; a mesa deve registrar uma decisão antes de outro ataque. Campos de fonte e confirmação são declarações da mesa, não certificação automática de uma regra oficial. O filtro textual não é uma garantia semântica e pode ter falsos positivos/negativos.

Nenhum Livro de Murin foi fornecido: não há regras oficiais presumidas nem retificação automática de eventos antigos. Até 48 regras e 100 fichas no estado atual (160 mil caracteres); atributos inteiros, PV máximos positivos; até 80 dados por ataque. Iniciativa, condições persistentes, críticos condicionais, manobras e outros subsistemas não são automatizados sem representação explícita nas regras aplicáveis.

## Livros e dados na conversa

PDF opcional na preparação ou em Livros, com aviso de benefício para imersão e fidelidade. Até 25 MB, 1.000 páginas e seis livros ativos por campanha. Original dividido em partes verificadas por SHA-256; páginas sequenciais em blocos adaptados ao texto e à digitalização. Progresso conta páginas gravadas, com pausa/retomada e execução exclusiva. PDFs criptografados são rejeitados.

PDF.js extrai texto nativo; pdf-lib monta os blocos com as páginas originais. Gemini recebe os PDFs reais e devolve JSON por página, com transcrição visual, notas e regras candidatas. O original é preservado; leitura incerta fica marcada. Fórmulas propostas exigem revisão e confirmação humanas. O modelo configurado precisa suportar PDFs e JSON. Cada bloco usa uma chamada sujeita às cotas do provedor.

`KELLY_LIVROS.sql` cria livros, partes do original e páginas como projeções do diário. Leituras usam RLS e escritas são restritas ao servidor. Exportação/restauração incluem o original e o progresso. A busca recupera páginas de livros ativos concluídos com suas referências `[E...]`; não envia todo o acervo em cada chamada. Limites de extração: 60 mil caracteres de texto, 13 mil de notas e 12 regras propostas por página. Contexto dos livros: até 60 mil caracteres, com trechos de até 18 mil por página.

A Narradora pode solicitar testes pelo protocolo interno `kelly_roll`. O servidor valida a expressão e a existência das fontes recuperadas antes de exibir a oferta. O jogador confere e clica em Rolar e continuar; dados reais e resultado são gravados antes da continuação. Em combate, a resolução aplica HP e evento na mesma transação; mudanças de estado invalidam a oferta. Cliques repetidos recuperam o resultado, e a continuação tem identificador estável. A checagem de fonte não certifica a interpretação semântica do modelo; regras ambíguas requerem revisão.

## Limites e operação

Até 6 anexos, 5 MB por arquivo, 10 MB por mensagem; 60 mil caracteres digitados. Narradora: até 120 mil caracteres de saída por tentativa, além das cotas do modelo. Anexos base64 e registros de tentativas usam espaço no banco; acompanhe capacidade e custos. Respostas exportam texto/código/ZIP, não binários PDF/DOCX gerados.

O backend fornece somente os arquivos públicos explicitamente permitidos. O cliente e estilo privados exigem login e licença em `/api/kelly/rpg/client` e `/api/kelly/rpg/style`; os caminhos diretos `/rpg-ui.js`, `/rpg-combat.js`, `/rpg-books-ui.js`, `/rpg-rolls-ui.js` e `/rpg.css` não são públicos. Código e nomes dos arquivos ainda podem ser lidos se o próprio repositório GitHub for público.

`SUPABASE_SECRET_KEY` (ou a alternativa legada `SUPABASE_SERVICE_ROLE_KEY`) nunca é enviada ao navegador. As leituras usam o cliente autenticado do usuário. O emissor, SQL, `.env`, dependências do servidor e configurações não são servidos por HTTP. Preserve `.env` fora do GitHub. Use o arquivo de lock incluído.

Nenhuma chamada real ao modelo nem ao banco de produção foi feita na validação local. Veja o escopo dos testes e a conferência após publicar no guia de instalação.
