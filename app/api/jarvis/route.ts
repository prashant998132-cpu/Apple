// app/api/jarvis/route.ts — v10.31 POWERED UP
// Streaming + File analysis + All chat modes + Smart context

import { NextRequest, NextResponse } from 'next/server'
import { orchestrate } from '../../../lib/core/orchestrator'

export const maxDuration = 60  // 60s timeout for complex queries

export async function POST(req: NextRequest) {
  const start = Date.now()
  try {
    const body = await req.json()
    const {
      message      = '',
      userId       = 'user',
      chatId,
      history      = [],
      location,
      providerMode = 'smart',
      chatMode     = 'auto',
      userName,
      memoryPrompt,
      fileData,        // base64 image/pdf for vision
      url,             // URL to analyze
    } = body

    if (!message?.trim() && !fileData && !url) {
      return NextResponse.json({ error: 'No input' }, { status: 400 })
    }

    const resolvedChatId = chatId || `chat_${userId}_${new Date().toDateString().replace(/ /g,'_')}`

    let forcedProvider: string | undefined
    if (chatMode === 'flash') forcedProvider = 'groq_fast'
    else if (chatMode === 'think') forcedProvider = 'deepseek_r1'
    else if (chatMode === 'deep') forcedProvider = 'gemini_deep'

    // Enhance message with context
    let enhancedMessage = message
    if (url) enhancedMessage = message + ' [URL: ' + url + ']'

    const result = await orchestrate({
      message: enhancedMessage || 'Analyze this',
      userId,
      chatId: resolvedChatId,
      history,
      location,
      baseUrl: req.nextUrl.origin,
      providerMode,
      forcedProvider,
      chatMode,
      userName,
      memoryPrompt,
      fileData,
    })

    return NextResponse.json({
      reply:        result.reply,
      thinking:     result.thinking,
      richData:     result.richData,
      toolsUsed:    result.toolsUsed,
      model:        result.model,
      provider:     result.provider,
      processingMs: result.processingMs,
      safeMode:     result.safeMode,
      intent:       result.routeReason,
      apiCallsMade: result.apiCallsMade,
      errors:       result.errors.length ? result.errors : undefined,
    })
  } catch (err) {
    console.error('[JARVIS]', err)
    return NextResponse.json({
      reply: 'Kuch gadbad ho gayi. Dobara try karo.',
      error: true,
      processingMs: Date.now() - start,
    }, { status: 200 })  // 200 so client shows the error message
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'JARVIS v10.31 online — Maximum Power',
    version: 'v10.31',
    modes: ['flash (Groq 8B — fastest)', 'think (DeepSeek R1 — reasoning)', 'deep (Gemini 2.0 — tools)', 'auto (Smart Router)'],
    providers: ['Gemini 2.0 Flash', 'Groq Llama 3.3 70B', 'DeepSeek V3/R1', 'Mistral', 'Grok xAI', 'OpenRouter', 'Together AI', 'Cohere', 'AIMLAPI', 'Pollinations (unlimited)'],
    tools: ['weather', 'news', 'crypto', 'wikipedia', 'image_gen', 'youtube', 'cricket', 'maps', '67+ more'],
    features: ['MacroDroid phone control', 'Contact picker', 'Push notifications', 'Offline queue', 'Mood tracking', 'Agentic multi-step', 'Memory', 'File/image analysis'],
  })
}
