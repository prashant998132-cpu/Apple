import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { action, companion, memories } = await req.json()

  if (action === 'extract') {
    const text = (memories || []).map((m: any) => {
      const role = m.r === 'u' ? 'User' : (companion || 'AI')
      const content = m.c || m.content || ''
      return role + ': ' + content
    }).join('\n').substring(0, 2000)

    const prompt = 'Extract 3-5 key facts from this conversation that ' + companion + ' should remember. Return as JSON array of strings only, no explanation.\n\n' + text

    try {
      const r = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages: [
            { role: 'system', content: 'Return only a JSON array of strings. Example: ["fact1", "fact2"]' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 200
        })
      })
      const d = await r.json()
      const content = d.choices?.[0]?.message?.content || '[]'
      // No /s flag — use [sS]* instead
      const match = content.match(/\[[\s\S]*\]/)
      let facts: string[] = []
      if (match) {
        try { facts = JSON.parse(match[0]) } catch {}
      }
      return NextResponse.json({ facts })
    } catch {
      return NextResponse.json({ facts: [] })
    }
  }

  return NextResponse.json({ ok: true })
}
