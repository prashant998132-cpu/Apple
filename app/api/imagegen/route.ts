import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { prompt, model = 'flux', width = 1024, height = 1024 } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'No prompt' }, { status: 400 })

  // Pollinations — completely free, no key
  const seed = Math.floor(Math.random() * 999999)
  const imageUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt)
    + '?model=' + model
    + '&width=' + width
    + '&height=' + height
    + '&seed=' + seed
    + '&nologo=true'
    + '&enhance=true'

  return NextResponse.json({ url: imageUrl, prompt, seed })
}
