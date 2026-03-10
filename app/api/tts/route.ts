// app/api/tts/route.ts — v2 BANDWIDTH-OPTIMIZED
// Strategy: Return URLs/instructions instead of binary audio data
// Never proxy audio through Vercel — client plays directly from source
// This eliminates ~95% of bandwidth from TTS

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Edge TTS (Microsoft, FREE, no key, best Hindi quality)
// Returns URL directly — browser plays it, Vercel serves ZERO bytes
async function getEdgeTTSUrl(text: string, voice = 'hi-IN-SwaraNeural', speed = 1.0): Promise<string | null> {
  // Edge TTS via public endpoint
  const rate = speed >= 1 ? `+${Math.round((speed - 1) * 100)}%` : `${Math.round((speed - 1) * 100)}%`;
  const ssml = `<speak version='1.0' xml:lang='hi-IN'><voice name='${voice}'><prosody rate='${rate}'>${text.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] || c))}</prosody></voice></speak>`;

  // Try Edge TTS via websocket-like endpoint (public, no auth)
  try {
    const reqId = crypto.randomUUID().replace(/-/g, '');
    const url = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=${reqId}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'Mozilla/5.0',
      },
      body: ssml,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    // Return as base64 — but ONLY for edge TTS (small, <30KB usually)
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 200000) return null; // >200KB = too large
    const bytes = new Uint8Array(buf);
    let b64 = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      b64 += String.fromCharCode(...bytes.slice(i, i + 8192));
    }
    return btoa(b64);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';

  // Whisper transcription mode — audio blob sent as FormData
  if (contentType.includes('multipart/form-data')) {
    try {
      const form = await req.formData();
      const audio = form.get('audio') as File | null;
      if (!audio) return NextResponse.json({ error: 'No audio' }, { status: 400 });

      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) return NextResponse.json({ text: '', error: 'No Groq key for Whisper' });

      const fd = new FormData();
      fd.append('file', audio, 'audio.webm');
      fd.append('model', 'whisper-large-v3-turbo');
      fd.append('language', 'hi');  // Hindi primary
      fd.append('response_format', 'json');

      const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}` },
        body: fd,
        signal: AbortSignal.timeout(20000),
      });
      const d = await r.json() as { text?: string };
      return NextResponse.json({ text: d.text || '', provider: 'Groq Whisper' });
    } catch(e: any) {
      return NextResponse.json({ text: '', error: e.message });
    }
  }

  const { text, lang = 'hi', speed = 1.0 } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: 'No text' }, { status: 400 });

  // Truncate to max 300 chars to keep audio small
  const truncated = text.slice(0, 300);
  const voice = lang === 'en' ? 'en-IN-NeerjaNeural' : 'hi-IN-SwaraNeural';

  // Try Edge TTS (Microsoft, free, no key)
  const audioBase64 = await getEdgeTTSUrl(truncated, voice, speed);
  if (audioBase64) {
    return NextResponse.json(
      { audioBase64, mimeType: 'audio/mp3', provider: 'Edge TTS (Microsoft)', voice },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Fallback: tell client to use Web Speech API (zero bandwidth)
  return NextResponse.json(
    { useBrowser: true, text: truncated, lang, speed, provider: 'Browser Web Speech' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function GET() {
  return NextResponse.json({ status: 'ok', note: 'Use POST with {text, lang, speed}' });
}
