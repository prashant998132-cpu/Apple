// app/api/verify-key/route.ts
// API key verification — real test call per provider
// Cheapest possible call: minimal tokens, fast timeout

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const TESTS: Record<string, { url: string; body: (key: string) => object; authHeader: (key: string) => string }> = {
  GROQ_API_KEY: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    body: () => ({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
    authHeader: k => `Bearer ${k}`,
  },
  NEXT_PUBLIC_GEMINI_API_KEY: {
    url: (k: string) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${k}`,
    body: () => ({ contents: [{ parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 1 } }),
    authHeader: () => '',
  } as any,
  DEEPSEEK_API_KEY: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    body: () => ({ model: 'deepseek-chat', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
    authHeader: k => `Bearer ${k}`,
  },
  MISTRAL_API_KEY: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    body: () => ({ model: 'mistral-small-latest', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
    authHeader: k => `Bearer ${k}`,
  },
  GROK_API_KEY: {
    url: 'https://api.x.ai/v1/chat/completions',
    body: () => ({ model: 'grok-3-fast', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
    authHeader: k => `Bearer ${k}`,
  },
  ELEVENLABS_API_KEY: {
    url: 'https://api.elevenlabs.io/v1/voices',
    body: () => ({}),
    authHeader: k => k, // xi-api-key header
  },
  HF_TOKEN: {
    url: 'https://huggingface.co/api/whoami',
    body: () => ({}),
    authHeader: k => `Bearer ${k}`,
  },
}

export async function POST(req: NextRequest) {
  const { keyName, keyValue } = await req.json()
  if (!keyName || !keyValue) return NextResponse.json({ ok: false, error: 'Key info missing' })

  const test = TESTS[keyName]
  if (!test) return NextResponse.json({ ok: true, note: 'Auto-passed — no test for this key' })

  try {
    const url = typeof test.url === 'function' ? (test.url as any)(keyValue) : test.url
    const auth = test.authHeader(keyValue)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (auth) {
      if (keyName === 'ELEVENLABS_API_KEY') headers['xi-api-key'] = auth
      else headers['Authorization'] = auth
    }

    const res = await fetch(url, {
      method: keyName === 'ELEVENLABS_API_KEY' || keyName === 'HF_TOKEN' ? 'GET' : 'POST',
      headers,
      body: keyName === 'ELEVENLABS_API_KEY' || keyName === 'HF_TOKEN' ? undefined : JSON.stringify(test.body(keyValue)),
      signal: AbortSignal.timeout(8000),
    })

    if (res.ok || res.status === 400) { // 400 = key valid, bad request (no model etc)
      return NextResponse.json({ ok: true })
    }
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ ok: false, error: 'Invalid key — unauthorized' })
    }
    return NextResponse.json({ ok: false, error: `HTTP ${res.status}` })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
