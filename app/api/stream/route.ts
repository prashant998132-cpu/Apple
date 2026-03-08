// app/api/stream/route.ts — JARVIS Streaming SSE
// CASCADE (best → fallback, all free/freemium):
// 1. Groq          — fastest, llama-3.3-70b (free tier, needs key)
// 2. Gemini        — Google, 2.0-flash (free tier, needs key)
// 3. Together AI   — $25 free credits, llama-3-70b
// 4. Cerebras      — ultra-fast inference (free tier, needs key)
// 5. Mistral       — mistral-small-latest (free tier, needs key)
// 6. Cohere        — command-r (free tier, needs key)
// 7. Fireworks AI  — llama-v3-70b (free tier, needs key)
// 8. OpenRouter    — free models (no key needed for some)
// 9. Deepinfra     — meta-llama (free tier, needs key)
// 10. HuggingFace  — HF Inference API (free, needs key)
// 11. Pollinations — 100% FREE, no key, no limit
// 12. Puter AI     — browser-side fallback (client handles)
import { NextRequest } from 'next/server'

export const runtime = 'edge'

function getMaxTokens(msg: string): number {
  const w = msg.trim().split(/\s+/).length
  const ml = msg.toLowerCase()
  if (w <= 3) return 80
  if (w <= 10 && !ml.match(/explain|why|how|derive|solve/)) return 200
  if (w > 60 || ml.match(/research|full|detailed|comprehensive/)) return 1200
  if (ml.match(/derive|solve|code|function|algorithm|explain.*detail/)) return 700
  return 400
}

// Generic OpenAI-compatible streaming handler
async function streamOpenAI(
  url: string, key: string, model: string,
  messages: object[], systemPrompt: string,
  maxTokens: number, send: (d: object) => void,
  providerName: string, extraBody: object = {}
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, stream: true, max_tokens: maxTokens,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        ...extraBody
      }),
      signal: AbortSignal.timeout(28000)
    })
    if (!res.ok || !res.body) return false
    send({ type: 'start', provider: providerName })
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = '', inThink = false
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n'); buf = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw || raw === '[DONE]') continue
        try {
          const text = JSON.parse(raw).choices?.[0]?.delta?.content || ''
          if (!text) continue
          if (text.includes('<think>')) inThink = true
          if (inThink) {
            send({ type: 'think', text })
            if (text.includes('</think>')) inThink = false
          } else {
            send({ type: 'token', text })
          }
        } catch { /* skip malformed */ }
      }
    }
    send({ type: 'done' })
    return true
  } catch { return false }
}

export async function POST(req: NextRequest) {
  const { message, history = [], memoryPrompt, chatMode = 'auto', userName = 'Boss' } = await req.json()
  if (!message?.trim()) return new Response('No message', { status: 400 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      try {
        const messages = [
          ...history.slice(-8).map((m: any) => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.content || m.text || ''
          })),
          { role: 'user', content: message }
        ]

        const systemPrompt = memoryPrompt ||
          `You are JARVIS, a personal AI assistant for ${userName || 'Boss'}. Respond in Hinglish (Hindi+English mix). Be concise and direct.
RULES:
- Never pretend to do physical tasks (coffee, phone calls, etc.) — say "Main ye physically nahi kar sakta, lekin [alternative] kar sakta hoon"
- Address user as "${userName || 'Boss'}" occasionally
- Keep responses short unless detail is needed
- For math/science formulas use LaTeX: $formula$ inline, $$formula$$ display`

        const maxTok = getMaxTokens(message)
        let replied = false

        // ── 1. GROQ — fastest streaming ─────────────────────
        if (!replied && process.env.GROQ_API_KEY) {
          const model = chatMode === 'flash' ? 'llama-3.1-8b-instant'
            : chatMode === 'think' ? 'deepseek-r1-distill-llama-70b'
            : 'llama-3.3-70b-versatile'
          replied = await streamOpenAI(
            'https://api.groq.com/openai/v1/chat/completions',
            process.env.GROQ_API_KEY, model, messages, systemPrompt, maxTok, send,
            `Groq ${model}`
          )
        }

        // ── 2. GEMINI 2.0 Flash — Google, very capable ──────
        if (!replied) {
          const gemKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY
          if (gemKey) {
            try {
              const gemMsgs = messages.map((m: any) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
              }))
              const gemRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${gemKey}&alt=sse`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: gemMsgs,
                    generationConfig: { maxOutputTokens: maxTok }
                  }),
                  signal: AbortSignal.timeout(28000)
                }
              )
              if (gemRes.ok && gemRes.body) {
                replied = true
                send({ type: 'start', provider: 'Gemini 2.0 Flash' })
                const reader = gemRes.body.getReader()
                const dec = new TextDecoder()
                let buf = ''
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  buf += dec.decode(value, { stream: true })
                  const lines = buf.split('\n'); buf = lines.pop() || ''
                  for (const line of lines) {
                    if (!line.startsWith('data: ')) continue
                    const raw = line.slice(6).trim()
                    if (!raw || raw === '[DONE]') continue
                    try {
                      const text = JSON.parse(raw).candidates?.[0]?.content?.parts?.[0]?.text || ''
                      if (text) send({ type: 'token', text })
                    } catch { /* skip */ }
                  }
                }
                send({ type: 'done' })
              }
            } catch { /* Gemini failed */ }
          }
        }

        // ── 3. TOGETHER AI — $25 free credits ───────────────
        if (!replied && process.env.TOGETHER_API_KEY) {
          replied = await streamOpenAI(
            'https://api.together.xyz/v1/chat/completions',
            process.env.TOGETHER_API_KEY,
            'meta-llama/Llama-3-70b-chat-hf',
            messages, systemPrompt, maxTok, send, 'Together AI Llama-3-70b'
          )
        }

        // ── 4. CEREBRAS — ultra-fast inference ──────────────
        if (!replied && process.env.CEREBRAS_API_KEY) {
          replied = await streamOpenAI(
            'https://api.cerebras.ai/v1/chat/completions',
            process.env.CEREBRAS_API_KEY,
            'llama3.1-70b',
            messages, systemPrompt, maxTok, send, 'Cerebras Llama-3.1-70b'
          )
        }

        // ── 5. MISTRAL — mistral-small (free tier) ──────────
        if (!replied && process.env.MISTRAL_API_KEY) {
          replied = await streamOpenAI(
            'https://api.mistral.ai/v1/chat/completions',
            process.env.MISTRAL_API_KEY,
            'mistral-small-latest',
            messages, systemPrompt, maxTok, send, 'Mistral Small'
          )
        }

        // ── 6. COHERE — command-r (free tier) ───────────────
        if (!replied && process.env.COHERE_API_KEY) {
          try {
            const coMsg = messages.map((m: any) => ({
              role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
              message: m.content
            }))
            const lastUser = messages.filter((m:any)=>m.role==='user').pop()
            const coRes = await fetch('https://api.cohere.ai/v1/chat', {
              method: 'POST',
              headers: { Authorization: `Bearer ${process.env.COHERE_API_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'command-r',
                message: lastUser?.content || message,
                chat_history: coMsg.slice(0,-1),
                preamble: systemPrompt,
                max_tokens: maxTok,
                stream: true
              }),
              signal: AbortSignal.timeout(28000)
            })
            if (coRes.ok && coRes.body) {
              replied = true
              send({ type: 'start', provider: 'Cohere Command-R' })
              const reader = coRes.body.getReader()
              const dec = new TextDecoder()
              let buf = ''
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buf += dec.decode(value, { stream: true })
                const lines = buf.split('\n')
                for (const line of lines) {
                  if (!line.trim()) continue
                  try {
                    const ev = JSON.parse(line)
                    if (ev.event_type === 'text-generation' && ev.text) send({ type: 'token', text: ev.text })
                  } catch { /* skip */ }
                }
                buf = ''
              }
              send({ type: 'done' })
            }
          } catch { /* Cohere failed */ }
        }

        // ── 7. FIREWORKS AI — fast, free tier ───────────────
        if (!replied && process.env.FIREWORKS_API_KEY) {
          replied = await streamOpenAI(
            'https://api.fireworks.ai/inference/v1/chat/completions',
            process.env.FIREWORKS_API_KEY,
            'accounts/fireworks/models/llama-v3-70b-instruct',
            messages, systemPrompt, maxTok, send, 'Fireworks Llama-3-70b'
          )
        }

        // ── 8. OPENROUTER — free models available ───────────
        if (!replied) {
          const orKey = process.env.OPENROUTER_API_KEY
          // Try free model first, then with key
          const orModel = orKey ? 'meta-llama/llama-3-70b-instruct' : 'meta-llama/llama-3.2-3b-instruct:free'
          try {
            const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                ...(orKey ? { Authorization: `Bearer ${orKey}` } : {}),
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://apple-lemon-zeta.vercel.app',
                'X-Title': 'JARVIS'
              },
              body: JSON.stringify({
                model: orModel,
                stream: true,
                max_tokens: maxTok,
                messages: [{ role: 'system', content: systemPrompt }, ...messages]
              }),
              signal: AbortSignal.timeout(30000)
            })
            if (orRes.ok && orRes.body) {
              replied = true
              send({ type: 'start', provider: `OpenRouter ${orModel.split('/').pop()}` })
              const reader = orRes.body.getReader()
              const dec = new TextDecoder()
              let buf = ''
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buf += dec.decode(value, { stream: true })
                const lines = buf.split('\n'); buf = lines.pop() || ''
                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue
                  const raw = line.slice(6).trim()
                  if (!raw || raw === '[DONE]') continue
                  try {
                    const text = JSON.parse(raw).choices?.[0]?.delta?.content || ''
                    if (text) send({ type: 'token', text })
                  } catch { /* skip */ }
                }
              }
              send({ type: 'done' })
            }
          } catch { /* OpenRouter failed */ }
        }

        // ── 9. DEEPINFRA — free tier available ──────────────
        if (!replied && process.env.DEEPINFRA_API_KEY) {
          replied = await streamOpenAI(
            'https://api.deepinfra.com/v1/openai/chat/completions',
            process.env.DEEPINFRA_API_KEY,
            'meta-llama/Meta-Llama-3-70B-Instruct',
            messages, systemPrompt, maxTok, send, 'Deepinfra Llama-3-70b'
          )
        }

        // ── 10. HUGGINGFACE — Inference API free ────────────
        if (!replied && process.env.HUGGINGFACE_API_KEY) {
          try {
            const hfRes = await fetch(
              'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  inputs: `<s>[INST] ${systemPrompt}\n\nUser: ${message} [/INST]`,
                  parameters: { max_new_tokens: maxTok, return_full_text: false },
                  stream: false
                }),
                signal: AbortSignal.timeout(25000)
              }
            )
            if (hfRes.ok) {
              const hfData = await hfRes.json()
              const text = hfData?.[0]?.generated_text || hfData?.generated_text || ''
              if (text) {
                replied = true
                send({ type: 'start', provider: 'HuggingFace Mistral-7B' })
                send({ type: 'token', text })
                send({ type: 'done' })
              }
            }
          } catch { /* HF failed */ }
        }

        // ── 11. POLLINATIONS — 100% FREE, no key ever ───────
        if (!replied) {
          try {
            send({ type: 'start', provider: 'Pollinations AI (free)' })
            const polRes = await fetch('https://text.pollinations.ai/openai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'openai',
                messages: [{ role: 'system', content: systemPrompt }, ...messages],
                max_tokens: maxTok,
                stream: true,
                seed: Math.floor(Math.random() * 9999)
              }),
              signal: AbortSignal.timeout(30000)
            })
            if (polRes.ok && polRes.body) {
              replied = true
              const reader = polRes.body.getReader()
              const dec = new TextDecoder()
              let buf = ''
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buf += dec.decode(value, { stream: true })
                const lines = buf.split('\n'); buf = lines.pop() || ''
                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue
                  const raw = line.slice(6).trim()
                  if (!raw || raw === '[DONE]') continue
                  try {
                    const text = JSON.parse(raw).choices?.[0]?.delta?.content || ''
                    if (text) send({ type: 'token', text })
                  } catch { /* skip */ }
                }
              }
              send({ type: 'done' })
            }
          } catch { /* Pollinations failed */ }
        }

        // ── Pollinations non-stream fallback ────────────────
        if (!replied) {
          try {
            const url = `https://text.pollinations.ai/${encodeURIComponent(message)}?model=openai&seed=${Date.now()}&system=${encodeURIComponent(systemPrompt.slice(0,200))}`
            const r = await fetch(url, { signal: AbortSignal.timeout(25000) })
            if (r.ok) {
              const text = await r.text()
              if (text) {
                replied = true
                send({ type: 'start', provider: 'Pollinations (fallback)' })
                send({ type: 'token', text })
                send({ type: 'done' })
              }
            }
          } catch { /* last resort failed */ }
        }

        // ── 12. CLIENT FALLBACK — tell browser to use Puter ──
        if (!replied) {
          send({ type: 'fallback', message: 'USE_PUTER' })
          send({ type: 'done' })
        }

      } catch (err: any) {
        try {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: err?.message || 'Unknown error' })}\n\n`
          ))
        } catch { /* stream already closed */ }
      } finally {
        try { controller.close() } catch { /* already closed */ }
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'Connection': 'keep-alive',
    }
  })
}
