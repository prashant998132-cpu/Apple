import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

const JARVIS_SYS = `Tu JARVIS hai — Pranshu ka personal AI assistant. Rewa, MP.
Smart, witty, helpful, dost jaisa. Hinglish (Hindi+English mix).
Short aur direct responses (2-4 lines). Markdown avoid karo — plain text.`

const LUNA_SYS = `Tu LUNA hai — Pranshu ki warm girl bestie.
Sirf Hinglish. JARVIS/Boss/sir kabhi nahi. 2-3 lines. Emoji naturally.`

const ERA_SYS = `Tu Era hai — Pranshu ki caring AI companion.
Hinglish. Warm affectionate tone. JARVIS/Boss nahi. 2-3 lines.`

async function groq(msgs: any[], sys: string, model = 'llama-3.1-8b-instant'): Promise<string> {
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: sys }, ...msgs], max_tokens: 350, temperature: 0.75 })
    })
    const d = await r.json()
    return d.choices?.[0]?.message?.content || ''
  } catch { return '' }
}

async function gemini(prompt: string, sys: string): Promise<string> {
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system_instruction: { parts: [{ text: sys }] }, contents: [{ parts: [{ text: prompt }] }] })
    })
    const d = await r.json()
    return d.candidates?.[0]?.content?.parts?.[0]?.text || ''
  } catch { return '' }
}

async function pollinations(prompt: string, sys: string): Promise<string> {
  try {
    const r = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }], max_tokens: 300 })
    })
    const d = await r.json()
    return d.choices?.[0]?.message?.content || 'JARVIS yahan hai!'
  } catch { return 'JARVIS yahan hai!' }
}

function detectTools(msg: string) {
  const m = msg.toLowerCase()
  return {
    youtube: m.includes('youtu'),
    url: !m.includes('youtu') && (msg.includes('http://') || msg.includes('https://')),
    search: /search|dhundho|kya hua|latest|aaj ki|news|live|price|rate|kitne ka|kab hai/.test(m),
    image: /image banao|photo banao|picture banao|wallpaper|generate image|ek photo|draw|sketch/.test(m),
    video: /video banao|animation banao|clip banao/.test(m),
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, lunaMode, eraMode, systemOverride, conversationHistory } = body

    let sys = JARVIS_SYS
    if (systemOverride) sys = systemOverride
    else if (eraMode) sys = ERA_SYS
    else if (lunaMode) sys = LUNA_SYS

    const history = (conversationHistory || []).slice(-6)
    const msgs = history.map((m: any) => ({
      role: m.role || (m.r === 'u' ? 'user' : 'assistant'),
      content: m.content || m.c || ''
    }))

    let contextData = ''

    if (!lunaMode && !eraMode && !systemOverride) {
      const tools = detectTools(message)

      if (tools.image) {
        const promptClean = message.replace(/image banao|photo banao|picture banao|wallpaper|generate image|ek photo|draw|sketch/gi, '').trim()
        const seed = Math.floor(Math.random() * 999999)
        const imageUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(promptClean || message) + '?model=flux&width=1024&height=1024&seed=' + seed + '&nologo=true&enhance=true'
        return NextResponse.json({ response: 'IMAGE_GENERATED', imageUrl, imagePrompt: promptClean || message })
      }

      if (tools.video) {
        const promptClean = message.replace(/video banao|animation banao|clip banao/gi, '').trim()
        const videoUrl = 'https://video.pollinations.ai/' + encodeURIComponent(promptClean || message)
        return NextResponse.json({ response: 'VIDEO_GENERATED', videoUrl, note: 'Alpha — 30-60s lag sakta hai' })
      }

      if (tools.youtube) {
        const urlMatch = message.match(/https?:\/\/[^\s]+/)
        if (urlMatch) {
          try {
            const ytRes = await fetch(req.nextUrl.origin + '/api/youtube', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: urlMatch[0] })
            })
            const yt = await ytRes.json()
            if (yt.transcript) contextData = '[YouTube Transcript]: ' + yt.transcript.substring(0, 2000)
            else if (yt.title) contextData = '[YouTube]: ' + yt.title
          } catch {}
        }
      } else if (tools.url) {
        const urlMatch = message.match(/https?:\/\/[^\s]+/)
        if (urlMatch) {
          try {
            const urlRes = await fetch(req.nextUrl.origin + '/api/readurl', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: urlMatch[0] })
            })
            const urlData = await urlRes.json()
            if (urlData.content) contextData = '[URL Content]: ' + urlData.content.substring(0, 2000)
          } catch {}
        }
      } else if (tools.search) {
        try {
          const sRes = await fetch(req.nextUrl.origin + '/api/search', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: message })
          })
          const sData = await sRes.json()
          if (sData.results?.length > 0) {
            contextData = '[Search]: ' + sData.results.slice(0,3).map((r: any) => r.title + ': ' + r.snippet).join(' | ')
          }
        } catch {}
      }
    }

    const fullMsg = contextData ? contextData + '\n\nUser: ' + message : message
    msgs.push({ role: 'user', content: fullMsg })

    let reply = await groq(msgs, sys, 'llama-3.1-8b-instant')
    if (!reply) reply = await groq(msgs, sys, 'llama-3.3-70b-versatile')
    if (!reply) reply = await gemini(message, sys)
    if (!reply) reply = await pollinations(message, sys)

    return NextResponse.json({ response: reply.trim(), message: reply.trim(), reply: reply.trim() })
  } catch (e) {
    return NextResponse.json({ response: 'Kuch issue hua, phir try karo!', error: String(e) })
  }
}
