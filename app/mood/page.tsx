'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type MoodEntry = { date: string; mood: number; label: string; emoji: string; note: string }

const MOODS = [
  { val: 5, emoji: '🤩', label: 'Amazing',  color: '#fbbf24' },
  { val: 4, emoji: '😊', label: 'Good',     color: '#34d399' },
  { val: 3, emoji: '😐', label: 'Okay',     color: '#60a5fa' },
  { val: 2, emoji: '😔', label: 'Low',      color: '#a78bfa' },
  { val: 1, emoji: '😢', label: 'Bad',      color: '#f87171' },
]

const KEY = 'jarvis_mood_v1'

function loadEntries(): MoodEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function saveEntries(e: MoodEntry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(e.slice(-90))) } catch {}
}
function today() { return new Date().toISOString().slice(0, 10) }

function getStreak(entries: MoodEntry[]): number {
  if (!entries.length) return 0
  let streak = 0
  const today_d = new Date(today())
  for (let i = 0; i < 90; i++) {
    const d = new Date(today_d); d.setDate(d.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
    if (entries.find(e => e.date === ds)) streak++
    else if (i > 0) break
  }
  return streak
}

export default function MoodPage() {
  const [entries, setEntries] = useState<MoodEntry[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const e = loadEntries()
    setEntries(e)
    const todayEntry = e.find(x => x.date === today())
    if (todayEntry) { setSelected(todayEntry.mood); setNote(todayEntry.note); setSaved(true) }
  }, [])

  function save() {
    if (!selected) return
    const mood = MOODS.find(m => m.val === selected)!
    const newEntry: MoodEntry = { date: today(), mood: selected, label: mood.label, emoji: mood.emoji, note }
    const filtered = entries.filter(e => e.date !== today())
    const updated = [...filtered, newEntry].sort((a, b) => a.date.localeCompare(b.date))
    setEntries(updated)
    saveEntries(updated)
    setSaved(true)
  }

  // Last 7 days for chart
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().slice(0, 10)
    const entry = entries.find(e => e.date === ds)
    return { date: ds, day: d.toLocaleDateString('en', { weekday: 'short' }), entry }
  })

  const streak = getStreak(entries)
  const avgMood = entries.length > 0 ? (entries.slice(-7).reduce((s, e) => s + e.mood, 0) / Math.min(entries.slice(-7).length, 7)).toFixed(1) : '-'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", padding: '0 0 80px' }}>
      <style>{`* { box-sizing: border-box } @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>

      {/* Header */}
      <div style={{ background: 'rgba(8,13,24,0.95)', borderBottom: '1px solid rgba(0,229,255,0.07)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/" style={{ color: '#2a5070', fontSize: '18px', textDecoration: 'none', lineHeight: 1 }}>←</Link>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#ddeeff' }}>😊 Mood Tracker</div>
          <div style={{ fontSize: '11px', color: '#2a5070' }}>Apna mood track karo</div>
        </div>
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '16px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px', animation: 'fadeUp 0.2s ease' }}>
          <div style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#00e5ff' }}>{streak}</div>
            <div style={{ fontSize: '11px', color: '#2a5070', marginTop: '2px' }}>🔥 Day streak</div>
          </div>
          <div style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.1)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#a78bfa' }}>{avgMood}</div>
            <div style={{ fontSize: '11px', color: '#2a5070', marginTop: '2px' }}>📊 7-day avg</div>
          </div>
        </div>

        {/* 7-day chart */}
        <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.07)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#2a5070', marginBottom: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>LAST 7 DAYS</div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '70px' }}>
            {last7.map(({ day, entry }) => {
              const mood = MOODS.find(m => m.val === entry?.mood)
              const h = entry ? (entry.mood / 5) * 56 : 0
              return (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ fontSize: '14px', opacity: entry ? 1 : 0.2 }}>{mood?.emoji || '○'}</div>
                  <div style={{ width: '100%', height: '56px', display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ width: '100%', height: h + 'px', background: mood ? mood.color + '55' : 'rgba(255,255,255,0.05)', borderRadius: '4px 4px 0 0', border: h > 0 ? `1px solid ${mood?.color}44` : 'none', transition: 'height 0.4s ease' }} />
                  </div>
                  <div style={{ fontSize: '9px', color: '#1e3248' }}>{day}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Today's mood */}
        <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.07)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#2a5070', marginBottom: '14px', fontWeight: 600, letterSpacing: '0.5px' }}>
            {saved ? `✓ AAJ KA MOOD (${new Date().toLocaleDateString('hi-IN')})` : 'AAJ KA MOOD KYA HAI?'}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {MOODS.map(m => (
              <button key={m.val} onClick={() => { setSelected(m.val); setSaved(false) }}
                style={{ flex: 1, padding: '10px 0', background: selected === m.val ? m.color + '18' : 'rgba(0,229,255,0.03)', border: '1px solid', borderColor: selected === m.val ? m.color + '55' : 'rgba(0,229,255,0.08)', borderRadius: '10px', cursor: 'pointer', fontSize: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.15s', transform: selected === m.val ? 'scale(1.08)' : 'scale(1)' }}>
                {m.emoji}
                <span style={{ fontSize: '9px', color: selected === m.val ? m.color : '#1e3248', fontWeight: selected === m.val ? 700 : 400 }}>{m.label}</span>
              </button>
            ))}
          </div>

          <textarea
            value={note}
            onChange={e => { setNote(e.target.value); setSaved(false) }}
            placeholder="Optional: kuch note karo..."
            rows={2}
            style={{ width: '100%', background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '8px', color: '#8ab0c8', padding: '9px 12px', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit', marginBottom: '12px' }}
          />

          <button onClick={save} disabled={!selected}
            style={{ width: '100%', background: selected && !saved ? 'linear-gradient(135deg, #0077ff, #00e5ff)' : saved ? 'rgba(52,211,153,0.15)' : 'rgba(0,229,255,0.05)', border: '1px solid', borderColor: saved ? 'rgba(52,211,153,0.3)' : 'rgba(0,229,255,0.15)', borderRadius: '10px', color: selected && !saved ? '#000' : saved ? '#34d399' : '#2a5070', padding: '11px', fontSize: '14px', fontWeight: 700, cursor: selected ? 'pointer' : 'not-allowed', transition: 'all 0.15s', fontFamily: 'inherit' }}>
            {saved ? '✓ Saved!' : 'Mood Save Karo'}
          </button>
        </div>

        {/* History */}
        {entries.length > 0 && (
          <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.07)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#2a5070', marginBottom: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>RECENT HISTORY</div>
            {entries.slice(-10).reverse().map(e => {
              const mood = MOODS.find(m => m.val === e.mood)!
              return (
                <div key={e.date} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '20px' }}>{mood.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: mood.color, fontWeight: 600 }}>{mood.label}</div>
                    {e.note && <div style={{ fontSize: '11px', color: '#2a5070', marginTop: '1px' }}>{e.note}</div>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#1e3248' }}>{new Date(e.date).toLocaleDateString('en', { day: 'numeric', month: 'short' })}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
