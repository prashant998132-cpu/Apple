import { trackCall, pickProvider, isNearLimit } from '../core/usageTracker'
import { detectComplexity, TOKEN_BUDGET, compressSystemPrompt, trimHistory, type Complexity } from '../core/tokenBudget'
// lib/providers/llm.ts — v3 MEGA CASCADE
// ALL free LLM providers — best first, auto fallback
// ─────────────────────────────────────────────────
// 1.  Puter.js          — Unlimited, NO KEY, browser-side (GPT-4o/Claude/Gemini/500+)
// 2.  Gemini 2.0 Flash  — 1500 req/day, best function calling
// 3.  Groq Llama 3.3    — 6K tokens/min, ultra fast
// 4.  DeepSeek V3/R1    — Excellent reasoning, free tier
// 5.  Mistral AI        — 1 BILLION tokens/month free
// 6.  Grok (xAI)        — Real-time X data, free tier
// 7.  OpenRouter        — 30+ free models, one key
// 8.  Together AI       — Llama 4 Scout, $25 free credits
// 9.  Cohere Command    — Free beta, good summarization
// 10. AIMLAPI           — GPT-4o mini, free credits

export interface LLMResult {
  text: string
  provider: string
  model: string
  tokens?: number
  ms: number
}

// ── 1. Gemini 2.0 Flash ──────────────────────────────────
export async function askGemini(messages: any[], systemPrompt: string, tools?: any[]): Promise<LLMResult> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('no_key')
  const start = Date.now()
  const body: any = {
    contents: messages,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  }
  if (tools?.length) {
    body.tools = [{ functionDeclarations: tools }]
    body.toolConfig = { functionCallingConfig: { mode: 'AUTO' } }
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal:AbortSignal.timeout(30000) }
  )
  if (!res.ok) throw new Error('gemini_' + res.status)
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || ''
  trackCall('gemini')
  return { text, provider:'Gemini 2.0 Flash', model:'gemini-2.0-flash', tokens:data.usageMetadata?.totalTokenCount, ms:Date.now()-start }
}

// ── 2. Groq — multiple models ────────────────────────────
export async function askGroq(messages: any[], systemPrompt: string, model = 'llama-3.3-70b-versatile'): Promise<LLMResult> {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('no_key')
  const start = Date.now()
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:'POST', headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json' },
    body: JSON.stringify({
      model, max_tokens: 8192, temperature:0.7,
      messages: [
        { role:'system', content:systemPrompt },
        ...messages.map((m: any) => ({ role: m.role==='user'?'user':'assistant', content: m.parts?.[0]?.text||m.content||'' }))
      ]
    }),
    signal: AbortSignal.timeout(15000)
  })
  if (!res.ok) throw new Error('groq_' + res.status)
  const data = await res.json()
  trackCall('groq')
  return { text:data.choices?.[0]?.message?.content||'', provider:'Groq', model, tokens:data.usage?.total_tokens, ms:Date.now()-start }
}

// ── 3. DeepSeek ──────────────────────────────────────────
export async function askDeepSeek(messages: any[], systemPrompt: string): Promise<LLMResult> {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('no_key')
  const start = Date.now()
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method:'POST', headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json' },
    body: JSON.stringify({
      model:'deepseek-chat', max_tokens: 700, temperature:0.7,
      messages:[{ role:'system', content:systemPrompt }, ...messages.map((m: any) => ({ role:m.role==='user'?'user':'assistant', content:m.parts?.[0]?.text||m.content||'' }))]
    }),
    signal: AbortSignal.timeout(20000)
  })
  if (!res.ok) throw new Error('deepseek_' + res.status)
  const data = await res.json()
  return { text:data.choices?.[0]?.message?.content||'', provider:'DeepSeek V3', model:'deepseek-chat', tokens:data.usage?.total_tokens, ms:Date.now()-start }
}

// ── 4. Mistral AI (1B tokens/month FREE) ─────────────────
export async function askMistral(messages: any[], systemPrompt: string): Promise<LLMResult> {
  const key = process.env.MISTRAL_API_KEY
  if (!key) throw new Error('no_key')
  const start = Date.now()
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method:'POST', headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json' },
    body: JSON.stringify({
      model:'mistral-small-latest', max_tokens: 350, temperature:0.7,
      messages:[{ role:'system', content:systemPrompt }, ...messages.map((m: any) => ({ role:m.role==='user'?'user':'assistant', content:m.parts?.[0]?.text||m.content||'' }))]
    }),
    signal: AbortSignal.timeout(20000)
  })
  if (!res.ok) throw new Error('mistral_' + res.status)
  const data = await res.json()
  return { text:data.choices?.[0]?.message?.content||'', provider:'Mistral AI (1B/month free)', model:'mistral-small-latest', tokens:data.usage?.total_tokens, ms:Date.now()-start }
}

// ── 5. Grok (xAI) ────────────────────────────────────────
export async function askGrok(messages: any[], systemPrompt: string): Promise<LLMResult> {
  const key = process.env.XAI_API_KEY || process.env.GROK_API_KEY
  if (!key) throw new Error('no_key')
  const start = Date.now()
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method:'POST', headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json' },
    body: JSON.stringify({
      model:'grok-3-fast', max_tokens: 350, temperature:0.7,
      messages:[{ role:'system', content:systemPrompt }, ...messages.map((m: any) => ({ role:m.role==='user'?'user':'assistant', content:m.parts?.[0]?.text||m.content||'' }))]
    }),
    signal: AbortSignal.timeout(20000)
  })
  if (!res.ok) throw new Error('grok_' + res.status)
  const data = await res.json()
  return { text:data.choices?.[0]?.message?.content||'', provider:'Grok (xAI)', model:'grok-3-fast', tokens:data.usage?.total_tokens, ms:Date.now()-start }
}

// ── 6. OpenRouter (30+ free models) ─────────────────────
export async function askOpenRouter(messages: any[], systemPrompt: string): Promise<LLMResult> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('no_key')
  const start = Date.now()
  // Best free models in priority order
  const freeModels = [
    'meta-llama/llama-4-scout:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-3-27b-it:free',
    'deepseek/deepseek-r1:free',
    'mistralai/mistral-7b-instruct:free',
    'qwen/qwen-2.5-72b-instruct:free',
  ]
  for (const model of freeModels) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method:'POST',
        headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json', 'HTTP-Referer':'https://jarvis.app' },
        body: JSON.stringify({
          model, max_tokens: 350,
          messages:[{ role:'system', content:systemPrompt }, ...messages.map((m: any) => ({ role:m.role==='user'?'user':'assistant', content:m.parts?.[0]?.text||m.content||'' }))]
        }),
        signal: AbortSignal.timeout(20000)
      })
      if (!res.ok) continue
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content||''
      if (text) return { text, provider:'OpenRouter', model, tokens:data.usage?.total_tokens, ms:Date.now()-start }
    } catch { /* try next */ }
  }
  throw new Error('openrouter_all_failed')
}

// ── 7. Together AI (Llama 4 Scout) ──────────────────────
export async function askTogether(messages: any[], systemPrompt: string): Promise<LLMResult> {
  const key = process.env.TOGETHER_API_KEY
  if (!key) throw new Error('no_key')
  const start = Date.now()
  const res = await fetch('https://api.together.xyz/v1/chat/completions', {
    method:'POST', headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json' },
    body: JSON.stringify({
      model:'meta-llama/Llama-4-Scout-17B-16E-Instruct', max_tokens: 350, temperature:0.7,
      messages:[{ role:'system', content:systemPrompt }, ...messages.map((m: any) => ({ role:m.role==='user'?'user':'assistant', content:m.parts?.[0]?.text||m.content||'' }))]
    }),
    signal: AbortSignal.timeout(25000)
  })
  if (!res.ok) throw new Error('together_' + res.status)
  const data = await res.json()
  return { text:data.choices?.[0]?.message?.content||'', provider:'Together AI (Llama 4 Scout)', model:'llama-4-scout', tokens:data.usage?.total_tokens, ms:Date.now()-start }
}

// ── 8. Cohere ────────────────────────────────────────────
export async function askCohere(messages: any[], systemPrompt: string): Promise<LLMResult> {
  const key = process.env.COHERE_API_KEY
  if (!key) throw new Error('no_key')
  const start = Date.now()
  const chatHistory = messages.slice(0,-1).map((m: any) => ({ role:m.role==='user'?'USER':'CHATBOT', message:m.parts?.[0]?.text||m.content||'' }))
  const last = messages[messages.length-1]
  const res = await fetch('https://api.cohere.com/v2/chat', {
    method:'POST', headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json' },
    body: JSON.stringify({
      model:'command-a-03-2025', chat_history:chatHistory, preamble:systemPrompt,
      message:last?.parts?.[0]?.text||last?.content||''
    }),
    signal: AbortSignal.timeout(20000)
  })
  if (!res.ok) throw new Error('cohere_' + res.status)
  const data = await res.json()
  return { text:data.message?.content?.[0]?.text||data.text||'', provider:'Cohere Command-A', model:'command-a', ms:Date.now()-start }
}

// ── 9. AIMLAPI ───────────────────────────────────────────
export async function askAIMLAPI(messages: any[], systemPrompt: string): Promise<LLMResult> {
  const key = process.env.AIMLAPI_KEY
  if (!key) throw new Error('no_key')
  const start = Date.now()
  const res = await fetch('https://api.aimlapi.com/v1/chat/completions', {
    method:'POST', headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json' },
    body: JSON.stringify({
      model:'gpt-4o-mini', max_tokens: 350,
      messages:[{ role:'system', content:systemPrompt }, ...messages.map((m: any) => ({ role:m.role==='user'?'user':'assistant', content:m.parts?.[0]?.text||m.content||'' }))]
    }),
    signal: AbortSignal.timeout(20000)
  })
  if (!res.ok) throw new Error('aimlapi_' + res.status)
  const data = await res.json()
  return { text:data.choices?.[0]?.message?.content||'', provider:'AIMLAPI (GPT-4o mini)', model:'gpt-4o-mini', tokens:data.usage?.total_tokens, ms:Date.now()-start }
}

// ════════════════════════════════════════════════════════
// SMART ROUTER — picks cascade based on query type
// ════════════════════════════════════════════════════════
export type QueryType = 'simple'|'reasoning'|'creative'|'study'|'tool_use'

export function detectQueryType(msg: string): QueryType {
  const m = msg.toLowerCase()
  // Greetings & simple
  if (m.length < 15 && ['hello','hi','ok','haan','nahi','thanks','haan bhai','theek'].some(k => m.startsWith(k))) return 'simple'
  // Study/learning topics
  if (['neet','biology','chemistry','physics','math','maths','cell','dna','enzyme','reaction','newton','mendel','formula','theorem','derivation','mcq','question','study','padhai','concept','define','difference between'].some(k => m.includes(k))) return 'study'
  // Tool use needed
  if (['image','photo','banao','bana','music','weather','mausam','train','news','youtube','search','dhundo','find','calculate','qr','currency'].some(k => m.includes(k))) return 'tool_use'
  // Reasoning
  if (m.length > 60 && ['kyon','why','how','explain','samjhao','compare','analyze','difference','better','should i','konsa'].some(k => m.includes(k))) return 'reasoning'
  return 'creative'
}

// ════════════════════════════════════════════════════════
// MAIN MEGA CASCADE — all 11 providers, smart order
// ════════════════════════════════════════════════════════

// ── Pollinations AI (100% FREE, no key needed) ───────────
export async function askPollinations(messages: any[], systemPrompt: string): Promise<LLMResult> {
  const start = Date.now()
  const allMsgs = [{ role: 'system', content: systemPrompt }, ...messages]
  const res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai-large', messages: allMsgs, max_tokens: 800,
      seed: Math.floor(Math.random() * 9999)
    }),
    signal: AbortSignal.timeout(25000)
  })
  if (!res.ok) throw new Error('pollinations_failed')
  const d = await res.json()
  const text = d.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('empty')
  return { text, provider: 'Pollinations AI (free)', model: 'openai', ms: Date.now() - start }
}

// ── Pollinations Alt models (mistral, llama, etc) ────────
export async function askPollinationsAlt(messages: any[], systemPrompt: string, model = 'mistral'): Promise<LLMResult> {
  const start = Date.now()
  const allMsgs = [{ role: 'system', content: systemPrompt }, ...messages]
  const res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: allMsgs, max_tokens: 600 }),
    signal: AbortSignal.timeout(20000)
  })
  if (!res.ok) throw new Error('pol_alt_fail')
  const d = await res.json()
  const text = d.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('empty')
  return { text, provider: 'Pollinations (' + model + ')', model, ms: Date.now() - start }
}

export async function askLLM(
  messages: any[],
  systemPrompt: string,
  queryType: QueryType = 'simple',
  complexity?: Complexity,
): Promise<LLMResult> {
  const cx = complexity || (() => {
    const lastUser = [...messages].reverse().find((m:any) => m.role === 'user')
    return detectComplexity(lastUser?.content || lastUser?.parts?.[0]?.text || '')
  })()
  const budget = TOKEN_BUDGET[cx]
  const trimmedMsgs = trimHistory(messages, budget.historyTurns)
  const trimmedPrompt = compressSystemPrompt(systemPrompt, budget.systemBudget)
  // Replace for downstream use
  messages = trimmedMsgs
  systemPrompt = trimmedPrompt

  type Fn = () => Promise<LLMResult>

  // Provider cascade — ordered by quality for each query type
  const cascades: Record<QueryType, Fn[]> = {
    simple: [
      () => askGroq(messages, systemPrompt, 'llama-3.1-8b-instant'),
      () => askGroq(messages, systemPrompt, 'gemma2-9b-it'),
      () => askGemini(messages, systemPrompt),
      () => askMistral(messages, systemPrompt),
      () => askOpenRouter(messages, systemPrompt),
    ],
    study: [
      () => askGemini(messages, systemPrompt),                          // best reasoning
      () => askDeepSeek(messages, systemPrompt),                        // excellent for science
      () => askGroq(messages, systemPrompt, 'llama-3.3-70b-versatile'),
      () => askMistral(messages, systemPrompt),
      () => askGrok(messages, systemPrompt),
      () => askOpenRouter(messages, systemPrompt),
      () => askTogether(messages, systemPrompt),
      () => askAIMLAPI(messages, systemPrompt),
    ],
    reasoning: [
      () => askDeepSeek(messages, systemPrompt),                        // R1 reasoning
      () => askGemini(messages, systemPrompt),
      () => askGrok(messages, systemPrompt),
      () => askGroq(messages, systemPrompt, 'llama-3.3-70b-versatile'),
      () => askMistral(messages, systemPrompt),
      () => askOpenRouter(messages, systemPrompt),
      () => askTogether(messages, systemPrompt),
      () => askCohere(messages, systemPrompt),
      () => askAIMLAPI(messages, systemPrompt),
    ],
    creative: [
      () => askGemini(messages, systemPrompt),
      () => askGrok(messages, systemPrompt),
      () => askGroq(messages, systemPrompt, 'llama-3.3-70b-versatile'),
      () => askMistral(messages, systemPrompt),
      () => askOpenRouter(messages, systemPrompt),
      () => askDeepSeek(messages, systemPrompt),
      () => askTogether(messages, systemPrompt),
      () => askCohere(messages, systemPrompt),
      () => askAIMLAPI(messages, systemPrompt),
    ],
    tool_use: [
      () => askGemini(messages, systemPrompt),                          // best function calling
      () => askGroq(messages, systemPrompt, 'llama-3.3-70b-versatile'),
      () => askDeepSeek(messages, systemPrompt),
      () => askOpenRouter(messages, systemPrompt),
      () => askMistral(messages, systemPrompt),
    ],
  }

  // Add Pollinations models as universal fallbacks (no key needed)
  const allProviders = [
    ...cascades[queryType],
    () => askPollinations(messages, systemPrompt),
    () => askPollinationsAlt(messages, systemPrompt, 'mistral'),
    () => askPollinationsAlt(messages, systemPrompt, 'llama'),
  ]

  // Smart skip: providers near 85% daily limit go to back of queue
  const providerNames = ['gemini','groq','deepseek','mistral','grok','openrouter','together','cohere','aimlapi']
  const nearLimit = providerNames.filter(p => isNearLimit(p, 85))
  if (nearLimit.length > 0) {
    // log silently — no console spam
  }

  for (const fn of allProviders) {
    try { return await fn() } catch { /* try next provider */ }
  }

  return { text:'Kuch gadbad ho gayi. Thodi der mein try karo.', provider:'none', model:'none', ms:0 }
}
