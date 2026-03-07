// lib/core/tokenBudget.ts
// Dynamic token budget — question complexity ke hisaab se
// Research: Fixed 1024 vs OpenAI tiktoken vs simple heuristic
// Winner: Heuristic (zero dependency, instant, mobile-friendly, no API call)

export type Complexity = 'nano' | 'simple' | 'normal' | 'deep' | 'research'

// ─── Detect complexity from message ──────────────────────
export function detectComplexity(msg: string): Complexity {
  const m = msg.trim()
  const words = m.split(/\s+/).length
  const ml = m.toLowerCase()

  // Nano — single word / greeting / yes-no
  if (words <= 3 && !ml.includes('?') && !ml.includes('explain'))
    return 'nano'

  // Simple — short factual
  if (words <= 10 && !ml.match(/explain|why|how|derive|solve|analyze|compare|difference|detail|samjhao/))
    return 'simple'

  // Research — long or explicit deep request
  if (words > 60 || ml.match(/research|full|detailed|comprehensive|elaborate|poora|puri jankari|deep dive/))
    return 'research'

  // Deep — complex reasoning/coding/math
  if (ml.match(/derive|derivation|solve|proof|code|function|algorithm|compare.*with|difference between|explain.*detail|kaise kaam|why does|analyze|physics|chemistry|biology topic|samjhao.*achhe se/))
    return 'deep'

  return 'normal'
}

// ─── Token budget per complexity ─────────────────────────
// Research: GPT avg tokens/word = 1.3. Mobile response sweet spots:
//   nano=20 words, simple=60, normal=150, deep=400, research=700
export const TOKEN_BUDGET: Record<Complexity, {
  maxTokens: number
  systemBudget: number   // max chars for system prompt
  historyTurns: number   // how many past turns to include
  toolSlots: number      // max tools to inject
}> = {
  nano:     { maxTokens: 80,   systemBudget: 300,  historyTurns: 2,  toolSlots: 0  },
  simple:   { maxTokens: 180,  systemBudget: 400,  historyTurns: 4,  toolSlots: 3  },
  normal:   { maxTokens: 350,  systemBudget: 600,  historyTurns: 6,  toolSlots: 6  },
  deep:     { maxTokens: 700,  systemBudget: 800,  historyTurns: 8,  toolSlots: 10 },
  research: { maxTokens: 1200, systemBudget: 1000, historyTurns: 10, toolSlots: 15 },
}

// ─── Compress system prompt to budget ────────────────────
export function compressSystemPrompt(prompt: string, budget: number): string {
  if (prompt.length <= budget) return prompt
  // Keep first N chars — most critical instructions are at the top
  return prompt.slice(0, budget) + '\n[truncated]'
}

// ─── Trim history to budget ───────────────────────────────
export function trimHistory(history: any[], turns: number): any[] {
  if (!history?.length) return []
  return history.slice(-turns)
}

// ─── Tool category map ────────────────────────────────────
// Only inject tools relevant to detected intent — not all 46
const TOOL_CATEGORIES: Record<string, string[]> = {
  search:   ['web_search', 'search_news', 'search_wikipedia', 'get_hackernews'],
  study:    ['generate_mcq', 'create_flashcards', 'create_notes', 'study_planner', 'search_wikipedia'],
  image:    ['generate_image', 'analyze_image', 'search_images'],
  location: ['get_weather', 'get_location_info', 'get_sunrise_sunset', 'search_trains', 'get_bus_routes', 'get_rewa_info'],
  utility:  ['calculate', 'convert_currency', 'convert_units', 'get_datetime', 'get_qr_code', 'get_word_meaning'],
  india:    ['get_rewa_info', 'search_trains', 'get_bus_routes', 'get_govt_services', 'search_news'],
  create:   ['generate_image', 'text_to_speech', 'generate_music', 'create_social_post'],
  code:     ['calculate', 'web_search'],
}

export function detectToolCategory(msg: string): string {
  const m = msg.toLowerCase()
  if (m.match(/search|find|news|latest|wikipedia|kya hai|who is/)) return 'search'
  if (m.match(/mcq|flashcard|notes|study|padhai|exam|quiz|explain.*concept/)) return 'study'
  if (m.match(/image|photo|picture|banao|draw|generate.*image/)) return 'image'
  if (m.match(/weather|mausam|train|bus|location|near|map|transport/)) return 'location'
  if (m.match(/calculate|convert|time|currency|unit|qr|meaning/)) return 'utility'
  if (m.match(/rewa|mp|madhya|bijli|govt|sarkari|nagar|palika/)) return 'india'
  if (m.match(/image|tts|music|post|social|generate/)) return 'create'
  if (m.match(/code|function|bug|fix|script|program/)) return 'code'
  return 'search' // default small set
}

export function getToolsForMessage(msg: string, allToolNames: string[], limit: number): string[] {
  const category = detectToolCategory(msg)
  const preferred = TOOL_CATEGORIES[category] || []
  // Return preferred tools that actually exist, up to limit
  const filtered = preferred.filter(t => allToolNames.includes(t)).slice(0, limit)
  // If not enough, pad with utility tools
  if (filtered.length < limit) {
    const extra = TOOL_CATEGORIES.utility
      .filter(t => allToolNames.includes(t) && !filtered.includes(t))
      .slice(0, limit - filtered.length)
    return [...filtered, ...extra]
  }
  return filtered
}
