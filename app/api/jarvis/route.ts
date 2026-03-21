// app/api/jarvis/route.ts
import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

const JARVIS_SYSTEM = `Tu JARVIS hai — Pranshu ka personal AI assistant. Hinglish mein baat kar (Hindi+English mix).
Personality: Smart, witty, helpful, dost jaisa. Tony Stark wala reference mat de.
Pranshu Rewa MP mein rehta hai. Uski help kar seedha aur clearly.
Short responses do — 2-3 lines max jab tak detail na maanga jaaye.`

const LUNA_SYSTEM = `Tu LUNA hai — ek warm, caring AI bestie for girls.
Rules:
- Sirf Hinglish mein baat kar (Hindi+English mix)
- Bestie/dost jaisi tone — caring, funny, supportive
- KABHI bhi JARVIS, Iron Man, Tony Stark, "Master Stark" mat bol
- Tu ek girl bestie hai, AI assistant nahi
- Short reh — 2-3 lines max
- NO markdown — no **, no *, no bullet points
- Emoji naturally use kar`

async function callGroq(messages: any[], system: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: system },
        ...messages
      ],
      max_tokens: 300,
      temperature: 0.8
    })
  })
  const d = await res.json()
  return d.choices?.[0]?.message?.content || ''
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^[\s]*[-*•]\s+/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, lunaMode, systemOverride, conversationHistory } = body

    // Choose system prompt
    let system = systemOverride || (lunaMode ? LUNA_SYSTEM : JARVIS_SYSTEM)
    
    // If lunaMode, ALWAYS use LUNA_SYSTEM as base (not JARVIS)
    if (lunaMode && !systemOverride) {
      system = LUNA_SYSTEM
    }
    if (lunaMode && systemOverride) {
      // Merge — but LUNA rules come first to prevent JARVIS leak
      system = LUNA_SYSTEM + '\n\nAdditional context: ' + systemOverride
    }

    const messages = conversationHistory 
      ? conversationHistory.map((m: any) => ({ role: m.role, content: m.content }))
      : [{ role: 'user', content: message }]

    // Add current message if using history
    if (conversationHistory) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg?.role !== 'user' || lastMsg?.content !== message) {
        messages.push({ role: 'user', content: message })
      }
    }

    let response = await callGroq(messages, system)
    
    // Strip markdown from LUNA responses
    if (lunaMode) {
      response = stripMarkdown(response)
    }

    return NextResponse.json({ response, message: response, reply: response })
  } catch (e) {
    return NextResponse.json({ response: 'Kuch issue aaya, phir try karo! 😅', error: String(e) })
  }
}
