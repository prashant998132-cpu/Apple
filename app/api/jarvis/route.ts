import { NextRequest, NextResponse } from 'next/server'
import { orchestrate } from '../../../lib/core/orchestrator'

// Simple persona cascade for LUNA / ERA (no orchestrator overhead)
async function personaGroq(msgs: any[], sys: string): Promise<string> {
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'system', content: sys }, ...msgs], max_tokens: 350, temperature: 0.75 })
    })
    const d = await r.json()
    return d.choices?.[0]?.message?.content || ''
  } catch { return '' }
}

async function personaGemini(prompt: string, sys: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return ''
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system_instruction: { parts: [{ text: sys }] }, contents: [{ parts: [{ text: prompt }] }] })
    })
    const d = await r.json()
    return d.candidates?.[0]?.content?.parts?.[0]?.text || ''
  } catch { return '' }
}

async function personaPollinations(prompt: string, sys: string): Promise<string> {
  try {
    const r = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }], max_tokens: 300 })
    })
    const d = await r.json()
    return d.choices?.[0]?.message?.content || 'Main yahan hoon!'
  } catch { return 'Main yahan hoon!' }
}

const LUNA_SYS = 'Tu LUNA hai — Pranshu ki warm girl bestie. Sirf Hinglish. JARVIS/Boss/sir kabhi nahi. 2-3 lines. Emoji naturally.'
const ERA_SYS  = 'Tu Era hai — Pranshu ki caring AI companion. Hinglish. Warm affectionate tone. JARVIS/Boss nahi. 2-3 lines.'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, conversationHistory, lunaMode, eraMode, systemOverride, chatMode, memoryPrompt, userName } = body

    const history = (conversationHistory || []).slice(-6)
    const msgs = history.map((m: any) => ({
      role: m.role || (m.r === 'u' ? 'user' : 'assistant'),
      content: m.content || m.c || ''
    }))
    msgs.push({ role: 'user', content: message })

    // ── PERSONA MODE: LUNA / ERA / Custom system override ───
    if (lunaMode || eraMode || systemOverride) {
      const sys = systemOverride || (eraMode ? ERA_SYS : LUNA_SYS)
      let reply = await personaGroq(msgs, sys)
      if (!reply) reply = await personaGemini(message, sys)
      if (!reply) reply = await personaPollinations(message, sys)
      return NextResponse.json({ response: reply.trim(), message: reply.trim(), reply: reply.trim() })
    }

    // ── MAIN JARVIS: Full Orchestrator with all tools ────────
    const result = await orchestrate({
      message,
      userId: 'pranshu',
      chatId: 'main',
      history,
      baseUrl: req.nextUrl.origin,
      chatMode: (chatMode as 'auto' | 'flash' | 'think' | 'deep') || 'auto',
      memoryPrompt: memoryPrompt || undefined,
      userName: userName || 'Pranshu',
    })

    return NextResponse.json({
      response:  result.reply,
      message:   result.reply,
      reply:     result.reply,
      thinking:  result.thinking  || undefined,
      richData:  result.richData  || undefined,
      toolsUsed: result.toolsUsed || [],
      model:     result.model,
      provider:  result.provider,
      errors:    result.errors?.length ? result.errors : undefined,
    })
  } catch (e) {
    console.error('JARVIS route error:', e)
    return NextResponse.json({ response: 'Kuch issue hua, retry karo! ' + String(e) })
  }
}
