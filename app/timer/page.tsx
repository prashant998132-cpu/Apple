'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

type Mode = 'work' | 'short' | 'long'

const DEFAULTS = { work: 25, short: 5, long: 15 }
const COLORS: Record<Mode, string> = { work: '#f87171', short: '#34d399', long: '#60a5fa' }
const LABELS: Record<Mode, string> = { work: '🎯 Focus', short: '☕ Short Break', long: '🌿 Long Break' }

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 440; osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8)
  } catch {}
}

export default function TimerPage() {
  const [mode, setMode] = useState<Mode>('work')
  const [mins, setMins] = useState<Record<Mode, number>>({ ...DEFAULTS })
  const [secs, setSecs] = useState(DEFAULTS.work * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [editing, setEditing] = useState<Mode | null>(null)
  const [editVal, setEditVal] = useState('')
  const intervalRef = useRef<any>(null)
  const KEY = 'jarvis_timer_sessions'

  useEffect(() => {
    try { setSessions(parseInt(localStorage.getItem(KEY) || '0')) } catch {}
    setSecs(mins[mode] * 60)
  }, [])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          beep()
          if (mode === 'work') {
            const ns = sessions + 1
            setSessions(ns)
            try { localStorage.setItem(KEY, String(ns)) } catch {}
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, mode, sessions])

  function switchMode(m: Mode) {
    clearInterval(intervalRef.current)
    setRunning(false); setMode(m); setSecs(mins[m] * 60)
  }

  function reset() {
    clearInterval(intervalRef.current)
    setRunning(false); setSecs(mins[mode] * 60)
  }

  function updateTime(m: Mode, val: number) {
    const v = Math.max(1, Math.min(90, val))
    setMins(prev => ({ ...prev, [m]: v }))
    if (m === mode && !running) setSecs(v * 60)
  }

  const total = mins[mode] * 60
  const pct = ((total - secs) / total) * 100
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  const color = COLORS[mode]
  const r = 90
  const circ = 2 * Math.PI * r
  const dash = circ - (pct / 100) * circ

  const todaySessions = sessions % 4

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", padding: '0 0 80px' }}>
      <style>{`* { box-sizing: border-box } @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} } @keyframes pulse-glow { 0%,100%{filter:drop-shadow(0 0 4px ${color}44)} 50%{filter:drop-shadow(0 0 12px ${color}88)} }`}</style>

      <div style={{ background: 'rgba(8,13,24,0.95)', borderBottom: '1px solid rgba(0,229,255,0.07)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/" style={{ color: '#2a5070', fontSize: '18px', textDecoration: 'none' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#ddeeff' }}>⏱️ Pomodoro Timer</div>
          <div style={{ fontSize: '11px', color: '#2a5070' }}>{sessions} sessions today</div>
        </div>
      </div>

      <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px 16px', animation: 'fadeUp 0.2s ease' }}>
        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', background: 'rgba(12,20,34,0.8)', borderRadius: '12px', padding: '5px' }}>
          {(['work', 'short', 'long'] as Mode[]).map(m => (
            <button key={m} onClick={() => switchMode(m)}
              style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: 'none', background: mode === m ? COLORS[m] + '18' : 'transparent', color: mode === m ? COLORS[m] : '#2a5070', fontSize: '11px', fontWeight: mode === m ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', borderBottom: mode === m ? `2px solid ${COLORS[m]}` : '2px solid transparent' }}>
              {m === 'work' ? 'Focus' : m === 'short' ? 'Short' : 'Long'}
            </button>
          ))}
        </div>

        {/* Timer circle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <div style={{ position: 'relative', width: '220px', height: '220px' }}>
            <svg width="220" height="220" style={{ transform: 'rotate(-90deg)', animation: running ? `pulse-glow 2s ease-in-out infinite` : 'none' }}>
              <circle cx="110" cy="110" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
              <circle cx="110" cy="110" r={r} fill="none" stroke={color} strokeWidth="8"
                strokeDasharray={circ} strokeDashoffset={dash}
                strokeLinecap="round" style={{ transition: running ? 'stroke-dashoffset 1s linear' : 'none' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <div style={{ fontSize: '46px', fontWeight: 800, color: secs === 0 ? color : '#ddeeff', letterSpacing: '-2px', fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss}</div>
              <div style={{ fontSize: '12px', color: color, fontWeight: 600 }}>{LABELS[mode]}</div>
              {secs === 0 && <div style={{ fontSize: '11px', color: '#2a5070' }}>Time's up! 🎉</div>}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', justifyContent: 'center' }}>
          <button onClick={reset}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#4a7090', cursor: 'pointer', padding: '12px 20px', fontSize: '14px', fontWeight: 600, transition: 'all 0.15s', fontFamily: 'inherit' }}>
            ↺ Reset
          </button>
          <button onClick={() => setRunning(v => !v)}
            style={{ background: running ? 'rgba(248,113,113,0.12)' : color + '18', border: `1px solid ${running ? '#f87171' : color}44`, borderRadius: '12px', color: running ? '#f87171' : color, cursor: 'pointer', padding: '12px 32px', fontSize: '15px', fontWeight: 700, transition: 'all 0.15s', minWidth: '120px', fontFamily: 'inherit' }}>
            {running ? '⏸ Pause' : secs === 0 ? '↺ Restart' : '▶ Start'}
          </button>
        </div>

        {/* Session tracker */}
        <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.07)', borderRadius: '12px', padding: '14px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#2a5070', marginBottom: '10px', fontWeight: 600, letterSpacing: '0.5px' }}>SESSION PROGRESS</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '10px' }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} style={{ width: '28px', height: '28px', borderRadius: '8px', background: i < todaySessions ? '#f87171' : 'rgba(255,255,255,0.05)', border: '1px solid', borderColor: i < todaySessions ? '#f87171' : 'rgba(255,255,255,0.06)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {i < todaySessions ? '🍅' : '○'}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#1e3248' }}>{todaySessions}/4 sessions · {sessions} total</div>
        </div>

        {/* Time settings */}
        <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.07)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#2a5070', marginBottom: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>TIMER SETTINGS</div>
          {(['work', 'short', 'long'] as Mode[]).map(m => (
            <div key={m} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: '#7ca5c0' }}>{LABELS[m]}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => updateTime(m, mins[m] - 1)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '6px', color: '#4a7090', cursor: 'pointer', width: '26px', height: '26px', fontSize: '14px', fontFamily: 'inherit' }}>−</button>
                <span style={{ fontSize: '14px', fontWeight: 700, color: COLORS[m], width: '30px', textAlign: 'center' }}>{mins[m]}</span>
                <button onClick={() => updateTime(m, mins[m] + 1)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '6px', color: '#4a7090', cursor: 'pointer', width: '26px', height: '26px', fontSize: '14px', fontFamily: 'inherit' }}>+</button>
                <span style={{ fontSize: '11px', color: '#1e3248' }}>min</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
