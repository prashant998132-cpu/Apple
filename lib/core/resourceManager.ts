// lib/core/resourceManager.ts v12
// JARVIS Resource Manager — bumped all token limits for complete responses

export function getMaxTokens(msg: string): number {
  const w = msg.trim().split(/\s+/).length
  const ml = msg.toLowerCase()
  // nano: simple greeting
  if (w <= 3) return 200
  // simple: short factual (increased from 150 → 500)
  if (w <= 8 && !ml.match(/explain|why|how|derive|solve|code|write|kya|batao|detail/)) return 500
  // deep: code/math/reasoning
  if (ml.match(/derive|solve|code|function|algorithm|write.*code|debug|program/)) return 1500
  // research: explicit or long
  if (w > 50 || ml.match(/research|full detail|comprehensive|step by step|vistaar|poora/)) return 2500
  // normal: default (increased from 350 → 1000)
  return 1000
}

export function getHistoryLimit(msg: string): number {
  const w = msg.trim().split(/\s+/).length
  if (w <= 3) return 2
  if (w <= 8) return 4
  if (w > 50) return 10
  return 6
}

export function trimHistory(messages: any[], limit: number): any[] {
  if (messages.length <= limit) return messages
  return messages.slice(-limit)
}

export const VERCEL_LIMITS = {
  invocationsPerMonth: 100_000,
  functionTimeoutMs: 9500,
  bandwidthGBPerMonth: 100,
}

const responseCache = new Map<string, { data: string; ts: number }>()
const CACHE_TTL = 60_000

export function getCachedResponse(key: string): string | null {
  const cached = responseCache.get(key)
  if (!cached) return null
  if (Date.now() - cached.ts > CACHE_TTL) { responseCache.delete(key); return null }
  return cached.data
}

export function setCachedResponse(key: string, data: string): void {
  if (responseCache.size >= 50) {
    const oldest = [...responseCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
    responseCache.delete(oldest[0])
  }
  responseCache.set(key, { data, ts: Date.now() })
}

interface ServiceUsage { count: number; resetAt: number; dailyLimit: number }
const serviceUsage: Record<string, ServiceUsage> = {}
const SERVICE_LIMITS: Record<string, number> = {
  gnews: 100, newsapi: 100, nasa: 50, omdb: 1000, ipapi: 1000, coingecko: 200,
}

export function canCallService(service: string): boolean {
  const limit = SERVICE_LIMITS[service]
  if (!limit) return true
  const now = Date.now()
  const usage = serviceUsage[service]
  if (!usage || now > usage.resetAt) {
    serviceUsage[service] = { count: 0, resetAt: now + 86_400_000, dailyLimit: limit }
    return true
  }
  return usage.count < usage.dailyLimit * 0.9
}

export function trackServiceCall(service: string): void {
  if (!SERVICE_LIMITS[service]) return
  if (serviceUsage[service]) serviceUsage[service].count++
}

interface ProviderUsage { tokensToday: number; callsToday: number; resetAt: number }
const providerUsage: Record<string, ProviderUsage> = {}

export const PROVIDER_FREE_LIMITS: Record<string, { tokensPerDay: number; reqPerDay: number }> = {
  groq:        { tokensPerDay: 500_000,     reqPerDay: 1000 },
  gemini:      { tokensPerDay: 1_000_000,   reqPerDay: 1500 },
  together:    { tokensPerDay: 999_999_999, reqPerDay: 999_999 },
  cerebras:    { tokensPerDay: 1_000_000,   reqPerDay: 1000 },
  mistral:     { tokensPerDay: 500_000,     reqPerDay: 500 },
  cohere:      { tokensPerDay: 100_000,     reqPerDay: 1000 },
  fireworks:   { tokensPerDay: 600_000,     reqPerDay: 600 },
  openrouter:  { tokensPerDay: 200_000,     reqPerDay: 200 },
  deepinfra:   { tokensPerDay: 500_000,     reqPerDay: 500 },
  huggingface: { tokensPerDay: 300_000,     reqPerDay: 1000 },
  pollinations:{ tokensPerDay: 999_999_999, reqPerDay: 999_999 },
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
  if (usage.tokensToday + estimatedTokens > limits.tokensPerDay * 0.85) return true
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

export const BANDWIDTH_RULES = {
  images: 'URL_ONLY',
  tts: 'EDGE_TTS_URL',
  audio: 'BROWSER_ONLY',
  video: 'EXTERNAL_URL_ONLY',
  maxResponseSize: 50_000,
}

export function truncateIfNeeded(text: string, maxChars = 10_000): string {
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '\n\n[...truncated for bandwidth efficiency]'
}

export const STORAGE_STRATEGY = {
  chatHistory:  ['indexedDB'],
  profile:      ['indexedDB', 'localStorage_mirror'],
  memory:       ['indexedDB', 'githubGist'],
  goals:        ['indexedDB', 'githubGist'],
  apiKeys:      ['localStorage'],
  pinHash:      ['localStorage'],
  theme:        ['localStorage'],
}
