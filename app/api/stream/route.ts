// app/api/stream/route.ts — JARVIS Streaming via SSE
// Groq + Gemini streaming support
// Client receives word-by-word via ReadableStream

import { NextRequest } from 'next/server'

export const runtime = 'edge'

// Inline complexity detection (edge runtime — no lib imports)
function getMaxTokens(msg: string): number {
  const words = msg.trim().split(/\s+/).length
  const ml = msg.toLowerCase()
  if (words <= 3) return 80
  if (words <= 10 && !ml.match(/explain|why|how|derive|solve|analyze/)) return 180
  if (words > 60 || ml.match(/research|full|detailed|comprehensive|elaborate/)) return 1200
  if (ml.match(/derive|solve|proof|code|function|algorithm|compare|explain.*detail|physics|chemistry/)) return 700
  return 350
}

export async function POST(req: NextRequest) {
  const { message, history = [], memoryPrompt, chatMode = 'auto' } = await req.json()

  if (!message?.trim()) {
    return new Response('No message', { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // Build messages
        const messages = [
          ...history.slice(-8).map((m: any) => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.content || m.text || ''
          })),
          { role: 'user', content: message }
        ]

        const systemPrompt = memoryPrompt || 'You are JARVIS, a helpful personal AI. Respond in Hinglish (Hindi+English mix). Be concise and direct.'

        let replied = false

        // Deep mode — send tool progress status first, then non-stream Gemini
        if (chatMode === 'deep') {
          send({ type: 'status', text: '🔬 Deep mode — tools activate kar raha hun...' })
          try {
            const gemKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
            if (gemKey) {
              send({ type: 'status', text: '🛠️ Relevant tools select kar raha hun...' })
              // Call regular jarvis API (has full tool support)
              const fallbackUrl = new URL(req.url)
              fallbackUrl.pathname = '/api/jarvis'
              const jRes = await fetch(fallbackUrl.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, history, memoryPrompt, chatMode: 'deep', userId: 'stream' }),
                signal: AbortSignal.timeout(25000)
              })
              if (jRes.ok) {
                const jData = await jRes.json()
                if (jData.toolsUsed?.length) {
                  send({ type: 'status', text: `✅ Tools used: ${jData.toolsUsed.join(', ')}` })
                }
                if (jData.reply) {
                  replied = true
                  send({ type: 'start', provider: jData.model || 'Gemini Deep' })
                  // Stream the reply word by word for feel
                  const words = jData.reply.split(' ')
                  for (const word of words) {
                    send({ type: 'token', text: word + ' ' })
                    await new Promise(r => setTimeout(r, 15))
                  }
                  send({ type: 'done' })
                }
              }
            }
          } catch {}
          if (replied) { controller.close(); return }
        }

        // Try 1: Groq streaming (fastest)
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
                  model,
                  max_tokens: getMaxTokens(message),
                  stream: true,
                  messages: [{ role: 'system', content: systemPrompt }, ...messages]
                }),
                signal: AbortSignal.timeout(30000)
              })

              if (groqRes.ok && groqRes.body) {
                replied = true
                send({ type: 'start', provider: `Groq ${model}` })
                const reader = groqRes.body.getReader()
                const decoder = new TextDecoder()
                let thinking = ''
                let inThink = false
                let buffer = ''

                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  buffer += decoder.decode(value, { stream: true })
                  const lines = buffer.split('\n')
                  buffer = lines.pop() || ''

                  for (const line of lines) {
                    if (!line.startsWith('data: ')) continue
                    const raw = line.slice(6).trim()
                    if (raw === '[DONE]') continue
                    try {
                      const chunk = JSON.parse(raw)
                      const delta = chunk.choices?.[0]?.delta?.content || ''
                      if (!delta) continue

                      // Handle DeepSeek think tags
                      if (model.includes('deepseek')) {
                        if (delta.includes('<think>')) { inThink = true }
                        if (delta.includes('</think>')) { inThink = false; send({ type: 'think_end' }); continue }
                        if (inThink) { thinking += delta; send({ type: 'think', text: delta }); continue }
                      }

                      send({ type: 'token', text: delta })
                    } catch { /* skip bad chunk */ }
                  }
                }
                send({ type: 'done' })
              }
            } catch (e) {
              // Groq failed, try next
            }
          }
        }

        // Try 2: Gemini streaming
        if (!replied) {
          const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
          if (geminiKey) {
            try {
              const geminiMessages = messages.map((m: any) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
              }))

              const geminiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${geminiKey}&alt=sse`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: geminiMessages,
                    generationConfig: { maxOutputTokens: getMaxTokens(message) }
                  }),
                  signal: AbortSignal.timeout(30000)
                }
              )

              if (geminiRes.ok && geminiRes.body) {
                replied = true
                send({ type: 'start', provider: 'Gemini 2.0 Flash' })
                const reader = geminiRes.body.getReader()
                const decoder = new TextDecoder()
                let buffer = ''

                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  buffer += decoder.decode(value, { stream: true })
                  const lines = buffer.split('\n')
                  buffer = lines.pop() || ''

                  for (const line of lines) {
                    if (!line.startsWith('data: ')) continue
                    const raw = line.slice(6).trim()
                    if (!raw || raw === '[DONE]') continue
                    try {
                      const chunk = JSON.parse(raw)
                      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || ''
                      if (text) send({ type: 'token', text })
                    } catch { /* skip */ }
                  }
                }
                send({ type: 'done' })
              }
            } catch { /* Gemini failed */ }
          }
        }

        // Fallback: non-streaming via regular jarvis endpoint
        if (!replied) {
          send({ type: 'start', provider: 'Fallback' })
          send({ type: 'token', text: 'माफ़ करना, streaming abhi available nahi. API keys check karo.' })
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
