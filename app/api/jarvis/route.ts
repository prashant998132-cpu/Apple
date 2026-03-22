import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

const JARVIS_SYS = `Tu JARVIS hai — Pranshu ka personal AI assistant. Rewa, MP.
Smart, witty, helpful, dost jaisa. Hinglish (Hindi+English mix).
Short aur direct responses. Markdown avoid karo — plain text.
Agar search/url/youtube tool use kiya ho to us data ko summarize karo clearly.`

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

// Detect what tools to use
function detectTools(msg: string): { search: boolean, url: boolean, youtube: boolean, image: boolean, video: boolean } {
  const m = msg.toLowerCase()
  const ytPatterns = ['youtube', 'youtu.be', 'yt.be']
  const urlPatterns = ['http://', 'https://']
  const searchPatterns = ['search', 'dhundho', 'kya hua', 'latest', 'aaj ki', 'news', 'batao abhi', 'live', 'price', 'rate', 'kitne ka', 'kab hai', 'kahan hai']
  const imagePatterns = ['image banao', 'photo banao', 'picture banao', 'wallpaper', 'drawing', 'art banao', 'generate image', 'ek photo']
  const videoPatterns = ['video banao', 'animation banao', 'clip banao']

  return {
    youtube: ytPatterns.some(p => m.includes(p)),
    url: !ytPatterns.some(p => m.includes(p)) && urlPatterns.some(p => msg.includes(p)),
    search: searchPatterns.some(p => m.includes(p)),
    image: imagePatterns.some(p => m.includes(p)),
    video: videoPatterns.some(p => m.includes(p)),
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

    // Tool detection (only for JARVIS, not Era/LUNA)
    let contextData = ''
    if (!lunaMode && !eraMode && !systemOverride) {
      const tools = detectTools(message)

      if (tools.youtube) {
        const urlMatch = message.match(/https?:\/\/[^\s]+/)
        if (urlMatch) {
          try {
            const ytRes = await fetch(req.nextUrl.origin + '/api/youtube', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: urlMatch[0] })
            })
            const ytData = await ytRes.json()
            if (ytData.transcript) contextData = '[YouTube Transcript]: ' + ytData.transcript.substring(0, 2000)
            else if (ytData.title) contextData = '[YouTube Video]: ' + ytData.title + ' by ' + ytData.author
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
            contextData = '[Search Results]: ' + sData.results.map((r: any) => r.title + ': ' + r.snippet).join(' | ').substring(0, 1500)
          }
        } catch {}
      } else if (tools.image) {
        const promptMatch = message.replace(/image banao|photo banao|picture banao|ek photo|generate image/gi, '').trim()
        try {
          const igRes = await fetch(req.nextUrl.origin + '/api/imagegen', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptMatch || message })
          })
          const igData = await igRes.json()
          if (igData.url) {
            return NextResponse.json({
              response: 'IMAGE_GENERATED',
              reply: 'IMAGE_GENERATED',
              message: 'IMAGE_GENERATED',
              imageUrl: igData.url,
              imagePrompt: igData.prompt
            })
          }
        } catch {}
      } else if (tools.video) {
        const promptMatch = message.replace(/video banao|animation banao|clip banao/gi, '').trim()
        try {
          const vgRes = await fetch(req.nextUrl.origin + '/api/videogen', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptMatch || message })
          })
          const vgData = await vgRes.json()
          if (vgData.url) {
            return NextResponse.json({
              response: 'VIDEO_GENERATED',
              reply: 'VIDEO_GENERATED',
              message: 'VIDEO_GENERATED',
              videoUrl: vgData.url,
              note: vgData.note
            })
          }
        } catch {}
      }
    }

    const fullMsg = contextData ? contextData + '\n\nUser ka sawaal: ' + message : message
    msgs.push({ role: 'user', content: fullMsg })

    // Cascade
    let reply = await groq(msgs, sys, 'llama-3.1-8b-instant')
    if (!reply) reply = await groq(msgs, sys, 'llama-3.3-70b-versatile')
    if (!reply) reply = await gemini(message, sys)
    if (!reply) reply = await pollinations(message, sys)

    return NextResponse.json({ response: reply.trim(), message: reply.trim(), reply: reply.trim() })
  } catch (e) {
    return NextResponse.json({ response: 'Kuch issue hua, phir try karo!', error: String(e) })
  }
}
