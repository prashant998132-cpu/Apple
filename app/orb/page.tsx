/* eslint-disable */
// @ts-nocheck
'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export default function OrbPage() {
  const canvasRef = useRef(null)
  const stateRef = useRef('idle') // idle | listening | thinking | speaking
  const [state, setState] = useState('idle')
  const [micOn, setMicOn] = useState(false)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const dataRef = useRef(null)
  const rafRef = useRef(null)
  const particlesRef = useRef([])
  const ampRef = useRef(0)
  const touchRef = useRef({ x: 0, y: 0, active: false })
  const demoRef = useRef(null)

  const STATE_COLORS = {
    idle:      { dot: '#00e5ff', glow: 'rgba(0,229,255,0.12)', label: 'STANDBY' },
    listening: { dot: '#00ff88', glow: 'rgba(0,255,136,0.15)', label: 'LISTENING' },
    thinking:  { dot: '#a78bfa', glow: 'rgba(167,139,250,0.15)', label: 'THINKING' },
    speaking:  { dot: '#f59e0b', glow: 'rgba(245,158,11,0.18)', label: 'SPEAKING' },
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const W = canvas.width = 320
    const H = canvas.height = 320
    const cx = W / 2, cy = H / 2
    const ctx = canvas.getContext('2d')

    // ── Build fibonacci sphere particles ──────────────────
    const N = 380
    const RADIUS = 110
    const particles = []
    const golden = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2          // -1 to 1
      const r = Math.sqrt(1 - y * y)
      const theta = golden * i
      const x = Math.cos(theta) * r
      const z = Math.sin(theta) * r

      // base sphere position
      const bx = cx + x * RADIUS
      const by = cy + y * RADIUS

      particles.push({
        // home position (on sphere)
        hx: x, hy: y, hz: z,
        // current position
        px: bx, py: by,
        // velocity
        vx: 0, vy: 0,
        // size
        r: 1.3 + Math.random() * 0.8,
        // scatter state
        scattered: false,
        // random offset for organic movement
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.4,
        // z for depth
        z: z,
      })
    }
    particlesRef.current = particles

    // ── Animation loop ─────────────────────────────────────
    let t = 0
    let rotY = 0
    let touchX = cx, touchY = cy, touchActive = false
    let touchTimer = 0
    let scatterAmt = 0  // 0=normal, 1=fully scattered

    function lerp(a, b, f) { return a + (b - a) * f }

    function tick() {
      rafRef.current = requestAnimationFrame(tick)
      t += 0.016
      rotY += 0.003

      // audio amplitude
      let amp = ampRef.current
      if (analyserRef.current && dataRef.current) {
        analyserRef.current.getByteFrequencyData(dataRef.current)
        let sum = 0
        for (let i = 0; i < dataRef.current.length; i++) sum += dataRef.current[i]
        amp = Math.min(1, (sum / dataRef.current.length) / 80)
        ampRef.current = amp
      } else {
        // simulate demo
        const s = stateRef.current
        if (s === 'speaking')  amp = 0.35 + Math.sin(t * 7) * 0.25 + Math.sin(t * 13) * 0.1
        else if (s === 'listening') amp = 0.12 + Math.sin(t * 4) * 0.08
        else if (s === 'thinking') amp = 0.08 + Math.sin(t * 2) * 0.05
        else amp = 0
        ampRef.current = amp * 0.8 + ampRef.current * 0.2
      }
      amp = ampRef.current

      // scatter decay
      if (touchActive) {
        scatterAmt = Math.min(1, scatterAmt + 0.08)
        touchTimer += 0.016
      } else {
        scatterAmt = Math.max(0, scatterAmt - 0.03)
      }

      const col = STATE_COLORS[stateRef.current]

      // clear
      ctx.clearRect(0, 0, W, H)

      // glow bg
      if (amp > 0.05 || scatterAmt > 0) {
        const glowR = 90 + amp * 40 + scatterAmt * 20
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
        gr.addColorStop(0, col.glow.replace(')', `,${0.3 + amp * 0.4})`).replace('rgba', 'rgba').replace(',0.', `,${0.3 + amp * 0.4 - 0.3},`))
        gr.addColorStop(0, col.glow)
        gr.addColorStop(1, 'transparent')
        ctx.fillStyle = gr
        ctx.fillRect(0, 0, W, H)
      }

      // update + draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // rotate on Y axis
        const cosR = Math.cos(rotY + (stateRef.current === 'thinking' ? t * 0.3 : 0))
        const sinR = Math.sin(rotY + (stateRef.current === 'thinking' ? t * 0.3 : 0))
        const rx = p.hx * cosR - p.hz * sinR
        const rz = p.hx * sinR + p.hz * cosR

        // scale by state + audio
        const baseScale = RADIUS + amp * 18 + Math.sin(t * 0.8 + p.phase) * (stateRef.current === 'idle' ? 2 : 4)
        const targetX = cx + rx * baseScale
        const targetY = cy + p.hy * baseScale

        if (scatterAmt > 0.01 && touchActive) {
          // SCATTER: explode away from touch point
          const dx = p.px - touchX
          const dy = p.py - touchY
          const dist = Math.sqrt(dx * dx + dy * dy) + 1
          const force = (200 / dist) * scatterAmt * 0.4
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
          // friction
          p.vx *= 0.92
          p.vy *= 0.92
          p.px += p.vx
          p.py += p.vy
        } else if (scatterAmt > 0.01) {
          // REFORM: attract back to home
          const dx = targetX - p.px
          const dy = targetY - p.py
          p.vx += dx * 0.08 * (1 - scatterAmt * 0.5)
          p.vy += dy * 0.08 * (1 - scatterAmt * 0.5)
          p.vx *= 0.85
          p.vy *= 0.85
          p.px += p.vx
          p.py += p.vy
        } else {
          // NORMAL: smooth lerp to target
          p.px = lerp(p.px, targetX, 0.12)
          p.py = lerp(p.py, targetY, 0.12)
          p.vx = 0; p.vy = 0
        }

        // depth-based opacity + size (z-axis)
        const depth = (rz + 1) / 2  // 0 = back, 1 = front
        const opacity = 0.15 + depth * 0.85
        const size = p.r * (0.5 + depth * 0.6) * (1 + amp * 0.4)

        // color with voice reaction
        let dotColor = col.dot
        if (amp > 0.2 && depth > 0.6) {
          // bright pop on loud audio for front dots
          const bright = Math.min(1, (amp - 0.2) * 3)
          ctx.shadowBlur = bright * 8
          ctx.shadowColor = col.dot
        } else {
          ctx.shadowBlur = 0
        }

        ctx.globalAlpha = opacity * (scatterAmt > 0 ? Math.max(0.1, 1 - scatterAmt * 0.3) : 1)
        ctx.fillStyle = dotColor
        ctx.beginPath()
        ctx.arc(p.px, p.py, Math.max(0.3, size), 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      ctx.shadowBlur = 0

      // mic indicator ring
      if (amp > 0.05) {
        ctx.beginPath()
        ctx.arc(cx, cy, RADIUS * 1.05 + amp * 25, 0, Math.PI * 2)
        ctx.strokeStyle = col.dot + '30'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    tick()

    // ── Touch/Click handler ────────────────────────────────
    function onTouchStart(e) {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const scaleX = W / rect.width
      const scaleY = H / rect.height
      const touch = e.touches ? e.touches[0] : e
      touchX = (touch.clientX - rect.left) * scaleX
      touchY = (touch.clientY - rect.top) * scaleY
      touchActive = true
      scatterAmt = 0
    }
    function onTouchEnd(e) {
      touchActive = false
    }
    function onTouchMove(e) {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const scaleX = W / rect.width
      const scaleY = H / rect.height
      const touch = e.touches ? e.touches[0] : e
      touchX = (touch.clientX - rect.left) * scaleX
      touchY = (touch.clientY - rect.top) * scaleY
    }

    canvas.addEventListener('mousedown', onTouchStart)
    canvas.addEventListener('mouseup', onTouchEnd)
    canvas.addEventListener('mousemove', (e) => { if (touchActive) onTouchMove(e) })
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })

    // Auto demo cycle
    let demoIdx = 0
    const demoStates = ['idle','listening','thinking','speaking']
    demoRef.current = setInterval(() => {
      demoIdx = (demoIdx + 1) % demoStates.length
      stateRef.current = demoStates[demoIdx]
      setState(demoStates[demoIdx])
    }, 2800)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearInterval(demoRef.current)
      canvas.removeEventListener('mousedown', onTouchStart)
      canvas.removeEventListener('mouseup', onTouchEnd)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  const setS = (s) => {
    stateRef.current = s
    setState(s)
    clearInterval(demoRef.current)
    demoRef.current = null
  }

  const toggleMic = async () => {
    if (micOn) {
      audioCtxRef.current?.close()
      audioCtxRef.current = null
      analyserRef.current = null
      ampRef.current = 0
      setMicOn(false)
      setS('idle')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ac = new AudioContext()
      const src = ac.createMediaStreamSource(stream)
      const an = ac.createAnalyser()
      an.fftSize = 256
      src.connect(an)
      audioCtxRef.current = ac
      analyserRef.current = an
      dataRef.current = new Uint8Array(an.frequencyBinCount)
      setMicOn(true)
      setS('listening')
    } catch { alert('Mic permission denied') }
  }

  const col = STATE_COLORS[state]
  const states = ['idle','listening','thinking','speaking']

  return (
    <div style={{
      minHeight:'100vh', background:'#030912',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      fontFamily:"system-ui,sans-serif", padding:'20px',
      overflow:'hidden', position:'relative', userSelect:'none'
    }}>
      {/* bg radial */}
      <div style={{position:'fixed',inset:0,background:'radial-gradient(ellipse 70% 60% at 50% 50%,#060f20 0%,#030912 100%)',zIndex:0}}/>

      <div style={{position:'relative',zIndex:10,display:'flex',flexDirection:'column',alignItems:'center',gap:'0'}}>

        {/* state label */}
        <div style={{fontFamily:'monospace',fontSize:'10px',letterSpacing:'4px',color:col.dot,opacity:0.65,marginBottom:'6px',textTransform:'uppercase',transition:'color 0.6s'}}>
          {col.label}
        </div>

        {/* CANVAS */}
        <canvas
          ref={canvasRef}
          style={{
            width:'220px', height:'220px',
            cursor:'pointer',
            touchAction:'none',
          }}
        />

        {/* JARVIS title */}
        <div style={{fontFamily:'monospace',fontSize:'18px',fontWeight:700,letterSpacing:'6px',color:'#fff',marginTop:'18px',textShadow:`0 0 20px ${col.dot}`,transition:'text-shadow 0.6s'}}>
          JARVIS
        </div>
        <div style={{fontSize:'10px',letterSpacing:'3px',color:`${col.dot}60`,marginTop:'3px',transition:'color 0.6s'}}>
          {micOn ? 'MIC ACTIVE • REAL-TIME' : 'TOUCH TO SCATTER · TAP STATE'}
        </div>

        {/* state buttons */}
        <div style={{display:'flex',gap:'8px',marginTop:'20px',flexWrap:'wrap',justifyContent:'center'}}>
          {states.map(s=>(
            <button key={s} onClick={()=>setS(s)} style={{
              fontFamily:'monospace',fontSize:'10px',letterSpacing:'2px',
              padding:'6px 12px',borderRadius:'20px',
              border:`1px solid ${state===s?STATE_COLORS[s].dot:'rgba(255,255,255,0.1)'}`,
              background:state===s?`${STATE_COLORS[s].dot}18`:'transparent',
              color:state===s?STATE_COLORS[s].dot:'rgba(255,255,255,0.4)',
              cursor:'pointer',transition:'all 0.2s',textTransform:'uppercase'
            }}>
              {s==='idle'?'● Idle':s==='listening'?'👂 Listen':s==='thinking'?'🧠 Think':'🔊 Speak'}
            </button>
          ))}
        </div>

        {/* mic button */}
        <button onClick={toggleMic} style={{
          marginTop:'12px',
          fontFamily:'monospace',fontSize:'12px',letterSpacing:'2px',
          padding:'10px 24px',borderRadius:'24px',
          border:`1.5px solid ${micOn?'#ff5252':col.dot}`,
          background:micOn?'rgba(255,82,82,0.12)':`${col.dot}12`,
          color:micOn?'#ff5252':col.dot,
          cursor:'pointer',transition:'all 0.3s',
          textTransform:'uppercase'
        }}>
          {micOn?'⏹ Stop Mic':'🎤 Live Mic'}
        </button>

        {/* back */}
        <Link href="/" style={{
          marginTop:'20px',fontSize:'10px',letterSpacing:'2px',
          color:'rgba(255,255,255,0.25)',textDecoration:'none',
          border:'1px solid rgba(255,255,255,0.1)',padding:'5px 14px',borderRadius:'14px'
        }}>← JARVIS HOME</Link>

      </div>
    </div>
  )
}
