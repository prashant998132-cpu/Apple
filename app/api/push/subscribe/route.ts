// app/api/push/subscribe/route.ts
// Saves push subscription to GitHub Gist for server-side push
// GET: retrieve subscription | POST: save subscription

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const GIST_ID_KEY  = 'JARVIS_PUSH_GIST_ID'
const GITHUB_TOKEN = process.env.GITHUB_PAT || ''
const GIST_FILENAME = 'jarvis_push_subscription.json'

async function getGistId(): Promise<string | null> {
  // We store Gist ID in env or search by filename
  const gistId = process.env.PUSH_GIST_ID || ''
  if (gistId) return gistId

  // Search user's gists for our file
  if (!GITHUB_TOKEN) return null
  const res = await fetch('https://api.github.com/gists', {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent': 'JARVIS' },
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) return null
  const gists: any[] = await res.json()
  const found = gists.find(g => g.files?.[GIST_FILENAME])
  return found?.id || null
}

export async function GET() {
  try {
    const gistId = await getGistId()
    if (!gistId) return NextResponse.json({ subscription: null })

    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent': 'JARVIS' },
    })
    const gist = await res.json()
    const content = gist.files?.[GIST_FILENAME]?.content
    if (!content) return NextResponse.json({ subscription: null })

    return NextResponse.json({ subscription: JSON.parse(content) })
  } catch {
    return NextResponse.json({ subscription: null })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { subscription } = await req.json()
    if (!subscription || !GITHUB_TOKEN) {
      return NextResponse.json({ ok: false, error: 'No token or subscription' })
    }

    const gistId = await getGistId()
    const body = {
      description: 'JARVIS Push Subscription (auto-managed)',
      public: false,
      files: { [GIST_FILENAME]: { content: JSON.stringify(subscription, null, 2) } },
    }

    let res
    if (gistId) {
      // Update existing gist
      res = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'JARVIS',
        },
        body: JSON.stringify(body),
      })
    } else {
      // Create new gist
      res = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'JARVIS',
        },
        body: JSON.stringify(body),
      })
    }

    const data = await res.json()
    return NextResponse.json({ ok: res.ok, gistId: data.id })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
