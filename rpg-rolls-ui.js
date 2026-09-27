window.RPGRolls=(()=>{
 'use strict';
 let working=false;
 async function roll(seq,cancel=false){
  if(working||state.busy)return;working=true;const buttons=[...document.querySelectorAll('.rpgRollButton')];buttons.forEach(b=>b.disabled=true);
  try{await window.RPG.mechanicsUI.refresh();const d=await api(window.RPG.mechanicsUI.base()+'/rolls/'+seq,{method:'POST',body:JSON.stringify({revision:state.rpgCurrent.campaign.head,confirmed:!cancel,cancel,reason:cancel?'A mesa solicitou revisar a regra ou a ação.':undefined})});
   await openChat(state.chatId,{preserveDraft:true});if(d.event.kind==='roll_result'&&d.event.payload.canContinue){toast('Resultado registrado. Continuando a cena…');await window.RPG.continueRoll(d.event);}else if(d.event.kind==='roll_result')toast('Dados preservados. Confira a regra antes de continuar.');else toast('Teste cancelado. Você pode esclarecer a regra na conversa.');
  }catch(err){toast(err.message);await window.RPG.mechanicsUI.refresh().catch(()=>{});}finally{working=false;buttons.forEach(b=>b.disabled=false);}
 }
 function decorate(){
  const rows=[...messages.querySelectorAll('.msgRow')];for(let i=0;i<rows.length;i++){const row=rows[i],message=state.currentMessages[i];if(!message||row.querySelector('.rpgRollControls'))continue;
   if(message.rollOffer||message.rollResult){const body=row.querySelector('.markdown');if(body)body.replaceChildren(el('pre','rpgRollReport',message.content));}
   if(message.rollOffer){const box=el('div','rpgRollControls'),pending=state.rpgCurrent?.pendingRoll?.seq===message.rpgSeq;
    if(pending){box.append(el('p','settingsHelp','Confira a fórmula, os modificadores e as fontes acima. Ao rolar, o resultado será salvo e a cena continuará.'),action('Rolar e continuar','dice',()=>roll(message.rpgSeq),'rpgPrimary rpgRollButton'),action('Revisar ou cancelar teste','close',()=>roll(message.rpgSeq,true),'textBtn rpgRollButton'));}else box.append(el('small','settingsHelp','Este pedido de dados já foi encerrado.'));row.append(box);
   }else if(message.rollResult?.canContinue){const box=el('div','rpgRollControls');box.append(action('Retomar continuação','up',()=>window.RPG.continueRoll({seq:message.rpgSeq,payload:message.rollResult}),'textBtn rpgRollButton'));row.append(box);}
  }
 }
 return {decorate,roll};
})();
