// lib/integrations/gmail.ts — Gmail API, OAuth based, safe-mode fallback

export async function sendEmail(opts: { to: string; subject: string; body: string; token: string }): Promise<any> {
  if (!opts.token) return { ok: false, safeMode: true, error: 'Google OAuth token missing. Connect in Settings.' };
  try {
    const raw = Buffer.from(`To: ${opts.to}\r\nSubject: ${opts.subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${opts.body}`)
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { Authorization: `Bearer ${opts.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }), signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error('gmail_' + res.status);
    const data = await res.json();
    return { ok: true, messageId: data.id };
  } catch (err) { return { ok: false, error: String(err) }; }
}

export async function listEmails(opts: { token: string; maxResults?: number; query?: string }): Promise<any> {
  if (!opts.token) return { ok: false, safeMode: true, messages: [] };
  try {
    const q = encodeURIComponent(opts.query || 'is:unread');
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${opts.maxResults || 10}&q=${q}`,
      { headers: { Authorization: `Bearer ${opts.token}` }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('gmail_list_' + res.status);
    const data = await res.json();
    return { ok: true, messages: data.messages || [] };
  } catch (err) { return { ok: false, messages: [], error: String(err) }; }
}
