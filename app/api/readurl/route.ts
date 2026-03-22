import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })

  try {
    const jinaUrl = 'https://r.jina.ai/' + url
    const r = await fetch(jinaUrl, {
      headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' },
      signal: AbortSignal.timeout(15000)
    })
    if (!r.ok) throw new Error('Jina failed: ' + r.status)
    let text = await r.text()
    // Trim to 3000 chars
    if (text.length > 3000) text = text.substring(0, 3000) + '...'
    return NextResponse.json({ content: text, url })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
