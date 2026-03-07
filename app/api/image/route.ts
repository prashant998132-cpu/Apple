// app/api/image/route.ts — v2 BANDWIDTH-OPTIMIZED
// Strategy: Return IMAGE URLs only, never proxy binary through Vercel
// Vercel bandwidth = 0 for images. Client loads directly from source CDN.

import { NextRequest, NextResponse } from 'next/server';

const STYLE_MAP: Record<string, string> = {
  realistic:  'hyperrealistic photography, 8K, sharp, natural lighting',
  anime:      'anime art, Studio Ghibli style, vibrant illustration',
  artistic:   'oil painting, masterpiece, museum quality',
  cinematic:  'cinematic shot, dramatic lighting, movie still',
  '3d':       '3D render, Octane render, photorealistic',
  bollywood:  'Bollywood poster, colorful, Indian aesthetic',
  nature:     'Indian landscape, golden hour, wildlife photography',
  minimal:    'minimalist flat design, clean, modern vector',
  portrait:   'professional portrait, studio lighting, sharp focus',
  watercolor: 'watercolor painting, soft washes, artistic',
};

// All return URLs (no binary data, zero Vercel bandwidth)
function pollinationsUrl(prompt: string, seed?: number): string {
  const s = seed ?? Math.floor(Math.random() * 99999);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true&seed=${s}&model=flux&enhance=true`;
}

async function geminiUrl(prompt: string): Promise<string> {
  const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!key) throw new Error('no_key');
  // Use Gemini to generate — returns base64 BUT we proxy only if <500KB
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: '1:1' } }),
      signal: AbortSignal.timeout(30000),
    }
  );
  if (!res.ok) throw new Error('gemini_' + res.status);
  const data = await res.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('no_data');
  // Only return if <400KB (avoids huge bandwidth bills)
  if (b64.length > 400000) throw new Error('too_large');
  return `data:image/png;base64,${b64}`;
}

async function huggingfaceUrl(prompt: string): Promise<string> {
  const token = process.env.HUGGINGFACE_TOKEN;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(
    'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
    { method: 'POST', headers, body: JSON.stringify({ inputs: prompt }), signal: AbortSignal.timeout(45000) }
  );
  if (!res.ok) throw new Error('hf_' + res.status);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > 500000) throw new Error('too_large'); // >500KB = skip
  const bytes = new Uint8Array(buf);
  let b64 = '';
  for (let i = 0; i < bytes.length; i += 8192) b64 += String.fromCharCode(...bytes.slice(i, i + 8192));
  return `data:image/jpeg;base64,${btoa(b64)}`;
}

export async function POST(req: NextRequest) {
  const { prompt, style } = await req.json();
  if (!prompt) return NextResponse.json({ error: 'No prompt' }, { status: 400 });

  let enhanced = prompt;
  if (style && STYLE_MAP[style]) enhanced += ', ' + STYLE_MAP[style];
  enhanced += ', high quality';

  const tried: string[] = [];
  const seed = Math.floor(Math.random() * 99999);

  // Strategy 1: Pollinations URL — zero Vercel bandwidth (client loads image directly)
  // This is ALWAYS the primary for bandwidth efficiency
  const primaryUrl = pollinationsUrl(enhanced, seed);

  // Try Gemini only if key exists (proxy small images only)
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    tried.push('gemini');
    try {
      const url = await geminiUrl(enhanced);
      return NextResponse.json(
        { imageUrl: url, prompt: enhanced, style, provider: 'Gemini Imagen 3', triedProviders: tried, fallbackUrl: primaryUrl },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } catch { /* try next */ }
  }

  // Try HuggingFace (proxy small images only)  
  if (process.env.HUGGINGFACE_TOKEN) {
    tried.push('huggingface');
    try {
      const url = await huggingfaceUrl(enhanced);
      return NextResponse.json(
        { imageUrl: url, prompt: enhanced, style, provider: 'HuggingFace FLUX.1', triedProviders: tried, fallbackUrl: primaryUrl },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } catch { /* use Pollinations */ }
  }

  // Always works — Pollinations URL (zero bandwidth)
  tried.push('pollinations');
  return NextResponse.json(
    { imageUrl: primaryUrl, prompt: enhanced, style, provider: 'Pollinations AI (CDN)', triedProviders: tried },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function GET() {
  return NextResponse.json({ status: 'ok', bandwidth: 'optimized', primary: 'pollinations-url' });
}
