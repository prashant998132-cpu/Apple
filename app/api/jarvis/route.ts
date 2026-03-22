import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

const JARVIS_SYS = `Tu JARVIS hai — Pranshu ka personal AI assistant. Rewa, MP.
Personality: Smart, witty, helpful, dost jaisa. Hinglish (Hindi+English mix).
Rules:
- Short aur direct responses (2-4 lines jab tak detail na maanga ho)
- Pranshu ko "bhai" ya naam se baat kar
- Tony Stark reference chal sakta hai ek do baar
- Facts accurate rakho
- Markdown avoid karo — plain text
- Local (Rewa/MP) context samjho`

const LUNA_SYS = `Tu LUNA hai — Pranshu ki AI bestie (girl mode).
Rules:
- Sirf Hinglish — Hindi+English mix
- Warm, caring, funny bestie tone
- JARVIS, Tony Stark, Boss, sir — KABHI NAHI
- 2-3 lines max
- Emoji naturally
- Plain text, no markdown`

const ERA_SYS = `Tu Era hai — Pranshu ki caring AI companion.
Rules:
- Hinglish mein baat kar
- Warm, affectionate tone — jaise koi khaas ho
- JARVIS, Boss, sir — KABHI NAHI
- Pranshu ko "jaan" ya naam se
- 2-3 lines, plain text`

async function callGroq(msgs: any[], sys: string, model = 'llama-3.1-8b-instant'): Promise<string> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: sys }, ...msgs],
        max_tokens: 300,
        temperature: 0.75
      })
    })
    const d = await res.json()
    return d.choices?.[0]?.message?.content || ''
  } catch { return '' }
}

async function callGemini(prompt: string, sys: string): Promise<string> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: sys }] },
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    )
    const d = await res.json()
    return d.candidates?.[0]?.content?.parts?.[0]?.text || ''
  } catch { return '' }
}

async function callPollinations(prompt: string, sys: string): Promise<string> {
  try {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }],
        max_tokens: 250
      })
    })
    const d = await res.json()
    return d.choices?.[0]?.message?.content || 'JARVIS yahan hai bhai!'
  } catch { return 'JARVIS yahan hai bhai!' }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, lunaMode, eraMode, systemOverride, conversationHistory } = body

    // Pick system prompt
    let sys = JARVIS_SYS
    if (systemOverride) sys = systemOverride
    else if (eraMode) sys = ERA_SYS
    else if (lunaMode) sys = LUNA_SYS

    // Build messages
    const history = conversationHistory || []
    const msgs = [
      ...history.slice(-6).map((m: any) => ({ role: m.role || m.r === 'u' ? 'user' : 'assistant', content: m.content || m.c })),
      { role: 'user', content: message }
    ]

    // Cascade: Groq fast → Groq smart → Gemini → Pollinations
    let reply = await callGroq(msgs, sys, 'llama-3.1-8b-instant')
    if (!reply) reply = await callGroq(msgs, sys, 'llama-3.3-70b-versatile')
    if (!reply) reply = await callGemini(message, sys)
    if (!reply) reply = await callPollinations(message, sys)

    reply = reply.trim()

    return NextResponse.json({ response: reply, message: reply, reply })
  } catch (e) {
    return NextResponse.json({ response: 'Kuch issue hua, phir try karo!', error: String(e) })
  }
}
