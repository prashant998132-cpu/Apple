// lib/proactive/engine.ts — JARVIS Proactive Engine v2
//
// Research — scheduler approaches:
//   A: setInterval only           → runs even when hidden, battery drain
//   B: Periodic Background Sync   → unreliable on mobile Chrome, needs HTTPS + SW
//   C: setInterval + visibilitychange + app-open trigger (hybrid) ✅
// Winner: C — battery safe, reliable, works on all Chrome mobile versions
//
// Research — habit prediction:
//   A: Manual rule engine         → brittle, needs maintenance
//   B: Groq micro-call on open    → costs tokens, latency
//   C: Keyword cluster from chat  → zero cost, instant, surprisingly good ✅
// Winner: C

import { loadChat, loadProfile, dbGet, dbPut } from '../storage'
import { get_weather } from '../tools/no-key'

// ════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════
export interface ProactiveAlert {
  id:    string
  type:  'morning' | 'health' | 'weather' | 'habit' | 'summary' | 'festival' | 'battery' | 'focus' | 'digest'
  title: string
  body:  string
  url?:  string
  witty?: boolean  // show with sarcastic tone
}

// ════════════════════════════════════════════════════════
// HABIT TRACKER — keyword cluster from recent chats
// ════════════════════════════════════════════════════════
const HABIT_PATTERNS = [
  { id: 'coding',  words: ['code','bug','function','react','api','build','deploy','fix','error','npm','git'],         tip: '💻 Aaj ka coding tip chahiye? Ya koi bug dekhu tere liye?' },
  { id: 'study',   words: ['padhai','study','exam','mcq','notes','biology','physics','chemistry','math','concept'],   tip: '📚 Koi concept pakka karna hai? MCQ ya notes bana dun?' },
  { id: 'fitness', words: ['gym','exercise','walk','run','workout','health','calories','protein','diet'],              tip: '💪 Fitness check-in — aaj activity hui?' },
  { id: 'work',    words: ['meeting','deadline','report','project','boss','office','task','kaam'],                    tip: '📋 Koi task pending hai? Plan bana dun aaj ka?' },
]

export async function detectHabits(chatId: string): Promise<string | null> {
  try {
    const msgs: any[] = await loadChat(chatId)
    if (msgs.length < 5) return null

    const recentText = msgs
      .slice(-30)
      .filter((m: any) => m.role === 'user')
      .map((m: any) => (m.content || m.text || '').toLowerCase())
      .join(' ')

    const scores = HABIT_PATTERNS.map(p => ({
      ...p,
      score: p.words.filter(w => recentText.includes(w)).length
    })).sort((a, b) => b.score - a.score)

    const top = scores[0]
    if (top.score >= 3) return top.tip
    return null
  } catch { return null }
}

// ════════════════════════════════════════════════════════
// DAILY SUMMARY — raat ko auto generate
// ════════════════════════════════════════════════════════
export async function buildDailySummary(chatId: string): Promise<ProactiveAlert | null> {
  try {
    const msgs: any[]  = await loadChat(chatId)
    const today        = new Date().toDateString()
    const todayMsgs    = msgs.filter((m: any) => new Date(m.timestamp || m.ts || 0).toDateString() === today)
    const userMsgs     = todayMsgs.filter((m: any) => m.role === 'user')

    if (userMsgs.length < 3) return null  // not enough activity

    const profile = await loadProfile()
    const name    = (profile.name || 'Boss').split(' ')[0]

    // Topic extract — simple keyword frequency
    const allText  = userMsgs.map((m: any) => m.content || m.text || '').join(' ').toLowerCase()
    const topics: string[] = []
    if (allText.match(/code|bug|react|api/))    topics.push('coding')
    if (allText.match(/study|padhai|exam/))      topics.push('study')
    if (allText.match(/weather|mausam/))         topics.push('weather checks')
    if (allText.match(/image|banao|generate/))   topics.push('image generation')

    const topicStr = topics.length ? topics.join(', ') : 'various topics'
    const msgCount = userMsgs.length

    const summaries = [
      `Aaj ${msgCount} messages exchange hue — ${topicStr} pe focus tha. Solid session ${name} bhai! 💪`,
      `${msgCount} sawalon ka jawab diya aaj — ${topicStr}. Tujhe productive rehna achha lagta hai 😏`,
      `Aaj ka score: ${msgCount} tasks/queries — ${topicStr}. Kal bhi aise hi chalte hain! 🚀`,
    ]

    return {
      id:    `summary_${today}`,
      type:  'summary',
      title: `📊 Aaj ka JARVIS Report — ${name} bhai`,
      body:  summaries[Math.floor(Math.random() * summaries.length)],
      url:   '/',
      witty: true,
    }
  } catch { return null }
}


// ════════════════════════════════════════════════════════
// DAILY DIGEST — Subah 8 baje comprehensive morning brief
// Weather + News headline + Today reminders + Quote
// Zero LLM cost — pure tool calls
// ════════════════════════════════════════════════════════
export async function buildDailyDigest(city: string): Promise<ProactiveAlert | null> {
  const h = getISTHour()
  if (h !== 8) return null
  const digestKey = `digest_${new Date().toDateString()}`
  if (wasRecentlySent(digestKey)) return null

  try {
    const parts: string[] = []

    // Weather
    try {
      const { get_weather } = await import('../tools/no-key')
      const w = await get_weather({ location: city || 'Rewa', days: 1 })
      if (w.current) {
        parts.push('\uD83C\uDF24 ' + w.current.temperature + ', ' + (w.current.condition_hindi || w.current.condition_english || ''))
        const rain = parseInt(w.forecast?.[0]?.rain_chance || '0')
        if (rain >= 60) parts.push('\uD83C\uDF27\uFE0F Baarish ' + rain + '% — chhata le jana')
      }
    } catch {}

    // Today reminders count
    try {
      const remStr = typeof localStorage !== 'undefined' ? localStorage.getItem('jarvis_reminders_v2') || '[]' : '[]'
      const rems: any[] = JSON.parse(remStr)
      const today = new Date(); today.setHours(23,59,59,999)
      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      const todayRems = rems.filter((r: any) => !r.done && r.triggerTime >= todayStart.getTime() && r.triggerTime <= today.getTime())
      if (todayRems.length > 0) {
        parts.push('\u23F0 Aaj ' + todayRems.length + ' reminder' + (todayRems.length > 1 ? 's' : '') + ' hain')
      }
    } catch {}

    // Motivational line — rotate daily
    const quotes = [
      'Aaj bhi solid kaam kar — JARVIS saath hai.',
      'Ek step aaj, ek kal — bas chalta reh.',
      'Code ho ya padhai — brain warm-up se shuru kar.',
      'Duniya ke liye nahi — apne liye productive ho.',
      'Kal jo socha tha — aaj kar.',
    ]
    const dayIdx = new Date().getDate() % quotes.length
    parts.push('\u2728 ' + quotes[dayIdx])

    if (parts.length === 0) return null

    return {
      id: digestKey,
      type: 'morning',
      title: '\uD83C\uDF05 JARVIS Morning Digest',
      body: parts.join(' | '),
      url: '/',
      witty: true,
    }
  } catch { return null }
}

// ════════════════════════════════════════════════════════
// FOCUS MODE — Pomodoro-style JARVIS nudge
// User asks JARVIS to focus → engine tracks + reminds
// ════════════════════════════════════════════════════════
const FOCUS_KEY = 'jarvis_focus_session'

export interface FocusSession {
  startTime: number
  durationMin: number
  task: string
  breakAlertSent: boolean
}

export function startFocusMode(task: string, durationMin: number = 25): FocusSession {
  const session: FocusSession = {
    startTime: Date.now(),
    durationMin,
    task,
    breakAlertSent: false,
  }
  try { localStorage.setItem(FOCUS_KEY, JSON.stringify(session)) } catch {}
  return session
}

export function getFocusSession(): FocusSession | null {
  try {
    const s = localStorage.getItem(FOCUS_KEY)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

export function clearFocusSession() {
  try { localStorage.removeItem(FOCUS_KEY) } catch {}
}

async function checkFocusMode(): Promise<ProactiveAlert | null> {
  try {
    const session = getFocusSession()
    if (!session) return null
    const elapsed = Date.now() - session.startTime
    const durationMs = session.durationMin * 60 * 1000
    const halfMs = durationMs / 2

    // Break alert at half time
    if (elapsed >= halfMs && elapsed < durationMs && !session.breakAlertSent) {
      session.breakAlertSent = true
      try { localStorage.setItem(FOCUS_KEY, JSON.stringify(session)) } catch {}
      return {
        id: 'focus_half_' + session.startTime,
        type: 'focus',
        title: '\uD83C\uDFAF Focus Check',
        body: (session.durationMin / 2) + ' min ho gaye — "' + session.task.slice(0, 40) + '" pe kaam jari hai? Solid reh!',
        witty: true,
      }
    }

    // Done alert
    if (elapsed >= durationMs) {
      clearFocusSession()
      return {
        id: 'focus_done_' + session.startTime,
        type: 'focus',
        title: '\u2705 Focus Session Complete!',
        body: session.durationMin + ' min ka solid focus session done — "' + session.task.slice(0, 40) + '". Break le, chai pi! \u2615',
        witty: true,
      }
    }
    return null
  } catch { return null }
}

// ════════════════════════════════════════════════════════
// SMART AUTO-MEMORY — detect important info in chats
// Phone, address, meeting, deadline → auto remind user
// ════════════════════════════════════════════════════════
export function extractImportantInfo(msg: string): string | null {
  const m = msg.toLowerCase()
  if (m.match(/\d{10}/)) return 'Phone number noted — memory mein save karna chahoge?'
  if (m.match(/deadline|due date|submit by|kal tak|aaj tak/)) return 'Deadline detect hui — reminder set kar dun?'
  if (m.match(/meeting|call at|baat karni|mil ke/)) return 'Meeting mention hui — calendar mein add kar dun?'
  if (m.match(/birthday|janamdin|bday/)) return 'Birthday mention — reminder set karun?'
  return null
}


// ════════════════════════════════════════════════════════
// TIME-BASED PROACTIVE NUDGES
// ════════════════════════════════════════════════════════
function getISTHour(): number {
  return new Date(new Date().toLocaleString('en', { timeZone: 'Asia/Kolkata' })).getHours()
}

async function getProfileName(): Promise<string> {
  const p = await loadProfile()
  return (p.name || 'Boss').split(' ')[0]
}

export async function checkTimeNudges(city: string): Promise<ProactiveAlert[]> {
  const h    = getISTHour()
  const name = await getProfileName()
  const alerts: ProactiveAlert[] = []

  // 7 AM — Morning briefing
  if (h === 7) {
    let weatherLine = ''
    try {
      const w = await get_weather({ location: city, days: 1 })
      if (w.current) weatherLine = ` ${w.current.temperature}, ${w.current.condition_hindi}.`
    } catch {}
    alerts.push({
      id: `morning_${new Date().toDateString()}`,
      type: 'morning',
      title: `🌅 Subah ho gayi ${name} bhai!`,
      body: `Uth ja!${weatherLine} Aaj kya plan hai? JARVIS ready hai.`,
      url: '/', witty: true,
    })
  }

  // 9 AM — Breakfast nudge
  if (h === 9) {
    alerts.push({
      id: `breakfast_${new Date().toDateString()}`,
      type: 'health',
      title: `🍳 Breakfast ${name} bhai?`,
      body: `Code pe dhyan dena achha hai — lekin pehle khaana kha le. Brain fuel chahiye 😏`,
      witty: true,
    })
  }

  // 1 PM — Lunch reminder
  if (h === 13) {
    alerts.push({
      id: `lunch_${new Date().toDateString()}`,
      type: 'health',
      title: `🍱 Lunch time!`,
      body: `${name} bhai screen se uthna padega — code bhagega nahi, lekin tujhe bhookh lagegi 😄`,
      witty: true,
    })
  }

  // 9 PM — Evening summary + dinner
  if (h === 21) {
    alerts.push({
      id: `dinner_${new Date().toDateString()}`,
      type: 'health',
      title: `🌙 Dinner + Wind down`,
      body: `${name} bhai, raat ke 9 baj gaye. Khana khaya? Thoda rest bhi le — kal bhi JARVIS rahega.`,
      witty: true,
    })
  }

  // 11 PM — Late night coding warning
  if (h === 23) {
    alerts.push({
      id: `late_${new Date().toDateString()}`,
      type: 'health',
      title: `😴 Sir, neend bhi zaruri hai`,
      body: `${name} bhai raat ke 11 baj gaye hain. Iron Man suit bhi charge hoti hai — tu bhi so ja 😏`,
      witty: true,
    })
  }

  // Weather alert at 8 AM + 5 PM
  if ((h === 8 || h === 17) && city) {
    try {
      const w          = await get_weather({ location: city, days: 1 })
      const rain       = parseInt(w.forecast?.[0]?.rain_chance || '0')
      const temp       = parseFloat(w.current?.temperature || '25')

      if (rain >= 70) alerts.push({ id: `rain_${Date.now()}`, type: 'weather', title: `🌧️ Baarish aane wali hai ${city} mein`, body: `${rain}% chance — chhata le ja ${name} bhai. Seriously.`, witty: true })
      else if (temp >= 42) alerts.push({ id: `heat_${Date.now()}`, type: 'weather', title: `🔥 Garmi extreme level`, body: `${w.current?.temperature}! Bahar mat nikal dopahar mein — pani peeta reh.`, witty: true })
    } catch {}
  }

  return alerts
}

// ════════════════════════════════════════════════════════
// BATTERY STATUS API
// Research: navigator.getBattery() — Chrome 38+, mobile Chrome ✅
//           iOS Safari: NOT supported → graceful skip
// ════════════════════════════════════════════════════════
export async function checkBattery(): Promise<ProactiveAlert | null> {
  try {
    if (!('getBattery' in navigator)) return null
    const battery: any = await (navigator as any).getBattery()
    const pct = Math.round(battery.level * 100)

    if (!battery.charging && pct <= 15) {
      return {
        id:    `battery_${Date.now()}`,
        type:  'battery',
        title: '🔋 Battery critical',
        body:  `${pct}% bachi hai — charge pe laga de pehle. JARVIS bhi disconnect nahi hona chahta 😅`,
        witty: true,
      }
    }
    if (!battery.charging && pct <= 30) {
      return {
        id:    `battery_low_${Date.now()}`,
        type:  'battery',
        title: `🔋 Battery ${pct}%`,
        body:  'Charger dhundh le jaldi — kaam zyada bacha hai, battery kam.',
        witty: true,
      }
    }
  } catch {}
  return null
}

// ════════════════════════════════════════════════════════
// SCREEN WAKE LOCK — long sessions mein screen off na ho
// Research: navigator.wakeLock.request() — Chrome 84+, Android Chrome ✅
//           iOS: NOT supported → graceful skip
//           Alt: NoSleep.js library → adds 10KB, same result
// Winner: Native API with graceful fallback
// ════════════════════════════════════════════════════════
let _wakeLock: any = null

export async function requestWakeLock(): Promise<boolean> {
  try {
    if (!('wakeLock' in navigator)) return false
    _wakeLock = await (navigator as any).wakeLock.request('screen')
    _wakeLock.addEventListener('release', () => { _wakeLock = null })
    return true
  } catch { return false }
}

export async function releaseWakeLock(): Promise<void> {
  try { if (_wakeLock) await _wakeLock.release() } catch {}
  _wakeLock = null
}

// Re-acquire on visibility change (browser releases on tab hide)
export function setupWakeLockPersist() {
  if (typeof document === 'undefined') return
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && !_wakeLock) {
      await requestWakeLock()
    }
  })
}

// ════════════════════════════════════════════════════════
// CHAINED COMMANDS — one input → detect multiple intents
// Research:
//   A: Manual regex rules         → brittle, misses nuance
//   B: LLM intent parse           → extra token cost
//   C: Keyword multi-label detect → fast, accurate for common patterns ✅
// ════════════════════════════════════════════════════════
export interface ChainedIntent {
  intents: ('help' | 'motivate' | 'remind' | 'weather' | 'health' | 'info')[]
  enrichedPrompt: string
}

export function detectChainedIntent(msg: string): ChainedIntent {
  const m = msg.toLowerCase()
  const intents: ChainedIntent['intents'] = []
  const extras: string[] = []

  // Detect multiple needs
  if (m.match(/tired|thak|neend|headache|sir dard/)) {
    intents.push('health')
    extras.push('[Note: User thaka hua lag raha hai — pehle acknowledge karo, phir help karo, phir rest suggest karo gently]')
  }
  if (m.match(/help|code|fix|bug|error|kaise|how/)) {
    intents.push('help')
  }
  if (m.match(/sad|bore|akela|lonely|depression|anxious|nervous/)) {
    intents.push('motivate')
    extras.push('[Note: User emotional support chahta hai — warm + witty response, not clinical]')
  }
  if (m.match(/remind|याद दिला|alarm|set|schedule/)) {
    intents.push('remind')
  }
  if (m.match(/weather|mausam|baarish|rain/)) {
    intents.push('weather')
  }

  return {
    intents,
    enrichedPrompt: extras.length ? msg + '\n\n' + extras.join('\n') : msg,
  }
}

// ════════════════════════════════════════════════════════
// PUSH NOTIFICATION
// ════════════════════════════════════════════════════════
export async function sendAlert(alert: ProactiveAlert): Promise<boolean> {
  if (typeof window === 'undefined') return false

  // In-app toast fallback if notification not granted
  const perm = Notification.permission
  if (perm === 'denied') {
    // dispatch custom event for in-app toast
    window.dispatchEvent(new CustomEvent('jarvis-alert', { detail: alert }))
    return true
  }

  if (perm !== 'granted') {
    await Notification.requestPermission()
  }

  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification(alert.title, {
          body:  alert.body,
          icon:  '/icons/icon-192x192.png',
          badge: '/icons/badge-96x96.png',
          data:  { url: alert.url || '/' },
          // vibrate: [200, 100, 200], // removed: not in TS NotificationOptions
        })
        return true
      }
      new Notification(alert.title, { body: alert.body, icon: '/icons/icon-192x192.png' })
      return true
    } catch {}
  }

  window.dispatchEvent(new CustomEvent('jarvis-alert', { detail: alert }))
  return false
}

// ════════════════════════════════════════════════════════
// MAIN SCHEDULER — hybrid approach (C)
// setInterval (1 min) + visibilitychange + app-open trigger
// ════════════════════════════════════════════════════════
const SENT_KEY = 'jarvis_sent_alerts'

function wasRecentlySent(id: string): boolean {
  try {
    const sent: string[] = JSON.parse(localStorage.getItem(SENT_KEY) || '[]')
    return sent.includes(id)
  } catch { return false }
}

function markSent(id: string) {
  try {
    const sent: string[] = JSON.parse(localStorage.getItem(SENT_KEY) || '[]')
    sent.push(id)
    // Keep last 50 only
    localStorage.setItem(SENT_KEY, JSON.stringify(sent.slice(-50)))
  } catch {}
}

async function runChecks(city: string, chatId: string) {
  const h = getISTHour()

  // Time nudges
  const timeAlerts = await checkTimeNudges(city)
  for (const a of timeAlerts) {
    if (!wasRecentlySent(a.id)) { await sendAlert(a); markSent(a.id) }
  }

  // Habit tip — once per day, on app open
  const habitTip = await detectHabits(chatId)
  const habitKey = `habit_${new Date().toDateString()}`
  if (habitTip && !wasRecentlySent(habitKey)) {
    const name = await getProfileName()
    await sendAlert({ id: habitKey, type: 'habit', title: `🤖 JARVIS noticed something`, body: habitTip + ` — ${name} bhai tu predictable hai 😄`, witty: true })
    markSent(habitKey)
  }

  // Daily summary at 9-10 PM
  if (h >= 21 && h <= 22) {
    const summaryKey = `summary_${new Date().toDateString()}`
    if (!wasRecentlySent(summaryKey)) {
      const summary = await buildDailySummary(chatId)
      if (summary) { await sendAlert(summary); markSent(summary.id) }
    }
  }

  // Daily Digest — 8 AM comprehensive morning brief
  const digest = await buildDailyDigest(city)
  if (digest && !wasRecentlySent(digest.id)) {
    await sendAlert(digest)
    markSent(digest.id)
  }

  // Focus mode check
  const focusAlert = await checkFocusMode()
  if (focusAlert && !wasRecentlySent(focusAlert.id)) {
    await sendAlert(focusAlert)
    markSent(focusAlert.id)
  }

  // Weekly report — Sunday only
  const weeklyRep = await buildWeeklyReport()
  if (weeklyRep && !wasRecentlySent(weeklyRep.id)) {
    await sendAlert(weeklyRep)
    markSent(weeklyRep.id)
  }

  // Battery check
  const battAlert = await checkBattery()
  if (battAlert && !wasRecentlySent(battAlert.id)) {
    await sendAlert(battAlert)
    markSent(battAlert.id)
  }

  // Festival check (once on open)
  const festival = getUpcomingFestival()
  if (festival && !wasRecentlySent(festival.id)) {
    await sendAlert(festival)
    markSent(festival.id)
  }

  // Reminder check — fire due reminders
  try {
    const remStr = localStorage.getItem('jarvis_reminders_v2') || '[]'
    const rems: any[] = JSON.parse(remStr)
    const now = Date.now()
    let changed = false
    for (const r of rems) {
      if (!r.done && r.triggerTime <= now) {
        await sendAlert({
          id: `rem_fire_${r.id}`,
          type: 'morning',
          title: '⏰ ' + (r.title || 'Reminder'),
          body: r.title || r.text || 'Reminder time!',
          witty: false,
        })
        if (!r.repeat || r.repeat === 'none') r.done = true
        else {
          const interval = r.repeat === 'daily' ? 86400000 : 604800000
          r.triggerTime += interval
        }
        changed = true
      }
    }
    if (changed) localStorage.setItem('jarvis_reminders_v2', JSON.stringify(rems))
  } catch {}
}

// Festival data
function getUpcomingFestival(): ProactiveAlert | null {
  const today = new Date()
  const m = today.getMonth() + 1
  const d = today.getDate()
  const festivals = [
    { month:1, day:26, name:'गणतंत्र दिवस', emoji:'🇮🇳' },
    { month:3, day:8,  name:'होली', emoji:'🎨' },
    { month:8, day:15, name:'स्वतंत्रता दिवस', emoji:'🇮🇳' },
    { month:10, day:12, name:'दशहरा', emoji:'🏹' },
    { month:11, day:1,  name:'दीवाली', emoji:'🪔' },
  ]
  for (const f of festivals) {
    const diff = (f.month - m) * 30 + (f.day - d)
    if (diff >= 0 && diff <= 2) {
      return { id:`fest_${f.name}`, type:'health', title:`${f.emoji} ${f.name} ${diff===0?'aaj hai!':'aa raha hai!'}`, body:`${diff===0?'Aaj':'Kal'} ${f.name} — tyohaar ka mazaa lo ${diff===0?'🎉':'(ready ho jao)'}`, witty:true }
    }
  }
  return null
}


// ════════════════════════════════════════════════════════
// WEEKLY REPORT — Har Sunday ek summary push
// Pure IndexedDB data — zero API cost
// ════════════════════════════════════════════════════════
async function buildWeeklyReport(): Promise<ProactiveAlert | null> {
  const today = new Date()
  if (today.getDay() !== 0) return null  // Sunday only
  const reportKey = 'weekly_report_' + today.toDateString()
  if (wasRecentlySent(reportKey)) return null

  try {
    // Read all chats from IndexedDB
    const allData: any[] = await new Promise(resolve => {
      try {
        const req = indexedDB.open('jarvis_v10', 1)
        req.onsuccess = () => {
          const db = req.result
          if (!db.objectStoreNames.contains('chats')) { resolve([]); return }
          const allReq = db.transaction('chats','readonly').objectStore('chats').getAll()
          allReq.onsuccess = () => resolve(allReq.result || [])
          allReq.onerror = () => resolve([])
        }
        req.onerror = () => resolve([])
      } catch { resolve([]) }
    })

    // Last 7 days
    const weekAgo = Date.now() - 7 * 86400000
    let totalMsgs = 0
    let userMsgs = 0
    const topicCount: Record<string,number> = {}

    allData.forEach((chat: any) => {
      if (!chat.id?.startsWith('chat_')) return
      const msgs: any[] = chat.data || []
      msgs.forEach((m: any) => {
        const ts = m.timestamp || m.ts || 0
        if (ts < weekAgo) return
        totalMsgs++
        if (m.role === 'user') {
          userMsgs++
          const text = (m.content || '').toLowerCase()
          if (text.match(/code|bug|function|react/)) topicCount['coding'] = (topicCount['coding']||0)+1
          if (text.match(/study|padhai|exam|mcq/))   topicCount['study'] = (topicCount['study']||0)+1
          if (text.match(/weather|mausam/))           topicCount['weather'] = (topicCount['weather']||0)+1
          if (text.match(/image|banao|generate/))     topicCount['images'] = (topicCount['images']||0)+1
          if (text.match(/remind|alarm|set/))         topicCount['reminders'] = (topicCount['reminders']||0)+1
        }
      })
    })

    if (userMsgs < 3) return null

    const topTopics = Object.entries(topicCount)
      .sort((a,b) => b[1]-a[1])
      .slice(0,3)
      .map(([t]) => t)
      .join(', ')

    const remCount = (() => {
      try {
        const rems: any[] = JSON.parse(localStorage.getItem('jarvis_reminders_v2') || '[]')
        return rems.filter((r: any) => r.createdAt > weekAgo).length
      } catch { return 0 }
    })()

    const name = await getProfileName()
    return {
      id: reportKey,
      type: 'summary',
      title: '📊 ' + name + ' bhai — Weekly Report',
      body: 'Is hafte: ' + userMsgs + ' messages · ' + remCount + ' reminders · Focus: ' + (topTopics || 'general') + '. Solid week!',
      url: '/',
      witty: true,
    }
  } catch { return null }
}

export function initProactiveEngine(city: string, chatId: string) {
  if (typeof window === 'undefined') return

  // Run immediately on app open
  setTimeout(() => runChecks(city, chatId), 3000)

  // Run every 60 seconds (battery-safe interval)
  const intervalId = setInterval(() => {
    if (document.visibilityState === 'visible') {
      runChecks(city, chatId)
    }
  }, 60000)

  // Run on visibility restore (tab switch back)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      runChecks(city, chatId)
    }
  })

  return () => clearInterval(intervalId)  // cleanup
}
