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
  type:  'morning' | 'health' | 'weather' | 'habit' | 'summary' | 'festival' | 'battery' | 'focus'
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
          vibrate: [200, 100, 200],  // haptic pattern
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
