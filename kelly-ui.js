'use strict';
Object.assign(paths, {
  chevron:'m8 10 4 4 4-4', study:'m2 9 10-5 10 5-10 5-10-5Zm4 3v6l6 3 6-3v-6M22 9v8',
  plan:'M5 3h14v18H5ZM8 7h1m3 0h4M8 12h1m3 0h4M8 17h1m3 0h4',
  palette:'M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h4a4 4 0 0 0 4-4c0-4-5-6-9-6ZM7 8h.01M11 6h.01M16 7h.01M5 12h.01',
  key:'M14 3a6 6 0 1 1-4 10l-7 7v-4l6-6a6 6 0 0 1 5-7ZM17 7h.01'
});
const KELLY_MODES = [
  {id:'general',name:'Geral',icon:'spark',description:'Converse, explore e tire suas dúvidas.',premium:false},
  {id:'code',name:'Programação',icon:'code',description:'Código, revisão e arquivos completos.',premium:true},
  {id:'study',name:'Estudante',icon:'study',description:'Fotos de matérias, explicações e revisão.',premium:true},
  {id:'write',name:'Escrita',icon:'write',description:'Textos que combinam com a sua voz.',premium:true},
  {id:'plan',name:'Planejamento',icon:'plan',description:'Ideias organizadas em próximos passos.',premium:true}
];
const THEMES = [
  ['aurora','Aurora','Um toque de lilás','#272039','#bca6ed'], ['dark','Grafite','Simples e profundo','#181a20','#c1b8f1'],
  ['light','Pérola','Leve e luminoso','#f5f3ee','#66518d'], ['ocean','Oceano','Para mergulhar nas ideias','#112c39','#85d5e5'],
  ['forest','Jardim','Uma pausa verde','#172d25','#acd9aa'], ['sunset','Pôr do sol','Calor para criar','#392725','#efb08d']
];
const DEFAULT_PREFS = {theme:'aurora',motion:true,density:'comfortable',response_style:'auto'};
state.mode = 'general'; state.kelly = {ready:false,license:{active:false},preferences:{...DEFAULT_PREFS}};
let pendingMode = null, prefQueue = Promise.resolve(), accountGeneration = 0;
function currentMode(){return KELLY_MODES.find(m=>m.id===state.mode)||KELLY_MODES[0];}
function canUseMode(id){return id==='general'||!!(state.kelly?.license?.active&&state.kelly.license.modes?.includes(id));}
function applyPreferences(prefs){
  const p={...DEFAULT_PREFS,...prefs};state.kelly.preferences=p;setTheme(p.theme);
  document.body.dataset.motion=p.motion?'on':'off';document.body.dataset.density=p.density;
  $('#motionToggle').checked=p.motion;
  $$('#themeGrid button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===p.theme)));
  $$('#densityOptions button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.density===p.density)));
  $$('#styleOptions button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.style===p.response_style)));
}
async function loadKelly(){
  const userId=state.me?.user?.id;
  try {
    const d=await api('/api/kelly');if(userId!==state.me?.user?.id)return;
    state.kelly=d;applyPreferences(d.preferences);renderModeMenu();renderLicense();
    $('#preferencesStatus').textContent=d.ready?'Preferências salvas na sua conta.':'A configuração da personalização está pendente. Você pode experimentar os temas neste navegador.';
  } catch(e) {
    if(userId!==state.me?.user?.id)return;
    state.kelly={ready:false,license:{active:false},preferences:{...DEFAULT_PREFS}};
    applyPreferences(state.kelly.preferences);renderModeMenu();renderLicense();toast(e.message);
  }
}
function resetKelly(){
  accountGeneration++;state.mode='general';pendingMode=null;state.kelly={ready:false,license:{active:false},preferences:{...DEFAULT_PREFS}};
  $('#activationKey').value='';$('#activationFeedback').textContent='';$('#licenseModal').classList.remove('show');closeModeMenu();renderModeMenu();renderLicense();
}
function savePreferences(patch){
  const generation=accountGeneration;applyPreferences({...state.kelly.preferences,...patch});
  if(!state.kelly.ready){$('#preferencesStatus').textContent='Prévia aplicada neste navegador. O administrador precisa concluir a configuração para salvar na conta.';return;}
  $('#preferencesStatus').textContent='Salvando…';
  prefQueue=prefQueue.then(async()=>{
    if(generation!==accountGeneration)return;
    try {await api('/api/kelly/preferences',{method:'PATCH',body:JSON.stringify(patch)});if(generation===accountGeneration)$('#preferencesStatus').textContent='Preferências salvas na sua conta.';}
    catch(e){if(generation===accountGeneration){$('#preferencesStatus').textContent='A alteração está só nesta tela. Tente escolher novamente para salvar.';toast(e.message);}}
  });
}
function renderModeMenu(){
  const box=$('#modeOptions');box.replaceChildren();
  for(const mode of KELLY_MODES){
    const active=mode.id===state.mode, unlocked=canUseMode(mode.id), b=el('button','modeOption');b.type='button';b.setAttribute('role','menuitemradio');b.setAttribute('aria-checked',String(active));b.dataset.mode=mode.id;
    const symbol=el('span','modeIcon');symbol.innerHTML=icon(mode.icon);const label=el('span','modeOptionText');label.append(el('strong','',mode.name),el('small','',mode.description));
    const badge=el('span','modeBadge');badge.innerHTML=active&&unlocked?icon('check'):!unlocked?icon('lock'):'';if(!mode.premium&&!active)badge.textContent='Livre';
    b.append(symbol,label,badge);b.onclick=()=>{closeModeMenu();if(!unlocked)openLicense(mode.id);else setMode(mode.id);};box.append(b);
  }
  const m=currentMode();$('#modeButtonIcon').innerHTML=icon(m.icon);$('#modeButtonLabel').textContent=m.name;
  $('#modeButton').setAttribute('aria-label',`Modo ${m.name}. Escolher modo`);
  $('.composerLabel').textContent=m.id==='study'?'Envie uma foto da matéria':m.id==='code'?'Código, arquivos e prints':'Texto, código e imagens';
  input.placeholder={general:'Pergunte, crie ou traga uma ideia...',code:'Descreva o projeto ou envie seu código...',study:'Qual matéria vamos entender hoje?',write:'O que você quer colocar em palavras?',plan:'Qual ideia vamos organizar?'}[m.id];
}
function setMode(id, refresh=true){
  state.mode=KELLY_MODES.some(m=>m.id===id)?id:'general';renderModeMenu();
  if(refresh&&messages.querySelector('.welcome'))welcome();
  if(refresh){toast(`Modo ${currentMode().name}`);input.focus();}
}
function closeModeMenu(){ $('#modeMenu').classList.add('hidden');$('#modeButton').setAttribute('aria-expanded','false'); }
function renderLicense(){
  const l=state.kelly.license||{active:false};
  $('#licenseCardTitle').textContent=l.active?'Seus modos estão ativos':'Mais possibilidades';
  $('#licenseCardText').textContent=l.active?(l.type==='beta'?'Acesso beta · veja seus modos':'Sua ativação está pronta'):'Conheça os modos especiais';
  $('#licenseBtn').classList.toggle('isActive',l.active);
  const status=$('#licenseStatus');status.replaceChildren();status.classList.toggle('hidden',!l.active);
  if(l.active){const names=KELLY_MODES.filter(m=>l.modes.includes(m.id)).map(m=>m.name).join(' · ');status.append(el('strong','',l.type==='beta'?'Beta ativado':'Chave individual ativada'),el('span','',names),el('small','',l.expiresAt?'Válida até '+new Date(l.expiresAt).toLocaleDateString('pt-BR'):'Sem prazo de expiração'));}
  $('#licenseAccountId').textContent=state.me?.user?.id||'';
}
function openLicense(mode=null){
  if(state.busy)return toast('Aguarde ou interrompa a resposta para ativar uma chave.');
  pendingMode=mode;closeDrawer();closeSheets();overlay.classList.remove('show');closeModeMenu();renderLicense();
  $('#activationFeedback').textContent='';$('#activationKey').value='';openModal('#licenseModal');
}
async function activateLicense(){
  const key=$('#activationKey').value.trim();if(!key){$('#activationFeedback').textContent='Cole a chave que você recebeu.';return;}
  $('#activateBtn').disabled=true;$('#activationFeedback').textContent='Conferindo sua chave…';
  try{
    const d=await api('/api/kelly/activate',{method:'POST',body:JSON.stringify({key})});state.kelly.license=d.license;state.kelly.ready=true;
    $('#activationKey').value='';renderModeMenu();renderLicense();$('#activationFeedback').textContent='Pronto! Seus modos foram liberados.';
    $('.activationCard').classList.remove('celebrate');void $('.activationCard').offsetWidth;$('.activationCard').classList.add('celebrate');
    if(pendingMode&&canUseMode(pendingMode)){setMode(pendingMode);pendingMode=null;}
    toast('Chave ativada. Explore seus novos modos.');
  }catch(e){$('#activationFeedback').textContent=e.message;}finally{$('#activateBtn').disabled=false;}
}
const welcomeContent={
  general:{eyebrow:'ESPAÇO PARA POSSIBILIDADES',title:'Uma ideia sua.',highlight:'Um novo começo.',description:'Para aprender, criar e descobrir.<br>Traga o começo. Vamos encontrar o próximo passo.',choices:[['image','Entenda uma imagem','Uma foto também pode ser uma pergunta.','image'],['write','Dê forma a uma ideia','Encontre as palavras para começar.','Me ajude a desenvolver uma ideia: '],['spark','Explore os modos','Uma função para cada momento.','modes']]},
  code:{eyebrow:'DO RASCUNHO AO CÓDIGO',title:'Vamos construir',highlight:'o próximo passo.',description:'Investigue um erro, revise um projeto ou crie do zero.<br>Código completo, com espaço para entender.',choices:[['code','Começar um projeto','Conte o que você quer criar.','Quero criar um projeto. Minha ideia é: '],['file','Revisar meus arquivos','Envie seu código para analisarmos.','file'],['image','Resolver um erro','Traga um print ou a mensagem do erro.','image']]},
  study:{eyebrow:'APRENDER NO SEU RITMO',title:'Da dúvida',highlight:'à descoberta.',description:'Uma foto do caderno, um exercício ou uma matéria.<br>Vamos entender juntos, uma etapa de cada vez.',choices:[['image','Foto da matéria','Envie o quadro, caderno ou exercício.','image'],['study','Explicar com calma','Exemplos que tornam tudo mais claro.','Me explique passo a passo, com exemplos: '],['plan','Preparar uma revisão','Resumos e perguntas para praticar.','Monte uma revisão com resumo e perguntas de prática sobre ']]},
  write:{eyebrow:'SUAS IDEIAS, SUA VOZ',title:'As palavras certas',highlight:'começam aqui.',description:'Do primeiro rascunho à versão para copiar.<br>Encontre um texto que soe como você.',choices:[['write','Escrever do zero','Conte a intenção e o público.','Escreva um texto para '],['file','Revisar um texto','Clareza sem perder sua voz.','Revise este texto preservando meu jeito de escrever: '],['spark','Mudar o tom','Encontre outro jeito de dizer.','Adapte o tom deste texto para ']]},
  plan:{eyebrow:'MENOS CONFUSÃO, MAIS DIREÇÃO',title:'Organize as ideias.',highlight:'Encontre seu ritmo.',description:'Transforme o que você tem em mente em algo possível.<br>Um objetivo, algumas etapas e um começo claro.',choices:[['plan','Organizar uma semana','Prioridades que cabem na rotina.','Me ajude a organizar minha semana. Preciso '],['spark','Tirar uma ideia do papel','Comece com um plano simples.','Monte um plano prático para '],['study','Criar uma rotina de estudo','Uma etapa por vez, no seu ritmo.','Me ajude a montar uma rotina de estudos para ']]}
};
function welcome(){
  messages.replaceChildren();state.currentMessages=[];$('#chatHeading').textContent='Nova conversa';
  const info=welcomeContent[state.mode]||welcomeContent.general,box=el('div','welcome');
  box.innerHTML=`<div class="welcomeDecoration" aria-hidden="true"><i></i><i></i><i></i></div><div class="welcomeLabel">${icon(currentMode().icon)} ${info.eyebrow}</div><h1>${info.title}<br><span>${info.highlight}</span></h1><p>${info.description}</p><div class="suggestions"></div><div class="welcomeFoot">${icon('file')} Arraste um arquivo ou cole uma imagem para começar.</div>`;
  for(const [ic,title,subtitle,prompt] of info.choices){const b=el('button','suggestion');b.type='button';b.innerHTML=icon(ic);b.append(el('strong','',title),el('small','',subtitle));b.onclick=()=>{if(prompt==='image'||prompt==='file')$('#fileInput').click();else if(prompt==='modes')$('#modeButton').click();else{input.value=prompt;resize();input.focus();}};box.querySelector('.suggestions').append(b);}
  messages.append(box);$('#exportChatBtn').disabled=true;
}
function initKelly(){
  for(const [id,name,description,bg,accent] of THEMES){const b=el('button','themeChoice');b.dataset.theme=id;b.type='button';b.setAttribute('aria-label',`Tema ${name}`);b.title=description;b.innerHTML=`<span class="themeSample" style="--sample-bg:${bg};--sample-accent:${accent}"><i></i><i></i><i></i><b>${icon('check')}</b></span><span>${name}</span>`;b.onclick=()=>savePreferences({theme:id});$('#themeGrid').append(b);}
  $('#motionToggle').onchange=e=>savePreferences({motion:e.target.checked});
  $$('#densityOptions button').forEach(b=>b.onclick=()=>savePreferences({density:b.dataset.density}));
  $$('#styleOptions button').forEach(b=>b.onclick=()=>savePreferences({response_style:b.dataset.style}));
  $('#modeButton').onclick=()=>{const open=$('#modeMenu').classList.toggle('hidden')===false;$('#modeButton').setAttribute('aria-expanded',String(open));if(open)$('#modeOptions [aria-checked="true"]')?.focus();};
  $('#modeMenu').addEventListener('keydown',e=>{const items=$$('#modeOptions button'),i=items.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const index=e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;items[index].focus();}if(e.key==='Escape'){e.preventDefault();closeModeMenu();$('#modeButton').focus();}if(e.key==='Tab')closeModeMenu();});
  document.addEventListener('click',e=>{if(!e.target.closest('.modeControl'))closeModeMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModeMenu();if($('#licenseModal').classList.contains('show'))closeModal('#licenseModal');}});
  $('#licenseBtn').onclick=()=>openLicense();$('#closeLicense').onclick=()=>closeModal('#licenseModal');$('#activateBtn').onclick=activateLicense;
  $('#copyAccountId').onclick=()=>copyText(state.me?.user?.id||'');
  $('#appearanceTopBtn').onclick=()=>$('#settingsBtn').click();
  $('#licenseModal').addEventListener('click',e=>{if(e.target.id==='licenseModal')closeModal('#licenseModal');});
  paintIcons();renderModeMenu();renderLicense();
}
initKelly();boot();
