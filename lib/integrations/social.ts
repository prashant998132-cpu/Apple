// lib/integrations/social.ts — Meta, Twitter, Telegram, WhatsApp

export async function postInstagram(opts: { token: string; userId: string; caption: string; imageUrl?: string }): Promise<any> {
  if (!opts.token || !opts.userId) return { ok: false, safeMode: true, note: 'Connect Instagram in Settings' };
  try {
    const imgUrl = opts.imageUrl || 'https://placehold.co/1080x1080/0a0e1a/00e5ff?text=JARVIS';
    const mediaRes = await fetch(`https://graph.instagram.com/v21.0/${opts.userId}/media`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imgUrl, caption: opts.caption, access_token: opts.token }),
      signal: AbortSignal.timeout(20000),
    });
    if (!mediaRes.ok) throw new Error('ig_media_' + mediaRes.status);
    const { id: containerId } = await mediaRes.json();
    const pubRes = await fetch(`https://graph.instagram.com/v21.0/${opts.userId}/media_publish`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId, access_token: opts.token }),
      signal: AbortSignal.timeout(20000),
    });
    if (!pubRes.ok) throw new Error('ig_pub_' + pubRes.status);
    const data = await pubRes.json();
    return { ok: true, platform: 'instagram', postId: data.id };
  } catch (err) { return { ok: false, platform: 'instagram', error: String(err) }; }
}

export async function postFacebook(opts: { token: string; pageId: string; message: string; imageUrl?: string }): Promise<any> {
  if (!opts.token || !opts.pageId) return { ok: false, safeMode: true };
  try {
    const endpoint = opts.imageUrl
      ? `https://graph.facebook.com/v21.0/${opts.pageId}/photos`
      : `https://graph.facebook.com/v21.0/${opts.pageId}/feed`;
    const body: any = { access_token: opts.token, message: opts.message };
    if (opts.imageUrl) body.url = opts.imageUrl;
    const res = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error('fb_' + res.status);
    const data = await res.json();
    return { ok: true, platform: 'facebook', postId: data.id };
  } catch (err) { return { ok: false, platform: 'facebook', error: String(err) }; }
}

export async function postTwitter(opts: { bearerToken: string; text: string }): Promise<any> {
  if (!opts.bearerToken) return { ok: false, safeMode: true };
  try {
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST', headers: { Authorization: `Bearer ${opts.bearerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: opts.text }), signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error('twitter_' + res.status);
    const data = await res.json();
    return { ok: true, platform: 'twitter', tweetId: data.data?.id };
  } catch (err) { return { ok: false, platform: 'twitter', error: String(err) }; }
}

export async function sendTelegram(opts: { text: string }): Promise<any> {
  const bot = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!bot || !chat) return { ok: false, safeMode: true, note: 'Add TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in Vercel env' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: opts.text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error('tg_' + res.status);
    return { ok: true, platform: 'telegram' };
  } catch (err) { return { ok: false, platform: 'telegram', error: String(err) }; }
}

export function whatsappLink(text: string, phone?: string): string {
  return phone
    ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
}
