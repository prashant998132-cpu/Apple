// app/api/fetch-url/route.ts
// URL content fetcher for link summarizer
// Research: cheerio (heavy) vs puppeteer (too heavy) vs native fetch + regex
// Winner: native fetch + regex strip — zero deps, edge-compatible, fast

import { NextRequest, NextResponse } from 'next/server'

function stripHTML(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
    .trim()
    .slice(0, 4000) // first 4000 chars = main content usually
}

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ error: 'Valid URL chahiye' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JARVIS/9.9)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const text = stripHTML(html)

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch?.[1]?.trim() || url

    return NextResponse.json({ text, title, url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Fetch failed' }, { status: 500 })
  }
}
