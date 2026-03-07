// app/api/jarvis/route.ts — v9.3
// Supports chatMode: flash | think | deep | auto

import { NextRequest, NextResponse } from 'next/server'
import { orchestrate } from '../../../lib/core/orchestrator'

export async function POST(req: NextRequest) {
  const start = Date.now()
  try {
    const {
      message,
      userId       = 'user',
      chatId,
      history      = [],
      location,
      providerMode = 'smart',
      chatMode     = 'auto',   // ← NEW: flash | think | deep | auto
    } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'No message' }, { status: 400 })
    }

    const resolvedChatId = chatId || `chat_${userId}_${new Date().toDateString().replace(/ /g, '_')}`

    // Override model based on chatMode
    let forcedProvider: string | undefined
    if (chatMode === 'flash') forcedProvider = 'groq_fast'
    else if (chatMode === 'think') forcedProvider = 'deepseek_r1'
    else if (chatMode === 'deep') forcedProvider = 'gemini_deep'

    const result = await orchestrate({
      message, userId,
      chatId: resolvedChatId,
      history, location,
      baseUrl: req.nextUrl.origin,
      providerMode,
      forcedProvider,
      chatMode,
    })

    return NextResponse.json({
      reply:        result.reply,
      thinking:     result.thinking,      // ← DeepSeek R1 <think> content
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
      reply: 'माफ़ करना, कुछ गड़बड़ हो गई। फिर try करो।',
      error: true, processingMs: Date.now() - start,
    })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'JARVIS v9.3 online',
    modes: ['flash (Groq 8B)', 'think (DeepSeek R1)', 'deep (Gemini 2.0)', 'auto (Smart Router)'],
    providers: ['Gemini 2.0', 'Groq Llama', 'DeepSeek R1', 'Mistral', 'Grok', 'OpenRouter', 'Together', 'Cohere', 'AIMLAPI'],
    storage: 'Supabase → Firebase → client-side only',
  })
}
