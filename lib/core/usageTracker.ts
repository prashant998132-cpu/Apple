// lib/core/usageTracker.ts
// Real-time API usage tracking — per provider per day
// At 85% limit → smart router switches to next provider
// ─────────────────────────────────────────────────────

export interface ProviderUsage {
  provider: string
  calls: number
  dailyLimit: number
  lastReset: string  // ISO date YYYY-MM-DD
}

const DAILY_LIMITS: Record<string, number> = {
  groq:       6000,
  gemini:     1500,
  cerebras:   1000,
  together:   9999,  // $25 credit — no hard daily limit
  mistral:    500,
  cohere:     1000,
  fireworks:  600,
  deepinfra:  500,
  huggingface:1000,
  deepseek:   9999,  // free credits
  openrouter: 200,
  pollinations: 999999,
  openai:     9999,
  anthropic:  9999,
  elevenlabs: 300,   // ~10k chars/mo ÷ ~30 days
  serper:     83,    // 2500/mo ÷ 30
  gnews:      100,
  newsapi:    100,
}

const todayKey = () => new Date().toISOString().split('T')[0]

function getStorageKey(provider: string) {
  return `jarvis_usage_${provider}_${todayKey()}`
}

export function trackCall(provider: string): void {
  if (typeof window === 'undefined') return
  const key = getStorageKey(provider)
  const cur = parseInt(localStorage.getItem(key) || '0')
  localStorage.setItem(key, String(cur + 1))
  // also store timestamp of last call
  localStorage.setItem(`jarvis_last_call_${provider}`, new Date().toISOString())
}

export function getUsage(provider: string): ProviderUsage {
  const calls = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem(getStorageKey(provider)) || '0')
    : 0
  return {
    provider,
    calls,
    dailyLimit: DAILY_LIMITS[provider] ?? 9999,
    lastReset: todayKey(),
  }
}

export function getUsagePercent(provider: string): number {
  const u = getUsage(provider)
  if (u.dailyLimit >= 9999) return 0
  return Math.round((u.calls / u.dailyLimit) * 100)
}

export function isNearLimit(provider: string, threshold = 85): boolean {
  return getUsagePercent(provider) >= threshold
}

export function isAtLimit(provider: string): boolean {
  return isNearLimit(provider, 100)
}

// Returns best available provider from ordered list
export function pickProvider(
  orderedProviders: string[],
  threshold = 85
): string {
  // First: starred providers (read from localStorage)
  const starred: string[] = JSON.parse(
    typeof window !== 'undefined'
      ? localStorage.getItem('jarvis_starred_apps') || '[]'
      : '[]'
  )
  const disabled: string[] = JSON.parse(
    typeof window !== 'undefined'
      ? localStorage.getItem('jarvis_disabled_apps') || '[]'
      : '[]'
  )

  // Build priority: starred first, then ordered list
  const priority = [
    ...orderedProviders.filter(p => starred.includes(p)),
    ...orderedProviders.filter(p => !starred.includes(p)),
  ].filter(p => !disabled.includes(p))

  // Pick first one under threshold
  for (const p of priority) {
    if (!isNearLimit(p, threshold)) return p
  }

  // All near limit — pick lowest usage
  return priority.sort((a, b) => getUsagePercent(a) - getUsagePercent(b))[0] ?? orderedProviders[0]
}

// Get all provider stats for UI display
export function getAllUsageStats(): Array<ProviderUsage & { pct: number; status: 'ok'|'warn'|'full' }> {
  return Object.keys(DAILY_LIMITS).map(p => {
    const u = getUsage(p)
    const pct = getUsagePercent(p)
    return {
      ...u,
      pct,
      status: pct >= 100 ? 'full' : pct >= 85 ? 'warn' : 'ok'
    }
  })
}

// Reset all usage (called at midnight)
export function resetDailyUsage(): void {
  if (typeof window === 'undefined') return
  const today = todayKey()
  Object.keys(localStorage)
    .filter(k => k.startsWith('jarvis_usage_') && !k.includes(today))
    .forEach(k => localStorage.removeItem(k))
}
