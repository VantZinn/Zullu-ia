const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let sbClient = null;
let authFlow = { mode: null, email: null };
const state = {
  session: null,
  me: null,
  chats: [],
  chatId: null
};

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 3200);
}

async function loadConfig() {
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    throw new Error("Biblioteca de login não carregou. Atualize a página.");
  }

  const r = await fetch("/api/config", { cache: "no-store" });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Configuração indisponível");

  sbClient = window.supabase.createClient(d.supabaseUrl, d.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
}

async function api(path, opt = {}) {
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session?.access_token) throw new Error("Sessão necessária");

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session.access_token}`,
    ...(opt.headers || {})
  };

  const r = await fetch(path, { ...opt, headers });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(d.error || `HTTP ${r.status}`);
    e.status = r.status;
    e.data = d;
    throw e;
  }
  return d;
}

function setTheme(theme, saveLocal = true) {
  document.body.dataset.theme = theme === "light" ? "light" : "dark";
  $("#themeToggle").checked = theme === "light";
  if (saveLocal) localStorage.setItem("zulu_theme", theme);
}

function showAuth() {
  $("#authView").classList.remove("hidden");
  $("#appView").classList.add("hidden");
  closeDrawer();
}

function showApp() {
  $("#authView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
}

function openModal(id) { $(id).classList.add("show"); }
function closeModal(id) { $(id).classList.remove("show"); }

$$("[data-tab]").forEach(btn => {
  btn.onclick = () => {
    $$("[data-tab]").forEach(b => b.classList.toggle("active", b === btn));
    $("#loginPane").classList.toggle("active", btn.dataset.tab === "login");
    $("#signupPane").classList.toggle("active", btn.dataset.tab === "signup");
  };
});

$$("[data-eye]").forEach(btn => {
  btn.onclick = () => {
    const inp = $("#" + btn.dataset.eye);
    inp.type = inp.type === "password" ? "text" : "password";
  };
});

$("#loginBtn").onclick = async () => {
  try {
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;
    if (!email || !password) return toast("Preencha e-mail e senha.");
    $("#loginBtn").disabled = true;

    const { error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (e) {
    toast(e.message || "Não foi possível entrar.");
  } finally {
    $("#loginBtn").disabled = false;
  }
};

$("#signupBtn").onclick = async () => {
  try {
    const email = $("#signupEmail").value.trim();
    const password = $("#signupPassword").value;
    if (!email || !password) return toast("Preencha e-mail e senha.");
    $("#signupBtn").disabled = true;

    const { data, error } = await sbClient.auth.signUp({ email, password });
    if (error) throw error;

    if (data.session) {
      await afterLogin();
      return;
    }

    authFlow = { mode: "signup", email };
    $("#otpTitle").textContent = "Confirme seu e-mail 💜";
    $("#otpText").textContent = `Digite o código de 8 dígitos enviado para ${email}.`;
    $("#otpCode").value = "";
    openModal("#otpView");
  } catch (e) {
    toast(e.message || "Não foi possível criar a conta.");
  } finally {
    $("#signupBtn").disabled = false;
  }
};

$("#forgotBtn").onclick = async () => {
  const email = $("#loginEmail").value.trim();
  if (!email) return toast("Digite seu e-mail primeiro.");
  try {
    const { error } = await sbClient.auth.resetPasswordForEmail(email);
    if (error) throw error;
    authFlow = { mode: "recovery", email };
    $("#otpTitle").textContent = "Recuperar senha 🔐";
    $("#otpText").textContent = `Digite o código enviado para ${email}.`;
    $("#otpCode").value = "";
    openModal("#otpView");
  } catch (e) {
    toast(e.message || "Não foi possível enviar o código.");
  }
};

$("#otpConfirmBtn").onclick = async () => {
  const token = $("#otpCode").value.replace(/\D/g, "");
  if (token.length < 6) return toast("Digite o código completo.");

  try {
    $("#otpConfirmBtn").disabled = true;
    const type = authFlow.mode === "recovery" ? "recovery" : "signup";
    const { error } = await sbClient.auth.verifyOtp({
      email: authFlow.email,
      token,
      type
    });
    if (error) throw error;

    closeModal("#otpView");
    if (authFlow.mode === "recovery") {
      openModal("#newPasswordView");
    } else {
      toast("E-mail confirmado! 💜");
      await afterLogin();
    }
  } catch (e) {
    toast(e.message || "Código inválido ou expirado.");
  } finally {
    $("#otpConfirmBtn").disabled = false;
  }
};

$("#otpBackBtn").onclick = () => closeModal("#otpView");

$("#savePasswordBtn").onclick = async () => {
  const p1 = $("#newPassword").value;
  const p2 = $("#newPassword2").value;
  if (p1.length < 8) return toast("A senha precisa ter pelo menos 8 caracteres.");
  if (p1 !== p2) return toast("As senhas não são iguais.");

  try {
    const { error } = await sbClient.auth.updateUser({ password: p1 });
    if (error) throw error;
    closeModal("#newPasswordView");
    toast("Senha alterada com sucesso.");
    await afterLogin();
  } catch (e) {
    toast(e.message || "Não foi possível alterar a senha.");
  }
};

async function oauth(provider) {
  try {
    const { error } = await sbClient.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
  } catch (e) {
    toast(`${provider === "google" ? "Google" : "Facebook"} ainda não está disponível: ${e.message}`);
  }
}
$("#googleBtn").onclick = () => oauth("google");
$("#facebookBtn").onclick = () => oauth("facebook");

async function afterLogin() {
  try {
    showApp();
    const d = await api("/api/me");
    state.me = d;

    const theme = d.settings?.theme || localStorage.getItem("zulu_theme") || "dark";
    setTheme(theme);

    $("#settingsName").value = d.profile?.display_name || "";
    $("#accountEmail").textContent = `E-mail: ${d.user?.email || "não disponível"}`;
    const providers = (d.user?.identities || []).join(", ") || "email";
    $("#accountProvider").textContent = `Login: ${providers}`;

    const hasPasswordProvider = (d.user?.identities || []).includes("email");
    $("#changePasswordBtn").style.display = hasPasswordProvider ? "" : "none";

    await loadChats();

    if (!d.profile?.name_confirmed) {
      $("#nameInput").value = d.profile?.display_name || "";
      openModal("#nameModal");
    } else if (state.chats.length) {
      await openChat(state.chats[0].id);
    } else {
      welcome();
    }
  } catch (e) {
    console.error(e);
    toast(e.message || "Erro ao carregar sua conta.");
  }
}

$("#saveNameBtn").onclick = async () => {
  const name = $("#nameInput").value.trim();
  if (!name) return toast("Digite como você quer ser chamado.");
  try {
    await saveDisplayName(name);
    closeModal("#nameModal");
    welcome();
  } catch (e) {
    toast(e.message);
  }
};

async function saveDisplayName(name) {
  const d = await api("/api/profile", {
    method: "PATCH",
    body: JSON.stringify({ displayName: name })
  });
  state.me.profile.display_name = d.profile.display_name;
  state.me.profile.name_confirmed = true;
  $("#settingsName").value = d.profile.display_name;
}

const drawer = $("#drawer"), overlay = $("#overlay"), messages = $("#messages"), input = $("#input");

function openDrawer() { drawer.classList.add("open"); overlay.classList.add("show"); }
function closeDrawer() { drawer.classList.remove("open"); overlay.classList.remove("show"); }
function closeSheets() {
  $("#memoryPanel").classList.remove("open");
  $("#settingsPanel").classList.remove("open");
}
$("#menuBtn").onclick = openDrawer;
$("#closeDrawer").onclick = closeDrawer;
overlay.onclick = () => { closeDrawer(); closeSheets(); overlay.classList.remove("show"); };

function addBubble(text, role, time = "") {
  const row = document.createElement("div");
  row.className = `msgRow ${role}`;

  if (role === "assistant") {
    const img = document.createElement("img");
    img.src = "zulu-avatar.png";
    img.className = "msgAvatar";
    row.appendChild(img);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  if (time) {
    const t = document.createElement("div");
    t.className = "time";
    t.textContent = time;
    bubble.appendChild(t);
  }

  row.appendChild(bubble);
  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
  return bubble;
}

function welcome() {
  messages.innerHTML = "";
  const name = state.me?.profile?.display_name || "";
  addBubble(
    name
      ? `Oi, ${name}! 💜 Como posso te ajudar hoje?`
      : "Oi! Eu sou a Zulu 💜 Como você gostaria que eu te chamasse?",
    "assistant"
  );
}

async function createChat() {
  const d = await api("/api/chats", { method: "POST" });
  state.chatId = d.chat.id;
  await loadChats();
  welcome();
  closeDrawer();
}

async function loadChats() {
  const d = await api("/api/chats");
  state.chats = d.chats || [];
  const box = $("#chatList");
  box.innerHTML = "";

  if (!state.chats.length) {
    box.innerHTML = '<div class="empty">Nenhuma conversa ainda.</div>';
    return;
  }

  for (const c of state.chats) {
    const item = document.createElement("div");
    item.className = "chatItem" + (c.id === state.chatId ? " active" : "");

    const title = document.createElement("div");
    title.className = "chatTitle";
    title.textContent = c.title;

    const del = document.createElement("button");
    del.textContent = "×";
    del.onclick = async ev => {
      ev.stopPropagation();
      if (!confirm("Excluir este chat?")) return;
      await api(`/api/chats/${c.id}`, { method: "DELETE" });
      if (state.chatId === c.id) {
        state.chatId = null;
        welcome();
      }
      await loadChats();
    };

    item.append(title, del);
    item.onclick = () => openChat(c.id);
    box.appendChild(item);
  }
}

async function openChat(id) {
  const d = await api(`/api/chats/${id}`);
  state.chatId = id;
  messages.innerHTML = "";

  if (!d.messages.length) {
    welcome();
  } else {
    for (const m of d.messages) {
      const time = m.created_at
        ? new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : "";
      addBubble(m.content, m.role, time);
    }
  }

  await loadChats();
  closeDrawer();
}

async function send() {
  const text = input.value.trim();
  if (!text) return;

  if (!state.chatId) await createChat();

  addBubble(text, "user");
  input.value = "";
  resize();

  const typing = addBubble("Digitando...", "assistant");
  typing.classList.add("typing");
  $("#sendBtn").disabled = true;

  try {
    const d = await api(`/api/chats/${state.chatId}/message`, {
      method: "POST",
      body: JSON.stringify({ message: text })
    });

    typing.textContent = d.reply;
    typing.classList.remove("typing");
    await loadChats();
  } catch (e) {
    typing.textContent = e.data?.code === "NAME_REQUIRED"
      ? "Antes da gente continuar, como você gostaria que eu te chamasse? 💜"
      : "Não consegui responder agora. Tente novamente em instantes.";

    if (e.data?.code === "NAME_REQUIRED") openModal("#nameModal");
  } finally {
    $("#sendBtn").disabled = false;
    messages.scrollTop = messages.scrollHeight;
  }
}

$("#composer").onsubmit = e => { e.preventDefault(); send(); };
function resize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 140) + "px"; }
input.oninput = resize;
$("#newChatBtn").onclick = createChat;
$("#newTopBtn").onclick = createChat;

$("#memoryBtn").onclick = async () => {
  closeDrawer();
  const d = await api("/api/memories");
  const box = $("#memoryList");
  box.innerHTML = "";

  if (!d.memories.length) {
    box.innerHTML = '<div class="empty">A Zulu ainda não guardou nenhuma informação útil sobre você.</div>';
  }

  for (const m of d.memories) {
    const card = document.createElement("div");
    card.className = "memoryCard";

    const del = document.createElement("button");
    del.className = "memoryDelete";
    del.textContent = "×";
    del.onclick = async () => {
      await api(`/api/memories/${m.id}`, { method: "DELETE" });
      card.remove();
    };

    const small = document.createElement("small");
    small.textContent = m.category;
    const b = document.createElement("b");
    b.textContent = m.memory_key;
    const p = document.createElement("p");
    p.textContent = m.memory_value;

    card.append(del, small, document.createElement("br"), b, p);
    box.appendChild(card);
  }

  $("#memoryPanel").classList.add("open");
  overlay.classList.add("show");
};
$("#closeMemory").onclick = () => { $("#memoryPanel").classList.remove("open"); overlay.classList.remove("show"); };

$("#settingsBtn").onclick = () => {
  closeDrawer();
  $("#settingsPanel").classList.add("open");
  overlay.classList.add("show");
};
$("#closeSettings").onclick = () => { $("#settingsPanel").classList.remove("open"); overlay.classList.remove("show"); };

$("#themeToggle").onchange = async e => {
  const theme = e.target.checked ? "light" : "dark";
  setTheme(theme);
  try {
    await api("/api/settings", { method: "PATCH", body: JSON.stringify({ theme }) });
    state.me.settings.theme = theme;
  } catch (err) {
    toast("Não consegui salvar o tema na conta.");
  }
};

$("#saveNameSettings").onclick = async () => {
  const name = $("#settingsName").value.trim();
  if (!name) return toast("Digite um nome ou apelido.");
  try {
    await saveDisplayName(name);
    toast("Nome atualizado 💜");
  } catch (e) {
    toast(e.message || "Não consegui atualizar.");
  }
};

$("#changePasswordBtn").onclick = async () => {
  const email = state.me?.user?.email;
  if (!email) return toast("Não encontrei um e-mail nesta conta.");
  try {
    const { error } = await sbClient.auth.resetPasswordForEmail(email);
    if (error) throw error;
    authFlow = { mode: "recovery", email };
    $("#otpTitle").textContent = "Verificação de segurança 🔐";
    $("#otpText").textContent = `Enviamos um código para ${email}. Confirme antes de alterar sua senha.`;
    $("#otpCode").value = "";
    closeSheets();
    overlay.classList.remove("show");
    openModal("#otpView");
  } catch (e) {
    toast(e.message || "Não consegui enviar o código.");
  }
};

$("#logoutBtn").onclick = async () => {
  await sbClient.auth.signOut();
  state.me = null;
  state.chatId = null;
  state.chats = [];
  messages.innerHTML = "";
  closeSheets();
  overlay.classList.remove("show");
  showAuth();
  toast("Você saiu da sua conta.");
};

// Gesto: deslizar a partir da borda esquerda para abrir o menu.
// Também aceita um swipe horizontal para a esquerda, conforme pedido.
let sx = 0, sy = 0;
document.addEventListener("touchstart", e => {
  const t = e.touches[0];
  sx = t.clientX;
  sy = t.clientY;
}, { passive: true });

document.addEventListener("touchend", e => {
  const t = e.changedTouches[0];
  const dx = t.clientX - sx;
  const dy = t.clientY - sy;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) {
    if ((sx < 45 && dx > 0) || dx < 0) openDrawer();
  }
}, { passive: true });

(async () => {
  document.documentElement.dataset.zuluJs = "ok";
  setTheme(localStorage.getItem("zulu_theme") || "dark", false);

  try {
    await loadConfig();

    sbClient.auth.onAuthStateChange(async (event, session) => {
      state.session = session;
      if (event === "SIGNED_OUT") {
        showAuth();
        return;
      }
      if (session && ["SIGNED_IN", "TOKEN_REFRESHED", "INITIAL_SESSION"].includes(event)) {
        await afterLogin();
      }
    });

    const { data: { session } } = await sbClient.auth.getSession();
    state.session = session;

    if (session) await afterLogin();
    else showAuth();
  } catch (e) {
    console.error(e);
    showAuth();
    toast("Servidor da Zulu ainda não está configurado para contas.");
  }
})();
