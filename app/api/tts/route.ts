import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { text, voice = 'Fritz-PlayAI' } = await req.json()
  if (!text) return NextResponse.json({ error: 'No text' }, { status: 400 })

  const clean = text.replace(/<[^>]*>/g, '').substring(0, 500)

  // 1. Try Groq TTS — playai-tts (Fritz-PlayAI, wav format)
  if (process.env.GROQ_API_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/audio/speech', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + process.env.GROQ_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'playai-tts', input: clean, voice: 'Fritz-PlayAI', response_format: 'wav' }),
        signal: AbortSignal.timeout(15000)
      })
      if (r.ok) {
        const buf = await r.arrayBuffer()
        return new NextResponse(buf, { headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'public,max-age=3600' } })
      }
    } catch { /* fallthrough */ }

    // 2. Try Groq Orpheus (newer model)
    try {
      const r = await fetch('https://api.groq.com/openai/v1/audio/speech', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + process.env.GROQ_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'canopylabs/orpheus-v1-english', input: clean, voice: 'troy', response_format: 'wav' }),
        signal: AbortSignal.timeout(15000)
      })
      if (r.ok) {
        const buf = await r.arrayBuffer()
        return new NextResponse(buf, { headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'public,max-age=3600' } })
      }
    } catch { /* fallthrough */ }
  }

  // 3. Fallback: Pollinations TTS
  try {
    const polUrl = 'https://text.pollinations.ai/' + encodeURIComponent(clean) + '?model=openai-audio&voice=nova'
    const r = await fetch(polUrl, { signal: AbortSignal.timeout(14000) })
    if (r.ok) {
      const buf = await r.arrayBuffer()
      return new NextResponse(buf, { headers: { 'Content-Type': 'audio/mpeg' } })
    }
  } catch { /* all failed */ }

  return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
}
