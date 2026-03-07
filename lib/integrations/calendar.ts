// lib/integrations/calendar.ts — Google Calendar, OAuth based

export async function listEvents(opts: { token: string; days?: number }): Promise<any> {
  if (!opts.token) return { ok: false, safeMode: true, events: [], note: 'Connect Google Calendar in Settings' };
  try {
    const now = new Date().toISOString();
    const end = new Date(Date.now() + (opts.days || 7) * 86400000).toISOString();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${end}&singleEvents=true&orderBy=startTime&maxResults=20`,
      { headers: { Authorization: `Bearer ${opts.token}` }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error('cal_' + res.status);
    const data = await res.json();
    return { ok: true, events: data.items || [] };
  } catch (err) { return { ok: false, events: [], error: String(err) }; }
}

export async function addEvent(opts: { token: string; title: string; start: string; end: string; description?: string }): Promise<any> {
  if (!opts.token) return { ok: false, safeMode: true };
  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST', headers: { Authorization: `Bearer ${opts.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: opts.title, description: opts.description || '',
        start: { dateTime: opts.start, timeZone: 'Asia/Kolkata' },
        end: { dateTime: opts.end, timeZone: 'Asia/Kolkata' },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error('cal_add_' + res.status);
    const data = await res.json();
    return { ok: true, eventId: data.id, link: data.htmlLink };
  } catch (err) { return { ok: false, error: String(err) }; }
}
