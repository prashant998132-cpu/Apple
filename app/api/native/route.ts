// app/api/native/route.ts
import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { action, data } = await req.json()

  // Screen time info (estimate from usage)
  if (action === 'device_info') {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      region: req.headers.get('x-vercel-ip-country') || 'IN' || 'IN',
      city: req.headers.get('x-vercel-ip-city') || 'Unknown' || 'Unknown',
      timezone: req.headers.get('x-vercel-ip-timezone') || 'Asia/Kolkata',
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
