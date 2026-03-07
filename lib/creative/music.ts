// lib/creative/music.ts -- Music/Song generation
// HuggingFace MusicGen -> Suno link -> Udio link -> Mubert -> DeepAI

export interface MusicOptions {
  prompt: string; style?: string; duration?: number; mood?: string;
}
export interface MusicResult {
  audioUrl?: string; audioBase64?: string; service: string; prompt: string; link?: string;
}

// 1. HuggingFace MusicGen -- free with token
export async function musicHuggingFace(o: MusicOptions): Promise<MusicResult|null> {
  const k = process.env.HUGGINGFACE_TOKEN;
  if(!k) return null;
  const fullPrompt = [o.prompt, o.style, o.mood].filter(Boolean).join(", ");
  try {
    const res = await fetch("https://api-inference.huggingface.co/models/facebook/musicgen-small", {
      method:"POST",
      headers:{"Authorization":"Bearer "+k,"Content-Type":"application/json"},
      body:JSON.stringify({inputs:fullPrompt,parameters:{duration:o.duration||10}}),
      signal:AbortSignal.timeout(120000)
    });
    if(!res.ok) return null;
    const buf = await res.arrayBuffer();
    return {audioBase64:"data:audio/wav;base64,"+Buffer.from(buf).toString("base64"), service:"HuggingFace MusicGen", prompt:o.prompt};
  } catch { return null; }
}

// 2. Mubert API -- royalty-free, free tier
export async function musicMubert(o: MusicOptions): Promise<MusicResult|null> {
  const k = process.env.MUBERT_API_KEY;
  if(!k) return null;
  try {
    const tags = [o.style||"ambient", o.mood||"calm"].join(",");
    const res = await fetch("https://api-b2b.mubert.com/v2/TTMRecordTrack", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({method:"TTMRecordTrack",params:{pat:k,tags,bpm:120,duration:o.duration||30,format:"mp3"}}),
      signal:AbortSignal.timeout(30000)
    });
    if(!res.ok) return null;
    const d = await res.json();
    const url = d.data?.tasks?.[0]?.download_link;
    if(!url) return null;
    return {audioUrl:url, service:"Mubert", prompt:o.prompt};
  } catch { return null; }
}

// 3. Links to Suno/Udio (no official API, but deep links work)
export function getMusicLinks(o: MusicOptions) {
  const enc = encodeURIComponent([o.prompt, o.style, o.mood, "indian bollywood hindi"].filter(Boolean).join(", "));
  return {
    suno: "https://suno.com/create?prompt="+enc,
    udio: "https://www.udio.com/create",
    soundverse: "https://soundverse.ai/",
    boomy: "https://boomy.com/",
    aiva: "https://www.aiva.ai/",
    elevenlabs_sound: "https://elevenlabs.io/sound-effects",
  };
}

// Bollywood/Hindi style prompts
export function getIndianMusicPrompt(style: string): string {
  const styles: Record<string,string> = {
    bollywood: "upbeat bollywood indian film music, sitar tabla dhol, energetic dance",
    devotional: "hindi devotional bhajan, harmonium tabla, spiritual calm",
    classical: "indian classical raag yaman, sitar sarangi, meditative",
    folk: "rajasthani folk music, dholak harmonium, traditional indian",
    sad: "sad hindi melody, piano strings, emotional romantic",
    party: "punjabi party dhol beats, high energy, dance floor",
  };
  return styles[style] || style;
}

// Main
export async function generateMusic(o: MusicOptions): Promise<MusicResult> {
  if(o.style) o.prompt = getIndianMusicPrompt(o.style) || o.prompt;
  const r = await musicHuggingFace(o) || await musicMubert(o);
  if(r) return r;
  const links = getMusicLinks(o);
  return {link:links.suno, service:"Suno (link)", prompt:o.prompt};
}
