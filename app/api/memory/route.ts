import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

// Simple KV memory using Vercel Edge Config or just return structured data
// Client will store in localStorage

export async function POST(req: NextRequest) {
  const { action, companion, key, value, memories } = await req.json()

  if (action === 'extract') {
    // Use AI to extract important facts from conversation
    const text = (memories || []).map((m: any) => (m.r === 'u' ? 'User' : companion) + ': ' + (m.c || '')).join('\n')
    
    const prompt = 'Conversation se important facts nikalo jo ' + companion + ' ko yaad rakhni chahiye. Sirf facts, JSON array mein:\n' + text
    
    try {
      const r = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages: [
            { role: 'system', content: 'Extract key facts as JSON array of strings. Max 5 facts. Hindi/English ok.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 200
        })
      })
      const d = await r.json()
      const content = d.choices?.[0]?.message?.content || '[]'
      const match = content.match(/\[.*\]/s)
      const facts = match ? JSON.parse(match[0]) : []
      return NextResponse.json({ facts })
    } catch {
      return NextResponse.json({ facts: [] })
    }
  }

  return NextResponse.json({ ok: true })
}
