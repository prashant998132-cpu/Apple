'use client'
// lib/client/puterClient.ts — JARVIS Puter.js Full Integration
// Puter.js = Free unlimited: Chat(500+ models) + Image(DALL-E3/FLUX/Imagen) + TTS + STT + Video
// User-Pays model: developer ka zero cost, user apna Puter account use karta hai
// MUST run client-side only (browser)

// ── Load Puter.js once ────────────────────────────────────
let puterLoaded = false
let puterLoading: Promise<void> | null = null

export async function loadPuter(): Promise<any> {
  if (typeof window === 'undefined') throw new Error('Puter client-side only')
  if ((window as any).puter) return (window as any).puter

  if (!puterLoading) {
    puterLoading = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://js.puter.com/v2/'
      s.onload = () => { puterLoaded = true; resolve() }
      s.onerror = () => reject(new Error('Puter.js load failed'))
      document.head.appendChild(s)
    })
  }

  await puterLoading
  return (window as any).puter
}

// ══════════════════════════════════════════════════════════
// IMAGE GENERATION — DALL-E 3, FLUX, Gemini, Imagen FREE
// ══════════════════════════════════════════════════════════

export interface PuterImageResult {
  url: string
  prompt: string
  model: string
}

// Image model cascade — try best quality first, fallback on error
const IMAGE_MODELS = [
  { model: 'dall-e-3', label: 'DALL-E 3' },
  { model: 'black-forest-labs/flux.1-dev', label: 'FLUX.1 Dev' },
  { model: 'google/imagen-4.0-fast', label: 'Imagen 4 Fast' },
  { model: 'stabilityai/stable-diffusion-xl-base-1.0', label: 'SDXL' },
]

export async function puterGenerateImage(
  prompt: string,
  preferredModel?: string
): Promise<PuterImageResult> {
  const puter = await loadPuter()

  const models = preferredModel
    ? [{ model: preferredModel, label: preferredModel }, ...IMAGE_MODELS]
    : IMAGE_MODELS

  for (const { model, label } of models) {
    try {
      const imgEl = await puter.ai.txt2img(prompt, {
        model,
        disable_safety_checker: true,
      })

      // Puter returns HTMLImageElement — extract src
      let url = ''
      if (imgEl instanceof HTMLImageElement) url = imgEl.src
      else if (typeof imgEl === 'string') url = imgEl
      else if (imgEl?.src) url = imgEl.src

      if (url) {
        return { url, prompt, model: label }
      }
    } catch (e: any) {
      // Try next model
      console.warn('Puter image model failed:', model, e?.message)
      continue
    }
  }

  // Final fallback: Pollinations
  const seed = Math.floor(Math.random() * 99999)
  const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt + ', high quality, detailed') + '?width=512&height=512&nologo=true&seed=' + seed
  return { url, prompt, model: 'Pollinations AI' }
}

// ══════════════════════════════════════════════════════════
// CHAT — GPT-5, Claude 3.7, Gemini, 500+ models FREE
// ══════════════════════════════════════════════════════════

export interface PuterChatResult {
  text: string
  model: string
}

// Chat model cascade — best free models
const CHAT_MODELS = [
  'claude-3-7-sonnet',
  'gpt-4o',
  'gemini-2-0-flash',
  'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'deepseek-chat',
]

export async function puterChat(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  systemPrompt?: string,
  preferredModel?: string
): Promise<PuterChatResult> {
  const puter = await loadPuter()

  const allMsgs = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  const models = preferredModel
    ? [preferredModel, ...CHAT_MODELS]
    : CHAT_MODELS

  for (const model of models) {
    try {
      const resp = await puter.ai.chat(allMsgs, { model })
      let text = ''
      if (typeof resp === 'string') text = resp
      else if (resp?.message?.content) text = resp.message.content
      else if (resp?.text) text = resp.text
      else if (resp?.content) text = resp.content
      else text = String(resp)
      if (text.length > 0) return { text, model }
    } catch {
      continue
    }
  }
  throw new Error('All Puter chat models failed')
}

// ══════════════════════════════════════════════════════════
// TTS — OpenAI quality text-to-speech FREE
// ══════════════════════════════════════════════════════════

export async function puterTTS(text: string): Promise<HTMLAudioElement | null> {
  try {
    const puter = await loadPuter()
    const audio = await puter.ai.txt2speech(text.slice(0, 500), {
      provider: 'openai',
    })
    return audio as HTMLAudioElement
  } catch {
    return null
  }
}

// ══════════════════════════════════════════════════════════
// STT — Whisper transcription FREE
// ══════════════════════════════════════════════════════════

export async function puterSTT(audioBlob: Blob): Promise<string> {
  try {
    const puter = await loadPuter()
    // Convert blob to URL for Puter
    const url = URL.createObjectURL(audioBlob)
    const result = await puter.ai.speech2txt(url)
    URL.revokeObjectURL(url)
    return result?.text || result || ''
  } catch {
    return ''
  }
}

// ══════════════════════════════════════════════════════════
// OCR / Image Analysis — img2txt FREE
// ══════════════════════════════════════════════════════════

export async function puterOCR(imageUrl: string): Promise<string> {
  try {
    const puter = await loadPuter()
    const result = await puter.ai.img2txt(imageUrl)
    return String(result || '')
  } catch {
    return ''
  }
}

// ══════════════════════════════════════════════════════════
// VIDEO GENERATION — Sora FREE
// ══════════════════════════════════════════════════════════

export interface PuterVideoResult {
  element: HTMLVideoElement | null
  prompt: string
}

export async function puterGenerateVideo(prompt: string): Promise<PuterVideoResult> {
  try {
    const puter = await loadPuter()
    // testMode: false = real generation, true = sample video for testing
    const videoEl = await puter.ai.txt2vid(prompt, false)
    return { element: videoEl as HTMLVideoElement, prompt }
  } catch (e) {
    console.warn('Puter video gen failed:', e)
    return { element: null, prompt }
  }
}

// ══════════════════════════════════════════════════════════
// VISION / IMAGE ANALYSIS — describe what's in an image
// ══════════════════════════════════════════════════════════

export async function puterVision(imageUrl: string, question = 'What do you see in this image? Describe in detail.'): Promise<string> {
  try {
    const puter = await loadPuter()
    const result = await puter.ai.chat(question, imageUrl, { model: 'gpt-4o' })
    if (typeof result === 'string') return result
    return result?.message?.content || result?.text || String(result)
  } catch {
    return ''
  }
}

// ══════════════════════════════════════════════════════════
// LIST MODELS — what's available right now
// ══════════════════════════════════════════════════════════

export async function puterListModels(): Promise<string[]> {
  try {
    const puter = await loadPuter()
    const models = await puter.ai.listModels()
    return Array.isArray(models) ? models.map((m: any) => m?.id || String(m)) : []
  } catch {
    return []
  }
}
