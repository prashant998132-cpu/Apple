import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'No prompt' }, { status: 400 })

  // Pollinations video (alpha)
  const videoUrl = 'https://video.pollinations.ai/' + encodeURIComponent(prompt)
  return NextResponse.json({ url: videoUrl, prompt, note: 'Alpha — may take 30-60s' })
}
