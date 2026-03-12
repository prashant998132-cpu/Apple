// lib/automation/reminders.ts — Smart Natural Language Reminders
// "Kal subah 7 baje yaad dilana" → parse → store → push notification

export interface Reminder {
  id: string
  text: string           // original user message
  title: string          // what to remind
  triggerTime: number    // epoch ms
  repeat?: 'daily' | 'weekly' | 'none'
  done: boolean
  createdAt: number
}

const STORE_KEY = 'jarvis_reminders_v2'

// ── Storage ──────────────────────────────────────────────────

export function getReminders(): Reminder[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]')
  } catch { return [] }
}

export function saveReminders(list: Reminder[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list))
}

export function addReminder(r: Reminder) {
  const list = getReminders()
  list.push(r)
  saveReminders(list)
}

export function deleteReminder(id: string) {
  saveReminders(getReminders().filter(r => r.id !== id))
}

export function markDone(id: string) {
  const list = getReminders()
  const idx = list.findIndex(r => r.id === id)
  if (idx >= 0) {
    if (list[idx].repeat === 'none' || !list[idx].repeat) {
      list[idx].done = true
    } else {
      // Reschedule for next occurrence
      const interval = list[idx].repeat === 'daily' ? 86400000 : 604800000
      list[idx].triggerTime += interval
    }
    saveReminders(list)
  }
}

export function getDueReminders(): Reminder[] {
  const now = Date.now()
  return getReminders().filter(r => !r.done && r.triggerTime <= now)
}

export function getPendingReminders(): Reminder[] {
  const now = Date.now()
  return getReminders().filter(r => !r.done && r.triggerTime > now)
    .sort((a, b) => a.triggerTime - b.triggerTime)
}

// ── Natural Language Parser ──────────────────────────────────

export function parseReminder(msg: string): Reminder | null {
  const m = msg.toLowerCase()
  
  // Must contain reminder intent
  const isReminder = m.match(/remind|yaad dila|alarm|alert|bata dena|mat bhoolna|bhool mat|notify|notification|set.*reminder/)
  if (!isReminder) return null

  // Extract "what to remind" — text after remind/yaad/etc
  const whatMatch = msg.match(/(?:remind(?:er)?(?:\s+me)?|yaad dila(?:na)?|bata dena)(?:\s+(?:ki|ke|that|to|about))?\s*(.+?)(?:\s+(?:kal|aaj|subah|sham|raat|at|baje|pm|am|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d))/i)
  const what = whatMatch?.[1]?.trim() || extractWhat(msg)

  // Parse time
  const triggerTime = parseTime(m)
  if (!triggerTime) return null

  // Detect repeat
  let repeat: 'daily' | 'weekly' | 'none' = 'none'
  if (m.match(/roz|daily|har din|every day/)) repeat = 'daily'
  if (m.match(/weekly|har hafte|every week/)) repeat = 'weekly'

  return {
    id: `rem_${Date.now()}`,
    text: msg,
    title: what || 'Reminder',
    triggerTime,
    repeat,
    done: false,
    createdAt: Date.now(),
  }
}

function extractWhat(msg: string): string {
  // Remove time expressions and reminder keywords to get the core task
  return msg
    .replace(/(?:remind me|remind|yaad dila(?:na)?|bata dena|mat bhoolna|bhool mat)\s*/gi, '')
    .replace(/(?:kal|aaj|subah|sham|raat)\s*/gi, '')
    .replace(/\d{1,2}(?::\d{2})?\s*(?:am|pm|baje)/gi, '')
    .replace(/(?:tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi, '')
    .replace(/(?:ki|ke|that|to|about|at)\s*/gi, '')
    .trim()
    .slice(0, 80)
}

function parseTime(m: string): number | null {
  const now = new Date()
  const IST_OFFSET = 5.5 * 60 * 60 * 1000
  const istNow = new Date(now.getTime() + IST_OFFSET)
  
  let targetDate = new Date(istNow)
  let hourSet = false

  // Tomorrow / kal
  if (m.match(/\bkal\b|tomorrow/)) {
    targetDate.setDate(targetDate.getDate() + 1)
  }

  // Day of week
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const sundays = ['ravi','somvar','mangal','budh','brihaspati','shukra','shanivar']
  for (let i = 0; i < days.length; i++) {
    if (m.includes(days[i])) {
      const diff = (i - istNow.getDay() + 7) % 7 || 7
      targetDate.setDate(targetDate.getDate() + diff)
      break
    }
  }

  // Time: "7 baje" / "7:30 baje" / "7 am" / "7 pm" / "19:00"
  const timeMatch = m.match(/(\d{1,2})(?::(\d{2}))?\s*(?:baje|am|pm|:00)?/)
  if (timeMatch) {
    let hour = parseInt(timeMatch[1])
    const min = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    
    // PM conversion
    if (m.includes('pm') || m.includes('sham') || m.includes('raat')) {
      if (hour < 12) hour += 12
    }
    // AM / morning
    if (m.includes('am') || m.includes('subah')) {
      if (hour === 12) hour = 0
    }
    // "baje" — if hour <= 6 it's ambiguous, check context
    if (m.includes('baje') && !m.includes('subah') && !m.includes('sham') && !m.includes('raat')) {
      if (hour >= 1 && hour <= 6) hour += 12  // assume PM for 1-6 baje
      if (hour === 7 || hour === 8 || hour === 9) hour = hour  // morning assumed
    }

    targetDate.setHours(hour, min, 0, 0)
    hourSet = true
  }

  // If no time set, default to next minute (immediate-ish)
  if (!hourSet) {
    targetDate = new Date(istNow.getTime() + 60000)
  }

  // Convert IST back to UTC epoch
  const epoch = targetDate.getTime() - IST_OFFSET

  // Must be in future
  if (epoch <= Date.now()) {
    // Add 1 day if time already passed today
    return epoch + 86400000
  }
  return epoch
}

// ── Check due reminders — called by page.tsx interval ────────

export function checkAndFireReminders(onFire: (r: Reminder) => void) {
  const due = getDueReminders()
  for (const r of due) {
    onFire(r)
    markDone(r.id)
  }
}

// ── Format reminder for display ─────────────────────────────

export function formatReminderTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = ts - Date.now()
  
  if (diff < 3600000) return `${Math.round(diff / 60000)} min mein`
  if (diff < 86400000) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  if (diff < 172800000) return `Kal ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
}
