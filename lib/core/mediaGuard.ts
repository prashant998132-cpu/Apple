/**
 * JARVIS Media Guard — Bandwidth Protection
 * Point 8: Images CDN-only, Audio browser TTS, Video external links
 * Server se KABHI heavy media serve nahi hoga
 */

export interface MediaResult {
  type: 'image' | 'audio' | 'video' | 'file';
  url: string;           // CDN / external URL — never Vercel proxy
  browserSide: boolean;  // true = handle in browser, no server bandwidth
  source: string;
}

// ── Image: CDN URL only, never proxy through Vercel ──────────────────────────
export function guardImage(url: string): MediaResult {
  // Strip any Vercel proxy wrapping
  const cleanUrl = url.replace(/^https?:\/\/[^/]*vercel\.app\/api\/proxy\?url=/, '');
  return {
    type: 'image',
    url: cleanUrl,
    browserSide: true,
    source: new URL(cleanUrl).hostname,
  };
}

// ── Audio: Always browser-side TTS, zero server bandwidth ────────────────────
export function guardAudio(text: string): MediaResult {
  // Return a signal to use browser SpeechSynthesis, not a server audio file
  return {
    type: 'audio',
    url: `browser-tts://${encodeURIComponent(text.slice(0, 200))}`,
    browserSide: true,
    source: 'browser-speechsynthesis',
  };
}

// ── Video/Music: Always external link, never embed heavy streams ─────────────
export function guardVideo(url: string): MediaResult {
  return {
    type: 'video',
    url, // YouTube/Spotify/external — direct link
    browserSide: false,
    source: new URL(url).hostname,
  };
}

// ── CDN Sources for image generation (priority order) ────────────────────────
export const IMAGE_CDN_SOURCES = [
  { name: 'Pollinations',  base: 'https://image.pollinations.ai/prompt/', free: true,  unlimited: true },
  { name: 'Picsum',        base: 'https://picsum.photos/',                free: true,  unlimited: true },
  { name: 'DiceBear',     base: 'https://api.dicebear.com/7.x/',         free: true,  unlimited: true },
];

export function buildImageCDNUrl(prompt: string, width = 512, height = 512): string {
  const encoded = encodeURIComponent(prompt);
  return `${IMAGE_CDN_SOURCES[0].base}${encoded}?width=${width}&height=${height}&nologo=true&enhance=true`;
}

// ── Bandwidth budget tracker ──────────────────────────────────────────────────
let _bandwidthSavedMB = 0;

export function recordBandwidthSaved(estimatedMB: number): void {
  _bandwidthSavedMB += estimatedMB;
}

export function getBandwidthSaved(): string {
  if (_bandwidthSavedMB < 1) return `${Math.round(_bandwidthSavedMB * 1024)}KB`;
  return `${_bandwidthSavedMB.toFixed(1)}MB`;
}

// ── Check if a URL is safe (CDN, not Vercel server) ──────────────────────────
export function isMediaSafe(url: string): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    // Block any media routed through our Vercel server
    const blocked = ['vercel.app', 'apple-lemon-zeta', 'localhost'];
    return !blocked.some(b => u.hostname.includes(b));
  } catch {
    return false;
  }
}
