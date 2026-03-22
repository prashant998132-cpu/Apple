import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { text, voice = 'nova' } = await req.json()
  if (!text) return NextResponse.json({ error: 'No text' }, { status: 400 })

  const clean = text.replace(/<[^>]*>/g, '').substring(0, 500)

  // Try Groq TTS
  if (process.env.GROQ_API_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/audio/speech', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + process.env.GROQ_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'playai-tts', input: clean, voice: 'Celeste-PlayAI', response_format: 'mp3' })
      })
      if (r.ok) {
        const buf = await r.arrayBuffer()
        return new NextResponse(buf, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public,max-age=3600' } })
      }
    } catch {}
  }

  // Fallback: Pollinations TTS
  try {
    const polUrl = 'https://text.pollinations.ai/' + encodeURIComponent(clean) + '?model=openai-audio&voice=' + voice
    const r = await fetch(polUrl, { signal: AbortSignal.timeout(12000) })
    if (r.ok) {
      const buf = await r.arrayBuffer()
      return new NextResponse(buf, { headers: { 'Content-Type': 'audio/mpeg' } })
    }
  } catch {}

  return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
}
