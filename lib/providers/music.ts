// lib/providers/music.ts
// MUSIC CASCADE — Best first, auto fallback
// 1. HuggingFace MusicGen (direct audio, API)
// 2. ElevenLabs Music (same key as TTS)
// 3. Mubert API (royalty-free)
// 4. Links: Suno → Udio → Boomy → AIVA (best quality, browser)

export interface MusicResult {
  audioBase64?: string;
  audioUrl?: string;
  mimeType?: string;
  provider: string;
  prompt: string;
  duration?: number;
  isLink?: boolean;
  links?: MusicLink[];
}

export interface MusicLink {
  name: string;
  url: string;
  limit: string;
  quality: number;
  recommended?: boolean;
}

// Indian music style presets — best first
export const MUSIC_STYLES: Record<string, string> = {
  bollywood_sad:   'bollywood sad romantic hindi song, piano, strings, slow tempo, emotional, filmi',
  bollywood_happy: 'bollywood upbeat happy dance music, dhol, tabla, celebration, energetic, festive',
  devotional:      'indian devotional bhajan, harmonium, flute, peaceful, spiritual, hindi lyrics',
  lofi_study:      'lofi hip hop beats, study music, calm, concentration, piano, ambient, peaceful',
  classical:       'hindustani classical raga, sitar, tabla, meditative, traditional, evening raga',
  folk_mp:         'madhya pradesh folk music, traditional tribal instruments, vibrant, baiga tribe',
  neet_focus:      'focus instrumental, binaural beats 40hz, concentration, alpha waves, study',
  party:           'bollywood party remix, electronic beats, bass drop, dancefloor energy, EDM',
  chill:           'chill ambient music, soft piano, nature sounds, relaxing, peaceful evening',
  motivational:    'motivational epic orchestral, rising crescendo, inspiring, powerful, energetic',
};

const MUSIC_LINKS = (prompt: string): MusicLink[] => {
  const enc = encodeURIComponent(prompt);
  return [
    { name: '🎵 Suno AI',    url: `https://suno.com/create?prompt=${enc}`,             limit: '~50 songs/day free', quality: 5, recommended: true },
    { name: '🎵 Udio AI',    url: `https://www.udio.com/create?prompt=${enc}`,          limit: 'Free tier',          quality: 5 },
    { name: '🎵 Boomy',      url: 'https://boomy.com/',                                  limit: 'Free tier',          quality: 3 },
    { name: '🎵 AIVA',       url: 'https://www.aiva.ai/',                                limit: '3 downloads/month',  quality: 4 },
    { name: '🎵 Soundverse', url: `https://soundverse.ai/create?prompt=${enc}`,         limit: 'Free credits',       quality: 4 },
    { name: '🎵 Mubert',     url: `https://mubert.com/render/tracks?prompt=${enc}`,     limit: 'Free tier',          quality: 3 },
  ];
};

// ── 1. HuggingFace MusicGen ────────────────────────────────
async function musicGenHF(prompt: string, durationSec: number): Promise<MusicResult> {
  const token = process.env.HUGGINGFACE_TOKEN || process.env.NEXT_PUBLIC_HUGGINGFACE_TOKEN;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch('https://api-inference.huggingface.co/models/facebook/musicgen-small', {
    method: 'POST', headers,
    body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: Math.min(durationSec * 50, 1500) } }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`musicgen_${res.status}`);
  const b64 = Buffer.from(await res.arrayBuffer()).toString('base64');
  return { audioBase64: b64, mimeType: 'audio/wav', provider: 'HuggingFace MusicGen', prompt, duration: durationSec };
}

// ── 2. ElevenLabs Music (Sound Effects / Music) ────────────
async function elevenLabsMusic(prompt: string, durationSec: number): Promise<MusicResult> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('no_key');
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: prompt, duration_seconds: Math.min(durationSec, 22), prompt_influence: 0.3 }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`el_music_${res.status}`);
  const b64 = Buffer.from(await res.arrayBuffer()).toString('base64');
  return { audioBase64: b64, mimeType: 'audio/mpeg', provider: 'ElevenLabs Sound', prompt, duration: durationSec };
}

// ── 3. Mubert API ──────────────────────────────────────────
async function mubertMusic(prompt: string): Promise<MusicResult> {
  const key = process.env.MUBERT_API_KEY;
  if (!key) throw new Error('no_key');
  const res = await fetch('https://api-b2b.mubert.com/v2/RecordTrackTTM', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'RecordTrackTTM', params: { pat: key, prompt, duration: 30, format: 'mp3', intensity: 'medium' } }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`mubert_${res.status}`);
  const data = await res.json();
  const url = data.data?.tasks?.[0]?.download_link;
  if (!url) throw new Error('no_url');
  return { audioUrl: url, provider: 'Mubert Royalty-Free', prompt, duration: 30 };
}

// ══════════════════════════════════════════════════════════
// MAIN CASCADE FUNCTION
// ══════════════════════════════════════════════════════════
export async function generateMusic(opts: {
  prompt?: string;
  style?: string;
  duration?: number;
  preferredProvider?: string;
}): Promise<MusicResult & { triedProviders: string[] }> {

  const tried: string[] = [];
  const duration = opts.duration || 20;

  // Build full prompt with style preset
  const stylePrompt = opts.style ? MUSIC_STYLES[opts.style] || '' : '';
  const finalPrompt = [stylePrompt, opts.prompt].filter(Boolean).join(', ');

  const providers: Array<{ id: string; fn: () => Promise<MusicResult> }> = [
    { id: 'musicgen',   fn: () => musicGenHF(finalPrompt, duration)     },
    { id: 'elevenlabs', fn: () => elevenLabsMusic(finalPrompt, duration) },
    { id: 'mubert',     fn: () => mubertMusic(finalPrompt)               },
  ];

  const preferred = opts.preferredProvider;
  const ordered = preferred
    ? [...providers.filter(p => p.id === preferred), ...providers.filter(p => p.id !== preferred)]
    : providers;

  for (const { id, fn } of ordered) {
    tried.push(id);
    try {
      const result = await fn();
      return { ...result, triedProviders: tried };
    } catch { /* try next */ }
  }

  // Final fallback: links to Suno/Udio/etc
  tried.push('links');
  return {
    isLink: true, provider: 'External Links', prompt: finalPrompt,
    links: MUSIC_LINKS(finalPrompt),
    triedProviders: tried,
  };
}
