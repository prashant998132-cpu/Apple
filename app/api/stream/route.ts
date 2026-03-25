// JARVIS AI STREAM v39 — Claude Haiku Added
import { NextRequest } from 'next/server';

function sse(t) { return `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`; }
function done() { return 'data: [DONE]\n\n'; }

function cleanChunk(text) {
  return text
    .replace(/<\|[^|>]*\|>/g, '')
    .replace(/---\s*\n?Support Pollinations\.AI:[\s\S]*?accessible for everyone\./gi, '')
    .replace(/Support Pollinations\.AI:[\s\S]*?accessible for everyone\./gi, '')
    .replace(/🌸\s*Ad\s*🌸[\s\S]*?accessible for everyone\./gi, '')
    .replace(/Pollinations\.AI free text APIs\./gi, '')
    .replace(/\[\s*Pollinations[^\]]*\]/gi, '');
}

class AdFilter {
  constructor() { this.buffer = ''; this.adDetected = false; }
  filter(chunk) {
    if (this.adDetected) return '';
    this.buffer += chunk;
    const adStart = this.buffer.search(/---\s*\n?Support Pollinations|Support Pollinations\.AI:|🌸\s*Ad\s*🌸/i);
    if (adStart !== -1) {
      this.adDetected = true;
      const clean = this.buffer.slice(0, adStart);
      this.buffer = ''; return cleanChunk(clean);
    }
    const safeEnd = Math.max(0, this.buffer.length - 50);
    const safeToEmit = this.buffer.slice(0, safeEnd);
    this.buffer = this.buffer.slice(safeEnd);
    return cleanChunk(safeToEmit);
  }
  flush() {
    if (this.adDetected) return '';
    const result = cleanChunk(this.buffer); this.buffer = ''; return result;
  }
}

async function* streamGroq(messages, model, key) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, stream: true, max_tokens: 1500, temperature: 0.7 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  yield* streamSSE(r);
}

async function* streamGemini(messages, system, key) {
  const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: system }] }, generationConfig: { maxOutputTokens: 1500 } }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
  while (true) {
    const { done: d, value } = await reader.read(); if (d) break;
    buf += dec.decode(value); const lines = buf.split('\n'); buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try { const t = JSON.parse(line.slice(6))?.candidates?.[0]?.content?.parts?.[0]?.text; if (t) yield t; } catch {}
    }
  }
}

async function* streamClaude(messages, system, key) {
  const claudeMsgs = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));
  if (!claudeMsgs.length) throw new Error('No messages');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 1500, system: system || 'You are JARVIS, a helpful AI assistant. Respond in Hinglish.', messages: claudeMsgs, stream: true }),
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}`);
  const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
  while (true) {
    const { done: d, value } = await reader.read(); if (d) break;
    buf += dec.decode(value); const lines = buf.split('\n'); buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      try { const j = JSON.parse(data); if (j.type === 'content_block_delta' && j.delta?.text) yield j.delta.text; } catch {}
    }
  }
}

async function* streamCerebras(messages, key) {
  const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'llama3.1-70b', messages, stream: true, max_tokens: 2048, temperature: 0.7 }),
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error(`Cerebras ${r.status}`);
  yield* streamSSE(r);
}

async function* streamMistral(messages, key) {
  const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'mistral-small-latest', messages, stream: true, max_tokens: 1500 }),
    signal: AbortSignal.timeout(18000),
  });
  if (!r.ok) throw new Error(`Mistral ${r.status}`);
  yield* streamSSE(r);
}

async function* streamOpenRouter(messages, key, model = 'moonshotai/kimi-k2-instruct:free') {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': 'https://apple-v10.vercel.app' },
    body: JSON.stringify({ model, messages, stream: true, max_tokens: 1500 }),
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) throw new Error(`OpenRouter ${r.status}`);
  yield* streamSSE(r);
}

async function* streamTogether(messages, key) {
  const r = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', messages, stream: true, max_tokens: 1500 }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`Together ${r.status}`);
  yield* streamSSE(r);
}

async function* streamDeepSeek(messages, key) {
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages, stream: true, max_tokens: 1500 }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}`);
  yield* streamSSE(r);
}

async function* streamPollinations(messages) {
  const urls = ['https://text.pollinations.ai/openai','https://api.pollinations.ai/v1/chat/completions'];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'openai', messages, stream: true, max_tokens: 1200 }),
        signal: AbortSignal.timeout(25000),
      });
      if (!r.ok) continue;
      const filter = new AdFilter();
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
      while (true) {
        const { done: d, value } = await reader.read(); if (d) break;
        buf += dec.decode(value); const lines = buf.split('\n'); buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6); if (data === '[DONE]') { yield filter.flush(); return; }
          try { const t = JSON.parse(data)?.choices?.[0]?.delta?.content; if (t) { const clean = filter.filter(t); if (clean) yield clean; } } catch {}
        }
      }
      const rem = filter.flush(); if (rem) yield rem; return;
    } catch {}
  }
  throw new Error('Pollinations failed');
}

async function* streamSSE(r) {
  const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
  while (true) {
    const { done: d, value } = await reader.read(); if (d) break;
    buf += dec.decode(value); const lines = buf.split('\n'); buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6); if (data === '[DONE]') return;
      try { const t = JSON.parse(data)?.choices?.[0]?.delta?.content; if (t) yield t; } catch {}
    }
  }
}

export async function POST(req) {
  const { messages, system, mode } = await req.json();
  const groqKey     = process.env.GROQ_API_KEY;
  const geminiKey   = process.env.GEMINI_API_KEY;
  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  const mistralKey  = process.env.MISTRAL_API_KEY;
  const orKey       = process.env.OPENROUTER_API_KEY;
  const togetherKey = process.env.TOGETHER_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const claudeKey   = process.env.ANTHROPIC_API_KEY;
  const allMsgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = chunk => controller.enqueue(encoder.encode(chunk));
      const providers = [];

      if (mode === 'think') {
        if (claudeKey) providers.push({ name: 'Claude', gen: () => streamClaude(messages, system || '', claudeKey) });
        if (groqKey)   providers.push({ name: 'Groq-R1', gen: () => streamGroq(allMsgs, 'deepseek-r1-distill-llama-70b', groqKey) });
        if (deepseekKey) providers.push({ name: 'DeepSeek', gen: () => streamDeepSeek(allMsgs, deepseekKey) });
        if (geminiKey) providers.push({ name: 'Gemini', gen: () => streamGemini(messages, system || '', geminiKey) });
      } else if (mode === 'deep') {
        if (claudeKey)   providers.push({ name: 'Claude', gen: () => streamClaude(messages, system || '', claudeKey) });
        if (geminiKey)   providers.push({ name: 'Gemini', gen: () => streamGemini(messages, system || '', geminiKey) });
        if (togetherKey) providers.push({ name: 'Together', gen: () => streamTogether(allMsgs, togetherKey) });
        if (deepseekKey) providers.push({ name: 'DeepSeek', gen: () => streamDeepSeek(allMsgs, deepseekKey) });
      } else {
        if (groqKey)     providers.push({ name: 'Groq', gen: () => streamGroq(allMsgs, 'llama-3.3-70b-versatile', groqKey) });
        if (claudeKey)   providers.push({ name: 'Claude', gen: () => streamClaude(messages, system || '', claudeKey) });
        if (cerebrasKey) providers.push({ name: 'Cerebras', gen: () => streamCerebras(allMsgs, cerebrasKey) });
        if (geminiKey)   providers.push({ name: 'Gemini', gen: () => streamGemini(messages, system || '', geminiKey) });
      }

      if (togetherKey) providers.push({ name: 'Together', gen: () => streamTogether(allMsgs, togetherKey) });
      if (mistralKey)  providers.push({ name: 'Mistral', gen: () => streamMistral(allMsgs, mistralKey) });
      if (orKey)       providers.push({ name: 'Kimi-K2', gen: () => streamOpenRouter(allMsgs, orKey, 'moonshotai/kimi-k2-instruct:free') });
      if (orKey)       providers.push({ name: 'OR-Gemma', gen: () => streamOpenRouter(allMsgs, orKey, 'google/gemma-3-27b-it:free') });
      providers.push({ name: 'Pollinations', gen: () => streamPollinations(allMsgs) });

      for (const p of providers) {
        try {
          let hasOutput = false;
          for await (const chunk of p.gen()) { if (chunk) { send(sse(chunk)); hasOutput = true; } }
          if (hasOutput) { send(done()); controller.close(); return; }
        } catch (e) { console.warn(`[${p.name}] failed:`, e.message?.slice(0, 80)); }
      }
      send(sse('Connectivity issue. Dobara try karo 📶')); send(done()); controller.close();
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' } });
}
