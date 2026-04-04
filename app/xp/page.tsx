'use client'
// /xp — JARVIS Gamification Hub
// XP system across ALL features. localStorage mein track hota hai.
// Har feature use = XP. Levels, badges, streaks.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/shared/Sidebar'

const C = {
  bg: '#030a14', surface: '#070e1c', border: 'rgba(255,255,255,0.07)',
  text: '#c8dff0', dim: '#3a5a7a', gold: '#ffd600', green: '#00e676',
  blue: '#40c4ff', purple: '#b388ff', red: '#ff5252', orange: '#ff9800',
}

// XP values per action
export const XP_ACTIONS: Record<string, { xp: number; icon: string; label: string; cat: string }> = {
  chat_message:     { xp: 2,  icon: '💬', label: 'Chat message',       cat: 'AI' },
  voice_used:       { xp: 5,  icon: '🎙️', label: 'Voice used',         cat: 'AI' },
  photo_analyzed:   { xp: 8,  icon: '📸', label: 'Photo analyzed',     cat: 'AI' },
  image_generated:  { xp: 5,  icon: '🎨', label: 'Image generated',    cat: 'AI' },
  study_session:    { xp: 10, icon: '📚', label: 'Study session',       cat: 'Study' },
  flashcard_done:   { xp: 3,  icon: '🗂️', label: 'Flashcard done',     cat: 'Study' },
  goal_created:     { xp: 15, icon: '🎯', label: 'Goal created',        cat: 'Goals' },
  goal_daily_done:  { xp: 20, icon: '✅', label: 'Daily goal done',     cat: 'Goals' },
  streak_7:         { xp: 50, icon: '🔥', label: '7-day streak',         cat: 'Goals' },
  streak_30:        { xp: 200,icon: '💥', label: '30-day streak',        cat: 'Goals' },
  water_goal_hit:   { xp: 10, icon: '💧', label: 'Water goal hit',      cat: 'Health' },
  mood_logged:      { xp: 5,  icon: '🧠', label: 'Mood logged',          cat: 'Health' },
  sleep_logged:     { xp: 5,  icon: '😴', label: 'Sleep logged',         cat: 'Health' },
  steps_goal_hit:   { xp: 15, icon: '👟', label: 'Steps goal hit',       cat: 'Health' },
  med_taken:        { xp: 8,  icon: '💊', label: 'Medicine taken',       cat: 'Health' },
  expense_added:    { xp: 3,  icon: '💰', label: 'Expense tracked',      cat: 'Finance' },
  budget_ontrack:   { xp: 20, icon: '✅', label: 'Month under budget',   cat: 'Finance' },
  writing_done:     { xp: 8,  icon: '✍️', label: 'Writing generated',   cat: 'Write' },
  tool_used:        { xp: 3,  icon: '🧮', label: 'Tool used',            cat: 'Tools' },
  india_lookup:     { xp: 4,  icon: '🇮🇳', label: 'India lookup',       cat: 'India' },
  brief_generated:  { xp: 5,  icon: '⚡', label: 'Brief generated',     cat: 'Brief' },
  setting_changed:  { xp: 2,  icon: '⚙️', label: 'Setting changed',     cat: 'System' },
}

// LEVELS
const LEVELS = [
  { level: 1,  xp: 0,     title: 'Naya User',      color: '#8d6e63',  icon: '🌱' },
  { level: 2,  xp: 50,    title: 'Curious Human',  color: '#78909c',  icon: '👀' },
  { level: 3,  xp: 150,   title: 'Regular User',   color: '#42a5f5',  icon: '💙' },
  { level: 4,  xp: 300,   title: 'Power User',     color: '#66bb6a',  icon: '⚡' },
  { level: 5,  xp: 500,   title: 'JARVIS Fan',     color: '#ffca28',  icon: '⭐' },
  { level: 6,  xp: 750,   title: 'Tech Wizard',    color: '#ab47bc',  icon: '🔮' },
  { level: 7,  xp: 1100,  title: 'Grind God',      color: '#ef5350',  icon: '🔥' },
  { level: 8,  xp: 1600,  title: 'JARVIS Addict',  color: '#ff7043',  icon: '🤖' },
  { level: 9,  xp: 2200,  title: 'Life OS Master', color: '#00e676',  icon: '🌟' },
  { level: 10, xp: 3000,  title: 'TONY STARK',     color: '#00e5ff',  icon: '🦾' },
]

// BADGES
const BADGES = [
  { id: 'first_chat',   icon: '💬', label: 'First Chat',      desc: 'Pehla message bheja',           xp: 10,  color: C.blue,   check: (s: Stats) => s.chat_message >= 1 },
  { id: 'chatty',       icon: '🗣️', label: 'Chatty',          desc: '100 messages bheje',            xp: 30,  color: C.blue,   check: (s: Stats) => s.chat_message >= 100 },
  { id: 'voice_init',   icon: '🎙️', label: 'Voice Init',      desc: 'Pehli baar voice use ki',       xp: 20,  color: C.purple, check: (s: Stats) => s.voice_used >= 1 },
  { id: 'photo_snap',   icon: '📸', label: 'Photo Snap',      desc: 'Pehli photo analyze ki',        xp: 20,  color: C.gold,   check: (s: Stats) => s.photo_analyzed >= 1 },
  { id: 'artist',       icon: '🎨', label: 'Artist',          desc: '10 images generate ki',         xp: 25,  color: '#f472b6',check: (s: Stats) => s.image_generated >= 10 },
  { id: 'scholar',      icon: '📚', label: 'Scholar',         desc: '10 study sessions',             xp: 40,  color: C.green,  check: (s: Stats) => s.study_session >= 10 },
  { id: 'goal_setter',  icon: '🎯', label: 'Goal Setter',     desc: '3 goals banaye',                xp: 30,  color: C.gold,   check: (s: Stats) => s.goal_created >= 3 },
  { id: 'streak_king',  icon: '🔥', label: 'Streak King',     desc: '7 din ka streak',               xp: 50,  color: C.orange, check: (s: Stats) => s.streak_7 >= 1 },
  { id: 'hydrated',     icon: '💧', label: 'Hydrated',        desc: '7 baar water goal hit ki',      xp: 30,  color: C.blue,   check: (s: Stats) => s.water_goal_hit >= 7 },
  { id: 'mood_aware',   icon: '🧠', label: 'Mood Aware',      desc: '14 baar mood log kiya',         xp: 25,  color: C.purple, check: (s: Stats) => s.mood_logged >= 14 },
  { id: 'health_freak', icon: '💪', label: 'Health Freak',    desc: '5 baar steps goal hit kiya',    xp: 40,  color: C.green,  check: (s: Stats) => s.steps_goal_hit >= 5 },
  { id: 'pill_popper',  icon: '💊', label: 'Medicine Hero',   desc: '21 baar medicine time pe li',   xp: 35,  color: C.gold,   check: (s: Stats) => s.med_taken >= 21 },
  { id: 'accountant',   icon: '💰', label: 'Accountant',      desc: '30 expenses track ki',          xp: 30,  color: C.gold,   check: (s: Stats) => s.expense_added >= 30 },
  { id: 'writer',       icon: '✍️', label: 'Writer',          desc: '20 writings generate ki',       xp: 35,  color: C.blue,   check: (s: Stats) => s.writing_done >= 20 },
  { id: 'tool_master',  icon: '🧮', label: 'Tool Master',     desc: '50 baar tools use ki',          xp: 25,  color: C.purple, check: (s: Stats) => s.tool_used >= 50 },
  { id: 'tony',         icon: '🦾', label: 'Tony Stark',      desc: 'Level 10 reach kiya',           xp: 200, color: C.blue,   check: (s: Stats) => s.total_xp >= 3000 },
]

interface Stats {
  [key: string]: number
  total_xp: number
  today_xp: number
  days_active: number
}

function loadStats(): Stats {
  try {
    const s = JSON.parse(localStorage.getItem('j_xp_stats') || '{}')
    return { total_xp: 0, today_xp: 0, days_active: 1, ...s }
  } catch { return { total_xp: 0, today_xp: 0, days_active: 1 } }
}

// Export this for other pages to call
export function awardXP(action: keyof typeof XP_ACTIONS, count = 1) {
  if (typeof window === 'undefined') return
  try {
    const stats = JSON.parse(localStorage.getItem('j_xp_stats') || '{}') as Stats
    const actionData = XP_ACTIONS[action]
    if (!actionData) return
    const earned = actionData.xp * count
    stats.total_xp = (stats.total_xp || 0) + earned
    stats[action] = (stats[action] || 0) + count
    const todayKey = new Date().toDateString()
    if (localStorage.getItem('j_xp_today_key') !== todayKey) {
      stats.today_xp = 0
      localStorage.setItem('j_xp_today_key', todayKey)
      stats.days_active = (stats.days_active || 0) + 1
    }
    stats.today_xp = (stats.today_xp || 0) + earned
    localStorage.setItem('j_xp_stats', JSON.stringify(stats))
  } catch {}
}

function getLevel(xp: number) {
  let current = LEVELS[0]
  for (const l of LEVELS) { if (xp >= l.xp) current = l }
  return current
}

function getNextLevel(xp: number) {
  for (const l of LEVELS) { if (xp < l.xp) return l }
  return null
}

export default function XPPage() {
  const [sidebar, setSidebar] = useState(false)
  const [stats, setStats] = useState<Stats>({ total_xp: 0, today_xp: 0, days_active: 1 })
  const [tab, setTab] = useState<'overview' | 'badges' | 'actions'>('overview')

  useEffect(() => { setStats(loadStats()) }, [])

  const level = getLevel(stats.total_xp)
  const nextLevel = getNextLevel(stats.total_xp)
  const xpIntoLevel = stats.total_xp - level.xp
  const xpForNext = nextLevel ? nextLevel.xp - level.xp : 0
  const levelPct = nextLevel ? (xpIntoLevel / xpForNext) * 100 : 100

  const earnedBadges = BADGES.filter(b => b.check(stats))
  const lockedBadges = BADGES.filter(b => !b.check(stats))

  const S = {
    card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10 } as React.CSSProperties,
    label: { fontSize: 9, color: C.dim, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 8 },
  }

  // Simulate earning XP for demo
  function demoEarn(action: string) {
    awardXP(action as keyof typeof XP_ACTIONS)
    setStats(loadStats())
  }

  const catColors: Record<string, string> = {
    'AI': C.blue, 'Study': C.green, 'Goals': C.gold, 'Health': '#66bb6a',
    'Finance': C.gold, 'Write': C.blue, 'Tools': C.purple, 'India': C.orange, 'Brief': C.gold, 'System': C.dim,
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, fontFamily: "'Inter','Noto Sans Devanagari',sans-serif", paddingTop: 48, paddingBottom: 80 }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 48, background: 'rgba(3,10,20,.96)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 14px 0 58px', backdropFilter: 'blur(10px)' }}>
        <span style={{ fontSize: 13, color: C.gold, letterSpacing: 1, fontWeight: 700 }}>🎮 JARVIS XP</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: level.color, fontWeight: 700 }}>{level.icon} {level.title}</span>
      </header>
      <button onClick={() => setSidebar(true)} style={{ position: 'fixed', top: 10, left: 14, zIndex: 51, background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: 6, borderRadius: 6, fontSize: 18 }}>☰</button>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '14px 14px' }}>

        {/* Level card */}
        <div style={{ ...S.card, background: `linear-gradient(135deg, ${level.color}0a 0%, rgba(7,14,28,0) 100%)`, borderColor: `${level.color}25`, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 52, lineHeight: 1 }}>{level.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 2, marginBottom: 2 }}>LEVEL {level.level}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: level.color }}>{level.title}</div>
              <div style={{ fontSize: 12, color: C.dim }}>{stats.total_xp.toLocaleString()} XP total</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: C.dim }}>Today</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.gold }}>+{stats.today_xp}</div>
              <div style={{ fontSize: 9, color: C.dim }}>XP</div>
            </div>
          </div>
          {/* XP bar */}
          {nextLevel ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.dim, marginBottom: 5 }}>
                <span>Level {level.level}</span>
                <span>{xpIntoLevel}/{xpForNext} XP → Level {nextLevel.level}</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: `${level.color}18`, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${levelPct}%`, background: level.color, borderRadius: 4, transition: 'width 1s ease' }} />
              </div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 5 }}>
                {nextLevel.xp - stats.total_xp} XP chahiye "{nextLevel.title}" ke liye
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: C.gold, textAlign: 'center', padding: '6px 0' }}>🦾 MAX LEVEL REACHED — Tony Stark ban gaye!</div>
          )}
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Total XP', value: stats.total_xp.toLocaleString(), color: C.gold, icon: '⚡' },
            { label: 'Badges', value: `${earnedBadges.length}/${BADGES.length}`, color: C.purple, icon: '🏅' },
            { label: 'Days Active', value: stats.days_active, color: C.green, icon: '📅' },
          ].map(s => (
            <div key={s.label} style={{ ...S.card, marginBottom: 0, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: C.dim }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['overview', 'badges', 'actions'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 11, cursor: 'pointer', background: tab === t ? 'rgba(255,214,0,.1)' : C.surface, border: `1px solid ${tab === t ? 'rgba(255,214,0,.3)' : C.border}`, color: tab === t ? C.gold : C.dim, fontWeight: tab === t ? 700 : 400, textTransform: 'capitalize' }}>
              {t === 'overview' ? '📊 Overview' : t === 'badges' ? '🏅 Badges' : '⚡ Actions'}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            {/* Top actions this session */}
            <div style={S.card}>
              <div style={S.label}>MERI ACTIVITY BREAKDOWN</div>
              {Object.entries(XP_ACTIONS)
                .filter(([key]) => (stats[key] || 0) > 0)
                .sort(([,a],[,b]) => (stats[b.label] || 0) - (stats[a.label] || 0))
                .slice(0, 8)
                .map(([key, action]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 18, width: 26, textAlign: 'center', flexShrink: 0 }}>{action.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: C.text }}>{action.label}</div>
                      <div style={{ fontSize: 10, color: C.dim }}>{action.xp} XP each</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, color: catColors[action.cat] || C.text, fontWeight: 700 }}>{stats[key] || 0}×</div>
                      <div style={{ fontSize: 9, color: C.dim }}>+{(stats[key] || 0) * action.xp} XP</div>
                    </div>
                  </div>
                ))}
              {Object.entries(XP_ACTIONS).filter(([key]) => (stats[key] || 0) > 0).length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: C.dim, fontSize: 12 }}>
                  Abhi tak koi activity nahi! JARVIS use karo, XP milega.
                </div>
              )}
            </div>

            {/* Recent badges earned */}
            {earnedBadges.length > 0 && (
              <div style={S.card}>
                <div style={S.label}>RECENTLY EARNED 🏅</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {earnedBadges.slice(0, 6).map(b => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 10, background: `${b.color}12`, border: `1px solid ${b.color}30` }}>
                      <span style={{ fontSize: 18 }}>{b.icon}</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: b.color }}>{b.label}</div>
                        <div style={{ fontSize: 9, color: C.dim }}>+{b.xp} XP</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* BADGES */}
        {tab === 'badges' && (
          <>
            {earnedBadges.length > 0 && (
              <div style={S.card}>
                <div style={S.label}>✅ EARNED — {earnedBadges.length}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {earnedBadges.map(b => (
                    <div key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 10px', borderRadius: 10, background: `${b.color}08`, border: `1px solid ${b.color}20` }}>
                      <span style={{ fontSize: 26, flexShrink: 0 }}>{b.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: b.color }}>{b.label}</div>
                        <div style={{ fontSize: 10, color: C.dim }}>{b.desc}</div>
                      </div>
                      <div style={{ fontSize: 11, color: b.color, fontWeight: 700, flexShrink: 0 }}>+{b.xp} XP</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {lockedBadges.length > 0 && (
              <div style={S.card}>
                <div style={S.label}>🔒 LOCKED — {lockedBadges.length}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {lockedBadges.map(b => (
                    <div key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 26, opacity: 0.3, flexShrink: 0 }}>🔒</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: C.dim }}>{b.label}</div>
                        <div style={{ fontSize: 10, color: C.dim, opacity: 0.6 }}>{b.desc}</div>
                      </div>
                      <div style={{ fontSize: 11, color: C.dim, flexShrink: 0 }}>+{b.xp} XP</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ACTIONS — XP guide */}
        {tab === 'actions' && (
          <div style={S.card}>
            <div style={S.label}>XP KAISE MILTA HAI</div>
            {Object.entries(
              Object.entries(XP_ACTIONS).reduce((acc, [key, val]) => {
                if (!acc[val.cat]) acc[val.cat] = []
                acc[val.cat].push({ key, ...val })
                return acc
              }, {} as Record<string, any[]>)
            ).map(([cat, actions]) => (
              <div key={cat} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: catColors[cat] || C.dim, letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>{cat.toUpperCase()}</div>
                {actions.map(a => (
                  <div key={a.key} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '5px 0' }}>
                    <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{a.icon}</span>
                    <div style={{ flex: 1, fontSize: 12, color: C.text }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: catColors[cat] || C.gold, fontWeight: 700, flexShrink: 0 }}>+{a.xp} XP</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

      </div>
      <Sidebar isOpen={sidebar} onClose={() => setSidebar(false)} />
    </div>
  )
}
