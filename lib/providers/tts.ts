// lib/providers/tts.ts — v2 MEGA CASCADE
// 0. Edge TTS (Microsoft, NO KEY, best Hindi FREE)
// 1. Google Cloud TTS (1M/month)
// 2. ElevenLabs (10K/month)
// 3. Azure Neural (500K/month)
// 4. Play.ht (12.5K words/month)
// 5. OpenAI TTS (free credits)
// 6. Fish Audio (free credits)
// 7. HuggingFace MMS-Hindi (rate limited)
// 8. Browser Web Speech API (unlimited, always works)

export interface TTSResult {
  audioBase64?: string; audioUrl?: string; mimeType?: string;
  provider: string; voice?: string; useBrowser?: boolean;
  text?: string; lang?: string; speed?: number;
}

type TTSOptions = {
  text: string; lang?: 'hi' | 'en' | 'mixed'; speed?: number;
  quality?: 'fast' | 'high'; preferredProvider?: string;
  voiceName?: string; pitch?: 'low' | 'normal' | 'high';
}

// ── 0. Edge TTS (Microsoft — NO KEY, best Hindi free) ────
async function edgeTTS({ text, lang = 'hi', speed = 1, voiceName, pitch = 'normal' }: TTSOptions): Promise<TTSResult> {
  const voiceMap: Record<string, string> = {
    hi: 'hi-IN-SwaraNeural',    // Best Hindi voice
    en: 'en-US-JennyNeural',
    mixed: 'hi-IN-SwaraNeural',
  }
  const voice = voiceName || voiceMap[lang] || 'hi-IN-SwaraNeural'
  const rate = speed >= 1 ? `+${Math.round((speed - 1) * 100)}%` : `-${Math.round((1 - speed) * 100)}%`
  const pitchMap = { low: '-10Hz', normal: '+0Hz', high: '+10Hz' }
  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang === 'en' ? 'en-US' : 'hi-IN'}'><voice name='${voice}'><prosody rate='${rate}' pitch='${pitchMap[pitch]}'>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</prosody></voice></speak>`
  
  // Edge TTS via unofficial API endpoint
  const res = await fetch('https://api.edge-tts.com/v1/tts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voice, text, ssml, format: 'audio-24khz-48kbitrate-mono-mp3' }),
    signal: AbortSignal.timeout(10000)
  })
  if (!res.ok) throw new Error('edge_' + res.status)
  const buf = await res.arrayBuffer()
  return { audioBase64: Buffer.from(buf).toString('base64'), mimeType: 'audio/mp3', provider: 'Edge TTS (Microsoft, No Key)', voice }
}

// ── 1. Google Cloud TTS ──────────────────────────────────
async function googleTTS({ text, lang = 'hi', speed = 1, quality = 'fast', voiceName }: TTSOptions): Promise<TTSResult> {
  const key = process.env.GOOGLE_TTS_KEY || process.env.NEXT_PUBLIC_GOOGLE_TTS_KEY
  if (!key) throw new Error('no_key')
  const voiceMap = {
    hi: { high: 'hi-IN-Wavenet-D', fast: 'hi-IN-Standard-A' },
    en: { high: 'en-US-Wavenet-D', fast: 'en-US-Standard-B' },
    mixed: { high: 'hi-IN-Wavenet-D', fast: 'hi-IN-Standard-A' },
  }
  const name = voiceName || (voiceMap[lang]?.[quality ?? 'fast'] ?? 'hi-IN-Standard-A')
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: lang === 'en' ? 'en-US' : 'hi-IN', name }, audioConfig: { audioEncoding: 'MP3', speakingRate: speed } }),
    signal: AbortSignal.timeout(10000)
  })
  if (!res.ok) throw new Error('google_tts_' + res.status)
  const data = await res.json()
  return { audioBase64: data.audioContent, mimeType: 'audio/mp3', provider: 'Google Cloud TTS', voice: name }
}

// ── 2. ElevenLabs ────────────────────────────────────────
async function elevenLabsTTS({ text, speed = 1 }: TTSOptions): Promise<TTSResult> {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error('no_key')
  const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
    method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice_settings: { stability: 0.5, similarity_boost: 0.75, speed } }),
    signal: AbortSignal.timeout(15000)
  })
  if (!res.ok) throw new Error('eleven_' + res.status)
  const buf = await res.arrayBuffer()
  return { audioBase64: Buffer.from(buf).toString('base64'), mimeType: 'audio/mp3', provider: 'ElevenLabs' }
}

// ── 3. Azure Neural TTS ──────────────────────────────────
async function azureTTS({ text, lang = 'hi', speed = 1, voiceName }: TTSOptions): Promise<TTSResult> {
  const key = process.env.AZURE_TTS_KEY; const region = process.env.AZURE_REGION || 'eastus'
  if (!key) throw new Error('no_key')
  const voice = voiceName || (lang === 'en' ? 'en-US-JennyNeural' : 'hi-IN-SwaraNeural')
  const rate = speed >= 1 ? `+${Math.round((speed-1)*100)}%` : `-${Math.round((1-speed)*100)}%`
  const ssml = `<speak version='1.0' xml:lang='${lang==='en'?'en-US':'hi-IN'}'><voice name='${voice}'><prosody rate='${rate}'>${text}</prosody></voice></speak>`
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3' },
    body: ssml, signal: AbortSignal.timeout(10000)
  })
  if (!res.ok) throw new Error('azure_' + res.status)
  return { audioBase64: Buffer.from(await res.arrayBuffer()).toString('base64'), mimeType: 'audio/mp3', provider: 'Azure Neural TTS', voice }
}

// ── 4. OpenAI TTS ────────────────────────────────────────
async function openaiTTS({ text, speed = 1 }: TTSOptions): Promise<TTSResult> {
  const key = process.env.OPENAI_API_KEY; if (!key) throw new Error('no_key')
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', input: text, voice: 'nova', speed }),
    signal: AbortSignal.timeout(15000)
  })
  if (!res.ok) throw new Error('openai_tts_' + res.status)
  return { audioBase64: Buffer.from(await res.arrayBuffer()).toString('base64'), mimeType: 'audio/mp3', provider: 'OpenAI TTS' }
}

// ── 5. HuggingFace MMS-Hindi ─────────────────────────────
async function huggingFaceTTS({ text }: TTSOptions): Promise<TTSResult> {
  const token = process.env.HUGGINGFACE_TOKEN
  const headers: Record<string,string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch('https://api-inference.huggingface.co/models/facebook/mms-tts-hin', {
    method: 'POST', headers, body: JSON.stringify({ inputs: text }), signal: AbortSignal.timeout(30000)
  })
  if (!res.ok) throw new Error('hf_tts_' + res.status)
  return { audioBase64: Buffer.from(await res.arrayBuffer()).toString('base64'), mimeType: 'audio/wav', provider: 'HuggingFace MMS-Hindi (No Key)' }
}

// ── 6. Browser Speech API (always works) ─────────────────
function browserTTS({ text, lang = 'hi', speed = 1 }: TTSOptions): TTSResult {
  return { useBrowser: true, text, lang: lang === 'en' ? 'en-US' : 'hi-IN', speed, provider: 'Browser Speech API (Free)' }
}

// ════════════════════════════════════════════════════════
// MAIN CASCADE
// ════════════════════════════════════════════════════════
export async function generateSpeech(options: TTSOptions): Promise<TTSResult> {
  const preferred = options.preferredProvider

  const providers: Array<[string, () => Promise<TTSResult>]> = [
    ['edge',       () => edgeTTS(options)],
    ['google',     () => googleTTS(options)],
    ['elevenlabs', () => elevenLabsTTS(options)],
    ['azure',      () => azureTTS(options)],
    ['openai',     () => openaiTTS(options)],
    ['huggingface',() => huggingFaceTTS(options)],
  ]

  // If preferred, try it first
  if (preferred && preferred !== 'auto' && preferred !== 'browser') {
    const prov = providers.find(([k]) => k === preferred)
    if (prov) {
      try { return await prov[1]() } catch { /* fallback */ }
    }
  }

  // Auto cascade
  for (const [, fn] of providers) {
    try { return await fn() } catch { /* next */ }
  }

  return browserTTS(options)
}

// Available voices per provider (for Settings UI)
export const TTS_VOICES: Record<string, Array<{id:string,name:string,lang:string}>> = {
  edge: [
    { id: 'hi-IN-SwaraNeural',   name: 'Swara (Hindi Female)', lang: 'hi' },
    { id: 'hi-IN-MadhurNeural',  name: 'Madhur (Hindi Male)', lang: 'hi' },
    { id: 'en-US-JennyNeural',   name: 'Jenny (English Female)', lang: 'en' },
    { id: 'en-US-GuyNeural',     name: 'Guy (English Male)', lang: 'en' },
  ],
  google: [
    { id: 'hi-IN-Wavenet-D',    name: 'Wavenet D (Hindi)', lang: 'hi' },
    { id: 'hi-IN-Standard-A',   name: 'Standard A (Hindi)', lang: 'hi' },
    { id: 'en-US-Wavenet-D',    name: 'Wavenet D (English)', lang: 'en' },
  ],
  azure: [
    { id: 'hi-IN-SwaraNeural',  name: 'Swara (Hindi Female)', lang: 'hi' },
    { id: 'hi-IN-MadhurNeural', name: 'Madhur (Hindi Male)', lang: 'hi' },
  ],
}
