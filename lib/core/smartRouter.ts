// lib/core/smartRouter.ts
// Smart API Router — decides WHAT to call and HOW
// Zero waste: simple queries never hit expensive APIs
// ─────────────────────────────────────────────────

export type CallType =
  | 'groq_only'      // fast, cheap — greetings, simple chat
  | 'gemini_only'    // reasoning needed — NEET, complex
  | 'tool_direct'    // skip LLM, call tool API directly
  | 'gemini_tools'   // full Gemini with function calling

export type ProviderMode = 'auto' | 'select' | 'smart'

export interface RouteDecision {
  callType: CallType
  skipLLM: boolean          // true = go straight to tool
  directTool?: string       // which tool to call directly
  preferredLLM?: 'gemini' | 'groq'
  reason: string            // why this decision
  estimatedCost: 'zero' | 'low' | 'medium' | 'high'
}

// ── Keyword maps ──────────────────────────────────────────
const DIRECT_TOOL_KEYWORDS: Record<string, string> = {
  // Image
  'image banao': 'generate_image', 'photo banao': 'generate_image',
  'तस्वीर': 'generate_image', 'picture': 'generate_image',
  'draw': 'generate_image', 'illustration': 'generate_image',

  // Music
  'gaana banao': 'generate_music', 'song banao': 'generate_music',
  'music banao': 'generate_music', 'गाना': 'generate_music',
  'compose': 'generate_music', 'beat banao': 'generate_music',

  // TTS
  'bolo': 'text_to_speech', 'bol': 'text_to_speech',
  'सुनाओ': 'text_to_speech', 'sunao': 'text_to_speech',
  'speak': 'text_to_speech', 'voice mein': 'text_to_speech',

  // Weather
  'mausam': 'get_weather', 'weather': 'get_weather',
  'मौसम': 'get_weather', 'temperature': 'get_weather',
  'barish': 'get_weather', 'बारिश': 'get_weather',

  // News
  'news': 'get_news', 'khabar': 'get_news',
  'खबर': 'get_news', 'samachar': 'get_news',

  // Train
  'train': 'search_trains', 'rail': 'search_trains',
  'irctc': 'search_trains', 'station': 'search_trains',

  // Video
  'video banao': 'get_video_links', 'reel banao': 'get_video_links',

  // Calendar
  'calendar': 'get_calendar', 'schedule': 'get_calendar',
  'events': 'get_calendar', 'meetings': 'get_calendar',
}

const SIMPLE_PATTERNS = [
  /^(hi|hello|hey|hii|helo)[\s!.]*$/i,
  /^(ok|okay|theek|shukriya|thanks|thank you|dhanyawad)[\s!.]*$/i,
  /^(ha|haan|yes|nahi|no|nope)[\s!.]*$/i,
  /^[\u0900-\u097F\s]{1,15}$/, // very short Hindi
  /^.{1,20}$/, // any very short message
]

const NEET_KEYWORDS = [
  'neet', 'biology', 'chemistry', 'physics',
  'cell', 'dna', 'rna', 'enzyme', 'mitosis', 'meiosis',
  'hybridization', 'reaction', 'newton', 'mendel',
  'photosynthesis', 'respiration', 'krebs', 'mcq',
  'explain karo', 'samjhao', 'difference', 'kya hai',
]

const COMPLEX_KEYWORDS = [
  'plan banao', 'strategy', 'analyze', 'compare',
  'summarize', 'write', 'essay', 'story', 'poem',
  'code', 'debug', 'solve', 'calculate', 'research',
]

// ── Main routing function ─────────────────────────────────
export function decideRoute(
  message: string,
  mode: ProviderMode = 'smart',
): RouteDecision {
  const m = message.toLowerCase().trim()

  // ── AUTO mode: just use Gemini+tools always ─────────────
  if (mode === 'auto') {
    return {
      callType: 'gemini_tools',
      skipLLM: false,
      preferredLLM: 'gemini',
      reason: 'Auto mode — Gemini handles everything',
      estimatedCost: 'medium',
    }
  }

  // ── SMART mode: context-aware decisions ─────────────────

  // 1. Very short / greeting → Groq only (cheapest, fastest)
  if (SIMPLE_PATTERNS.some(p => p.test(m))) {
    return {
      callType: 'groq_only',
      skipLLM: false,
      preferredLLM: 'groq',
      reason: 'Simple greeting/short message — Groq sufficient',
      estimatedCost: 'low',
    }
  }

  // 2. Direct tool keyword detected → skip LLM entirely
  for (const [keyword, tool] of Object.entries(DIRECT_TOOL_KEYWORDS)) {
    if (m.includes(keyword)) {
      return {
        callType: 'tool_direct',
        skipLLM: true,
        directTool: tool,
        reason: `Keyword "${keyword}" → direct tool call, no LLM needed`,
        estimatedCost: 'zero', // no LLM cost
      }
    }
  }

  // 3. NEET / educational → Gemini (needs reasoning)
  if (NEET_KEYWORDS.some(k => m.includes(k))) {
    return {
      callType: 'gemini_only',
      skipLLM: false,
      preferredLLM: 'gemini',
      reason: 'NEET/education — Gemini reasoning needed',
      estimatedCost: 'medium',
    }
  }

  // 4. Complex task → Gemini with tools
  if (COMPLEX_KEYWORDS.some(k => m.includes(k)) || m.length > 200) {
    return {
      callType: 'gemini_tools',
      skipLLM: false,
      preferredLLM: 'gemini',
      reason: 'Complex task — Gemini + full tool access',
      estimatedCost: 'high',
    }
  }

  // 5. Medium length chat → Groq (fast enough, cheap)
  if (m.length < 100) {
    return {
      callType: 'groq_only',
      skipLLM: false,
      preferredLLM: 'groq',
      reason: 'Medium chat — Groq fast and sufficient',
      estimatedCost: 'low',
    }
  }

  // Default → Gemini tools
  return {
    callType: 'gemini_tools',
    skipLLM: false,
    preferredLLM: 'gemini',
    reason: 'Default — Gemini with tools',
    estimatedCost: 'medium',
  }
}

// ── User preference store/load ────────────────────────────
export interface UserProviderPrefs {
  mode: ProviderMode           // 'auto' | 'select' | 'smart'
  tts?: string                 // e.g. 'google', 'elevenlabs', 'azure'
  image?: string               // e.g. 'gemini', 'flux', 'pollinations'
  music?: string               // e.g. 'musicgen', 'mubert'
  llm?: string                 // e.g. 'gemini', 'groq'
  storage?: string             // e.g. 'supabase', 'firebase', 'indexeddb'
}

export function saveProviderPrefs(prefs: UserProviderPrefs) {
  try { localStorage.setItem('jarvis_provider_prefs', JSON.stringify(prefs)) }
  catch {}
}

export function loadProviderPrefs(): UserProviderPrefs {
  try {
    return JSON.parse(localStorage.getItem('jarvis_provider_prefs') || '{}')
  } catch {
    return { mode: 'smart' }
  }
}
