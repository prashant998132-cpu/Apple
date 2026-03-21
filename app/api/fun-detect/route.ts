// app/api/fun-detect/route.ts
// Helper: detect fun intents from message
import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { message } = await req.json()
  const msg = message?.toLowerCase() || ''

  // Detect fun intent
  if (msg.includes('roast') || msg.includes('roast kar')) return NextResponse.json({ intent: 'roast' })
  if (msg.includes('shayari') || msg.includes('sher')) return NextResponse.json({ intent: 'shayari' })
  if (msg.includes('rap') || msg.includes('rap bana')) return NextResponse.json({ intent: 'rap' })
  if (msg.includes('8 ball') || msg.includes('magic') || msg.includes('batao kya hoga')) return NextResponse.json({ intent: 'magic8' })
  if (msg.includes('dare') || msg.includes('challenge')) return NextResponse.json({ intent: 'dare' })
  if (msg.includes('life hack') || msg.includes('tip do')) return NextResponse.json({ intent: 'lifehack' })
  if (msg.includes('joke') || msg.includes('hasao') || msg.includes('funny')) return NextResponse.json({ intent: 'joke' })
  if (msg.includes('motivat') || msg.includes('himmat') || msg.includes('inspire')) return NextResponse.json({ intent: 'motivation' })
  if (msg.includes('bore') || msg.includes('kya karoon') || msg.includes('kuch karo')) return NextResponse.json({ intent: 'bored' })
  if (msg.includes('truth') || msg.includes('sachchi baat')) return NextResponse.json({ intent: 'truth' })

  return NextResponse.json({ intent: null })
}
