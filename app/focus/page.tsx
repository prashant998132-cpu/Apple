'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

type Sound = { id: string; name: string; icon: string; color: string }
const SOUNDS: Sound[] = [
  { id: 'rain',   name: 'Rain',       icon: '🌧️', color: '#60a5fa' },
  { id: 'forest', name: 'Forest',     icon: '🌿', color: '#34d399' },
  { id: 'cafe',   name: 'Café',       icon: '☕', color: '#fbbf24' },
  { id: 'ocean',  name: 'Ocean',      icon: '🌊', color: '#0ea5e9' },
  { id: 'fire',   name: 'Fireplace',  icon: '🔥', color: '#f87171' },
  { id: 'white',  name: 'White Noise',icon: '🌫️', color: '#94a3b8' },
]

const QUOTES = [
  '"Focus on being productive instead of busy." — Tim Ferriss',
  '"The secret of getting ahead is getting started." — Mark Twain',
  '"Concentrate all your thoughts upon the work at hand." — Alexander Graham Bell',
  '"You don\'t have to be great to start, but you have to start to be great."',
  '"Deep work is the ability to focus without distraction."',
  '"Ek kaam karo aur use poori tarah karo." — JARVIS',
]

function createNoise(ctx: AudioContext, type: string): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buf.getChannelData(0)

  if (type === 'white') {
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  } else if (type === 'rain') {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (Math.random() > 0.97 ? 1 : 0.05)
    }
  } else if (type === 'ocean') {
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate
      data[i] = Math.sin(2 * Math.PI * 0.1 * t) * 0.3 * (Math.random() * 2 - 1)
    }
  } else {
    for (let i = 0; i < bufferSize; i++) {
      let b0 = 0, b1 = 0, b2 = 0
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759; b2 = 0.96900 * b2 + white * 0.1538520
      data[i] = (b0 + b1 + b2 + white * 0.0168980) * 0.11
    }
  }

  const src = ctx.createBufferSource()
  src.buffer = buf; src.loop = true
  return src
}

export default function FocusPage() {
  const [activeSounds, setActiveSounds] = useState<Set<string>>(new Set())
  const [volumes, setVolumes] = useState<Record<string, number>>({})
  const [quote, setQuote] = useState(QUOTES[0])
  const [timer, setTimer] = useState(25 * 60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSet, setTimerSet] = useState(25)
  const ctxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<Record<string, { src: AudioBufferSourceNode; gain: GainNode }>>({})
  const intervalRef = useRef<any>(null)

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)])
    return () => {
      Object.values(nodesRef.current).forEach(({ src, gain }) => { try { src.stop(); gain.disconnect() } catch {} })
      ctxRef.current?.close()
    }
  }, [])

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimer(t => { if (t <= 1) { setTimerRunning(false); clearInterval(intervalRef.current); return 0 } return t - 1 })
      }, 1000)
    } else { clearInterval(intervalRef.current) }
    return () => clearInterval(intervalRef.current)
  }, [timerRunning])

  function toggleSound(id: string) {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    const ctx = ctxRef.current!
    if (ctx.state === 'suspended') ctx.resume()

    if (activeSounds.has(id)) {
      nodesRef.current[id]?.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3)
      setTimeout(() => { try { nodesRef.current[id]?.src.stop() } catch {}; delete nodesRef.current[id] }, 400)
      setActiveSounds(prev => { const s = new Set(prev); s.delete(id); return s })
    } else {
      const src = createNoise(ctx, id)
      const gain = ctx.createGain()
      const vol = volumes[id] ?? 0.5
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.setTargetAtTime(vol, ctx.currentTime, 0.3)
      src.connect(gain); gain.connect(ctx.destination)
      src.start()
      nodesRef.current[id] = { src, gain }
      setActiveSounds(prev => new Set([...prev, id]))
    }
  }

  function setVolume(id: string, vol: number) {
    setVolumes(prev => ({ ...prev, [id]: vol }))
    if (nodesRef.current[id] && ctxRef.current) {
      nodesRef.current[id].gain.gain.setTargetAtTime(vol, ctxRef.current.currentTime, 0.1)
    }
  }

  function resetTimer() { clearInterval(intervalRef.current); setTimerRunning(false); setTimer(timerSet * 60) }

  const mm = String(Math.floor(timer / 60)).padStart(2, '0')
  const ss = String(timer % 60).padStart(2, '0')
  const pct = 1 - timer / (timerSet * 60)
  const r = 60; const circ = 2 * Math.PI * r

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", padding: '0 0 80px' }}>
      <style>{`* { box-sizing: border-box } @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} } @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }`}</style>

      <div style={{ background: 'rgba(8,13,24,0.95)', borderBottom: '1px solid rgba(0,229,255,0.07)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/" style={{ color: '#2a5070', fontSize: '18px', textDecoration: 'none' }}>←</Link>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#ddeeff' }}>🎯 Focus Mode</div>
          <div style={{ fontSize: '11px', color: '#2a5070' }}>Ambient sounds + timer</div>
        </div>
      </div>

      <div style={{ maxWidth: '460px', margin: '0 auto', padding: '20px 16px' }}>
        {/* Quote */}
        <div style={{ background: 'rgba(12,20,34,0.7)', border: '1px solid rgba(0,229,255,0.06)', borderRadius: '14px', padding: '18px', marginBottom: '20px', textAlign: 'center', animation: 'fadeUp 0.2s ease' }}>
          <div style={{ fontSize: '13px', color: '#4a7090', lineHeight: '1.6', fontStyle: 'italic' }}>{quote}</div>
          <button onClick={() => setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)])}
            style={{ background: 'none', border: 'none', color: '#1e3248', cursor: 'pointer', fontSize: '11px', marginTop: '8px', fontFamily: 'inherit' }}>↻ New quote</button>
        </div>

        {/* Timer */}
        <div style={{ background: 'rgba(12,20,34,0.9)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '16px', padding: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div style={{ position: 'relative', width: '160px', height: '160px' }}>
            <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(0,229,255,0.06)" strokeWidth="6" />
              <circle cx="80" cy="80" r={r} fill="none" stroke="#00e5ff" strokeWidth="6"
                strokeDasharray={circ} strokeDashoffset={(1 - pct) * circ}
                strokeLinecap="round" style={{ transition: timerRunning ? 'stroke-dashoffset 1s linear' : 'none' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <div style={{ fontSize: '36px', fontWeight: 800, color: timer === 0 ? '#f87171' : '#ddeeff', fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>{mm}:{ss}</div>
              <div style={{ fontSize: '11px', color: '#1e3248' }}>{timerRunning ? '🟢 Focusing' : timer === 0 ? '✅ Done!' : '⏸ Paused'}</div>
            </div>
          </div>

          {/* Timer presets */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[15, 25, 45, 60].map(m => (
              <button key={m} onClick={() => { setTimerSet(m); setTimer(m * 60); setTimerRunning(false) }}
                style={{ background: timerSet === m ? 'rgba(0,229,255,0.1)' : 'rgba(0,229,255,0.03)', border: '1px solid', borderColor: timerSet === m ? 'rgba(0,229,255,0.25)' : 'rgba(0,229,255,0.07)', borderRadius: '7px', color: timerSet === m ? '#00e5ff' : '#2a5070', cursor: 'pointer', padding: '5px 10px', fontSize: '12px', fontFamily: 'inherit' }}>
                {m}m
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={resetTimer} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', color: '#4a7090', cursor: 'pointer', padding: '10px 18px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit' }}>↺</button>
            <button onClick={() => setTimerRunning(v => !v)}
              style={{ background: timerRunning ? 'rgba(248,113,113,0.1)' : 'rgba(0,229,255,0.1)', border: '1px solid', borderColor: timerRunning ? 'rgba(248,113,113,0.25)' : 'rgba(0,229,255,0.25)', borderRadius: '10px', color: timerRunning ? '#f87171' : '#00e5ff', cursor: 'pointer', padding: '10px 28px', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', minWidth: '110px' }}>
              {timerRunning ? '⏸ Pause' : timer === 0 ? '↺ Restart' : '▶ Start'}
            </button>
          </div>
        </div>

        {/* Ambient sounds */}
        <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.07)', borderRadius: '14px', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#1e3248', marginBottom: '14px', fontWeight: 600, letterSpacing: '0.5px' }}>🎵 AMBIENT SOUNDS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {SOUNDS.map(s => {
              const active = activeSounds.has(s.id)
              const vol = volumes[s.id] ?? 0.5
              return (
                <div key={s.id} style={{ background: active ? s.color + '0f' : 'rgba(0,229,255,0.03)', border: `1px solid ${active ? s.color + '33' : 'rgba(0,229,255,0.07)'}`, borderRadius: '12px', padding: '12px', transition: 'all 0.15s' }}>
                  <button onClick={() => toggleSound(s.id)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: active ? '8px' : '0', fontFamily: 'inherit' }}>
                    <span style={{ fontSize: '22px' }}>{s.icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: active ? 600 : 400, color: active ? s.color : '#4a7090', flex: 1, textAlign: 'left' }}>{s.name}</span>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: active ? s.color : 'transparent', border: `2px solid ${active ? s.color : 'rgba(255,255,255,0.1)'}`, flexShrink: 0, animation: active ? 'pulse 2s infinite' : 'none' }} />
                  </button>
                  {active && (
                    <input type="range" min="0" max="1" step="0.05" value={vol}
                      onChange={e => setVolume(s.id, parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: s.color, cursor: 'pointer', height: '3px' }} />
                  )}
                </div>
              )
            })}
          </div>
          {activeSounds.size > 0 && (
            <button onClick={() => { activeSounds.forEach(id => toggleSound(id)) }}
              style={{ background: 'none', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '8px', color: '#f87171', cursor: 'pointer', fontSize: '11px', padding: '7px', width: '100%', marginTop: '10px', fontFamily: 'inherit' }}>
              Stop All Sounds
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
