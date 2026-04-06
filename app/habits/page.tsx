'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type Habit = { id: string; name: string; icon: string; color: string; completions: string[]; createdAt: string }

const COLORS = ['#00e5ff', '#34d399', '#f87171', '#a78bfa', '#fbbf24', '#f9a8d4', '#fb923c', '#60a5fa']
const ICONS = ['💪','🏃','📚','💧','🧘','🥗','😴','💊','✍️','🎯','🌞','🏋️']
const KEY = 'jarvis_habits_v1'
const today = () => new Date().toISOString().slice(0, 10)

function loadHabits(): Habit[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function saveHabits(h: Habit[]) { try { localStorage.setItem(KEY, JSON.stringify(h)) } catch {} }
function uid() { return Date.now().toString(36) }

function getStreak(completions: string[]): number {
  let streak = 0; const t = today()
  const d = new Date(t)
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().slice(0, 10)
    if (completions.includes(ds)) streak++
    else if (i > 0) break
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function getLast30(completions: string[]): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i))
    return d.toISOString().slice(0, 10)
  }).filter(d => completions.includes(d))
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(ICONS[0])
  const [color, setColor] = useState(COLORS[0])
  const [view, setView] = useState<'today' | 'stats'>('today')

  useEffect(() => { setHabits(loadHabits()) }, [])

  function addHabit() {
    if (!name.trim()) return
    const h: Habit = { id: uid(), name: name.trim(), icon, color, completions: [], createdAt: today() }
    const updated = [...habits, h]; setHabits(updated); saveHabits(updated)
    setName(''); setAdding(false)
  }

  function toggle(id: string) {
    const t = today()
    const updated = habits.map(h =>
      h.id === id ? { ...h, completions: h.completions.includes(t) ? h.completions.filter(d => d !== t) : [...h.completions, t] } : h
    )
    setHabits(updated); saveHabits(updated)
  }

  function deleteHabit(id: string) {
    const updated = habits.filter(h => h.id !== id)
    setHabits(updated); saveHabits(updated)
  }

  const todayStr = today()
  const completedToday = habits.filter(h => h.completions.includes(todayStr)).length
  const pct = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", padding: '0 0 80px' }}>
      <style>{`* { box-sizing: border-box } @keyframes fadeUp { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} } .habit-row:hover { background: rgba(0,229,255,0.04) !important; }`}</style>

      <div style={{ background: 'rgba(8,13,24,0.95)', borderBottom: '1px solid rgba(0,229,255,0.07)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/" style={{ color: '#2a5070', fontSize: '18px', textDecoration: 'none' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#ddeeff' }}>💪 Habit Tracker</div>
          <div style={{ fontSize: '11px', color: '#2a5070' }}>{completedToday}/{habits.length} aaj complete</div>
        </div>
        <button onClick={() => setAdding(true)} style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '8px', color: '#00e5ff', cursor: 'pointer', padding: '6px 12px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit' }}>+ Add</button>
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '14px' }}>
        {/* Progress ring */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.07)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
          <svg width="70" height="70" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(0,229,255,0.07)" strokeWidth="7" />
            <circle cx="35" cy="35" r="28" fill="none" stroke="#00e5ff" strokeWidth="7"
              strokeDasharray={2 * Math.PI * 28} strokeDashoffset={(1 - pct/100) * 2 * Math.PI * 28}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
          </svg>
          <div style={{ transform: 'rotate(0)' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#00e5ff', lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: '12px', color: '#2a5070', marginTop: '3px' }}>Aaj ka progress</div>
            <div style={{ fontSize: '11px', color: '#1e3248', marginTop: '2px' }}>{completedToday} of {habits.length} done</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#fbbf24' }}>{habits.reduce((m, h) => Math.max(m, getStreak(h.completions)), 0)}</div>
            <div style={{ fontSize: '10px', color: '#2a5070' }}>🔥 best streak</div>
          </div>
        </div>

        {/* View tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', background: 'rgba(12,20,34,0.7)', borderRadius: '10px', padding: '4px' }}>
          {(['today','stats'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 'none', background: view === v ? 'rgba(0,229,255,0.1)' : 'transparent', color: view === v ? '#00e5ff' : '#2a5070', fontSize: '12px', fontWeight: view === v ? 700 : 400, cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'inherit' }}>
              {v === 'today' ? "Today's Habits" : '30-Day Stats'}
            </button>
          ))}
        </div>

        {/* Add habit form */}
        {adding && (
          <div style={{ background: 'rgba(12,20,34,0.9)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '14px', padding: '16px', marginBottom: '14px', animation: 'fadeUp 0.15s ease' }}>
            <div style={{ fontSize: '13px', color: '#2a5070', marginBottom: '12px', fontWeight: 600 }}>NEW HABIT</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Habit ka naam..." onKeyDown={e => e.key === 'Enter' && addHabit()}
              style={{ width: '100%', background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '8px', color: '#ddeeff', padding: '9px 12px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', marginBottom: '12px' }} />
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: '#1e3248', marginBottom: '7px' }}>Icon:</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {ICONS.map(ic => <button key={ic} onClick={() => setIcon(ic)} style={{ background: icon === ic ? 'rgba(0,229,255,0.12)' : 'none', border: '1px solid', borderColor: icon === ic ? 'rgba(0,229,255,0.25)' : 'transparent', borderRadius: '7px', cursor: 'pointer', fontSize: '18px', padding: '4px 6px', transition: 'all 0.1s' }}>{ic}</button>)}
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: '#1e3248', marginBottom: '7px' }}>Color:</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {COLORS.map(c => <button key={c} onClick={() => setColor(c)} style={{ width: '22px', height: '22px', borderRadius: '50%', background: c, border: `2px solid ${color === c ? 'white' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.1s', transform: color === c ? 'scale(1.15)' : 'scale(1)' }} />)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setAdding(false)} style={{ flex: 1, background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '9px', color: '#4a7090', cursor: 'pointer', padding: '9px', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={addHabit} disabled={!name.trim()} style={{ flex: 2, background: name.trim() ? `${color}22` : 'rgba(0,229,255,0.04)', border: `1px solid ${name.trim() ? color + '44' : 'rgba(0,229,255,0.08)'}`, borderRadius: '9px', color: name.trim() ? color : '#2a5070', cursor: name.trim() ? 'pointer' : 'not-allowed', padding: '9px', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s', fontFamily: 'inherit' }}>Add Habit</button>
            </div>
          </div>
        )}

        {habits.length === 0 && (
          <div style={{ textAlign: 'center', color: '#1e3248', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>💪</div>
            <div style={{ fontSize: '14px' }}>Koi habit nahi! Add karo.</div>
          </div>
        )}

        {view === 'today' ? (
          <div>
            {habits.map(h => {
              const done = h.completions.includes(todayStr)
              const streak = getStreak(h.completions)
              return (
                <div key={h.id} className="habit-row"
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', marginBottom: '8px', background: 'rgba(12,20,34,0.8)', border: `1px solid ${done ? h.color + '22' : 'rgba(0,229,255,0.05)'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
                  onClick={() => toggle(h.id)}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: done ? h.color + '20' : 'rgba(255,255,255,0.03)', border: `1px solid ${done ? h.color + '44' : 'rgba(255,255,255,0.06)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, transition: 'all 0.2s' }}>{h.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: done ? h.color : '#8ab0c8', textDecoration: done ? 'line-through' : 'none', transition: 'all 0.15s' }}>{h.name}</div>
                    <div style={{ fontSize: '11px', color: '#1e3248', marginTop: '2px' }}>{streak > 0 ? `🔥 ${streak} day streak` : 'Start today!'}</div>
                  </div>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: done ? h.color : 'transparent', border: `2px solid ${done ? h.color : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: done ? '#000' : 'transparent', flexShrink: 0, transition: 'all 0.15s' }}>✓</div>
                  <button onClick={e => { e.stopPropagation(); deleteHabit(h.id) }} style={{ background: 'none', border: 'none', color: '#1e3248', cursor: 'pointer', fontSize: '12px', padding: '4px', opacity: 0.5, fontFamily: 'inherit' }}>🗑️</button>
                </div>
              )
            })}
          </div>
        ) : (
          <div>
            {habits.map(h => {
              const last30 = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (29 - i)); return d.toISOString().slice(0, 10) })
              const streak = getStreak(h.completions)
              const total = h.completions.length
              return (
                <div key={h.id} style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.06)', borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{h.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: h.color }}>{h.name}</div>
                      <div style={{ fontSize: '11px', color: '#1e3248' }}>{total} completions total</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#fbbf24' }}>{streak}</div>
                      <div style={{ fontSize: '9px', color: '#1e3248' }}>streak</div>
                    </div>
                  </div>
                  {/* Heat map */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '3px' }}>
                    {last30.map((d, i) => {
                      const done = h.completions.includes(d)
                      return <div key={i} title={d} style={{ width: '100%', paddingBottom: '100%', borderRadius: '3px', background: done ? h.color + '80' : 'rgba(255,255,255,0.04)', border: d === todayStr ? `1px solid ${h.color}` : '1px solid transparent', transition: 'all 0.15s' }} />
                    })}
                  </div>
                  <div style={{ fontSize: '9px', color: '#0e2030', marginTop: '5px', textAlign: 'right' }}>Last 30 days</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
