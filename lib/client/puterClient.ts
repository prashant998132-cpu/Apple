'use client'
// lib/client/puterClient.ts — JARVIS Puter.js Correct Integration
// Based on actual Puter.js docs: https://docs.puter.com/AI/
// User-Pays model — developer zero cost
// APIs confirmed from docs:
//   txt2img(prompt, testMode|options)
//   txt2speech(text, { provider })
//   speech2txt(audioUrl) → { text }
//   txt2vid(prompt, testMode)
//   img2txt(imageUrl) → text
//   speech2speech(url, { voice, model, output_format })
//   chat(messages, options) → response
//   KV store: puter.kv.set/get/del

let puterLoading: Promise<void> | null = null

export async function loadPuter(): Promise<any> {
  if (typeof window === 'undefined') throw new Error('Browser only')
  if ((window as any).puter?.ai) return (window as any).puter

  if (!puterLoading) {
    puterLoading = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://js.puter.com/v2/'
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Puter.js load failed'))
      document.head.appendChild(s)
    })
  }
  await puterLoading
  // Wait for puter.ai to be ready
  await new Promise(r => setTimeout(r, 500))
  return (window as any).puter
}

// ══════════════════════════════════════════════════════════
// IMAGE GENERATION — gpt-image-1.5, DALL-E 3, etc FREE
// API: puter.ai.txt2img(prompt, testMode|{model})
// Returns: HTMLImageElement
// ══════════════════════════════════════════════════════════

export interface PuterImageResult {
  url: string
  prompt: string
  model: string
}

const IMAGE_MODELS = [
  'gpt-image-1.5',
  'dall-e-3',
  'gpt-image-1',
  'dall-e-2',
]

export async function puterGenerateImage(prompt: string): Promise<PuterImageResult> {
  const puter = await loadPuter()

  for (const model of IMAGE_MODELS) {
    try {
      // Correct API: txt2img(prompt, { model }) OR txt2img(prompt, false) for real generation
      const imgEl = await puter.ai.txt2img(prompt, { model })
      let url = ''
      if (imgEl instanceof HTMLImageElement) url = imgEl.src
      else if (typeof imgEl === 'string') url = imgEl
      else if (imgEl?.src) url = imgEl.src
      if (url) return { url, prompt, model }
    } catch { continue }
  }

  // Pollinations fallback
  const seed = Math.floor(Math.random() * 99999)
  const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt + ', high quality') + '?width=512&height=512&nologo=true&seed=' + seed
  return { url, prompt, model: 'Pollinations AI' }
}

// ══════════════════════════════════════════════════════════
// CHAT — Claude, GPT-5, Gemini, 500+ models FREE
// API: puter.ai.chat(messages_or_string, options)
// ══════════════════════════════════════════════════════════

export interface PuterChatResult {
  text: string
  model: string
}

const CHAT_MODELS = [
  'claude-3-7-sonnet',
  'gpt-4o',
  'gpt-5-nano',
  'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'deepseek-chat',
]

export async function puterChat(
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string,
  preferredModel?: string
): Promise<PuterChatResult> {
  const puter = await loadPuter()

  const allMsgs = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  const models = preferredModel ? [preferredModel, ...CHAT_MODELS] : CHAT_MODELS

  for (const model of models) {
    try {
      const resp = await puter.ai.chat(allMsgs, { model })
      let text = ''
      if (typeof resp === 'string') text = resp
      else if (resp?.message?.content) text = resp.message.content
      else if (resp?.text) text = resp.text
      else if (resp?.content?.[0]?.text) text = resp.content[0].text
      else text = String(resp || '')
      if (text.length > 2) return { text, model }
    } catch { continue }
  }
  throw new Error('All Puter chat models failed')
}

// ══════════════════════════════════════════════════════════
// TTS — OpenAI quality FREE
// API: puter.ai.txt2speech(text, { provider: 'openai' })
// Returns: HTMLAudioElement
// ══════════════════════════════════════════════════════════

export async function puterTTS(text: string): Promise<HTMLAudioElement | null> {
  try {
    const puter = await loadPuter()
    // Confirmed from docs: provider: 'openai' for OpenAI TTS
    const audio = await puter.ai.txt2speech(text.slice(0, 500), { provider: 'openai' })
    return audio as HTMLAudioElement
  } catch { return null }
}

// ══════════════════════════════════════════════════════════
// STT — OpenAI Whisper FREE
// API: puter.ai.speech2txt(audioUrl) → { text } or string
// ══════════════════════════════════════════════════════════

export async function puterSTT(audioBlob: Blob): Promise<string> {
  try {
    const puter = await loadPuter()
    const url = URL.createObjectURL(audioBlob)
    const result = await puter.ai.speech2txt(url)
    URL.revokeObjectURL(url)
    // Docs: transcript.text ?? transcript
    return result?.text ?? String(result ?? '')
  } catch { return '' }
}

// ══════════════════════════════════════════════════════════
// OCR — AWS Textract / Mistral OCR FREE
// API: puter.ai.img2txt(imageUrl) → string
// ══════════════════════════════════════════════════════════

export async function puterOCR(imageUrl: string): Promise<string> {
  try {
    const puter = await loadPuter()
    const result = await puter.ai.img2txt(imageUrl)
    return String(result || '')
  } catch { return '' }
}

// ══════════════════════════════════════════════════════════
// VIDEO — OpenAI Sora FREE
// API: puter.ai.txt2vid(prompt, testMode) → HTMLVideoElement
// testMode=false for real, testMode=true for sample
// ══════════════════════════════════════════════════════════

export async function puterGenerateVideo(prompt: string): Promise<string | null> {
  try {
    const puter = await loadPuter()
    // testMode=false = real Sora generation
    const videoEl = await puter.ai.txt2vid(prompt, false)
    if (videoEl instanceof HTMLVideoElement) return videoEl.src
    if (videoEl?.src) return videoEl.src
    return null
  } catch { return null }
}

// ══════════════════════════════════════════════════════════
// VISION — Analyze image with GPT-4o FREE
// API: puter.ai.chat(question, imageUrl, { model })
// ══════════════════════════════════════════════════════════

export async function puterVision(imageUrl: string, question = 'Describe this image in detail.'): Promise<string> {
  try {
    const puter = await loadPuter()
    const result = await puter.ai.chat(question, imageUrl, { model: 'gpt-4o' })
    if (typeof result === 'string') return result
    return result?.message?.content || result?.text || String(result)
  } catch { return '' }
}

// ══════════════════════════════════════════════════════════
// KV STORE — Puter's free cloud KV (replaces localStorage for sync)
// puter.kv.set(key, value) / get(key) / del(key) / list()
// Data persists across sessions per user account
// ══════════════════════════════════════════════════════════

export async function puterKVSet(key: string, value: string): Promise<boolean> {
  try {
    const puter = await loadPuter()
    await puter.kv.set(key, value)
    return true
  } catch { return false }
}

export async function puterKVGet(key: string): Promise<string | null> {
  try {
    const puter = await loadPuter()
    return await puter.kv.get(key) || null
  } catch { return null }
}

// ══════════════════════════════════════════════════════════
// SPEECH-TO-SPEECH — ElevenLabs voice conversion FREE
// API: puter.ai.speech2speech(url, { voice, model, output_format })
// ══════════════════════════════════════════════════════════

export async function puterSpeech2Speech(audioUrl: string, voice = '21m00Tcm4TlvDq8ikWAM'): Promise<string | null> {
  try {
    const puter = await loadPuter()
    const result = await puter.ai.speech2speech(audioUrl, {
      voice,
      model: 'eleven_multilingual_sts_v2',
      output_format: 'mp3_44100_128',
    })
    return typeof result === 'string' ? result : (result?.url || null)
  } catch { return null }
}
