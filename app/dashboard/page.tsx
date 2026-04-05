'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const ALL_PAGES = [
  { href: '/',          icon: '⚡', label: 'JARVIS',     color: '#00e5ff',  desc: 'AI Chat' },
  { href: '/luna',      icon: '🌸', label: 'LUNA',       color: '#f9a8d4',  desc: 'Bestie AI' },
  { href: '/era',       icon: '💗', label: 'Era',        color: '#fb7185',  desc: 'Creative AI' },
  { href: '/brief',     icon: '📰', label: 'Brief',      color: '#ffd600',  desc: 'Daily news' },
  { href: '/mood',      icon: '😊', label: 'Mood',       color: '#a78bfa',  desc: 'Track mood' },
  { href: '/health',    icon: '🏥', label: 'Health',     color: '#00e676',  desc: 'Fitness' },
  { href: '/finance',   icon: '💰', label: 'Finance',    color: '#ffd600',  desc: 'Money' },
  { href: '/notes',     icon: '📝', label: 'Notes',      color: '#34d399',  desc: 'Quick notes' },
  { href: '/timer',     icon: '⏱️', label: 'Timer',      color: '#f87171',  desc: 'Pomodoro' },
  { href: '/write',     icon: '✍️', label: 'Write',      color: '#40c4ff',  desc: 'Writing AI' },
  { href: '/study',     icon: '📚', label: 'Study',      color: '#34d399',  desc: 'NEET/JEE' },
  { href: '/target',    icon: '🎯', label: 'Goals',      color: '#fbbf24',  desc: 'Targets' },
  { href: '/india',     icon: '🇮🇳', label: 'India',    color: '#f97316',  desc: 'India tools' },
  { href: '/image',     icon: '🎨', label: 'Image',      color: '#f472b6',  desc: 'AI art' },
  { href: '/voice',     icon: '🎙️', label: 'Voice',     color: '#60a5fa',  desc: 'Voice AI' },
  { href: '/orb',       icon: '🌐', label: 'Orb',        color: '#7c3aed',  desc: '3D sphere' },
  { href: '/xp',        icon: '🎮', label: 'XP',         color: '#ff9800',  desc: 'Gamification' },
  { href: '/settings',  icon: '⚙️', label: 'Settings',  color: '#94a3b8',  desc: 'Config' },
]

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) {
  return (
    <div style={{ background: 'rgba(12,20,34,0.8)', border: `1px solid ${color}18`, borderRadius: '12px', padding: '14px', textAlign: 'center', borderTopWidth: '2px', borderTopColor: color + '44' }}>
      <div style={{ fontSize: '22px', marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontSize: '22px', fontWeight: 800, color, letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: '10px', color: '#2a5070', marginTop: '2px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({ msgs: 0, notes: 0, sessions: 0, streak: 0, xp: 0, mood: '' })
  const [greeting, setGreeting] = useState('')
  const [time, setTime] = useState('')

  useEffect(() => {
    // Load stats from localStorage
    try {
      const msgs = JSON.parse(localStorage.getItem('j_msgs_v5') || '[]').length
      const notes = JSON.parse(localStorage.getItem('jarvis_notes_v1') || '[]').length
      const sessions = parseInt(localStorage.getItem('jarvis_timer_sessions') || '0')
      const xp = parseInt(localStorage.getItem('jarvis_xp') || '0')
      
      // Mood streak
      const moodEntries = JSON.parse(localStorage.getItem('jarvis_mood_v1') || '[]')
      let streak = 0
      const today = new Date().toISOString().slice(0, 10)
      const todayEntry = moodEntries.find((e: any) => e.date === today)
      const moodEmoji = todayEntry?.emoji || '—'
      
      const today_d = new Date(today)
      for (let i = 0; i < 90; i++) {
        const d = new Date(today_d); d.setDate(d.getDate() - i)
        const ds = d.toISOString().slice(0, 10)
        if (moodEntries.find((e: any) => e.date === ds)) streak++
        else if (i > 0) break
      }

      setStats({ msgs, notes, sessions, streak, xp, mood: moodEmoji })
    } catch {}

    // Greeting
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Suprabhat 🌅' : h < 17 ? 'Namaste ☀️' : h < 21 ? 'Shubh Sandhya 🌇' : 'Shubh Ratri 🌙')
    
    // Live clock
    const tick = () => setTime(new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const FAVORITES = ALL_PAGES.slice(0, 8)
  const MORE = ALL_PAGES.slice(8)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", padding: '0 0 80px' }}>
      <style>{`* { box-sizing: border-box } @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} } .page-btn:hover { background: rgba(255,255,255,0.05) !important; transform: translateY(-2px); }`}</style>

      {/* Header */}
      <div style={{ background: 'rgba(8,13,24,0.95)', borderBottom: '1px solid rgba(0,229,255,0.07)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/" style={{ color: '#2a5070', fontSize: '18px', textDecoration: 'none' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#ddeeff' }}>📊 Dashboard</div>
          <div style={{ fontSize: '11px', color: '#2a5070' }}>JARVIS Life OS</div>
        </div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#00e5ff', fontVariantNumeric: 'tabular-nums' }}>{time}</div>
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '16px' }}>
        {/* Greeting */}
        <div style={{ background: 'linear-gradient(135deg, rgba(0,119,255,0.1), rgba(0,229,255,0.05))', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '16px', padding: '18px', marginBottom: '18px', animation: 'fadeUp 0.2s ease' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#ddeeff', marginBottom: '4px' }}>{greeting}</div>
          <div style={{ fontSize: '13px', color: '#2a5070' }}>Pranshu, aaj kya karna hai?</div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px', animation: 'fadeUp 0.25s ease' }}>
          <StatCard label="Messages" value={stats.msgs} color="#00e5ff" icon="💬" />
          <StatCard label="Pomodoros" value={stats.sessions} color="#f87171" icon="🍅" />
          <StatCard label="Mood Streak" value={`${stats.streak}d`} color="#a78bfa" icon="🔥" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '22px', animation: 'fadeUp 0.3s ease' }}>
          <StatCard label="Notes" value={stats.notes} color="#34d399" icon="📝" />
          <StatCard label="Today Mood" value={stats.mood || '—'} color="#fbbf24" icon="😊" />
          <StatCard label="XP Points" value={stats.xp} color="#ff9800" icon="⭐" />
        </div>

        {/* Quick access */}
        <div style={{ marginBottom: '20px', animation: 'fadeUp 0.35s ease' }}>
          <div style={{ fontSize: '11px', color: '#2a5070', marginBottom: '12px', fontWeight: 600, letterSpacing: '1px' }}>QUICK ACCESS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {FAVORITES.map(p => (
              <button key={p.href} className="page-btn" onClick={() => router.push(p.href)}
                style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.07)', borderRadius: '12px', padding: '12px 6px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                <span style={{ fontSize: '22px' }}>{p.icon}</span>
                <span style={{ fontSize: '10px', color: '#4a7090', fontWeight: 600 }}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* All tools */}
        <div style={{ animation: 'fadeUp 0.4s ease' }}>
          <div style={{ fontSize: '11px', color: '#2a5070', marginBottom: '12px', fontWeight: 600, letterSpacing: '1px' }}>ALL TOOLS</div>
          <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
            {MORE.map((p, i) => (
              <button key={p.href} onClick={() => router.push(p.href)}
                style={{ width: '100%', padding: '11px 14px', background: 'transparent', border: 'none', borderBottom: i < MORE.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', transition: 'background 0.12s', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span style={{ fontSize: '18px', width: '22px', textAlign: 'center' }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: p.color }}>{p.label}</div>
                  <div style={{ fontSize: '11px', color: '#1e3248' }}>{p.desc}</div>
                </div>
                <span style={{ fontSize: '12px', color: '#1e3248' }}>›</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
