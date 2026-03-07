// app/api/tool-stream/route.ts
// Deep mode: SSE stream for real-time tool progress
// SSE chosen over WebSocket (simpler, HTTP-native, Vercel-compatible, mobile-safe)

import { NextRequest } from 'next/server'
import { orchestrate } from '../../../lib/core/orchestrator'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const encoder = new TextEncoder()

  const TOOL_LABELS: Record<string, string> = {
    get_weather:       '🌤️ Mausam check kar raha hun...',
    web_search:        '🔍 Web search kar raha hun...',
    search_wikipedia:  '📖 Wikipedia dekh raha hun...',
    search_news:       '📰 News fetch kar raha hun...',
    search_trains:     '🚂 Train schedule dekh raha hun...',
    get_location_info: '📍 Location dhundh raha hun...',
    generate_image:    '🎨 Image bana raha hun...',
    calculate:         '🔢 Calculate kar raha hun...',
    get_datetime:      '🕐 Time check kar raha hun...',
    convert_currency:  '💱 Currency convert kar raha hun...',
    text_to_speech:    '🔊 Audio bana raha hun...',
    get_rewa_info:     '📍 Local info fetch kar raha hun...',
    search_youtube:    '▶️ YouTube search kar raha hun...',
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      send({ type: 'start' })

      // Monkey-patch: intercept tool calls via callback in orchestrate input
      const toolCallback = (name: string, status: 'start' | 'done') => {
        send({ type: 'tool', tool: name, status, label: TOOL_LABELS[name] || `🔧 ${name.replace(/_/g,' ')}...` })
      }

      try {
        const result = await orchestrate({ ...body, chatMode: 'deep', onToolCall: toolCallback })
        send({ type: 'reply', reply: result.reply, thinking: result.thinking, toolsUsed: result.toolsUsed, model: result.model, richData: result.richData })
      } catch (e: any) {
        send({ type: 'error', text: e.message || 'Unknown error' })
      }

      send({ type: 'done' })
      controller.close()
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
  })
}
