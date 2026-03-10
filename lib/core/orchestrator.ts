// lib/core/orchestrator.ts — v9.4 FIXED
// Properly uses brain/gemini.ts (46 tools) + brain/groq.ts + llm.ts cascade
// Mobile Chrome compatible — no browser APIs

import { askGemini as askGeminiBrain } from '../brain/gemini'
import { askGroq as askGroqBrain } from '../brain/groq'
import { route } from '../brain/router'
// storage: client-side only (saveChat in lib/storage)
import {
  askGroq, askDeepSeek, askMistral, askOpenRouter,
  detectQueryType, askLLM
} from '../providers/llm'
import { cacheGet, cacheSet, TTL } from './responseCache'
import { pickModelTier, getModelForTier } from './agentDispatcher'

export interface OrchestratorInput {
  message: string
  userId: string
  chatId: string
  history: any[]
  location?: any
  baseUrl: string
  providerMode?: string
  chatMode?: 'auto' | 'flash' | 'think' | 'deep'
  forcedProvider?: string
  memoryPrompt?: string
  userName?: string
}

export interface OrchestratorOutput {
  reply: string
  thinking?: string
  richData?: any
  toolsUsed: string[]
  model: string
  provider: string
  processingMs: number
  safeMode: boolean
  errors: string[]
  routeReason: string
  apiCallsMade: number
}

// Default user profile for Gemini brain
function buildUserProfile(input: OrchestratorInput) {
  return {
    userId: input.userId,
    name: input.userName || 'Boss',
    language: 'hindi' as const,
    location: input.location || { city: '', lat: 0, lon: 0 },
    timezone: 'Asia/Kolkata',
    preferences: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function buildSimplePrompt(chatMode?: string, memoryPrompt?: string): string {
  const modeNote =
    chatMode === 'think' ? '\nThink step by step. Show reasoning before answer.' :
    chatMode === 'deep'  ? '\nBe thorough. Use all knowledge. Comprehensive answer.' : ''
  const base = (memoryPrompt || 'You are JARVIS — a personal AI. Hinglish mein baat karo. Direct raho.') +
    '\n- Math → seedha number/answer, koi explanation nahi jab tak na pucha jaye\n- Factual → 1-2 lines\n- Code → sirf code'
  return base + modeNote
}

function extractThinking(text: string): { thinking: string; answer: string } {
  const m = text.match(/<think>([\s\S]*?)<\/think>/i)
  if (m) return { thinking: m[1].trim(), answer: text.replace(/<think>[\s\S]*?<\/think>/i, '').trim() }
  return { thinking: '', answer: text }
}

export async function orchestrate(input: OrchestratorInput): Promise<OrchestratorOutput> {
  const start = Date.now()
  const errors: string[] = []
  let toolsUsed: string[] = []
  let richData: any
  let model = 'none', provider = 'none'
  let safeMode = false
  let apiCallsMade = 0
  let thinking = ''
  let reply = ''

  const chatMode = input.chatMode || 'auto'

  // ── CACHE CHECK — skip all API calls if we have fresh response ──
  const cacheCategory = chatMode === 'flash' ? 'flash' : chatMode === 'auto' ? 'auto' : chatMode
  const cached = cacheGet<OrchestratorOutput>(cacheCategory, input.message)
  if (cached && chatMode === 'flash') {
    return { ...cached, processingMs: 1, routeReason: 'cache_hit' }
  }

  const geminiKey = !!process.env.NEXT_PUBLIC_GEMINI_API_KEY
  const groqKey   = !!process.env.GROQ_API_KEY
  safeMode = !geminiKey && !groqKey

  // History formatted for Gemini brain
  const geminiHistory = (input.history || []).slice(-8).map((m: any) => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.content || '' }]
  }))

  // History for simple LLM providers (OpenAI format)
  const simpleHistory = (input.history || []).slice(-8).map((m: any) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content || ''
  }))
  const simpleMsgs = [...simpleHistory, { role: 'user', content: input.message }]

  const userProfile = buildUserProfile(input)
  const simplePrompt = buildSimplePrompt(chatMode)

  // ── FLASH MODE — Groq Llama 8B, fastest ─────────────────
  if (chatMode === 'flash') {
    try {
      if (groqKey) {
        const flashModel = getModelForTier(pickModelTier(input.message, 'groq', 1, 'flash'))
        const r = await askGroq(simpleMsgs, simplePrompt, flashModel)
        reply = r.text; model = r.model; provider = '⚡ Groq Llama 8B (Flash)'; apiCallsMade++
      } else {
        const r = await askLLM(simpleMsgs, simplePrompt)
        reply = r.text; model = r.model; provider = r.provider; apiCallsMade++
      }
    } catch(e: any) { errors.push('Flash: ' + e.message) }
  }

  // ── THINK MODE — DeepSeek R1 on Groq ─────────────────────
  if (!reply && chatMode === 'think') {
    try {
      if (groqKey) {
        const r = await askGroq(simpleMsgs,
          simplePrompt + '\nThink step by step inside <think> tags before answering.',
          'deepseek-r1-distill-llama-70b')
        const ex = extractThinking(r.text)
        thinking = ex.thinking
        reply = ex.answer || r.text
        model = 'DeepSeek R1 Distill 70B'; provider = '🧠 DeepSeek R1 on Groq'; apiCallsMade++
      }
    } catch(e: any) { errors.push('Think/R1: ' + e.message) }

    // Think fallback: DeepSeek direct
    if (!reply) {
      try {
        const r = await askDeepSeek(simpleMsgs, simplePrompt + '\nThink step by step.')
        const ex = extractThinking(r.text)
        thinking = ex.thinking
        reply = ex.answer || r.text
        model = r.model; provider = r.provider; apiCallsMade++
      } catch(e: any) { errors.push('Think/DS: ' + e.message) }
    }
  }

  // ── DEEP MODE — Gemini 2.0 Flash with 46 tools ────────────
  if (!reply && chatMode === 'deep' && geminiKey) {
    try {
      const r = await askGeminiBrain({
        message: input.message,
        history: geminiHistory,
        user: userProfile,
      })
      reply = r.reply
      toolsUsed = r.toolsUsed
      model = r.model; provider = '🔬 Gemini 2.0 Flash + 46 tools'; apiCallsMade++
    } catch(e: any) { errors.push('Deep/Gemini: ' + e.message) }
  }

  // ── AUTO MODE — Smart routing ──────────────────────────────
  if (!reply && chatMode === 'auto') {
    const decision = route(input.message)

    // Direct tool (no LLM): datetime, calculate, etc
    if (decision.brain === 'direct' && decision.tools[0]) {
      try {
        const toolName = decision.tools[0]
        const { get_datetime, calculate, get_sunrise_sunset } = await import('../tools/no-key')
        const toolMap: Record<string, any> = { get_datetime, calculate, get_sunrise_sunset }
        if (toolMap[toolName]) {
          const data = await toolMap[toolName]({})
          toolsUsed = [toolName]
          if (toolName === 'get_datetime') {
            reply = `🕐 ${data.time_hindi || data.time} | ${data.date_hindi || data.date}`
          } else {
            reply = JSON.stringify(data)
          }
          model = 'direct'; provider = 'Direct Tool (no LLM)'; apiCallsMade++
        }
      } catch {}
    }

    // Groq for simple queries
    if (!reply && decision.brain === 'groq' && groqKey) {
      try {
        const r = await askGroq(simpleMsgs, simplePrompt, 'llama-3.3-70b-versatile')
        const ex = extractThinking(r.text)
        if (ex.thinking) thinking = ex.thinking
        reply = ex.answer || r.text
        model = r.model; provider = r.provider; apiCallsMade++
      } catch(e: any) { errors.push('Auto/Groq: ' + e.message) }
    }

    // Gemini for complex + tool queries
    if (!reply && geminiKey) {
      try {
        const r = await askGeminiBrain({
          message: input.message,
          history: geminiHistory,
          user: userProfile,
          toolNames: decision.tools.length ? decision.tools : undefined,
        })
        reply = r.reply
        toolsUsed = r.toolsUsed
        model = r.model; provider = 'Gemini 2.0 Flash'; apiCallsMade++
        // Build richData from tool results
        if (r.toolResults && Object.keys(r.toolResults).length > 0) {
          const firstTool = Object.keys(r.toolResults)[0]
          const d = r.toolResults[firstTool]
          if (firstTool.includes('weather'))    richData = { type: 'weather', data: d }
          else if (firstTool.includes('news'))  richData = { type: 'news',    data: d }
          else if (firstTool.includes('image')) richData = { type: 'image',   data: d }
        }
      } catch(e: any) { errors.push('Auto/Gemini: ' + e.message) }
    }
  }

  // ── UNIVERSAL FALLBACK CASCADE ─────────────────────────────
  if (!reply) {
    const qType = detectQueryType(input.message)
    try {
      const r = await askLLM(simpleMsgs, simplePrompt, qType)
      const ex = extractThinking(r.text)
      if (ex.thinking) thinking = ex.thinking
      reply = ex.answer || r.text
      model = r.model; provider = r.provider; apiCallsMade++
    } catch(e: any) { errors.push('Cascade: ' + e.message) }
  }

  if (!reply) {
    // NOTE: Puter.js emergency fallback is client-side only
    // Frontend (app/page.tsx) handles this via window.puter
    reply = '⚡ Sab AI providers busy hain. Ek second... Puter.js se try karo (Settings → Storage → Puter Cloud). 🙏'
    safeMode = true
  }

  // Save to cloud (non-blocking)
  const updatedHistory = [
    ...(input.history || []),
    { role: 'user',      content: input.message, ts: Date.now() },
    { role: 'assistant', content: reply,          ts: Date.now(), toolsUsed, model, thinking },
  ]
  // chat history saved client-side via lib/storage/index.ts

  const result: OrchestratorOutput = {
    reply, thinking, richData, toolsUsed, model, provider,
    processingMs: Date.now() - start,
    safeMode, errors,
    routeReason: chatMode,
    apiCallsMade,
  }

  // ── CACHE SAVE — store for next identical query ──
  if (reply && !safeMode) {
    const ttl = chatMode === 'flash' ? TTL.NEWS :   // flash = 5 min
                chatMode === 'auto'  ? TTL.DEFAULT : // auto = 5 min
                TTL.DEFAULT
    cacheSet(cacheCategory, input.message, result, ttl)
  }

  return result
}
