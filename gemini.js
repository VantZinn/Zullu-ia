'use strict';
const SYSTEM_BASE = require('./prompt');
const { problem } = require('./attachments');
function outputLimit() { const n = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 32768); return Math.max(1024, Math.min(65536, Number.isFinite(n) ? n : 32768)); }
async function request(contents, system, config, stream, signal, fetcher = fetch) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw problem('A chave da IA ainda não foi configurada no servidor.', 503);
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${stream ? 'streamGenerateContent?alt=sse' : 'generateContent'}`;
  const response = await fetcher(url, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: config.temperature ?? 0.65, maxOutputTokens: config.maxOutputTokens ?? outputLimit() } })
  });
  if (!response.ok) {
    await response.body?.cancel();
    const msg = response.status === 429 ? 'O limite da IA foi atingido. Aguarde e tente novamente.' : response.status === 404 ? 'O modelo configurado não está disponível. Confira GEMINI_MODEL no servidor.' : response.status === 401 || response.status === 403 ? 'A chave da IA não tem acesso ao modelo. Confira a configuração do servidor.' : 'O serviço de IA está indisponível. Tente novamente.';
    throw problem(msg, response.status === 429 ? 429 : 502);
  }
  return response;
}
function visibleText(data) { return (data.candidates?.[0]?.content?.parts || []).filter(p => !p.thought && typeof p.text === 'string').map(p => p.text).join(''); }
async function gemini(contents, system = SYSTEM_BASE, config = {}) {
  const r = await request(contents, system, config, false, AbortSignal.timeout(45000));
  return visibleText(await r.json()).trim();
}
async function* sseData(body) {
  if (!body) throw problem('O serviço de IA não enviou uma resposta.', 502);
  const reader = body.getReader(), decoder = new TextDecoder(); let pending = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      pending = pending.replace(/\r\n/g, '\n');
      let pos;
      while ((pos = pending.indexOf('\n\n')) >= 0) {
        const event = pending.slice(0, pos); pending = pending.slice(pos + 2);
        const data = event.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
        if (data && data !== '[DONE]') yield JSON.parse(data);
      }
      if (pending.length > 4 * 1024 * 1024) throw problem('Resposta da IA excedeu o limite de leitura.', 502);
      if (done) break;
    }
    const tail = pending.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n').trim();
    if (tail && tail !== '[DONE]') yield JSON.parse(tail);
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
async function streamGemini(contents, system, { signal, onDelta, fetcher } = {}) {
  const combined = AbortSignal.any([signal || new AbortController().signal, AbortSignal.timeout(180000)]);
  const r = await request(contents, system, {}, true, combined, fetcher);
  let text = '', finishReason = '', blocked = false;
  for await (const data of sseData(r.body)) {
    if (data.error) throw problem('A IA interrompeu a resposta. Tente novamente.', 502);
    if (data.promptFeedback?.blockReason) blocked = true;
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason) finishReason = candidate.finishReason;
    const delta = visibleText(data);
    if (delta) { text += delta; if (text.length > 600000) throw problem('A resposta ultrapassou o limite. Divida o pedido.', 413); await onDelta?.(delta); }
  }
  if (blocked || ['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII'].includes(finishReason)) throw problem('A IA não conseguiu responder a este pedido. Reformule a mensagem.', 422);
  if (!finishReason) throw problem('A conexão com a IA terminou antes de concluir a resposta. Tente novamente.', 502);
  if (!text.trim()) throw problem('A IA retornou uma resposta vazia. Tente novamente.', 502);
  return { text, finishReason, limited: finishReason === 'MAX_TOKENS' };
}
module.exports = { gemini, streamGemini, sseData, visibleText };
