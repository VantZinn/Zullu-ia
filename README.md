# Kelly 6.1.0

Atualização da Kelly 6 com Narradora privada, preparação obrigatória de RPG, diário persistente e backup/restauração. Todos os arquivos distribuídos ficam na raiz; `server.js` incorpora seus módulos internos.

## Instalação

Siga **KELLY_COMO_INSTALAR.md**. Execute `KELLY_INSTALAR.sql` e depois `KELLY_NARRADORA.sql`. Preserve seu login Supabase e a configuração Gemini. Configure a chave pública do emissor e a chave secreta Supabase somente no servidor. Node 22/24; `npm ci`; `node server.js`.

A porta segue `PORT`, depois `SERVER_PORT`, depois 3000. Em Render, o proxy é detectado pela variável `RENDER`; `TRUST_PROXY` pode ser definida conforme a hospedagem. `/api/health` informa a versão 6.1.0.

## Acesso e interface

- Geral livre; Programação, Estudante, Escrita e Planejamento por chave beta/individual.
- Narradora fora do catálogo comum. Sua chave privada não expira, exige UUID da conta e não é concedida por uma chave beta comum.
- Chaves comuns e privadas coexistem. O gerador offline é entregue separadamente; seu backup privado fica com o administrador.
- Seis temas, densidade e animações; nome/avatar somente no menu; anexos, digitação, copiar, downloads de código/texto e ZIP preservados.
- Modos são instruções especializadas sobre o modelo configurado; não são motores independentes de regras ou outros provedores.

## Diário de RPG

A migração cria `kelly_rpg_campaigns`, `kelly_rpg_links`, `kelly_rpg_events`, `kelly_rpg_facts` e `kelly_rpg_turns`. A campanha é independente da exclusão de chats. Não há TTL. RLS limita leituras à conta; o navegador não pode escrever diretamente no diário. Escritas usam funções do servidor com verificação de proprietário e bloqueio transacional da campanha.

A preparação e os limites atuais sempre entram no contexto. Até 100 fatos fixados/80 mil caracteres, eventos recentes, busca textual e referências explícitas `[E123]` compõem o contexto recuperado. Os registros originais permanecem completos no banco. Não há garantia de recuperação perfeita, ausência total de alucinações ou preservação durante dez anos sem manutenção/backups.

A ação é persistida antes da chamada ao modelo. Rascunhos são gravados antes da emissão das deltas; a conclusão é transacional. Uma tentativa tem UUID, revisão e concessão temporária de execução. Repetições idênticas não duplicam eventos; cancelamento invalida a tentativa; falhas mantêm a ação recuperável. Há exclusão mútua por campanha entre processos. As cotas gerais por conta dos modos comuns continuam locais a cada processo.

Backup `.ndjson` é transmitido em lotes, com cadeia SHA-256 e rodapé de conferência. A importação restaura em nova campanha, permanece bloqueada até a conferência e pode ser retomada no mesmo navegador. É uma verificação de integridade, não assinatura/autoria nem criptografia.

## Limites e operação

Até 6 anexos, 5 MB por arquivo, 10 MB por mensagem; 60 mil caracteres digitados. Narradora: até 120 mil caracteres de saída por tentativa, além das cotas do modelo. Anexos base64 e registros de tentativas usam espaço no banco; acompanhe capacidade e custos. Respostas exportam texto/código/ZIP, não binários PDF/DOCX gerados.

O backend fornece somente os arquivos públicos explicitamente permitidos. O cliente e estilo privados exigem login e licença em `/api/kelly/rpg/client` e `/api/kelly/rpg/style`; os caminhos diretos `/rpg-ui.js` e `/rpg.css` não são públicos. Código e nomes dos arquivos ainda podem ser lidos se o próprio repositório GitHub for público.

`SUPABASE_SECRET_KEY` (ou a alternativa legada `SUPABASE_SERVICE_ROLE_KEY`) nunca é enviada ao navegador. As leituras usam o cliente autenticado do usuário. O emissor, SQL, `.env`, dependências do servidor e configurações não são servidos por HTTP. Preserve `.env` fora do GitHub. Use o arquivo de lock incluído.

Nenhuma chamada real ao modelo nem ao banco de produção foi feita na validação local. Veja o escopo dos testes e a conferência após publicar no guia de instalação.
