// lib/core/moodTracker.ts — JARVIS Mood Intelligence v1
// Silently track user mood from messages — zero API cost
// Store in localStorage — use to adjust JARVIS tone proactively

export type Mood = 'happy' | 'stressed' | 'sad' | 'focused' | 'tired' | 'neutral' | 'excited'

export interface MoodEntry {
  mood: Mood
  confidence: number  // 0-1
  timestamp: number
  trigger?: string    // what caused this mood detect
}

const MOOD_KEY = 'jarvis_mood_log'
const MAX_ENTRIES = 50

// ── Detect mood from user message ────────────────────────

export function detectMood(msg: string): MoodEntry | null {
  const m = msg.toLowerCase()
  
  const patterns: Array<{ mood: Mood; words: string[]; confidence: number }> = [
    { mood: 'stressed',  confidence: 0.85, words: ['stressed','tension','tension','pressure','deadline','panic','help','jaldi','urgent','problem','issue','bug'] },
    { mood: 'sad',       confidence: 0.9,  words: ['sad','dukhi','bura lag','rona','cry','depressed','akela','lonely','hurt','broken','miss'] },
    { mood: 'tired',     confidence: 0.85, words: ['thak','tired','exhausted','neend','bore','bored','ugh','sigh','bahut ho gaya'] },
    { mood: 'excited',   confidence: 0.8,  words: ['excited','khushi','amazing','awesome','yes!','yay','great','wonderful','perfect','finally'] },
    { mood: 'happy',     confidence: 0.75, words: ['happy','khush','maza','fun','haha','lol','😊','😄','accha hua','nice'] },
    { mood: 'focused',   confidence: 0.7,  words: ['focus','kaam','work','code','study','padhai','solve','build','create','design'] },
  ]

  let topMood: Mood = 'neutral'
  let topScore = 0
  let topConf = 0

  for (const p of patterns) {
    const score = p.words.filter(w => m.includes(w)).length
    if (score > topScore || (score === topScore && p.confidence > topConf)) {
      topScore = score
      topMood = p.mood
      topConf = p.confidence
    }
  }

  if (topScore === 0) return null

  return {
    mood: topMood,
    confidence: topConf,
    timestamp: Date.now(),
    trigger: msg.slice(0, 60),
  }
}

// ── Storage ───────────────────────────────────────────────

export function logMood(entry: MoodEntry) {
  try {
    const log: MoodEntry[] = JSON.parse(localStorage.getItem(MOOD_KEY) || '[]')
    log.push(entry)
    localStorage.setItem(MOOD_KEY, JSON.stringify(log.slice(-MAX_ENTRIES)))
  } catch {}
}

export function getRecentMoods(n = 5): MoodEntry[] {
  try {
    const log: MoodEntry[] = JSON.parse(localStorage.getItem(MOOD_KEY) || '[]')
    return log.slice(-n)
  } catch { return [] }
}

export function getDominantMood(hours = 24): Mood {
  try {
    const since = Date.now() - hours * 3600000
    const recent = getRecentMoods(20).filter(e => e.timestamp > since)
    if (recent.length === 0) return 'neutral'
    const counts: Partial<Record<Mood, number>> = {}
    recent.forEach(e => { counts[e.mood] = (counts[e.mood] || 0) + 1 })
    return (Object.entries(counts).sort((a,b) => b[1]-a[1])[0][0] as Mood) || 'neutral'
  } catch { return 'neutral' }
}

// ── Mood-based JARVIS tone hint ───────────────────────────

export function getMoodPromptHint(mood: Mood): string {
  switch(mood) {
    case 'stressed':  return 'User stressed lag raha hai — pehle acknowledge karo, short replies do, koi lecture nahi.'
    case 'sad':       return 'User sad/dukhi hai — warm aur supportive raho, solutions impose mat karo.'
    case 'tired':     return 'User thaka hua hai — concise replies, no overload, gentle tone.'
    case 'excited':   return 'User excited hai — match their energy, enthusiastic replies.'
    case 'happy':     return 'User khush hai — playful aur witty tone okay hai.'
    case 'focused':   return 'User kaam mein focused hai — direct, efficient replies. No fluff.'
    default:          return ''
  }
}
