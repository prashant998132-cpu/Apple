// lib/xp.ts — JARVIS XP System
// Import awardXP in any page to give user XP for actions
// Usage: import { awardXP } from '../../lib/xp'
//        awardXP('water_goal_hit')

export const XP_ACTIONS: Record<string, { xp: number; icon: string; label: string; cat: string }> = {
  chat_message:    { xp: 2,   icon: '💬', label: 'Chat message',      cat: 'AI'      },
  voice_used:      { xp: 5,   icon: '🎙️', label: 'Voice used',        cat: 'AI'      },
  photo_analyzed:  { xp: 8,   icon: '📸', label: 'Photo analyzed',    cat: 'AI'      },
  image_generated: { xp: 5,   icon: '🎨', label: 'Image generated',   cat: 'AI'      },
  study_session:   { xp: 10,  icon: '📚', label: 'Study session',      cat: 'Study'   },
  flashcard_done:  { xp: 3,   icon: '🗂️', label: 'Flashcard done',    cat: 'Study'   },
  goal_created:    { xp: 15,  icon: '🎯', label: 'Goal created',       cat: 'Goals'   },
  goal_daily_done: { xp: 20,  icon: '✅', label: 'Daily goal done',    cat: 'Goals'   },
  streak_7:        { xp: 50,  icon: '🔥', label: '7-day streak',        cat: 'Goals'   },
  streak_30:       { xp: 200, icon: '💥', label: '30-day streak',       cat: 'Goals'   },
  water_goal_hit:  { xp: 10,  icon: '💧', label: 'Water goal hit',     cat: 'Health'  },
  mood_logged:     { xp: 5,   icon: '🧠', label: 'Mood logged',         cat: 'Health'  },
  sleep_logged:    { xp: 5,   icon: '😴', label: 'Sleep logged',        cat: 'Health'  },
  steps_goal_hit:  { xp: 15,  icon: '👟', label: 'Steps goal hit',      cat: 'Health'  },
  med_taken:       { xp: 8,   icon: '💊', label: 'Medicine taken',      cat: 'Health'  },
  expense_added:   { xp: 3,   icon: '💰', label: 'Expense tracked',     cat: 'Finance' },
  budget_ontrack:  { xp: 20,  icon: '✅', label: 'Month under budget',  cat: 'Finance' },
  writing_done:    { xp: 8,   icon: '✍️', label: 'Writing generated',  cat: 'Write'   },
  tool_used:       { xp: 3,   icon: '🧮', label: 'Tool used',           cat: 'Tools'   },
  india_lookup:    { xp: 4,   icon: '🇮🇳', label: 'India lookup',      cat: 'India'   },
  brief_generated: { xp: 5,   icon: '⚡', label: 'Brief generated',    cat: 'Brief'   },
}

export function awardXP(action: keyof typeof XP_ACTIONS, count = 1): number {
  if (typeof window === 'undefined') return 0
  try {
    const actionData = XP_ACTIONS[action]
    if (!actionData) return 0

    const earned = actionData.xp * count
    const raw = localStorage.getItem('j_xp_stats')
    const stats: Record<string, number> = raw ? JSON.parse(raw) : {}

    stats.total_xp = (stats.total_xp || 0) + earned
    stats[action as string] = (stats[action as string] || 0) + count

    const todayKey = new Date().toDateString()
    if (localStorage.getItem('j_xp_today_key') !== todayKey) {
      stats.today_xp = 0
      stats.days_active = (stats.days_active || 0) + 1
      localStorage.setItem('j_xp_today_key', todayKey)
    }
    stats.today_xp = (stats.today_xp || 0) + earned

    localStorage.setItem('j_xp_stats', JSON.stringify(stats))
    return earned
  } catch { return 0 }
}

export function getTotalXP(): number {
  try {
    const s = JSON.parse(localStorage.getItem('j_xp_stats') || '{}')
    return s.total_xp || 0
  } catch { return 0 }
}

export function getLevel(xp: number): { level: number; title: string; color: string; icon: string } {
  const levels = [
    { level: 1,  xp: 0,    title: 'Naya User',     color: '#8d6e63', icon: '🌱' },
    { level: 2,  xp: 50,   title: 'Curious Human', color: '#78909c', icon: '👀' },
    { level: 3,  xp: 150,  title: 'Regular User',  color: '#42a5f5', icon: '💙' },
    { level: 4,  xp: 300,  title: 'Power User',    color: '#66bb6a', icon: '⚡' },
    { level: 5,  xp: 500,  title: 'JARVIS Fan',    color: '#ffca28', icon: '⭐' },
    { level: 6,  xp: 750,  title: 'Tech Wizard',   color: '#ab47bc', icon: '🔮' },
    { level: 7,  xp: 1100, title: 'Grind God',     color: '#ef5350', icon: '🔥' },
    { level: 8,  xp: 1600, title: 'JARVIS Addict', color: '#ff7043', icon: '🤖' },
    { level: 9,  xp: 2200, title: 'Life OS Master',color: '#00e676', icon: '🌟' },
    { level: 10, xp: 3000, title: 'TONY STARK',    color: '#00e5ff', icon: '🦾' },
  ]
  let cur = levels[0]
  for (const l of levels) { if (xp >= l.xp) cur = l }
  return cur
}
