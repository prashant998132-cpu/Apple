// app/api/tts/route.ts
// TTS CASCADE — Best first → auto fallback
// 1. Google Cloud TTS  (1M chars/month, best Hindi WaveNet)
// 2. ElevenLabs        (10K chars/month, most realistic)
// 3. Microsoft Azure   (500K chars/month, Neural voices)
// 4. Play.ht           (12.5K words/month, good Hindi)
// 5. OpenAI TTS        (free credits, nova voice)
// 6. Fish Audio        (free credits, open source)
// 7. HuggingFace MMS   (rate limited, Hindi TTS)
// 8. Browser Web Speech (unlimited, always works)

import { NextRequest, NextResponse } from 'next/server';

// ── 1. Google Cloud TTS ──────────────────────────────────
async function google(text: string, lang: string, speed: number, quality: string) {
  const key = process.env.GOOGLE_TTS_KEY;
  if (!key) throw new Error('no_key');
  const voices: Record<string, Record<string, string>> = {
    hi: { high: 'hi-IN-Wavenet-D', fast: 'hi-IN-Standard-A' },
    en: { high: 'en-US-Wavenet-D', fast: 'en-US-Standard-B' },
  };
  const name = voices[lang]?.[quality] ?? 'hi-IN-Standard-A';
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: lang === 'en' ? 'en-US' : 'hi-IN', name },
      audioConfig: { audioEncoding: 'MP3', speakingRate: speed } }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error('gtts_' + res.status);
  const { audioContent } = await res.json();
  return { audioBase64: audioContent, mimeType: 'audio/mp3', provider: 'Google Cloud TTS', voice: name };
}

// ── 2. ElevenLabs ────────────────────────────────────────
async function elevenlabs(text: string, lang: string, speed: number) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('no_key');
  const voiceId = lang === 'hi'
    ? (process.env.ELEVENLABS_HINDI_VOICE || 'pNInz6obpgDQGcFmaJgB')
    : (process.env.ELEVENLABS_VOICE_ID   || 'EXAVITQu4vr4xnSDxMaL');
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.8, speed } }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error('el_' + res.status);
  return { audioBase64: Buffer.from(await res.arrayBuffer()).toString('base64'), mimeType: 'audio/mpeg', provider: 'ElevenLabs Multilingual v2', voice: voiceId };
}

// ── 3. Microsoft Azure Neural TTS ────────────────────────
async function azure(text: string, lang: string, speed: number) {
  const key = process.env.AZURE_TTS_KEY;
  const region = process.env.AZURE_REGION || 'eastus';
  if (!key) throw new Error('no_key');
  const voice = lang === 'hi' ? 'hi-IN-SwaraNeural' : 'en-US-JennyNeural';
  const esc = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const ssml = `<speak version='1.0' xml:lang='${lang==='en'?'en-US':'hi-IN'}'><voice name='${voice}'><prosody rate='${speed}'>${esc}</prosody></voice></speak>`;
  const tok = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
    { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key }, signal: AbortSignal.timeout(5000) });
  if (!tok.ok) throw new Error('azure_tok');
  const token = await tok.text();
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3' },
    body: ssml, signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error('azure_' + res.status);
  return { audioBase64: Buffer.from(await res.arrayBuffer()).toString('base64'), mimeType: 'audio/mpeg', provider: 'Azure Neural TTS', voice };
}

// ── 4. Play.ht ───────────────────────────────────────────
async function playht(text: string, lang: string) {
  const key = process.env.PLAYHT_API_KEY;
  const userId = process.env.PLAYHT_USER_ID;
  if (!key || !userId) throw new Error('no_key');
  const res = await fetch('https://api.play.ht/api/v2/tts/stream', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'X-User-Id': userId, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, voice: lang === 'hi' ? 'hi-IN-Standard-A' : 'en-US-Standard-B', output_format: 'mp3', voice_engine: 'PlayHT2.0' }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error('playht_' + res.status);
  return { audioBase64: Buffer.from(await res.arrayBuffer()).toString('base64'), mimeType: 'audio/mpeg', provider: 'Play.ht' };
}

// ── 5. OpenAI TTS ────────────────────────────────────────
async function openai(text: string, speed: number) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('no_key');
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', input: text, voice: 'nova', speed }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error('openai_' + res.status);
  return { audioBase64: Buffer.from(await res.arrayBuffer()).toString('base64'), mimeType: 'audio/mpeg', provider: 'OpenAI TTS', voice: 'nova' };
}

// ── 6. Fish Audio ────────────────────────────────────────
async function fish(text: string) {
  const key = process.env.FISH_AUDIO_KEY;
  if (!key) throw new Error('no_key');
  const res = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, format: 'mp3', latency: 'normal' }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error('fish_' + res.status);
  return { audioBase64: Buffer.from(await res.arrayBuffer()).toString('base64'), mimeType: 'audio/mpeg', provider: 'Fish Audio' };
}

// ── 7. HuggingFace MMS Hindi TTS ─────────────────────────
async function huggingface(text: string, lang: string) {
  const token = process.env.HUGGINGFACE_TOKEN;
  const model = lang === 'hi' ? 'facebook/mms-tts-hin' : 'microsoft/speecht5_tts';
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`,
    { method: 'POST', headers, body: JSON.stringify({ inputs: text }), signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error('hf_' + res.status);
  return { audioBase64: Buffer.from(await res.arrayBuffer()).toString('base64'), mimeType: 'audio/wav', provider: 'HuggingFace MMS-TTS', voice: model };
}

// ════════════════════════════════════════════════════════
// POST — Main handler: try each provider in order
// ════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const { text, lang = 'hi', speed = 1, quality = 'fast', provider: pref } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: 'No text' }, { status: 400 });

  const tried: string[] = [];

  // Ordered providers — best first
  type P = { id: string; fn: () => Promise<any> };
  const all: P[] = [
    { id: 'google',      fn: () => google(text, lang, speed, quality) },
    { id: 'elevenlabs',  fn: () => elevenlabs(text, lang, speed)       },
    { id: 'azure',       fn: () => azure(text, lang, speed)            },
    { id: 'playht',      fn: () => playht(text, lang)                  },
    { id: 'openai',      fn: () => openai(text, speed)                 },
    { id: 'fish',        fn: () => fish(text)                          },
    { id: 'huggingface', fn: () => huggingface(text, lang)             },
  ];

  // Preferred first
  const ordered = pref ? [...all.filter(p=>p.id===pref), ...all.filter(p=>p.id!==pref)] : all;

  for (const { id, fn } of ordered) {
    tried.push(id);
    try {
      const result = await fn();
      return NextResponse.json({ ...result, triedProviders: tried });
    } catch { /* next */ }
  }

  // Final: browser Web Speech API
  return NextResponse.json({ useBrowser: true, text, lang, speed, provider: 'Browser Web Speech (Unlimited)', triedProviders: tried });
}

// GET — Provider status
export async function GET() {
  return NextResponse.json({
    providers: [
      { id:'google',      name:'Google Cloud TTS',      limit:'1M chars/month',  hasKey: !!process.env.GOOGLE_TTS_KEY,      quality:5, hindi:true  },
      { id:'elevenlabs',  name:'ElevenLabs',             limit:'10K chars/month', hasKey: !!process.env.ELEVENLABS_API_KEY,  quality:5, hindi:true  },
      { id:'azure',       name:'Microsoft Azure Neural', limit:'500K chars/month',hasKey: !!process.env.AZURE_TTS_KEY,       quality:4, hindi:true  },
      { id:'playht',      name:'Play.ht',                limit:'12.5K words/mo',  hasKey: !!process.env.PLAYHT_API_KEY,      quality:4, hindi:true  },
      { id:'openai',      name:'OpenAI TTS',             limit:'Free credits',    hasKey: !!process.env.OPENAI_API_KEY,      quality:4, hindi:true  },
      { id:'fish',        name:'Fish Audio',             limit:'Free credits',    hasKey: !!process.env.FISH_AUDIO_KEY,      quality:4, hindi:false },
      { id:'huggingface', name:'HuggingFace MMS-TTS',   limit:'Rate limited',    hasKey: !!process.env.HUGGINGFACE_TOKEN,   quality:3, hindi:true  },
      { id:'browser',     name:'Browser Web Speech',     limit:'Unlimited',       hasKey: true,                              quality:2, hindi:true  },
    ]
  });
}

// ── EDGE TTS (Microsoft, No Key, Best Hindi) ─────────────
// Client-side only via edge-tts-universal or SpeechSynthesis hack
// Server: use azure endpoint without auth for short texts
async function edgeTTS(text: string, voice: string = 'hi-IN-SwaraNeural', speed: number = 1.0) {
  const rate = speed >= 1 ? `+${Math.round((speed-1)*100)}%` : `${Math.round((speed-1)*100)}%`
  const ssml = `<speak version='1.0' xml:lang='hi-IN'>
    <voice name='${voice}'>
      <prosody rate='${rate}'>${text.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]||c))}</prosody>
    </voice>
  </speak>`
  
  // Edge TTS endpoint (no auth needed for basic voices)
  const res = await fetch('https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'Mozilla/5.0',
    },
    body: ssml,
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error('edge_tts_' + res.status)
  const buf = await res.arrayBuffer()
  return { audioBase64: Buffer.from(buf).toString('base64'), mimeType: 'audio/mp3', provider: 'Edge TTS (Microsoft)', voice }
}
