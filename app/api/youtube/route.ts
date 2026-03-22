import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

function extractVideoId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  const videoId = extractVideoId(url || '')
  if (!videoId) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })

  try {
    // Use free transcript API
    const apiUrl = 'https://yt-transcript-api.vercel.app/api/transcript?videoId=' + videoId + '&lang=en'
    const r = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) })
    
    if (r.ok) {
      const d = await r.json()
      const text = Array.isArray(d) ? d.map((x: any) => x.text).join(' ').substring(0, 4000) : ''
      return NextResponse.json({ transcript: text, videoId })
    }

    // Fallback: Scrape description from oEmbed
    const oEmbed = await fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + videoId + '&format=json')
    const meta = await oEmbed.json()
    return NextResponse.json({ 
      transcript: null, 
      title: meta.title,
      author: meta.author_name,
      note: 'Transcript not available, only metadata',
      videoId 
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
