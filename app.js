const API=(window.ZULU_CONFIG?.API_BASE_URL||"").replace(/\/+$/,"");
const $=s=>document.querySelector(s);
const state={token:localStorage.getItem("zulu_token")||"",me:null,chats:[],chatId:null};

const drawer=$("#drawer"), overlay=$("#overlay"), messages=$("#messages"), input=$("#input");

async function api(path,opt={}){
  const headers={"Content-Type":"application/json",...(opt.headers||{})};
  if(state.token) headers.Authorization=`Bearer ${state.token}`;
  const r=await fetch(API+path,{...opt,headers});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(data.error||`HTTP ${r.status}`);e.status=r.status;e.data=data;throw e}
  return data;
}

async function ensureAuth(){
  if(!state.token){
    const d=await api("/api/auth/register",{method:"POST"});
    state.token=d.token; localStorage.setItem("zulu_token",state.token);
  }
  try{state.me=await api("/api/me")}
  catch(e){
    if(e.status===401){localStorage.removeItem("zulu_token");state.token="";return ensureAuth()}
    throw e;
  }
  if(!state.me.displayName) $("#nameModal").classList.add("show");
}

function openDrawer(){drawer.classList.add("open");overlay.classList.add("show")}
function closeDrawer(){drawer.classList.remove("open");overlay.classList.remove("show")}
$("#menuBtn").onclick=openDrawer; $("#closeDrawer").onclick=closeDrawer; overlay.onclick=()=>{closeDrawer();$("#memoryPanel").classList.remove("open")};

function addBubble(text,role,time=""){
  const row=document.createElement("div");row.className=`msgRow ${role}`;
  if(role==="assistant"){
    const img=document.createElement("img");img.src="zulu-avatar.png";img.className="msgAvatar";row.appendChild(img);
  }
  const wrap=document.createElement("div");wrap.className="bubble";wrap.textContent=text;
  if(time){const t=document.createElement("div");t.className="time";t.textContent=time;wrap.appendChild(t)}
  row.appendChild(wrap);messages.appendChild(row);messages.scrollTop=messages.scrollHeight;return wrap;
}

function welcome(){
  messages.innerHTML="";
  const name=state.me?.displayName||"";
  addBubble(name?`Oi, ${name}! 💜 Como posso te ajudar hoje?`:"Oi! Eu sou a Zulu 💜","assistant");
}

async function createChat(){
  const c=await api("/api/chats",{method:"POST"});
  state.chatId=c.id; await loadChats(); welcome(); closeDrawer();
}

async function loadChats(){
  const d=await api("/api/chats");state.chats=d.chats||[];
  const box=$("#chatList");box.innerHTML="";
  if(!state.chats.length){box.innerHTML='<div class="empty">Nenhuma conversa ainda.</div>';return}
  for(const c of state.chats){
    const item=document.createElement("div");item.className="chatItem"+(c.id===state.chatId?" active":"");
    const title=document.createElement("div");title.className="chatTitle";title.textContent=c.title;
    const del=document.createElement("button");del.textContent="⋯";
    del.onclick=async(ev)=>{ev.stopPropagation(); if(confirm("Excluir este chat?")){await api(`/api/chats/${c.id}`,{method:"DELETE"});if(state.chatId===c.id){state.chatId=null;welcome()}await loadChats()}};
    item.append(title,del);item.onclick=()=>openChat(c.id);box.appendChild(item);
  }
}

async function openChat(id){
  const d=await api(`/api/chats/${id}`);state.chatId=id;messages.innerHTML="";
  if(!d.messages.length) welcome();
  else for(const m of d.messages)addBubble(m.content,m.role,m.created_at?new Date(m.created_at+"Z").toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"");
  await loadChats();closeDrawer();
}

async function send(){
  const text=input.value.trim();if(!text)return;
  if(!state.chatId) await createChat();
  addBubble(text,"user");input.value="";resize();
  const typing=addBubble("Digitando...","assistant");typing.classList.add("typing");
  $("#sendBtn").disabled=true;
  try{
    const d=await api(`/api/chats/${state.chatId}/message`,{method:"POST",body:JSON.stringify({message:text})});
    typing.textContent=d.reply;typing.classList.remove("typing");
    await loadChats();
  }catch(e){
    typing.textContent=e.data?.code==="NAME_REQUIRED"?"Antes da gente continuar, como você gostaria que eu te chamasse? 💜":"Não consegui responder agora. Tente novamente em instantes.";
    if(e.data?.code==="NAME_REQUIRED")$("#nameModal").classList.add("show");
  }finally{$("#sendBtn").disabled=false;messages.scrollTop=messages.scrollHeight}
}

$("#composer").onsubmit=e=>{e.preventDefault();send()};
function resize(){input.style.height="auto";input.style.height=Math.min(input.scrollHeight,140)+"px"}
input.oninput=resize;

$("#saveNameBtn").onclick=async()=>{
  const name=$("#nameInput").value.trim();if(!name)return;
  const d=await api("/api/me",{method:"PATCH",body:JSON.stringify({displayName:name})});
  state.me.displayName=d.displayName;$("#nameModal").classList.remove("show");welcome();
};

$("#newChatBtn").onclick=createChat;$("#newTopBtn").onclick=createChat;

$("#memoryBtn").onclick=async()=>{
  closeDrawer();const d=await api("/api/memories");const box=$("#memoryList");box.innerHTML="";
  if(!d.memories.length)box.innerHTML='<div class="empty">A Zulu ainda não guardou nenhuma informação útil sobre você.</div>';
  for(const m of d.memories){
    const card=document.createElement("div");card.className="memoryCard";
    card.innerHTML=`<small>${escapeHtml(m.category)}</small><br><b>${escapeHtml(m.memory_key)}</b><p>${escapeHtml(m.memory_value)}</p>`;
    box.appendChild(card);
  }
  $("#memoryPanel").classList.add("open");overlay.classList.add("show");
};
$("#closeMemory").onclick=()=>{$("#memoryPanel").classList.remove("open");overlay.classList.remove("show")};

function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

// Gestures: swipe from left edge to right OR swipe left across header opens drawer.
let sx=0,sy=0;
document.addEventListener("touchstart",e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY},{passive:true});
document.addEventListener("touchend",e=>{
 const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;
 if(Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)){
   if((sx<45 && dx>0) || dx<0) openDrawer();
 }
},{passive:true});

(async()=>{
  try{
    await ensureAuth();
    $("#status").textContent="Online";
    await loadChats();
    if(state.chats.length) await openChat(state.chats[0].id); else welcome();
  }catch(e){console.error(e);$("#status").textContent="Sem conexão";welcome()}
})();
