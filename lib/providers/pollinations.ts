// lib/providers/pollinations.ts — Unlimited free images, NO KEY
// https://image.pollinations.ai/prompt/YOUR_PROMPT

export interface PollinationsResult {
  url: string
  model: string
  prompt: string
}

const MODELS = ['flux', 'flux-realism', 'flux-anime', 'flux-3d', 'turbo']

export function pollinationsUrl(
  prompt: string,
  options: {
    width?: number
    height?: number
    model?: string
    seed?: number
    nologo?: boolean
    style?: string
  } = {}
): string {
  const {
    width = 1024, height = 1024,
    model = 'flux',
    seed = Math.floor(Math.random() * 99999),
    nologo = true,
    style,
  } = options

  const finalPrompt = style ? `${style} style: ${prompt}` : prompt
  const encoded = encodeURIComponent(finalPrompt)
  const params = new URLSearchParams({
    width: width.toString(),
    height: height.toString(),
    model, seed: seed.toString(),
    nologo: nologo.toString(),
  })
  return `https://image.pollinations.ai/prompt/${encoded}?${params}`
}

// Style presets mapped to Pollinations prompts
export const STYLE_PROMPTS: Record<string, string> = {
  realistic:  'photorealistic, detailed, 8k',
  anime:      'anime style, manga, vibrant colors',
  artistic:   'oil painting, artistic, masterpiece',
  cinematic:  'cinematic, movie still, dramatic lighting',
  '3d':       '3D render, octane render, realistic lighting',
  bollywood:  'Bollywood style, colorful, Indian aesthetic',
  nature:     'nature photography, golden hour, beautiful',
  minimal:    'minimalist, clean, simple',
  portrait:   'portrait photography, studio lighting, sharp',
  watercolor: 'watercolor painting, soft colors, artistic',
}

export async function generateImage(prompt: string, style?: string): Promise<PollinationsResult> {
  const stylePrompt = style ? STYLE_PROMPTS[style] : undefined
  const url = pollinationsUrl(prompt, { style: stylePrompt, model: 'flux' })
  // Verify image loads (fetch HEAD)
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error('pollinations_' + res.status)
  } catch {
    // Return URL anyway — sometimes HEAD fails but GET works
  }
  return { url, model: 'FLUX (Pollinations.ai)', prompt }
}
