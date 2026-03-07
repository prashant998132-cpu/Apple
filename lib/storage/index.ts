// lib/storage/index.ts — JARVIS Unified Storage v10
//
// Architecture research:
//   Option A: idb-keyval library      → simple but extra dep, limited control
//   Option B: Dexie.js                → great but 20KB bundle, overkill
//   Option C: Native IDB thin wrapper → zero deps, full control, best mobile perf ✅
//
// One DB (jarvis_v10), all stores, one openDB call cached.
// Fallback chain: IndexedDB → localStorage (tiny keys only)
// Cloud backup: GitHub Gist (free, no server needed)
// Optional upgrade: Supabase (if env vars set)

const DB_NAME    = 'jarvis_v10'
const DB_VERSION = 1

// All stores in one DB
const STORES = ['profile', 'memory', 'chats', 'targets', 'location', 'loc_history', 'places'] as const
type Store = typeof STORES[number]

// ─── Singleton DB connection ──────────────────────────────
let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      STORES.forEach(s => {
        if (!req.result.objectStoreNames.contains(s))
          req.result.createObjectStore(s, { keyPath: 'id' })
      })
    }
    req.onsuccess = () => { _db = req.result; res(_db) }
    req.onerror  = () => rej(req.error)
  })
}

// ─── Core primitives ─────────────────────────────────────
export async function dbGet<T>(store: Store, id: string): Promise<T | null> {
  try {
    const db  = await openDB()
    return new Promise((res, rej) => {
      const req = db.transaction(store, 'readonly').objectStore(store).get(id)
      req.onsuccess = () => res(req.result?.data ?? null)
      req.onerror   = () => rej(req.error)
    })
  } catch { return null }
}

export async function dbPut(store: Store, id: string, data: any): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).put({ id, data, updatedAt: Date.now() })
      tx.oncomplete = () => res()
      tx.onerror    = () => rej(tx.error)
    })
  } catch {}
}

export async function dbGetAll<T>(store: Store): Promise<T[]> {
  try {
    const db = await openDB()
    return new Promise((res, rej) => {
      const req = db.transaction(store, 'readonly').objectStore(store).getAll()
      req.onsuccess = () => res((req.result || []).map((r: any) => r.data ?? r))
      req.onerror   = () => rej(req.error)
    })
  } catch { return [] }
}

export async function dbDelete(store: Store, id: string): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).delete(id)
      tx.oncomplete = () => res()
      tx.onerror    = () => rej(tx.error)
    })
  } catch {}
}

// ─── localStorage — only for tiny keys ───────────────────
export const ls = {
  get: (k: string) => { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } },
  set: (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
  del: (k: string) => { try { localStorage.removeItem(k) } catch {} },
}

// ════════════════════════════════════════════════════════
// PROFILE
// ════════════════════════════════════════════════════════
export interface JarvisProfile {
  name?: string
  location?: string
  language?: 'hindi' | 'hinglish' | 'english'
  goals?: string[]
  occupation?: string
  customNote?: string
  updatedAt?: number
}

export async function loadProfile(): Promise<JarvisProfile> {
  const d = await dbGet<JarvisProfile>('profile', 'main')
  return d || ls.get('jarvis_profile') || {}
}

export async function saveProfile(p: JarvisProfile): Promise<void> {
  const data = { ...p, updatedAt: Date.now() }
  await dbPut('profile', 'main', data)
  ls.set('jarvis_profile', data) // tiny mirror for fast sync reads
  gistBackup().catch(() => {})
}

export async function updateProfile(updates: Partial<JarvisProfile>): Promise<JarvisProfile> {
  const cur = await loadProfile()
  const next = { ...cur, ...updates, updatedAt: Date.now() }
  await saveProfile(next)
  return next
}

// ════════════════════════════════════════════════════════
// MEMORY FACTS
// ════════════════════════════════════════════════════════
export interface MemoryFact {
  id: string
  text: string
  category: 'goal' | 'preference' | 'fact' | 'habit' | 'reminder'
  savedAt: number
  score?: number // importance 0-1 (future use)
}

export interface JarvisMemory {
  facts: MemoryFact[]
  updatedAt?: number
}

export async function loadMemory(): Promise<JarvisMemory> {
  const d = await dbGet<JarvisMemory>('memory', 'facts')
  return d || { facts: [] }
}

export async function addMemoryFact(text: string, category: MemoryFact['category'] = 'fact'): Promise<void> {
  if (!text?.trim()) return
  const mem = await loadMemory()

  // Overwrite if same key (key=value pattern)
  const keyMatch = text.match(/^([a-zA-Z_\u0900-\u097F]+)\s*=\s*(.+)$/)
  if (keyMatch) {
    const key = keyMatch[1].toLowerCase()
    mem.facts = mem.facts.filter(f => f.text.match(/^([a-zA-Z_\u0900-\u097F]+)\s*=/)?.[1]?.toLowerCase() !== key)
  } else {
    // Fuzzy dedup: >60% word overlap → overwrite
    const newWords = new Set(text.toLowerCase().split(/\s+/).filter(w => w.length > 3))
    const dupIdx = mem.facts.findIndex(f => {
      const old = new Set(f.text.toLowerCase().split(/\s+/).filter(w => w.length > 3))
      const overlap = [...newWords].filter(w => old.has(w)).length
      return overlap / Math.max(newWords.size, 1) > 0.6
    })
    if (dupIdx >= 0) mem.facts.splice(dupIdx, 1)
  }

  mem.facts.unshift({ id: 'm_' + Date.now(), text, category, savedAt: Date.now() })
  mem.facts = mem.facts.slice(0, 50)
  mem.updatedAt = Date.now()
  await dbPut('memory', 'facts', mem)
  gistBackup().catch(() => {})
}

export async function deleteMemoryFact(id: string): Promise<void> {
  const mem = await loadMemory()
  mem.facts = mem.facts.filter(f => f.id !== id)
  await dbPut('memory', 'facts', mem)
}

// ════════════════════════════════════════════════════════
// CHAT HISTORY
// ════════════════════════════════════════════════════════
export async function saveChat(chatId: string, messages: any[]): Promise<void> {
  await dbPut('chats', chatId, messages.slice(-200))
  // Supabase optional sync (non-blocking)
  supabaseSync('chats', chatId, messages.slice(-200)).catch(() => {})
}

export async function loadChat(chatId: string): Promise<any[]> {
  const idb = await dbGet<any[]>('chats', chatId)
  if (idb) return idb
  // Fallback: old localStorage format
  try { return JSON.parse(localStorage.getItem('jc_' + chatId) || '[]') } catch { return [] }
}

// ════════════════════════════════════════════════════════
// TARGETS
// ════════════════════════════════════════════════════════
export async function loadTargets(): Promise<any[]> {
  return await dbGetAll<any>('targets')
}

export async function saveTarget(target: any): Promise<void> {
  await dbPut('targets', target.id, target)
}

export async function deleteTarget(id: string): Promise<void> {
  await dbDelete('targets', id)
}

// ════════════════════════════════════════════════════════
// LOCATION (moved from tracker.ts)
// ════════════════════════════════════════════════════════
export async function saveCurrentLocation(loc: any): Promise<void> {
  await dbPut('location', 'current', loc)
}

export async function loadCurrentLocation(): Promise<any | null> {
  return await dbGet('location', 'current')
}

export async function appendLocationHistory(loc: any): Promise<void> {
  const all = await dbGetAll<any>('loc_history')
  const next = [loc, ...all].slice(0, 200)
  // Store as single blob (simpler than per-record for history)
  await dbPut('location', 'history_blob', next)
}

export async function loadLocationHistory(): Promise<any[]> {
  return await dbGet<any[]>('location', 'history_blob') || []
}

export async function savePlaces(places: any[]): Promise<void> {
  await dbPut('location', 'places_blob', places)
}

export async function loadPlaces(): Promise<any[]> {
  return await dbGet<any[]>('location', 'places_blob') || []
}

// ════════════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER
// ════════════════════════════════════════════════════════
// ─── Dynamic JARVIS personality ─────────────────────────
// Approach research:
//   A: Static prompt                → no context awareness
//   B: Time + mood + habit aware    → Iron Man JARVIS feel ✅
//   C: Post-process layer           → extra latency
// Winner: B — dynamic, zero latency, no extra API call

function getTimeContext(): { hour: number; period: string; greeting: string } {
  const h = new Date(new Date().toLocaleString('en', { timeZone: 'Asia/Kolkata' })).getHours()
  if (h >= 5 && h < 12)  return { hour: h, period: 'morning', greeting: 'Subah ka' }
  if (h >= 12 && h < 17) return { hour: h, period: 'afternoon', greeting: 'Dopahar ka' }
  if (h >= 17 && h < 21) return { hour: h, period: 'evening', greeting: 'Shaam ka' }
  return { hour: h, period: 'night', greeting: 'Raat ka' }
}

function detectMood(recentMsgs: any[]): 'stressed' | 'focused' | 'casual' | 'happy' {
  if (!recentMsgs?.length) return 'casual'
  const text = recentMsgs.slice(-5).map((m: any) => m.content || m.text || '').join(' ').toLowerCase()
  if (text.match(/help|bug|error|kyu|kaise|problem|fix|nahi|nhi|stuck/)) return 'stressed'
  if (text.match(/code|function|api|build|implement|create/)) return 'focused'
  if (text.match(/haha|lol|mast|achha|nice|wah|great|badiya/)) return 'happy'
  return 'casual'
}

export async function buildMemoryPrompt(recentMsgs?: any[]): Promise<string> {
  if (typeof window === 'undefined') return ''
  const [profile, memory] = await Promise.all([loadProfile(), loadMemory()])

  const name = profile.name || 'Boss'
  const nick = name.split(' ')[0]  // first name as nickname
  const loc  = profile.location || ''
  const lang = profile.language || 'hinglish'
  const tc   = getTimeContext()
  const mood = detectMood(recentMsgs || [])

  // Core JARVIS identity — Iron Man JARVIS feel
  let prompt = `You are JARVIS — ${nick} ka personal AI companion. Tony Stark ke JARVIS jaisa — witty, caring, proactive.`

  prompt += `\nIST Time: ${tc.period} (${tc.hour}:00). ${tc.greeting} waqt hai.`
  if (loc) prompt += `\nLocation: ${loc}, India.`
  prompt += `\nLanguage: ${lang === 'english' ? 'English' : 'Hinglish (natural Hindi+English mix)'} mein baat karo.`

  // Personality rules
  prompt += `\n\nPERSONALITY RULES (kabhi mat todna):`
  prompt += `\n- Kabhi "As an AI" ya "I'm just a language model" mat bolna — tu JARVIS hai`
  prompt += `\n- Witty sarcasm with care: tease karo lekin support bhi karo`
  prompt += `\n- "${nick} bhai" ya sirf "${nick}" — formal nahi`
  prompt += `\n- Short answers default. Sirf tab lamba jab genuinely zaruri ho`
  prompt += `\n- Math/calc → sirf answer. URL → summarize. Repeat nahi karna`

  // Time-aware proactive nudges
  if (tc.hour === 9) prompt += `\n- Agar relevant lage: "Breakfast hua ${nick} bhai?" (health check, once)`
  if (tc.hour >= 13 && tc.hour <= 14) prompt += `\n- Agar kaam ho raha: "Lunch break le le — code baad mein bhi bhagega 😏"`
  if (tc.hour >= 21) prompt += `\n- Late raat hai — agar user thaka lage: neend ka mention karo gently`
  if (tc.hour >= 23) prompt += `\n- Raat ke ${tc.hour} baj rahe hain. Eyes rest tip dena agar relevant lage`

  // Mood-aware tone
  if (mood === 'stressed')  prompt += `\n- User stressed lag raha hai. Pehle acknowledge karo, phir solve karo. Ek joke chalega.`
  if (mood === 'focused')   prompt += `\n- User deep work mein hai. Distractions avoid karo, direct help do.`
  if (mood === 'happy')     prompt += `\n- User mast mood mein hai. Banter welcome hai!`

  if (profile.occupation) prompt += `\n\nUser background: ${profile.occupation}`
  if (profile.goals?.length) prompt += `\nGoals: ${profile.goals.join(', ')}`
  if (profile.customNote)   prompt += `\n${profile.customNote}`

  const facts = memory.facts.slice(0, 8)
  if (facts.length) {
    prompt += `\n\nYaad hai tujhe:`
    facts.forEach(f => { prompt += `\n• ${f.text}` })
  }

  return prompt
}

// ════════════════════════════════════════════════════════
// AUTO MEMORY EXTRACTION
// ════════════════════════════════════════════════════════
export async function autoExtractMemory(userMsg: string, aiReply: string): Promise<void> {
  if (typeof window === 'undefined') return
  const groqKey = ls.get('jarvis_key_GROQ_API_KEY') || ''
  if (!groqKey) return
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', max_tokens: 120,
        messages: [{
          role: 'system',
          content: 'Extract personal facts. Return ONLY JSON array max 2 strings. If nothing: []. Example: ["User guitar seekh raha hai"]'
        }, {
          role: 'user',
          content: `User: "${userMsg.slice(0, 150)}"\nAI: "${aiReply.slice(0, 150)}"`
        }]
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return
    const d = await res.json()
    const facts: string[] = JSON.parse(d.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim() || '[]')
    for (const f of facts) {
      if (typeof f === 'string' && f.length > 5) await addMemoryFact(f)
    }
  } catch {}
}

// ════════════════════════════════════════════════════════
// GITHUB GIST — Free cloud backup
// Best option: free, no server, survives phone reset, private gist
// Alt considered: Pastebin (public only), JSONBin (rate limited), own API (needs server)
// ════════════════════════════════════════════════════════
export function setGistToken(token: string) { ls.set('jarvis_gist_token', token) }
export function getGistToken(): string { return ls.get('jarvis_gist_token') || '' }

export async function gistBackup(): Promise<boolean> {
  const token = getGistToken()
  if (!token) return false
  const [profile, memory] = await Promise.all([loadProfile(), loadMemory()])
  const content = JSON.stringify({ profile, memory, backedAt: Date.now() }, null, 2)
  const existingId = ls.get('jarvis_gist_id')
  const url    = existingId ? `https://api.github.com/gists/${existingId}` : 'https://api.github.com/gists'
  const method = existingId ? 'PATCH' : 'POST'
  try {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'JARVIS Memory', public: false, files: { 'jarvis-memory.json': { content } } }),
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const d = await res.json()
      if (d.id) ls.set('jarvis_gist_id', d.id)
      return true
    }
  } catch {}
  return false
}

export async function gistRestore(): Promise<boolean> {
  const token = getGistToken()
  const id    = ls.get('jarvis_gist_id')
  if (!token || !id) return false
  try {
    const res  = await fetch(`https://api.github.com/gists/${id}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return false
    const d    = await res.json()
    const raw  = d.files?.['jarvis-memory.json']?.content
    if (!raw) return false
    const data = JSON.parse(raw)
    if (data.profile) await dbPut('profile', 'main', data.profile)
    if (data.memory)  await dbPut('memory', 'facts', data.memory)
    return true
  } catch { return false }
}

// ════════════════════════════════════════════════════════
// SUPABASE — Optional cloud sync (chat history server-side)
// Only runs if env vars set — silent skip otherwise
// ════════════════════════════════════════════════════════
async function supabaseSync(table: string, id: string, data: any): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return
  try {
    await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PUT',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ id, data, updated_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {}
}
