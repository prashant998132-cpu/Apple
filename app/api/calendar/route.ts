// app/api/calendar/route.ts — Google Calendar + Gmail
import { NextRequest, NextResponse } from 'next/server';

// ── List events ───────────────────────────────────────────
async function listEvents(token: string, days: number) {
  const now = new Date().toISOString();
  const end = new Date(Date.now() + days * 86400000).toISOString();
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${end}&maxResults=20&orderBy=startTime&singleEvents=true`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Calendar list ' + res.status);
  const data = await res.json();
  return (data.items || []).map((e: any) => ({
    id: e.id, title: e.summary, description: e.description,
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date, location: e.location,
    color: e.colorId
  }));
}

// ── Add event ─────────────────────────────────────────────
async function addEvent(token: string, event: any) {
  const body = {
    summary: event.title, description: event.description, location: event.location,
    start: { dateTime: event.start, timeZone: 'Asia/Kolkata' },
    end: { dateTime: event.end, timeZone: 'Asia/Kolkata' },
    colorId: event.color || '1',
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] }
  };
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Calendar add ' + res.status);
  return res.json();
}

// ── Send email ────────────────────────────────────────────
async function sendEmail(token: string, to: string, subject: string, body: string) {
  const raw = [`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset=utf-8', '', body].join('\n');
  const encoded = Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encoded })
  });
  if (!res.ok) throw new Error('Gmail send ' + res.status);
  return { success: true };
}

export async function POST(req: NextRequest) {
  try {
    const { action, token, event, days, to, subject, emailBody } = await req.json();
    if (!token) return NextResponse.json({ error: 'Google token required. Settings → Integrations mein connect karo.' }, { status: 401 });

    switch (action) {
      case 'list':   return NextResponse.json({ events: await listEvents(token, days || 7) });
      case 'add':    return NextResponse.json({ event: await addEvent(token, event) });
      case 'email':  return NextResponse.json(await sendEmail(token, to, subject, emailBody));
      default:       return NextResponse.json({ error: 'action: list | add | email' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── OAuth callback ────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    // Return auth URL
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirect = req.nextUrl.origin + '/api/calendar';
    const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
    return NextResponse.json({ authUrl });
  }

  // Exchange code for token
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
  const secret   = process.env.GOOGLE_CLIENT_SECRET!;
  const redirect = req.nextUrl.origin + '/api/calendar';
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: secret,
      redirect_uri: redirect, grant_type: 'authorization_code' })
  });
  if (!res.ok) return NextResponse.json({ error: 'Token exchange failed' }, { status: 400 });
  const tokens = await res.json();

  // Store in client via redirect
  const html = `<!DOCTYPE html><html><body><script>
    localStorage.setItem('jarvis_google_token','${tokens.access_token}');
    localStorage.setItem('jarvis_google_refresh','${tokens.refresh_token || ''}');
    localStorage.setItem('jarvis_google_expiry','${Date.now() + (tokens.expires_in || 3600) * 1000}');
    window.location.href='/settings?tab=integrations&connected=google';
  </script><p>Connected! Redirecting...</p></body></html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}
