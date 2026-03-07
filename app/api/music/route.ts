// app/api/music/route.ts
// MUSIC CASCADE — Best first → auto fallback
// 1. HuggingFace MusicGen     (direct audio, rate limited)
// 2. ElevenLabs Sound/Music   (same key as TTS, 22s max)
// 3. Mubert API               (royalty-free, 30s tracks)
// 4. Links: Suno → Udio → Boomy → AIVA → Soundverse (best quality, browser)

import { NextRequest, NextResponse } from 'next/server';

const STYLES: Record<string,string> = {
  bollywood_sad:   'bollywood sad romantic hindi song, piano, strings, slow tempo, emotional',
  bollywood_happy: 'bollywood upbeat dance music, dhol, tabla, celebration, festive energy',
  devotional:      'indian devotional bhajan, harmonium, flute, peaceful, spiritual',
  lofi_study:      'lofi hip hop study beats, calm piano, concentration, peaceful ambient',
  classical:       'hindustani classical raga, sitar, tabla, meditative, evening raga',
  folk_mp:         'madhya pradesh folk music, tribal instruments, vibrant, baiga tribe',
  neet_focus:      'focus instrumental, binaural beats 40hz, alpha waves, concentration',
  party:           'bollywood party remix, electronic bass, dancefloor, EDM energy',
  chill:           'chill ambient, soft piano, nature sounds, relaxing evening',
  motivational:    'epic orchestral, rising crescendo, inspiring, powerful, energetic',
};

const MUSIC_LINKS = (prompt: string) => [
  { name:'🎵 Suno AI',     url:`https://suno.com/create?prompt=${encodeURIComponent(prompt)}`,         limit:'~50 songs/day free', quality:5, recommended:true },
  { name:'🎵 Udio AI',     url:`https://www.udio.com/create?prompt=${encodeURIComponent(prompt)}`,      limit:'Free tier',           quality:5 },
  { name:'🎵 Soundverse',  url:`https://soundverse.ai/create?prompt=${encodeURIComponent(prompt)}`,    limit:'Free credits',        quality:4 },
  { name:'🎵 AIVA',        url:'https://www.aiva.ai/',                                                  limit:'3 downloads/month',  quality:4 },
  { name:'🎵 Boomy',       url:'https://boomy.com/',                                                    limit:'Free tier',           quality:3 },
  { name:'🎵 Mubert Web',  url:`https://mubert.com/render/tracks?prompt=${encodeURIComponent(prompt)}`, limit:'Free tier',          quality:3 },
  { name:'🎵 ElevenLabs',  url:'https://elevenlabs.io/sound-effects',                                   limit:'10K chars/month',    quality:4 },
];

// ── 1. HuggingFace MusicGen ──────────────────────────────
async function musicgen(prompt: string, duration: number) {
  const token = process.env.HUGGINGFACE_TOKEN;
  const headers: Record<string,string> = { 'Content-Type':'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch('https://api-inference.huggingface.co/models/facebook/musicgen-small', {
    method:'POST', headers,
    body: JSON.stringify({ inputs:prompt, parameters:{ max_new_tokens: Math.min(duration*50, 1500) } }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error('musicgen_' + res.status);
  const b64 = Buffer.from(await res.arrayBuffer()).toString('base64');
  return { audioBase64:b64, mimeType:'audio/wav', provider:'HuggingFace MusicGen', duration };
}

// ── 2. ElevenLabs Sound Effects ──────────────────────────
async function elevenlabs(prompt: string, duration: number) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('no_key');
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method:'POST',
    headers: { 'xi-api-key':key, 'Content-Type':'application/json' },
    body: JSON.stringify({ text:prompt, duration_seconds:Math.min(duration,22), prompt_influence:0.3 }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error('el_' + res.status);
  const b64 = Buffer.from(await res.arrayBuffer()).toString('base64');
  return { audioBase64:b64, mimeType:'audio/mpeg', provider:'ElevenLabs Sound', duration };
}

// ── 3. Mubert API ────────────────────────────────────────
async function mubert(prompt: string) {
  const key = process.env.MUBERT_API_KEY;
  if (!key) throw new Error('no_key');
  const res = await fetch('https://api-b2b.mubert.com/v2/RecordTrackTTM', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ method:'RecordTrackTTM', params:{ pat:key, prompt, duration:30, format:'mp3', intensity:'medium' } }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error('mubert_' + res.status);
  const data = await res.json();
  const url = data.data?.tasks?.[0]?.download_link;
  if (!url) throw new Error('no_url');
  return { audioUrl:url, provider:'Mubert Royalty-Free', duration:30 };
}

// ════════════════════════════════════════════════════════
// POST — Main cascade
// ════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const { prompt, style, duration = 20, provider: pref } = await req.json();

  const stylePrompt = style ? (STYLES[style] || style) : '';
  const finalPrompt = [stylePrompt, prompt].filter(Boolean).join(', ');

  const tried: string[] = [];

  type P = { id:string; fn:()=>Promise<any> };
  const all: P[] = [
    { id:'musicgen',   fn:()=>musicgen(finalPrompt, duration)   },
    { id:'elevenlabs', fn:()=>elevenlabs(finalPrompt, duration) },
    { id:'mubert',     fn:()=>mubert(finalPrompt)               },
  ];

  const ordered = pref ? [...all.filter(p=>p.id===pref), ...all.filter(p=>p.id!==pref)] : all;

  for (const { id, fn } of ordered) {
    tried.push(id);
    try {
      const result = await fn();
      return NextResponse.json({ ...result, prompt:finalPrompt, triedProviders:tried });
    } catch { /* next */ }
  }

  // Final: links to Suno/Udio/etc (always works)
  tried.push('links');
  return NextResponse.json({ isLink:true, provider:'External Links', prompt:finalPrompt, links:MUSIC_LINKS(finalPrompt), triedProviders:tried });
}

export async function GET() {
  return NextResponse.json({
    styles: Object.keys(STYLES),
    providers: [
      { id:'musicgen',   name:'HuggingFace MusicGen', limit:'Rate limited',  hasKey:!!process.env.HUGGINGFACE_TOKEN,  quality:4 },
      { id:'elevenlabs', name:'ElevenLabs Sound',     limit:'With TTS quota',hasKey:!!process.env.ELEVENLABS_API_KEY, quality:4 },
      { id:'mubert',     name:'Mubert Royalty-Free',  limit:'Free tier',     hasKey:!!process.env.MUBERT_API_KEY,     quality:3 },
      { id:'links',      name:'Suno/Udio/AIVA links', limit:'Varies',        hasKey:true,                             quality:5, note:'Browser' },
    ],
  });
}
