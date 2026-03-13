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
import { trackCall, isNearLimit } from './usageTracker'
import { pickModelTier, getModelForTier } from './agentDispatcher'
import { classifyQuery, buildDynamicPrompt } from '../brain/queryClassifier'

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

function buildSimplePrompt(chatMode?: string, memoryPrompt?: string, message?: string, userName?: string, toolResults?: string): string {
  const modeNote =
    chatMode === 'think' ? '\nThink step by step. Show reasoning before answer.' :
    chatMode === 'deep'  ? '\nBe thorough. Use all knowledge. Comprehensive answer.' : ''

  // Use dynamic classifier if we have a message
  if (message) {
    const meta = classifyQuery(message)
    const dynamic = buildDynamicPrompt(meta, userName || 'Boss', memoryPrompt || '', toolResults)
    return dynamic + modeNote
  }

  // Fallback static prompt
  const base = (memoryPrompt || 'You are JARVIS — a personal AI. Hinglish mein baat karo. Direct raho.') +
    '\n- Math → seedha number/answer\n- Factual → 1-2 lines\n- Code → sirf code'
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
  // ── Dynamic Prompt — query-type aware ────────────────────
  const queryMeta = classifyQuery(input.message)
  const dynamicPrompt = buildDynamicPrompt(
    queryMeta,
    input.userName || 'Boss',
    input.memoryPrompt || '',
  )
  // Keep simplePrompt as alias for compatibility
  const simplePrompt = dynamicPrompt

  // ── FLASH MODE — Groq Llama 8B, fastest ─────────────────
  if (chatMode === 'flash') {
    try {
      if (groqKey && !isNearLimit('groq')) {
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
        trackCall('groq')
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
  let _routerCacheTTL = 0
  if (!reply && chatMode === 'auto') {
    const decision = route(input.message)
    _routerCacheTTL = decision.cacheTTL || 0

    // ── TOOL RESULTS PRE-FETCH — inject into AI context ──────
    let injectedToolResults = ''
    if (decision.tools.length > 0 && decision.brain !== 'direct') {
      try {
        const { routeTools } = await import('../tools/external-router')
        const toolResults = await routeTools(input.message)
        if (toolResults.length > 0) {
          injectedToolResults = toolResults.map(t => t.tool.toUpperCase() + ':\n' + t.data).join('\n\n')
          toolsUsed = toolResults.map(t => t.tool)
          const firstResult = toolResults[0]
          if (firstResult.tool.includes('weather') || firstResult.tool.includes('forecast'))
            richData = { type: 'weather', data: firstResult.data }
          else if (firstResult.tool.includes('news'))
            richData = { type: 'news', data: firstResult.data }
          else if (firstResult.tool.includes('crypto') || firstResult.tool.includes('stock'))
            richData = { type: 'finance', data: firstResult.data }
        }
      } catch(e: any) { errors.push('ToolPrefetch: ' + (e as any).message) }
    }

    // Rebuild prompt WITH tool results injected so AI reads real data
    const enrichedPrompt = injectedToolResults
      ? buildDynamicPrompt(queryMeta, input.userName || 'Boss', input.memoryPrompt || '', injectedToolResults)
      : simplePrompt
    const enrichedMsgs = [...simpleHistory, { role: 'user', content: input.message }]

    // Direct tool (no LLM): datetime, calculate, etc
    if (decision.brain === 'direct' && decision.tools[0]) {
      try {
        const toolName = decision.tools[0]
        const { get_datetime, calculate, get_sunrise_sunset } = await import('../tools/no-key')
        const toolMap: Record<string, any> = { get_datetime, calculate, get_sunrise_sunset }
        if (toolMap[toolName]) {
          const data = await toolMap[toolName]({})
          toolsUsed = [toolName]
          reply = toolName === 'get_datetime'
            ? '🕐 ' + (data.time_hindi || data.time) + ' | ' + (data.date_hindi || data.date)
            : JSON.stringify(data)
          model = 'direct'; provider = 'Direct Tool (no LLM)'; apiCallsMade++
        }
      } catch {}
    }

    // Groq — with tool results already injected into prompt
    if (!reply && decision.brain === 'groq' && groqKey) {
      try {
        const tier = pickModelTier(input.message, 'groq', decision.complexity, 'auto')
        const autoGroqModel = getModelForTier(tier)
        const r = await askGroq(enrichedMsgs, enrichedPrompt, autoGroqModel)
        const ex = extractThinking(r.text)
        if (ex.thinking) thinking = ex.thinking
        reply = ex.answer || r.text
        model = r.model
        provider = tier === 'nano' ? '⚡ Groq Llama 8B' : '🧠 Groq Llama 70B'
        apiCallsMade++
      } catch(e: any) { errors.push('Auto/Groq: ' + (e as any).message) }
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
        // Tool result injection for auto mode
        if (r.toolResults && Object.keys(r.toolResults).length > 0) {
          const toolCtx = Object.entries(r.toolResults).map(([k,v]) => k + ': ' + JSON.stringify(v).slice(0, 400)).join('\n')
          if (toolCtx && reply) {
            // Enrich the prompt context for richData building
            richData = { ...richData, toolContext: toolCtx }
          }
        }
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

  // Chat history saved client-side via lib/storage/index.ts

  const result: OrchestratorOutput = {
    reply, thinking, richData, toolsUsed, model, provider,
    processingMs: Date.now() - start,
    safeMode, errors,
    routeReason: chatMode,
    apiCallsMade,
  }

  // ── CACHE SAVE — use router's smart TTL for auto, else defaults ──
  if (reply && !safeMode) {
    const ttl = chatMode === 'flash' ? TTL.NEWS :
                chatMode === 'auto'  ? (_routerCacheTTL || TTL.DEFAULT) :
                TTL.DEFAULT
    if (ttl > 0) cacheSet(cacheCategory, input.message, result, ttl)
  }

  return result
}
