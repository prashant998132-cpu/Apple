// lib/core/resourceManager.ts
// JARVIS Resource Manager â Credits + Limits kabhi khatam na hon
// STRATEGY: Primary (best) â Alternative â Backup â Emergency fallback

// âââââââââââââââââââââââââââââââââââââââââââââââ
// 1. LLM PROVIDER ROUTING
// Primary: Groq (fastest free)
// Alt: Gemini (Google free)
// Backup: Pollinations (unlimited, forever free)
// Emergency: Puter.js (browser-side, no server)
// âââââââââââââââââââââââââââââââââââââââââââââââ

export function getMaxTokens(msg: string): number {
  const w = msg.trim().split(/\s+/).length
  const ml = msg.toLowerCase()
  // nano: greeting/simple
  if (w <= 3) return 200
  // simple: short factual
  if (w <= 8 && !ml.match(/explain|why|how|derive|solve|code|write/)) return 400
  // deep: code/math/reasoning
  if (ml.match(/derive|solve|code|function|algorithm|write.*code|debug/)) return 1200
  // research: explicit or long
  if (w > 50 || ml.match(/research|full detail|comprehensive|step by step/)) return 2000
  // normal: default
  return 600
}

export function getHistoryLimit(msg: string): number {
  const w = msg.trim().split(/\s+/).length
  if (w <= 3) return 2   // greetings â no history needed
  if (w <= 8) return 4
  if (w > 50) return 10
  return 6
}

// Trim history to limit (newest first kept)
export function trimHistory(messages: any[], limit: number): any[] {
  if (messages.length <= limit) return messages
  return messages.slice(-limit) // keep last N messages
}

// âââââââââââââââââââââââââââââââââââââââââââââââ
// 2. VERCEL FUNCTION LIMITS GUARD
// Hobby: 100K invocations/month, 10s per function
// Strategy: Edge runtime + short timeouts + cache
// âââââââââââââââââââââââââââââââââââââââââââââââ

// Vercel Hobby plan soft limits
export const VERCEL_LIMITS = {
  invocationsPerMonth: 100_000,
  functionTimeoutMs: 9500,    // 9.5s â 0.5s buffer before 10s limit
  bandwidthGBPerMonth: 100,
}

// Response caching â same query within 60s â return cached
const responseCache = new Map<string, { data: string; ts: number }>()
const CACHE_TTL = 60_000 // 60 seconds

export function getCachedResponse(key: string): string | null {
  const cached = responseCache.get(key)
  if (!cached) return null
  if (Date.now() - cached.ts > CACHE_TTL) {
    responseCache.delete(key)
    return null
  }
  return cached.data
}

export function setCachedResponse(key: string, data: string): void {
  // Max 50 entries in cache
  if (responseCache.size >= 50) {
    const oldest = [...responseCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
    responseCache.delete(oldest[0])
  }
  responseCache.set(key, { data, ts: Date.now() })
}

// âââââââââââââââââââââââââââââââââââââââââââââââ
// 3. EXTERNAL API RATE LIMIT TRACKER
// Track calls per service per day
// If limit near â skip that service
// âââââââââââââââââââââââââââââââââââââââââââââââ

interface ServiceUsage {
  count: number
  resetAt: number // timestamp of next daily reset
  dailyLimit: number
}

// In-memory tracker (resets with each cold start â that's fine)
const serviceUsage: Record<string, ServiceUsage> = {}

const SERVICE_LIMITS: Record<string, number> = {
  gnews: 100,
  newsapi: 100,
  nasa: 50,          // DEMO_KEY
  omdb: 1000,
  ipapi: 1000,
  coingecko: 200,    // soft limit (public API)
  // unlimited services â no tracking needed:
  // wttr, wikipedia, jokeapi, quotable, worldtime, restcountries,
  // usgs, opentdb, catfact, openlibrary, hackernews, themealdb
}

export function canCallService(service: string): boolean {
  const limit = SERVICE_LIMITS[service]
  if (!limit) return true // unlimited service

  const now = Date.now()
  const usage = serviceUsage[service]

  if (!usage || now > usage.resetAt) {
    // Reset daily counter
    serviceUsage[service] = {
      count: 0,
      resetAt: now + 86_400_000, // 24 hours
      dailyLimit: limit
    }
    return true
  }

  return usage.count < usage.dailyLimit * 0.9 // stop at 90% of limit
}

export function trackServiceCall(service: string): void {
  if (!SERVICE_LIMITS[service]) return
  if (serviceUsage[service]) {
    serviceUsage[service].count++
  }
}

// âââââââââââââââââââââââââââââââââââââââââââââââ
// 4. LLM CREDIT ESTIMATOR
// Track approximate token usage per provider
// Switch to cheaper/free if nearing limit
// âââââââââââââââââââââââââââââââââââââââââââââââ

interface ProviderUsage {
  tokensToday: number
  callsToday: number
  resetAt: number
}

const providerUsage: Record<string, ProviderUsage> = {}

// Approximate free tier limits (tokens/day or requests/day)
export const PROVIDER_FREE_LIMITS: Record<string, { tokensPerDay: number; reqPerDay: number }> = {
  groq:       { tokensPerDay: 500_000, reqPerDay: 1000 },  // ~6000 req/day actually
  gemini:     { tokensPerDay: 1_000_000, reqPerDay: 1500 }, // gemini-2.0-flash free
  together:   { tokensPerDay: 999_999_999, reqPerDay: 999_999 }, // $25 credit
  cerebras:   { tokensPerDay: 1_000_000, reqPerDay: 1000 },
  mistral:    { tokensPerDay: 500_000, reqPerDay: 500 },
  cohere:     { tokensPerDay: 100_000, reqPerDay: 1000 },
  fireworks:  { tokensPerDay: 600_000, reqPerDay: 600 },
  openrouter: { tokensPerDay: 200_000, reqPerDay: 200 },
  deepinfra:  { tokensPerDay: 500_000, reqPerDay: 500 },
  huggingface:{ tokensPerDay: 300_000, reqPerDay: 1000 },
  pollinations:{ tokensPerDay: 999_999_999, reqPerDay: 999_999 }, // truly unlimited
}

export function shouldSkipProvider(provider: string, estimatedTokens: number): boolean {
  const limits = PROVIDER_FREE_LIMITS[provider]
  if (!limits) return false

  const now = Date.now()
  const usage = providerUsage[provider]

  if (!usage || now > usage.resetAt) {
    providerUsage[provider] = { tokensToday: 0, callsToday: 0, resetAt: now + 86_400_000 }
    return false
  }

  // Skip if at 85% of daily token limit
  if (usage.tokensToday + estimatedTokens > limits.tokensPerDay * 0.85) return true
  // Skip if at 85% of daily request limit
  if (usage.callsToday >= limits.reqPerDay * 0.85) return true

  return false
}

export function trackProviderUsage(provider: string, tokensUsed: number): void {
  const now = Date.now()
  if (!providerUsage[provider] || now > providerUsage[provider].resetAt) {
    providerUsage[provider] = { tokensToday: 0, callsToday: 0, resetAt: now + 86_400_000 }
  }
  providerUsage[provider].tokensToday += tokensUsed
  providerUsage[provider].callsToday++
}

// âââââââââââââââââââââââââââââââââââââââââââââââ
// 5. BANDWIDTH SAVER
// Images: URL only (zero Vercel bandwidth)
// TTS: Edge TTS URL / browser Web Speech
// Audio: browser MediaRecorder (never proxied)
// âââââââââââââââââââââââââââââââââââââââââââââââ

export const BANDWIDTH_RULES = {
  images: 'URL_ONLY',          // Never proxy images through Vercel
  tts: 'EDGE_TTS_URL',         // Return audio URL, not binary
  audio: 'BROWSER_ONLY',       // MediaRecorder = client-side
  video: 'EXTERNAL_URL_ONLY',  // YouTube embeds etc
  maxResponseSize: 50_000,     // 50KB max per API response
}

// If response > maxResponseSize, truncate with summary
export function truncateIfNeeded(text: string, maxChars = 10_000): string {
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '\n\n[...truncated for bandwidth efficiency]'
}

// âââââââââââââââââââââââââââââââââââââââââââââââ
// 6. STORAGE FALLBACK CHAIN
// Primary: IndexedDB (device, unlimited)
// Alt: localStorage (device, 5MB)
// Backup: GitHub Gist (cloud, free)
// Emergency: sessionStorage (tab-only)
// âââââââââââââââââââââââââââââââââââââââââââââââ

export const STORAGE_STRATEGY = {
  chatHistory:  ['indexedDB'],                              // local only (privacy)
  profile:      ['indexedDB', 'localStorage_mirror'],       // fast reads
  memory:       ['indexedDB', 'githubGist'],                // cloud backup
  goals:        ['indexedDB', 'githubGist'],                // cloud backup
  apiKeys:      ['localStorage'],                           // never to cloud
  pinHash:      ['localStorage'],                           // never to cloud
  theme:        ['localStorage'],                           // tiny
}

// âââââââââââââââââââââââââââââââââââââââââââââââ
// 7. COMPLETE FALLBACK TREE (visual reference)
// âââââââââââââââââââââââââââââââââââââââââââââââ
/*
JARVIS Resource Fallback Tree:

AI RESPONSES:
  Primary  â Groq (fastest, free 6K req/day)
  Alt 1    â Gemini 2.0 Flash (1M tok/day free)
  Alt 2    â Together AI ($25 credit)
  Alt 3    â Cerebras (fast inference free)
  Alt 4    â Mistral Small (free tier)
  Alt 5    â Cohere Command-R (free tier)
  Alt 6    â Fireworks AI (free tier)
  Alt 7    â OpenRouter (some free models)
  Alt 8    â Deepinfra (free tier)
  Alt 9    â HuggingFace (free inference)
  Backup   â Pollinations (unlimited, forever free)
  Emergencyâ Puter.js (browser-side, no server)

IMAGES:
  Primary  â Pollinations (free, URL only)
  Alt      â fal.ai (credits)
  Alt      â HuggingFace FLUX (free)
  Backup   â Gemini Imagen

TTS:
  Primary  â Edge TTS (Microsoft, free)
  Alt      â Pollinations TTS (free)
  Alt      â gTTS (Google, free)
  Backup   â Web Speech API (browser, offline)

SEARCH:
  Primary  â Serper.dev (2500/month free)
  Alt      â Jina AI r.jina.ai (URL reader free)
  Backup   â DuckDuckGo (free, no key)

WEATHER:
  Primary  â wttr.in (unlimited free)
  Alt      â OpenWeatherMap (1000/day free)
  Backup   â open-meteo.com (unlimited free)

NEWS:
  Primary  â GNews (100/day free)
  Alt      â NewsAPI (100/day free)
  Backup   â HackerNews Firebase (unlimited)

STORAGE:
  Primary  â IndexedDB (device, unlimited)
  Alt      â localStorage (device, 5MB)
  Backup   â GitHub Gist (cloud, free)
  Future   â Vercel KV (256MB free)

HOSTING:
  Primary  â Vercel Hobby (100K invocations/month)
  Alt      â Netlify (125K req/month free)
  Backup   â Cloudflare Pages (unlimited req free!)
*/
