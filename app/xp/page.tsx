'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const LEVELS = [
  { lvl: 1,  name: 'Rookie',       xp: 0,    color: '#94a3b8', icon: '🌱' },
  { lvl: 2,  name: 'Explorer',     xp: 100,  color: '#34d399', icon: '🧭' },
  { lvl: 3,  name: 'Thinker',      xp: 250,  color: '#60a5fa', icon: '💭' },
  { lvl: 4,  name: 'Builder',      xp: 500,  color: '#a78bfa', icon: '⚒️' },
  { lvl: 5,  name: 'Achiever',     xp: 800,  color: '#f9a8d4', icon: '🎯' },
  { lvl: 6,  name: 'Master',       xp: 1200, color: '#fbbf24', icon: '🏆' },
  { lvl: 7,  name: 'Champion',     xp: 1800, color: '#f87171', icon: '⚡' },
  { lvl: 8,  name: 'Legend',       xp: 2500, color: '#00e5ff', icon: '👑' },
  { lvl: 9,  name: 'JARVIS Elite', xp: 3500, color: '#ff9800', icon: '🌟' },
  { lvl: 10, name: 'Omniscient',   xp: 5000, color: '#fff',   icon: '🔱' },
]

const BADGES = [
  { id: 'first_chat',   name: 'First Chat',     desc: 'Pehla message bheja',    icon: '💬', xp: 10 },
  { id: 'streak_3',     name: '3-Day Streak',   desc: '3 din lagaataar use',    icon: '🔥', xp: 50 },
  { id: 'streak_7',     name: 'Week Warrior',   desc: '7 din streak!',          icon: '⚡', xp: 100 },
  { id: 'image_gen',    name: 'Artist',         desc: 'Pehla image banaya',     icon: '🎨', xp: 25 },
  { id: 'luna_chat',    name: 'Luna Bestie',    desc: 'Luna se baat ki',        icon: '🌸', xp: 30 },
  { id: 'era_write',    name: 'Wordsmith',      desc: 'Era se likha',           icon: '✍️', xp: 30 },
  { id: 'voice_used',   name: 'Voice User',     desc: 'Voice se baat ki',       icon: '🎙️', xp: 25 },
  { id: 'habit_streak', name: 'Habit Master',   desc: '7-day habit streak',     icon: '💪', xp: 75 },
  { id: 'todo_done',    name: 'Task Slayer',    desc: '10 todos complete kiye', icon: '✅', xp: 40 },
  { id: 'focus_done',   name: 'Deep Worker',    desc: 'Focus session complete', icon: '🎯', xp: 35 },
  { id: 'study_quiz',   name: 'Scholar',        desc: 'Quiz attempt kiya',      icon: '📚', xp: 30 },
  { id: 'night_owl',    name: 'Night Owl',      desc: 'Raat ko 12 ke baad use', icon: '🦉', xp: 20 },
]

const DAILY = [
  { id: 'd1', task: 'JARVIS se 3 messages karo',       xp: 30,  icon: '💬', key: 'j_msgs_v5' },
  { id: 'd2', task: 'Ek habit complete karo',           xp: 25,  icon: '💪', key: 'jarvis_habits_v1' },
  { id: 'd3', task: 'Mood track karo',                  xp: 20,  icon: '😊', key: 'jarvis_mood_v1' },
  { id: 'd4', task: 'Ek Pomodoro session karo',         xp: 35,  icon: '⏱️', key: 'jarvis_timer_sessions' },
  { id: 'd5', task: 'Ek note banao',                    xp: 15,  icon: '📝', key: 'jarvis_notes_v1' },
]

const XP_KEY = 'jarvis_xp'
const BADGES_KEY = 'jarvis_badges'

function getXP(): number { try { return parseInt(localStorage.getItem(XP_KEY)||'0') } catch { return 0 } }
function getBadges(): string[] { try { return JSON.parse(localStorage.getItem(BADGES_KEY)||'[]') } catch { return [] } }
function getLevel(xp: number) {
  return [...LEVELS].reverse().find(l => xp >= l.xp) || LEVELS[0]
}
function getNextLevel(xp: number) {
  return LEVELS.find(l => xp < l.xp) || null
}

export default function XPPage() {
  const [xp, setXp] = useState(0)
  const [earnedBadges, setEarnedBadges] = useState<string[]>([])
  const [anim, setAnim] = useState<number | null>(null)
  const [tab, setTab] = useState<'overview'|'badges'|'daily'>('overview')

  useEffect(() => {
    setXp(getXP())
    setEarnedBadges(getBadges())
  }, [])

  function addXP(amount: number, badgeId?: string) {
    const newXp = xp + amount
    setXp(newXp)
    try { localStorage.setItem(XP_KEY, String(newXp)) } catch {}
    setAnim(amount)
    setTimeout(() => setAnim(null), 1500)
    if (badgeId && !earnedBadges.includes(badgeId)) {
      const nb = [...earnedBadges, badgeId]
      setEarnedBadges(nb)
      try { localStorage.setItem(BADGES_KEY, JSON.stringify(nb)) } catch {}
    }
  }

  function checkDailyProgress(task: typeof DAILY[0]): number {
    try {
      const data = localStorage.getItem(task.key)
      if (!data) return 0
      if (task.id === 'd1') { const msgs = JSON.parse(data); return Math.min(1, msgs.length >= 3 ? 1 : msgs.length/3) }
      if (task.id === 'd2') {
        const habits = JSON.parse(data)
        const today = new Date().toISOString().slice(0,10)
        const done = habits.filter((h: any) => h.completions?.includes(today)).length
        return habits.length > 0 ? Math.min(1, done/habits.length) : 0
      }
      if (task.id === 'd3') { const entries = JSON.parse(data); const today = new Date().toISOString().slice(0,10); return entries.some((e: any) => e.date === today) ? 1 : 0 }
      if (task.id === 'd4') { const s = parseInt(data); return s > 0 ? 1 : 0 }
      if (task.id === 'd5') { const n = JSON.parse(data); return n.length > 0 ? 1 : 0 }
    } catch {}
    return 0
  }

  const level = getLevel(xp)
  const nextLevel = getNextLevel(xp)
  const pct = nextLevel ? ((xp - level.xp) / (nextLevel.xp - level.xp)) * 100 : 100
  const totalBadgeXP = earnedBadges.reduce((s, id) => s + (BADGES.find(b => b.id === id)?.xp || 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#070d1a', color: '#ddeeff', fontFamily: "'Inter', sans-serif", padding: '0 0 80px' }}>
      <style>{`
        * { box-sizing: border-box }
        @keyframes fadeUp { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatUp { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-40px)} }
        @keyframes pulse { 0%,100%{opacity:0.7} 50%{opacity:1} }
        @keyframes shimmer { 0%,100%{opacity:0.7} 50%{opacity:1} }
      `}</style>

      {/* Header */}
      <div style={{ background: 'rgba(7,13,26,0.97)', borderBottom: '1px solid rgba(0,229,255,0.07)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)' }}>
        <Link href="/" style={{ color: '#2a5070', fontSize: '18px', textDecoration: 'none' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: level.color }}>🎮 {level.icon} {level.name}</div>
          <div style={{ fontSize: '11px', color: '#2a5070' }}>{xp} XP total</div>
        </div>
        {anim && (
          <div style={{ position: 'fixed', top: '60px', right: '20px', fontSize: '20px', fontWeight: 900, color: '#fbbf24', zIndex: 100, animation: 'floatUp 1.5s ease forwards' }}>
            +{anim} XP! ⚡
          </div>
        )}
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '14px' }}>
        {/* Level card */}
        <div style={{ background: `linear-gradient(135deg, ${level.color}12, ${level.color}06)`, border: `1px solid ${level.color}33`, borderRadius: '18px', padding: '20px', marginBottom: '16px', animation: 'fadeUp 0.2s ease', textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '8px', animation: 'shimmer 2s infinite' }}>{level.icon}</div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: level.color, marginBottom: '2px' }}>{level.name}</div>
          <div style={{ fontSize: '12px', color: '#2a5070', marginBottom: '16px' }}>Level {level.lvl} · {xp} XP</div>

          {/* XP bar */}
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', height: '10px', overflow: 'hidden', marginBottom: '6px' }}>
            <div style={{ height: '100%', background: `linear-gradient(90deg, ${level.color}, ${level.color}dd)`, borderRadius: '8px', width: pct + '%', transition: 'width 0.6s ease', boxShadow: `0 0 10px ${level.color}55` }} />
          </div>
          {nextLevel ? (
            <div style={{ fontSize: '11px', color: '#2a5070' }}>{xp} / {nextLevel.xp} XP → {nextLevel.icon} {nextLevel.name}</div>
          ) : (
            <div style={{ fontSize: '11px', color: level.color }}>MAX LEVEL ACHIEVED! 🔱</div>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '16px' }}>
          {[
            { label: 'Total XP', val: xp, color: '#00e5ff', icon: '⭐' },
            { label: 'Badges', val: earnedBadges.length + '/' + BADGES.length, color: '#fbbf24', icon: '🏅' },
            { label: 'Level', val: level.lvl, color: level.color, icon: level.icon },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(12,20,34,0.8)', border: `1px solid ${s.color}18`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: '9px', color: '#1e3248', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(12,20,34,0.7)', borderRadius: '10px', padding: '4px', marginBottom: '14px' }}>
          {(['overview','badges','daily'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 'none', background: tab === t ? 'rgba(0,229,255,0.1)' : 'transparent', color: tab === t ? '#00e5ff' : '#2a5070', fontSize: '11px', fontWeight: tab === t ? 700 : 400, cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'inherit', textTransform: 'capitalize' }}>
              {t === 'overview' ? '📊 Levels' : t === 'badges' ? '🏅 Badges' : '📅 Daily'}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'overview' && (
          <div>
            {LEVELS.map(l => {
              const isUnlocked = xp >= l.xp
              const isCurrent = l.lvl === level.lvl
              return (
                <div key={l.lvl} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', marginBottom: '6px', background: isCurrent ? `${l.color}12` : 'rgba(12,20,34,0.7)', border: `1px solid ${isCurrent ? l.color + '33' : 'rgba(255,255,255,0.04)'}`, borderRadius: '11px', opacity: isUnlocked ? 1 : 0.4 }}>
                  <div style={{ fontSize: '22px', width: '28px', textAlign: 'center' }}>{l.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: isCurrent ? 700 : 400, color: isCurrent ? l.color : '#7ca5c0' }}>{l.name} {isCurrent && '← YOU'}</div>
                    <div style={{ fontSize: '11px', color: '#1e3248' }}>Level {l.lvl} · {l.xp} XP</div>
                  </div>
                  {isUnlocked && <div style={{ fontSize: '12px', color: l.color }}>✓</div>}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'badges' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {BADGES.map(b => {
              const earned = earnedBadges.includes(b.id)
              return (
                <div key={b.id} style={{ background: earned ? 'rgba(251,191,36,0.08)' : 'rgba(12,20,34,0.8)', border: `1px solid ${earned ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.04)'}`, borderRadius: '12px', padding: '12px', opacity: earned ? 1 : 0.5, transition: 'all 0.2s' }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{earned ? b.icon : '🔒'}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: earned ? '#fbbf24' : '#4a7090', marginBottom: '2px' }}>{b.name}</div>
                  <div style={{ fontSize: '10px', color: '#1e3248', marginBottom: '5px' }}>{b.desc}</div>
                  <div style={{ fontSize: '10px', color: earned ? '#fbbf24' : '#1e3248', fontWeight: 600 }}>+{b.xp} XP</div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'daily' && (
          <div>
            <div style={{ fontSize: '12px', color: '#2a5070', marginBottom: '12px', fontWeight: 600 }}>📅 {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} ke challenges</div>
            {DAILY.map(d => {
              const prog = checkDailyProgress(d)
              const done = prog >= 1
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', marginBottom: '8px', background: done ? 'rgba(52,211,153,0.07)' : 'rgba(12,20,34,0.8)', border: `1px solid ${done ? 'rgba(52,211,153,0.25)' : 'rgba(0,229,255,0.06)'}`, borderRadius: '12px' }}>
                  <div style={{ fontSize: '22px', width: '28px', textAlign: 'center', opacity: done ? 1 : 0.6 }}>{d.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: done ? '#34d399' : '#7ca5c0', fontWeight: done ? 600 : 400, textDecoration: done ? 'line-through' : 'none' }}>{d.task}</div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '3px', marginTop: '6px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: done ? '#34d399' : '#00e5ff', width: (prog*100)+'%', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: done ? '#34d399' : '#2a5070' }}>+{d.xp}</div>
                </div>
              )
            })}
            {/* Manual XP test button */}
            <button onClick={() => addXP(10)} style={{ width: '100%', background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '10px', color: '#00e5ff77', cursor: 'pointer', padding: '10px', fontSize: '12px', marginTop: '8px', fontFamily: 'inherit' }}>
              ⚡ Test: +10 XP
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
