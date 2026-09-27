/* Private Narradora client. Original PDFs and extracted pages require ownership. */
window.RPGBooks=(()=>{
 'use strict';
 let reading=false,stop=false;
 const ui=()=>window.RPG.mechanicsUI;
 const endpoint=id=>ui().base()+'/books/'+id;
 const showStatus=(body,t)=>ui().status(body,t);
 const labels={uploading:'Envio incompleto',processing:'Leitura incompleta',paused:'Leitura pausada',ready:'Leitura concluída'};
 const formatBytes=n=>(n/1024/1024).toFixed(1)+' MB';
 function progress(body){const box=el('div','rpgBookProgress'),heading=el('strong','','Preparando o livro…'),bar=el('progress'),label=el('p','settingsHelp'),hint=el('small','','O tempo varia com o tamanho e a complexidade das páginas.');bar.max=100;bar.value=0;bar.setAttribute('aria-label','Progresso da leitura do livro');label.setAttribute('aria-live','polite');box.append(heading,bar,label,hint);body.append(box);return {heading,bar,label,hint};}
 function paint(p,b){p.heading.textContent=b.title;p.bar.max=b.total_pages||1;p.bar.value=b.processed_pages||0;p.label.textContent=`${b.processed_pages} de ${b.total_pages} páginas processadas · ${Math.floor(100*b.processed_pages/b.total_pages)}%`;p.hint.textContent=b.status==='ready'?(b.warnings?`${b.warnings} página(s) com transcrição automática ou aviso. Confira números e tabelas.`:'Todas as páginas foram processadas. As regras propostas ainda precisam de confirmação.'):'Lendo texto, regras, tabelas e detalhes visuais…';}
 async function open(){
  if(!state.rpgCurrent)return window.RPG.openStart();if(reading)return toast('A leitura está aberta. Pause após o bloco atual antes de abrir outro livro.');
  const body=ui().modal('Livros da campanha','Opcional: carregar o livro pode tornar a narração mais imersiva e fiel ao seu sistema.');
  const note=el('p','settingsHelp','O PDF fica associado a esta campanha. A leitura considera texto e páginas digitalizadas; trechos incertos são sinalizados. Até 25 MB e 1.000 páginas por livro.');body.append(note);
  const file=el('input');file.type='file';file.accept='application/pdf,.pdf';file.hidden=true;file.id='rpgBookFile';body.append(action('Carregar livro em PDF','upload',()=>{delete file.dataset.resumeId;file.value='';file.click();},'rpgPrimary'),file);file.onchange=()=>file.files[0]&&upload(file.files[0]);
  try{const data=await api(ui().base()+'/books');if(!body.isConnected)return;if(!data.installed){showStatus(body,'Execute KELLY_LIVROS.sql no Supabase para habilitar a leitura dos livros.');return;}
   const search=el('form','rpgSearch'),query=el('input');query.placeholder='Buscar uma regra ou termo nos livros lidos';query.setAttribute('aria-label','Buscar nos livros');const button=el('button','smallBtn','Buscar');search.append(query,button);body.append(search);const results=el('div');body.append(results);
   search.onsubmit=async e=>{e.preventDefault();if(!query.value.trim())return;button.disabled=true;try{const d=await api(ui().base()+'/books/search?q='+encodeURIComponent(query.value));results.replaceChildren();for(const p of d.pages){const b=data.books.find(b=>b.book_id===p.book_id);results.append(action((b?.title||'Livro')+' · página '+p.page,'book',()=>openPage(b,p.page),'rpgFact'));}if(!d.pages.length)results.append(el('p','settingsHelp','Não encontrei esse termo nos livros concluídos e ativos.'));}catch(err){showStatus(body,err.message);}finally{button.disabled=false;}};
   for(const b of data.books){const card=el('article','rpgBookCard'),top=el('div','rpgBookCardTop');top.append(el('strong','',b.title),el('span','rpgBookBadge',b.enabled?labels[b.status]:'Desativado'));card.append(top,el('p','settingsHelp',`${b.processed_pages}/${b.total_pages} páginas · ${formatBytes(b.bytes)}${b.edition?' · '+b.edition:''}`));const bar=el('progress');bar.max=b.total_pages;bar.value=b.processed_pages;bar.setAttribute('aria-label','Páginas processadas de '+b.title);card.append(bar);
    if(b.error)card.append(el('p','rpgFeedback',b.error));if(b.warnings)card.append(el('p','settingsHelp',b.warnings+' página(s) com avisos ou transcrição automática.'));
    const actions=el('div','rpgActions');if(b.status!=='ready'&&b.status!=='uploading')actions.append(action('Continuar leitura','book',()=>resume(b),'smallBtn'));if(b.status==='uploading')actions.append(action('Reenviar o mesmo PDF','upload',()=>{file.dataset.resumeId=b.book_id;file.click();},'smallBtn'));
    if(b.processed_pages)actions.append(action('Consultar páginas e regras','book',()=>openPage(b,1),'smallBtn'));
    actions.append(action('Baixar PDF original','download',()=>download(b),'textBtn'),action(b.enabled?'Desativar':'Usar na campanha','settings',async()=>{try{await api(endpoint(b.book_id)+'/enabled',{method:'POST',body:JSON.stringify({enabled:!b.enabled})});await open();}catch(err){showStatus(body,err.message);}},'textBtn'));card.append(actions);body.append(card);
   }
   file.onchange=()=>{if(file.files[0])upload(file.files[0],file.dataset.resumeId||null);};
   if(!data.books.length)body.append(el('p','settingsHelp','Você pode jogar sem livro e carregar um depois pelo botão Livros.'));
  }catch(err){showStatus(body,err.message);}
 }
 async function upload(file,resumeId=null){
  if(reading)return toast('Aguarde ou pause a leitura atual.');if(file.size>25*1024*1024||!file.name.toLowerCase().endsWith('.pdf'))return toast('Selecione um PDF de até 25 MB.');
  const campaignId=state.rpgCurrent?.campaign.id;if(!campaignId)return;
  const body=ui().modal('Preparando seu livro','A leitura será salva por páginas. Você poderá retomar de onde parou.'),p=progress(body);reading=true;stop=false;
  const id=resumeId||crypto.randomUUID(),base='/api/kelly/rpg/campaigns/'+campaignId+'/books/'+id;
  try{
   const {data:{session}}=await sbClient.auth.getSession();if(!session)throw Error('Entre novamente.');const params=new URLSearchParams({name:file.name,title:file.name.replace(/\.pdf$/i,''),edition:state.rpgCurrent.campaign.setup.system});
   p.heading.textContent='Enviando '+file.name;p.hint.textContent='Enviando o PDF original e conferindo sua integridade.';
   const b=await new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('POST',base+'/upload?'+params);xhr.setRequestHeader('Authorization','Bearer '+session.access_token);xhr.setRequestHeader('Content-Type','application/pdf');xhr.responseType='json';xhr.upload.onprogress=e=>{if(e.lengthComputable){p.bar.value=100*e.loaded/e.total;p.label.textContent=`Enviando ${formatBytes(e.loaded)} de ${formatBytes(e.total)}`;}};xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve(xhr.response.book):reject(Error(xhr.response?.error||'Não foi possível enviar o PDF.'));xhr.onerror=()=>reject(Error('Envio interrompido. Reabra Livros e selecione o mesmo PDF para retomar.'));xhr.send(file);});
   await loop(b,base,body,p);
  }catch(err){showStatus(body,err.message);body.append(action('Abrir livros','book',()=>{reading=false;open();},'smallBtn'));}finally{reading=false;await ui().refresh().catch(()=>{});}
 }
 async function resume(b){if(reading)return;const body=ui().modal('Lendo seu livro','O progresso confirmado continua salvo mesmo se você fechar esta janela.'),p=progress(body);reading=true;stop=false;try{await loop(b,endpoint(b.book_id),body,p);}catch(err){showStatus(body,err.message);}finally{reading=false;await ui().refresh().catch(()=>{});}}
 async function loop(book,base,body,p){
  paint(p,book);const pause=action('Pausar após este bloco','close',()=>{stop=true;pause.disabled=true;pause.textContent='Pausando ao concluir o bloco…';},'smallBtn');body.append(pause);let started=performance.now(),initial=book.processed_pages;
  while(book.status!=='ready'&&!stop&&body.isConnected){
   try{const d=await api(base+'/process',{method:'POST',body:'{}'});book=d.book;paint(p,book);const done=book.processed_pages-initial;if(done>0&&book.status!=='ready'){const seconds=Math.ceil((performance.now()-started)/1000/done*(book.total_pages-book.processed_pages));p.hint.textContent=`Estimativa pelo ritmo atual: cerca de ${seconds<60?seconds+' s':Math.ceil(seconds/60)+' min'}. Páginas complexas podem levar mais tempo.`;}}
   catch(err){if(err.data?.code==='BOOK_BUSY'){p.hint.textContent='Aguardando a leitura do bloco em andamento…';await new Promise(r=>setTimeout(r,1800));continue;}throw err;}
  }
  pause.remove();if(!body.isConnected)return;
  if(book.status==='ready'){p.heading.textContent='Livro processado';body.append(el('p','settingsHelp','O livro está disponível para consulta da Narradora. Confira as regras extraídas antes de usá-las em cálculos.'),action('Consultar páginas e regras','book',()=>{reading=false;openPage(book,1);},'rpgPrimary'),action('Voltar à conversa','up',()=>{reading=false;ui().closePanel();},'smallBtn'));}
  else{p.hint.textContent='Leitura pausada. As páginas concluídas foram preservadas.';body.append(action('Retomar leitura','book',()=>{reading=false;resume(book);},'rpgPrimary'));}
 }
 async function download(b){try{const response=await ui().authorizedFetch(endpoint(b.book_id)+'/pdf');downloadBlob(await response.blob(),safeFilename(b.file_name||b.title+'.pdf'));}catch(err){toast(err.message);}}
 async function openPage(book,page){
  if(!book)return;if(reading)return toast('Pause a leitura para consultar as páginas.');const body=ui().modal(book.title,'A numeração corresponde às páginas do PDF. Confira as regras propostas no original.'),nav=el('form','rpgSearch'),number=el('input');number.type='number';number.min=1;number.max=book.processed_pages;number.value=page;number.setAttribute('aria-label','Número da página do livro');const go=el('button','smallBtn','Ir à página');nav.append(number,go);body.append(nav);nav.onsubmit=e=>{e.preventDefault();openPage(book,Number(number.value));};
  try{const d=await api(endpoint(book.book_id)+'/pages?page='+page),p=d.pages[0];if(!p)return showStatus(body,'Esta página ainda não foi processada.');
   body.append(el('p','rpgBookBadge',`Página ${p.page} · [E${p.source_seq}] · ${p.quality==='native'?'texto do PDF':p.quality==='ocr'?'transcrição automática':p.quality==='empty'?'página sem texto':'revisão necessária'}`));
   const details=el('details','rpgMechanicalRule');details.open=!p.rules.length;details.append(el('summary','','Texto e detalhes da página'),el('pre','rpgBookText',p.text||'Nenhum texto legível.'),el('p','rpgPlain',p.notes));body.append(details);
   if(p.rules.length)body.append(el('h3','','Regras propostas para conferência'));
   for(const r of p.rules){const card=el('article','rpgMechanicalCard');card.append(el('strong','',r.name),el('p','rpgPlain',r.excerpt));if(r.formula)card.append(el('code','',r.formula));if(r.uncertainty)card.append(el('p','settingsHelp',r.uncertainty));card.append(el('small','','Proposta extraída pela IA; não foi aplicada às fichas.'));
    if(r.usable)card.append(action('Conferir e cadastrar regra','plus',()=>window.RPGCombat.proposeRule({...r,source:`${book.title} · ${book.edition||'edição informada na mesa'} · PDF p. ${p.page} [E${p.source_seq}]`}), 'smallBtn'));body.append(card);}
   const actions=el('div','rpgActions');if(page>1)actions.append(action('Página anterior','up',()=>openPage(book,page-1),'smallBtn'));if(page<book.processed_pages)actions.append(action('Próxima página','down',()=>openPage(book,page+1),'smallBtn'));actions.append(action('Copiar referência','copy',()=>copyText('[E'+p.source_seq+']'),'textBtn'),action('Baixar PDF original','download',()=>download(book),'textBtn'));body.append(actions);
  }catch(err){showStatus(body,err.message);}
 }
 return {open,upload,openPage,get busy(){return reading;}};
})();
