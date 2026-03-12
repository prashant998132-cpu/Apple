// app/api/macrodroid/route.ts
// Receives events FROM MacroDroid → JARVIS can react
// MacroDroid macro: HTTP GET https://apple-lemon-zeta.vercel.app/api/macrodroid?event=xxx

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const event  = searchParams.get('event')  || 'ping'
  const data   = searchParams.get('data')   || ''
  const secret = searchParams.get('secret') || ''

  // Optional: validate secret if set
  const expectedSecret = process.env.MACRODROID_SECRET || ''
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Log the event (could trigger notifications, memory updates, etc.)
  const events: Record<string, string> = {
    battery_low:    '🔋 Battery low event received',
    charging:       '⚡ Phone charging started',
    charger_off:    '🔌 Charger disconnected',
    arrived_home:   '🏠 Arrived home',
    left_home:      '🚶 Left home',
    call_received:  '📞 Call received',
    call_missed:    '📵 Missed call',
    screen_on:      '📱 Screen turned on',
    screen_off:     '💤 Screen turned off',
    headphone_in:   '🎧 Headphones connected',
    headphone_out:  '🔇 Headphones disconnected',
    wifi_connected: '📶 WiFi connected',
    wifi_lost:      '📵 WiFi disconnected',
    ping:           '🟢 MacroDroid ping received',
  }

  const message = events[event] || `📡 MacroDroid event: ${event}${data ? ` — ${data}` : ''}`

  return NextResponse.json({
    ok: true,
    event,
    data,
    message,
    timestamp: new Date().toISOString(),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    return NextResponse.json({ ok: true, received: body, timestamp: new Date().toISOString() })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
}
