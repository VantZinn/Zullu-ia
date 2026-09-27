/* Private asset: delivered only after Narradora license verification. */
window.RPGCombat=(()=>{
 'use strict';
 const categories={hpmax:'PV máximos',attack:'Ataque',defense:'Defesa',hit:'Acerto',damage:'Dano bruto',mitigation:'Mitigação',net_damage:'Dano aplicado',hp_after:'PV após dano'};
 const steps=['attack','defense','hit','damage','mitigation','net_damage','hp_after'];
 const examples={hpmax:'Exemplo didático: BASE + RES (use a fórmula do seu livro)',attack:'Exemplo didático: 1d20 + a_FOR',defense:'Exemplo didático: t_DEF',hit:'Exemplo didático: ataque >= defesa',damage:'Exemplo didático: a_ARMA',mitigation:'Exemplo didático: t_RES',net_damage:'Exemplo didático: max(0, bruto - mitigacao)',hp_after:'Exemplo didático: max(0, pv - dano)'};
 const ui=()=>window.RPG.mechanicsUI;
 function field(form,label,name,{type='text',value='',placeholder='',options,required=true,max=1000}={}){
  const wrap=el('label','',label),control=el(options?'select':type==='textarea'?'textarea':'input');control.name=name;control.required=required;
  if(options){for(const [v,t]of options){const option=el('option','',t);option.value=v;control.append(option);}}else if(type==='textarea'){control.rows=3;control.maxLength=max;}else{control.type=type;control.maxLength=max;}
  control.value=value;control.placeholder=placeholder;wrap.append(control);form.append(wrap);return control;
 }
 function checkbox(form,label){const wrap=el('label','rpgCheck'),input=el('input');input.type='checkbox';input.required=true;wrap.append(input,document.createTextNode(label));form.append(wrap);return input;}
 function wire(form,body,snapshot,build,label){
  const button=el('button','rpgPrimary',label);button.type='submit';form.append(button);let attempt=null;
  form.onsubmit=async event=>{event.preventDefault();if(state.busy)return toast('Aguarde a narração terminar.');button.disabled=true;
   try{
    if(!attempt)attempt={requestId:crypto.randomUUID(),revision:snapshot.head,command:build()};
    for(const c of form.elements)if(c!==button)c.disabled=true;
    const result=await api(ui().base()+'/mechanics',{method:'POST',body:JSON.stringify(attempt)});
    await ui().refresh();if(state.chatId)await openChat(state.chatId);
    const out=ui().modal('Registro confirmado','E'+result.event.seq+' · salvo no diário da campanha');out.append(el('pre','rpgMechanicalReport',result.event.content));
    out.append(action('Voltar à Mesa mecânica','dice',()=>open(),'rpgPrimary'),action('Copiar registro','copy',()=>copyText(result.event.content+' [E'+result.event.seq+']'),'smallBtn'));
   }catch(error){
    if(error.status>=400&&error.status<500){attempt=null;for(const c of form.elements)c.disabled=false;}
    ui().status(body,error.message+(attempt?' Repetir usa o mesmo pedido e recupera o registro salvo, sem aplicar outro ataque.':''));
   }finally{button.disabled=false;button.textContent=attempt?'Consultar ou repetir o mesmo pedido':label;}
  };
 }
 async function open(){
  if(state.busy)return toast('Aguarde a narração terminar.');if(!state.rpgCurrent)return window.RPG.openStart();
  const body=ui().modal('Mesa mecânica','Regras com fonte. Fichas conferidas. Cada dado e cada conta no diário.');
  try{const snapshot=await api(ui().base()+'/mechanics');if(!body.isConnected)return;
   const banner=el('div','rpgMechanicsIntro');banner.append(el('strong','','Antes de resolver um combate'),el('p','','Cadastre as fórmulas da edição que sua mesa usa e os atributos das fichas. Use a edição e as regras combinadas para esta campanha. A confirmação da transcrição é sua; a narração não altera PV.'));body.append(banner);
   const actions=el('div','rpgActions');actions.append(action('Cadastrar regra','plus',()=>ruleForm(snapshot),'smallBtn'),action('Cadastrar ficha','plus',()=>actorForm(snapshot),'smallBtn'),action('Resolver ataque','dice',()=>attackForm(snapshot),'rpgPrimary'));body.append(actions);
   if(snapshot.state.pending){const pending=el('div','rpgMechanicsIntro');pending.append(el('strong','','Resolução mecânica pendente'),el('p','',snapshot.state.pending.reason),action('Registrar decisão da mesa','book',()=>reviewForm(snapshot),'smallBtn'));body.append(pending);}
   body.append(el('h3','','Fichas da mesa'));
   if(!snapshot.state.actors.length)body.append(el('p','settingsHelp','Nenhuma ficha confirmada. Primeiro cadastre a fórmula de PV máximos com a fonte.'));
   for(const a of snapshot.state.actors){const card=el('article','rpgMechanicalCard');card.append(el('strong','',a.name),el('span','',`${a.kind==='npc'?'NPC':'Jogador'} · ${a.cultivation} / ${a.stage}`),el('b','',`PV ${a.hp} / ${a.hpMax}`),el('small','',Object.entries(a.attributes).map(([k,v])=>`${k}: ${v}`).join(' · ')),action('Revisar ficha','book',()=>actorForm(snapshot,a),'textBtn'));body.append(card);}
   body.append(el('h3','','Regras confirmadas'));
   if(!snapshot.state.rules.length)body.append(el('p','settingsHelp','Fórmulas pendentes. Envie o livro correto para configurar as regras da sua mesa.'));
   for(const r of snapshot.state.rules){const details=el('details','rpgMechanicalRule'),summary=el('summary','',r.name+' · '+categories[r.category]);details.append(summary,el('code','',r.formula),el('p','',r.source),el('p','',r.excerpt));body.append(details);}
   body.append(el('p','settingsHelp','Cada alteração gera um evento. Revisões de fórmulas usam uma nova regra; fichas só mudam mediante confirmação ou resolução mecânica. Exporte o diário para guardar as fichas e contas junto da campanha.'));
  }catch(error){ui().status(body,error.message);}
 }
 function ruleForm(snapshot,draft=null){
  const body=ui().modal('Cadastrar regra com fonte','Transcreva o procedimento do livro ou a regra da casa confirmada. Os exemplos são apenas de sintaxe.'),form=el('form','rpgSetupForm');body.append(form);
  const name=field(form,'Nome da regra','ruleName',{value:draft?.name||'',max:100}),category=field(form,'Etapa da resolução','category',{value:draft?.category||'hpmax',options:Object.entries(categories)}),formula=field(form,'Fórmula','formula',{value:draft?.formula||'',max:240,placeholder:examples.hpmax});
  category.onchange=()=>{formula.placeholder=examples[category.value];};
  form.append(el('p','settingsHelp','PV máximos: atributos em MAIÚSCULAS. Combate: a_FOR = atributo do atacante; t_RES = atributo do alvo. Resultados anteriores: ataque, defesa, acerto, bruto, mitigacao, dano. pv e pvmax pertencem ao alvo. Aceita + − * /, min, max, floor, ceil, abs e comparações. Divisões exigem o arredondamento previsto na regra.'));
  const source=field(form,'Livro, edição e página (ou regra da casa)','source',{value:draft?.source||'',max:400}),excerpt=field(form,'Trecho que define a fórmula e suas condições','excerpt',{value:draft?.excerpt||'',type:'textarea',max:1600});
  const confirmed=checkbox(form,'Conferi a fonte e a fórmula. Sei que preencher este formulário não certifica que a regra é oficial.');
  wire(form,body,snapshot,()=>({action:'rule',rule:{id:'r_'+crypto.randomUUID(),name:name.value,category:category.value,formula:formula.value,source:source.value,excerpt:excerpt.value,confirmed:confirmed.checked}}),'Confirmar regra');
 }
 function actorForm(snapshot,existing){
  const hpRules=snapshot.state.rules.filter(r=>r.category==='hpmax');if(!hpRules.length)return toast('Cadastre a regra de PV máximos antes da ficha.');
  const body=ui().modal(existing?'Revisar ficha':'Cadastrar ficha','NPC e jogador usam os mesmos cálculos. Uma revisão fica registrada com seu motivo.'),form=el('form','rpgSetupForm');body.append(form);
  const name=field(form,'Nome','actorName',{value:existing?.name||'',max:100}),kind=field(form,'Tipo','kind',{value:existing?.kind||'npc',options:[['npc','NPC'],['player','Personagem do jogador']]}),cultivation=field(form,'Categoria de cultivo (ou não se aplica)','cultivation',{value:existing?.cultivation||'',max:100}),stage=field(form,'Estágio (ou não se aplica)','stage',{value:existing?.stage||'',max:100});
  const attrs=field(form,'Atributos da ficha, um por linha','attributes',{type:'textarea',value:existing?Object.entries(existing.attributes).map(([k,v])=>`${k}=${v}`).join('\n'):'',placeholder:'Use os nomes exigidos pelas fórmulas. Exemplo de formato: RES=1',max:2000});
  const hpRule=field(form,'Fórmula confirmada de PV máximos','hpRule',{value:existing?.hpRule||hpRules[0].id,options:hpRules.map(r=>[r.id,r.name+' · '+r.formula])});
  const start=field(form,'Como definir os PV atuais?','start',{value:existing?'current':'full',options:[['full','Confirmo que começa com os PV máximos calculados'],['current','Vou informar os PV atuais confirmados']]}),hp=field(form,'PV atuais','hp',{type:'number',value:existing?.hp??'',required:!!existing});hp.parentElement.hidden=!existing;
  start.onchange=()=>{hp.required=start.value==='current';hp.parentElement.hidden=!hp.required;};
  const source=field(form,'Origem dos atributos, categoria, estágio e PV atuais','actorSource',{value:existing?.source||'',max:500}),reason=field(form,'Motivo da criação ou correção','reason',{max:1000});
  const confirmed=checkbox(form,'Conferi os atributos e a regra de PV. Esta ficha representa o estado confirmado da mesa.');
  wire(form,body,snapshot,()=>{const attributes={};for(const line of attrs.value.split('\n').map(l=>l.trim()).filter(Boolean)){const m=line.match(/^([A-Z][A-Z_0-9]{0,23})\s*=\s*(-?\d+)$/);if(!m)throw Error('Use um atributo por linha, no formato RES=1, com letras MAIÚSCULAS.');if(Object.hasOwn(attributes,m[1]))throw Error('Atributo repetido: '+m[1]);attributes[m[1]]=Number(m[2]);}return {action:'actor',reason:reason.value,actor:{id:existing?.id||'a_'+crypto.randomUUID(),name:name.value,kind:kind.value,cultivation:cultivation.value,stage:stage.value,attributes,source:source.value,hpRule:hpRule.value,startFull:start.value==='full',hp:start.value==='current'?Number(hp.value):null,confirmed:confirmed.checked}};},'Confirmar ficha e calcular PV');
 }
 function attackForm(snapshot){
  if(snapshot.state.pending)return toast('Confira a pendência e registre a decisão da mesa antes de outro ataque.');
  if(snapshot.state.actors.length<2)return toast('Cadastre pelo menos duas fichas antes de resolver o ataque.');
  const missing=steps.filter(k=>!snapshot.state.rules.some(r=>r.category===k));if(missing.length)return toast('Faltam regras: '+missing.map(k=>categories[k]).join(', ')+'.');
  const body=ui().modal('Resolver ataque','Os dados são gerados no servidor. Ao confirmar, o resultado e os PV ficam gravados juntos.'),form=el('form','rpgSetupForm');body.append(form);
  const choices=snapshot.state.actors.map(a=>[a.id,`${a.name} · PV ${a.hp}/${a.hpMax}`]),attacker=field(form,'Atacante','attacker',{value:choices[0][0],options:choices}),target=field(form,'Alvo','target',{value:choices[1][0],options:choices}),rules={};
  for(const k of steps)rules[k]=field(form,categories[k],'rule_'+k,{value:snapshot.state.rules.find(r=>r.category===k).id,options:snapshot.state.rules.filter(r=>r.category===k).map(r=>[r.id,r.name+' · '+r.formula])});
  const context=field(form,'Ação, equipamentos e condições aplicáveis','context',{type:'textarea',max:1000,placeholder:'Descreva o ataque e as condições que conferiu. Se houver uma exceção não representada nas fórmulas, cadastre-a antes.'});
  const confirmed=checkbox(form,'Conferi fichas, fontes e todas as condições. As fórmulas selecionadas representam esta ação, inclusive exceções relevantes. Não há crítico ou efeito especial automático.');
  wire(form,body,snapshot,()=>({action:'resolve',attacker:attacker.value,target:target.value,rules:Object.fromEntries(steps.map(k=>[k,rules[k].value])),context:context.value,confirmed:confirmed.checked}),'Rolar, calcular e registrar');
 }
 function reviewForm(snapshot){const body=ui().modal('Conferir resolução pendente','Os dados sorteados continuam no diário. Registre como a mesa resolveu a pendência antes de continuar.'),form=el('form','rpgSetupForm');body.append(form);const reason=field(form,'Decisão, justificativa e fonte usada','reason',{type:'textarea',max:2000}),confirmed=checkbox(form,'Conferi os dados registrados e confirmo esta decisão da mesa. Uma nova rolagem só será feita se a mesa a autorizar.');wire(form,body,snapshot,()=>({action:'review',reason:reason.value,confirmed:confirmed.checked}),'Registrar decisão e liberar a mesa');}
 return {open,async proposeRule(draft){const snapshot=await api(ui().base()+'/mechanics');ruleForm(snapshot,draft);}};
})();
