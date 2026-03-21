// app/api/next/route.ts
import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

async function groq(prompt: string): Promise<string> {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], max_tokens: 400 })
  })
  const d = await r.json()
  return d.choices?.[0]?.message?.content || 'Nahi mila'
}

export async function POST(req: NextRequest) {
  const { action, data } = await req.json()

  // 1. LIVE CRICKET SCORE
  if (action === 'cricket') {
    try {
      const r = await fetch('https://api.cricapi.com/v1/currentMatches?apikey=free&offset=0')
      if (r.ok) {
        const d = await r.json()
        const matches = d.data?.slice(0, 3) || []
        if (matches.length === 0) return NextResponse.json({ result: '🏏 Abhi koi live match nahi chal raha' })
        const text = matches.map((m: any) =>
          `🏏 ${m.name}\n📊 ${m.status}`
        ).join('\n\n')
        return NextResponse.json({ result: text })
      }
    } catch {}
    // Fallback via AI
    const res = await groq('Aaj ke cricket matches ka brief update do Hinglish mein. 3-4 lines.')
    return NextResponse.json({ result: '🏏 Cricket:\n' + res })
  }

  // 2. NEWS — Hindi headlines
  if (action === 'news') {
    const topic = data?.topic || 'India'
    try {
      const r = await fetch(`https://newsdata.io/api/1/news?apikey=pub_free&country=in&language=hi&q=${topic}&size=5`)
      if (r.ok) {
        const d = await r.json()
        const articles = d.results?.slice(0, 4) || []
        if (articles.length > 0) {
          const text = articles.map((a: any, i: number) => `${i+1}. ${a.title}`).join('\n')
          return NextResponse.json({ result: '📰 Aaj ki Khabar:\n\n' + text })
        }
      }
    } catch {}
    // Fallback
    const res = await groq(`${topic} ke baare mein aaj ki 4 important news headlines do Hinglish mein. Numbered list.`)
    return NextResponse.json({ result: '📰 News (AI):\n\n' + res })
  }

  // 3. UPI APPS OPEN
  if (action === 'upi') {
    const apps: Record<string, string> = {
      phonepe: 'phonepe://pay',
      gpay: 'tez://upi/pay',
      paytm: 'paytmmp://pay',
      bhim: 'upi://pay'
    }
    const app = data?.app?.toLowerCase() || 'phonepe'
    const url = apps[app] || apps.phonepe
    return NextResponse.json({ result: 'UPI_OPEN', url, appName: app })
  }

  // 4. SMART REMINDER (store in response, client handles)
  if (action === 'reminder') {
    const text = data?.text || ''
    const res = await groq(`Parse this reminder request: "${text}"
    Extract: what to remind, when (in minutes from now, default 60).
    Return JSON only: {"task":"...", "minutes": N}
    Examples: "kal subah 8 baje" = 720 minutes, "30 min baad" = 30, "1 ghante baad" = 60`)
    try {
      const parsed = JSON.parse(res.match(/\{[\s\S]*\}/)?.[0] || '{}')
      return NextResponse.json({ result: 'REMINDER_SET', task: parsed.task || text, minutes: parsed.minutes || 60 })
    } catch {
      return NextResponse.json({ result: 'REMINDER_SET', task: text, minutes: 60 })
    }
  }

  // 5. MOTIVATIONAL QUOTE (desi, real)
  if (action === 'quote') {
    const quotes = [
      'Rewa se nikla hoon, duniya dekhni hai. 🔥',
      'Phone pe app bana raha hoon, log lab mein baithe hain. Different level. 💪',
      'Limitation nahi, direction chahiye. ✨',
      'Kal ka Pranshu aaj se better hoga. Guaranteed. 🚀',
      'Jo kaam karta hai, woh seekhta hai. Simple. 🎯',
    ]
    const q = quotes[Math.floor(Math.random() * quotes.length)]
    return NextResponse.json({ result: '💬 ' + q })
  }

  return NextResponse.json({ error: 'Unknown' }, { status: 400 })
}
