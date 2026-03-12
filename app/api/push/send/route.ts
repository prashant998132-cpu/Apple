// app/api/push/send/route.ts
// Sends push notification to stored subscription
// Called by scheduler, reminder system, or JARVIS proactively

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'  // web-push needs Node, not Edge

// VAPID keys — set in Vercel env vars
const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY  || 'BCOKkUUNtTS31OidVojPqwYnYDcogR2LheEl__Ux9xVAYXncsthby6sfvO-7fsgwg-DblERS-VXFuvAHt9NWZHE'
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_EMAIL   = 'mailto:prashant998132@gmail.com'

export async function POST(req: NextRequest) {
  try {
    const { title, body, tag, subscription } = await req.json()

    if (!subscription) {
      return NextResponse.json({ ok: false, error: 'No subscription provided' }, { status: 400 })
    }
    if (!VAPID_PRIVATE) {
      return NextResponse.json({ ok: false, error: 'VAPID_PRIVATE_KEY not set in env' }, { status: 500 })
    }

    // Dynamic import — web-push is in package.json
    const webpush = (await import('web-push')).default
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

    const payload = JSON.stringify({
      title: title || 'JARVIS',
      body:  body  || 'Notification',
      tag:   tag   || 'jarvis-notif',
      icon:  '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
    })

    await webpush.sendNotification(subscription, payload)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
