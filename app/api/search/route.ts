import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query) return NextResponse.json({ error: 'No query' }, { status: 400 })

  // Try Serper.dev first
  if (process.env.SERPER_API_KEY) {
    try {
      const r = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: 5, gl: 'in', hl: 'hi' })
      })
      const d = await r.json()
      const results = (d.organic || []).slice(0, 5).map((x: any) => ({
        title: x.title,
        snippet: x.snippet,
        link: x.link
      }))
      return NextResponse.json({ results, source: 'serper' })
    } catch {}
  }

  // Fallback: DuckDuckGo
  try {
    const r = await fetch('https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1&no_redirect=1')
    const d = await r.json()
    const results = []
    if (d.AbstractText) results.push({ title: d.Heading, snippet: d.AbstractText, link: d.AbstractURL })
    for (const t of (d.RelatedTopics || []).slice(0, 4)) {
      if (t.Text && t.FirstURL) results.push({ title: t.Text.substring(0, 60), snippet: t.Text, link: t.FirstURL })
    }
    return NextResponse.json({ results, source: 'duckduckgo' })
  } catch {
    return NextResponse.json({ results: [], error: 'Search failed' })
  }
}
