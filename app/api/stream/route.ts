// app/api/stream/route.ts — JARVIS Streaming SSE
// Chain: Groq → Gemini → Pollinations (FREE, no key) → error
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

export async function POST(req: NextRequest) {
  const { message, history = [], memoryPrompt, chatMode = 'auto' } = await req.json()
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
          'You are JARVIS, a helpful personal AI assistant. Respond naturally in Hinglish (Hindi+English mix). Be concise and helpful.'

        let replied = false

        // ── GROQ (fastest, needs key) ──────────────────────
        if (!replied) {
          const groqKey = process.env.GROQ_API_KEY
          if (groqKey) {
            try {
              const model = chatMode === 'flash' ? 'llama-3.1-8b-instant'
                : chatMode === 'think' ? 'deepseek-r1-distill-llama-70b'
                : 'llama-3.3-70b-versatile'

              const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model, stream: true, max_tokens: getMaxTokens(message),
                  messages: [{ role: 'system', content: systemPrompt }, ...messages]
                }),
                signal: AbortSignal.timeout(28000)
              })

              if (groqRes.ok && groqRes.body) {
                replied = true
                send({ type: 'start', provider: `Groq ${model}` })
                const reader = groqRes.body.getReader()
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
                      const chunk = JSON.parse(raw)
                      const text = chunk.choices?.[0]?.delta?.content || ''
                      if (!text) continue
                      if (text.includes('<think>')) { inThink = true }
                      if (inThink) {
                        send({ type: 'think', text })
                        if (text.includes('</think>')) inThink = false
                      } else {
                        send({ type: 'token', text })
                      }
                    } catch { /* skip */ }
                  }
                }
                send({ type: 'done' })
              }
            } catch { /* Groq failed, try next */ }
          }
        }

        // ── GEMINI (needs key) ─────────────────────────────
        if (!replied) {
          const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
          if (geminiKey) {
            try {
              const gemMsgs = messages.map((m: any) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
              }))
              const gemRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${geminiKey}&alt=sse`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: gemMsgs,
                    generationConfig: { maxOutputTokens: getMaxTokens(message) }
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

        // ── POLLINATIONS (100% FREE, no key needed) ────────
        if (!replied) {
          try {
            send({ type: 'start', provider: 'Pollinations AI (free)' })
            // Build conversation for Pollinations
            const polMsgs = [
              { role: 'system', content: systemPrompt },
              ...messages
            ]
            const polRes = await fetch('https://text.pollinations.ai/openai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'openai',
                messages: polMsgs,
                max_tokens: getMaxTokens(message),
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

        // ── POLLINATIONS non-stream fallback ───────────────
        if (!replied) {
          try {
            send({ type: 'start', provider: 'Pollinations (non-stream)' })
            const question = encodeURIComponent(message)
            const system = encodeURIComponent(systemPrompt)
            const polRes = await fetch(
              `https://text.pollinations.ai/${question}?model=openai&system=${system}&seed=${Math.floor(Math.random()*9999)}`,
              { signal: AbortSignal.timeout(20000) }
            )
            if (polRes.ok) {
              replied = true
              const text = await polRes.text()
              // Stream word by word for feel
              const words = text.trim().split(' ')
              for (const word of words) {
                send({ type: 'token', text: word + ' ' })
                await new Promise(r => setTimeout(r, 8))
              }
              send({ type: 'done' })
            }
          } catch { /* Last resort failed too */ }
        }

        if (!replied) {
          send({ type: 'token', text: 'Abhi kuch gadbad ho gayi. Thodi der mein try karo.' })
          send({ type: 'done' })
        }

      } catch (err) {
        send({ type: 'error', text: 'Stream error — try again' })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
