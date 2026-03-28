// lib/providers/image.ts — v2 with Pollinations FIRST (no key)
// 1. Pollinations.ai — NO KEY, unlimited, FLUX model
// 2. Puter.js — NO KEY, browser-side DALL-E
// 3. Gemini Imagen 3 — uses Gemini key
// 4. HuggingFace FLUX — uses HF token
// 5. AIMLAPI — uses AIMLAPI key
// 6. DeepAI — uses DeepAI key

export interface ImageResult {
  url: string; provider: string; model?: string;
  width?: number; height?: number; puter?: boolean;
}

type ImageOptions = {
  prompt: string; style?: string; width?: number; height?: number;
  preferredProvider?: string; negativePrompt?: string;
}

// Enhance prompt with style
function enhancePrompt(prompt: string, style?: string): string {
  const styles: Record<string, string> = {
    realistic:   'photorealistic, 8k, detailed, professional photography',
    anime:       'anime style, vibrant colors, Studio Ghibli inspired',
    artistic:    'oil painting, artistic, detailed brushwork, masterpiece',
    cinematic:   'cinematic lighting, movie still, dramatic, epic',
    '3d':        '3D render, octane render, hyperrealistic, 8k',
    bollywood:   'Bollywood style, vibrant colors, Indian aesthetic',
    nature:      'nature photography, golden hour, landscape, stunning',
    minimal:     'minimalist, clean, simple, white background',
    watercolor:  'watercolor painting, soft colors, artistic, flowing',
    portrait:    'portrait photography, bokeh, professional lighting',
  }
  const suffix = style && styles[style] ? `, ${styles[style]}` : ''
  return prompt + suffix
}

// ── 1. Pollinations.ai (NO KEY, UNLIMITED) ───────────────
export async function pollinationsImage({ prompt, style, width = 1024, height = 1024 }: ImageOptions): Promise<ImageResult> {
  const enhanced = enhancePrompt(prompt, style)
  const encoded = encodeURIComponent(enhanced)
  // Pollinations generates on-the-fly — just fetch the URL to verify
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&model=flux&nologo=true&enhance=true`
  // Quick HEAD check
  const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error('pollinations_' + res.status)
  return { url, provider: 'Pollinations.ai (No Key, Unlimited)', model: 'FLUX' }
}

// ── 2. Gemini Imagen ─────────────────────────────────────
export async function geminiImage({ prompt, style }: ImageOptions): Promise<ImageResult> {
  const key = process.env.GEMINI_API_KEY; if (!key) throw new Error('no_key')
  const enhanced = enhancePrompt(prompt, style)
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: [{ prompt: enhanced }], parameters: { sampleCount: 1 } }),
    signal: AbortSignal.timeout(30000)
  })
  if (!res.ok) throw new Error('gemini_img_' + res.status)
  const data = await res.json()
  const b64 = data.predictions?.[0]?.bytesBase64Encoded
  if (!b64) throw new Error('gemini_no_image')
  return { url: `data:image/png;base64,${b64}`, provider: 'Gemini Imagen 3', model: 'imagen-3' }
}

// ── 3. HuggingFace FLUX ──────────────────────────────────
export async function huggingFaceImage({ prompt, style }: ImageOptions): Promise<ImageResult> {
  const token = process.env.HUGGINGFACE_TOKEN
  const headers: Record<string,string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const enhanced = enhancePrompt(prompt, style)
  const res = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell', {
    method: 'POST', headers, body: JSON.stringify({ inputs: enhanced }), signal: AbortSignal.timeout(45000)
  })
  if (!res.ok) throw new Error('hf_img_' + res.status)
  const b64 = Buffer.from(await res.arrayBuffer()).toString('base64')
  return { url: `data:image/png;base64,${b64}`, provider: 'HuggingFace FLUX (Free)', model: 'FLUX.1-schnell' }
}

// ── 4. AIMLAPI ───────────────────────────────────────────
export async function aimlImage({ prompt, style, width = 1024, height = 1024 }: ImageOptions): Promise<ImageResult> {
  const key = process.env.AIMLAPI_KEY; if (!key) throw new Error('no_key')
  const enhanced = enhancePrompt(prompt, style)
  const res = await fetch('https://api.aimlapi.com/images/generations', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'flux/schnell', prompt: enhanced, image_size: { width, height } }),
    signal: AbortSignal.timeout(30000)
  })
  if (!res.ok) throw new Error('aiml_img_' + res.status)
  const data = await res.json()
  return { url: data.images?.[0]?.url || data.data?.[0]?.url, provider: 'AIMLAPI (FLUX)', model: 'flux/schnell' }
}

// ── 5. DeepAI ────────────────────────────────────────────
export async function deepAIImage({ prompt, style }: ImageOptions): Promise<ImageResult> {
  const key = process.env.DEEPAI_KEY; if (!key) throw new Error('no_key')
  const enhanced = enhancePrompt(prompt, style)
  const form = new FormData(); form.append('text', enhanced)
  const res = await fetch('https://api.deepai.org/api/text2img', {
    method: 'POST', headers: { 'api-key': key }, body: form, signal: AbortSignal.timeout(30000)
  })
  if (!res.ok) throw new Error('deepai_' + res.status)
  const data = await res.json()
  return { url: data.output_url, provider: 'DeepAI', model: 'text2img' }
}

// ── Puter.js — browser-side only ─────────────────────────
export function puterImageInstruction(prompt: string, style?: string): string {
  const enhanced = enhancePrompt(prompt, style)
  return `puter:${enhanced}` // Client handles this via Puter.js
}

// ════════════════════════════════════════════════════════
// MAIN CASCADE
// ════════════════════════════════════════════════════════
export async function generateImage(options: ImageOptions): Promise<ImageResult> {
  const preferred = options.preferredProvider

  const providers: Array<[string, () => Promise<ImageResult>]> = [
    ['pollinations', () => pollinationsImage(options)],
    ['gemini',       () => geminiImage(options)],
    ['huggingface',  () => huggingFaceImage(options)],
    ['aimlapi',      () => aimlImage(options)],
    ['deepai',       () => deepAIImage(options)],
  ]

  if (preferred && preferred !== 'auto' && preferred !== 'puter') {
    const prov = providers.find(([k]) => k === preferred)
    if (prov) {
      try { return await prov[1]() } catch { /* fallback */ }
    }
  }

  for (const [, fn] of providers) {
    try { return await fn() } catch { /* next */ }
  }

  // Final fallback — Pollinations URL (always works, no fetch needed)
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(options.prompt)}?model=flux&nologo=true`
  return { url, provider: 'Pollinations.ai Fallback', model: 'FLUX' }
}
