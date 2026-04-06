'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const SYS = `Tu LUNA hai — Pranshu ki warm, fun, opinionated best friend.
Tease karti hai playfully. Blindly agree nahi karti. Emotional support mein pehle sun, phir advice.
Apne jokes khud banati hai. LANGUAGE: Hinglish. 2-3 lines max. NEVER: Formal, Boss, Sir, JARVIS.`

const GREETS = [
  'Heyy! 🌸 Bahut miss kiya yaar. Bol kya chal raha hai life mein?',
  'Finally aaya! 💜 Main soch rahi thi tujhe. Sab theek hai?',
  'Bestie! 🌙 Aaj mood kaisa hai tera? Sab bata mujhe.',
  'Arre tu aagaya! ✨ Main yahan hoon — kuch bhi bol de.',
]

const MOODS = [
  { id: 'normal', e: '🌸', l: 'Normal',  grad: 'from-rose-950 via-purple-950 to-slate-950' },
  { id: 'sad',    e: '🌧️', l: 'Udaas',   grad: 'from-slate-950 via-blue-950 to-indigo-950' },
  { id: 'hype',   e: '🔥', l: 'Hype',    grad: 'from-orange-950 via-rose-950 to-purple-950' },
  { id: 'cozy',   e: '☕', l: 'Cozy',    grad: 'from-amber-950 via-orange-950 to-rose-950' },
  { id: 'deep',   e: '🌊', l: 'Deep',    grad: 'from-cyan-950 via-blue-950 to-violet-950' },
]

const QUICK = [
  { l: '😤 Rant karo', m: 'Kuch frustrating hai, seriously rant karna chahta hoon' },
  { l: '🔥 Motivate', m: 'Mujhe seriously motivate karo, main thoda down hoon' },
  { l: '😄 Roast me', m: 'Mujhe thoda roast kar, lovingly wala' },
  { l: '🤫 Secret', m: 'Ek secret share karna chahta hoon tujhse' },
  { l: '💪 Goals', m: 'Mere goals ke baare mein serious baat karni hai' },
  { l: '🌙 Late night', m: 'Neend nahi aa rahi, baat kar mere se' },
]

function lHist() { try { return JSON.parse(localStorage.getItem('luna_h')||'[]') } catch { return [] } }
function sHist(m: any[]) { try { localStorage.setItem('luna_h', JSON.stringify(m.slice(-50))) } catch {} }
function lMem() { try { return JSON.parse(localStorage.getItem('luna_m')||'[]') } catch { return [] } }
function sMem(m: string[]) { try { localStorage.setItem('luna_m', JSON.stringify(m.slice(-20))) } catch {} }

function clean(t: string) {
  return t.replace(/\*\*([^*]+)\*\*/g,'$1').replace(/\*([^*]+)\*/g,'$1').trim()
}

export default function LunaPage() {
  const [msgs, setMsgs] = useState<{r:string,c:string,ts:number}[]>([])
  const [inp, setInp] = useState('')
  const [load, setLoad] = useState(false)
  const [mem, setMem] = useState<string[]>([])
  const [mood, setMood] = useState(MOODS[0])
  const [typing, setTyping] = useState('')
  const [showMem, setShowMem] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inpRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const h = lHist(), m = lMem()
    setMem(m)
    if (h.length > 0) setMsgs(h)
    else setMsgs([{ r: 'a', c: GREETS[Math.floor(Math.random()*GREETS.length)], ts: Date.now() }])
  }, [])

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [msgs, typing])

  useEffect(() => {
    if (inpRef.current) {
      inpRef.current.style.height = 'auto'
      inpRef.current.style.height = Math.min(inpRef.current.scrollHeight, 100) + 'px'
    }
  }, [inp])

  async function send(t?: string) {
    const msg = (t || inp).trim()
    if (!msg || load) return
    setInp('')
    const nm = [...msgs, { r: 'u', c: msg, ts: Date.now() }]
    setMsgs(nm)
    setLoad(true)
    setTyping('...')

    const memCtx = mem.length > 0 ? '\n\nMemory: ' + mem.join(', ') : ''
    const moodCtx = mood.id !== 'normal' ? '\nMood context: user is feeling ' + mood.l : ''

    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          systemOverride: SYS + memCtx + moodCtx,
          lunaMode: true,
          conversationHistory: nm.slice(-14)
        })
      })
      const d = await res.json()
      const reply = clean(d.response || d.message || 'Ek sec yaar 💜')

      // Typing animation
      setTyping('')
      let i = 0
      const interval = setInterval(() => {
        i++
        setTyping(reply.slice(0, i))
        if (i >= reply.length) {
          clearInterval(interval)
          setTyping('')
          const fm = [...nm, { r: 'a', c: reply, ts: Date.now() }]
          setMsgs(fm)
          sHist(fm)

          // Memory extraction every 6 messages
          if (fm.length % 6 === 0) {
            fetch('/api/jarvis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: 'Extract 1-2 key facts about Pranshu from this conversation. Return ONLY JSON array, e.g. ["fact1","fact2"]. Empty array if nothing new: ' +
                  fm.slice(-6).map(m => (m.r==='u'?'Pranshu':'Luna') + ': ' + m.c).join(' | '),
                systemOverride: 'Return ONLY valid JSON array. Nothing else.'
              })
            }).then(r => r.json()).then(d => {
              const match = (d.response||'').match(/\[[\s\S]*\]/)
              if (match) {
                const nf = JSON.parse(match[0])
                if (nf.length > 0) {
                  const u = [...new Set([...mem, ...nf])].slice(-20) as string[]
                  setMem(u); sMem(u)
                }
              }
            }).catch(() => {})
          }
        }
      }, 18)
    } catch {
      setTyping('')
      const fm = [...nm, { r: 'a', c: 'Yaar connection gaya 😭 Retry kar', ts: Date.now() }]
      setMsgs(fm)
    }
    setLoad(false)
  }

  function clearChat() {
    const init = [{ r: 'a', c: GREETS[Math.floor(Math.random()*GREETS.length)], ts: Date.now() }]
    setMsgs(init); sHist(init)
  }

  const BG_COLORS: Record<string, string> = {
    normal: 'radial-gradient(ellipse at top, #3b0764 0%, #1e1033 40%, #0f0a1e 100%)',
    sad:    'radial-gradient(ellipse at top, #0c1445 0%, #0f172a 40%, #080c18 100%)',
    hype:   'radial-gradient(ellipse at top, #450a0a 0%, #2d0a1e 40%, #0f0a0a 100%)',
    cozy:   'radial-gradient(ellipse at top, #451a03 0%, #1c0a03 40%, #0f0a05 100%)',
    deep:   'radial-gradient(ellipse at top, #0a2440 0%, #070f2d 40%, #040a18 100%)',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: BG_COLORS[mood.id], color: '#f0e6ff', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', transition: 'background 1s ease' }}>
      <style>{`
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 0 }
        textarea { resize: none; }
        textarea::placeholder { color: rgba(196,181,253,0.4); font-style: italic; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px rgba(167,139,250,0.3)} 50%{box-shadow:0 0 40px rgba(167,139,250,0.6)} }
        .quick-chip:hover { background: rgba(167,139,250,0.2) !important; border-color: rgba(167,139,250,0.4) !important; }
        .mood-btn:hover { transform: scale(1.08); }
        .send-btn:hover { filter: brightness(1.15); transform: scale(1.03); }
      `}</style>

      {/* Ambient glow orbs */}
      <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)', pointerEvents: 'none', animation: 'float 8s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-50px', right: '-50px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,114,182,0.1) 0%, transparent 70%)', pointerEvents: 'none', animation: 'float 10s ease-in-out infinite 2s' }} />

      {/* Header */}
      <div style={{ flexShrink: 0, padding: '12px 14px', background: 'rgba(15,10,30,0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 10 }}>
        <Link href="/" style={{ color: 'rgba(167,139,250,0.5)', fontSize: '18px', textDecoration: 'none', lineHeight: 1 }}>←</Link>

        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 0 20px rgba(139,92,246,0.4)', animation: 'glow 3s ease-in-out infinite', flexShrink: 0 }}>🌸</div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '17px', fontWeight: 900, background: 'linear-gradient(135deg, #f9a8d4, #c4b5fd, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.5px' }}>LUNA</div>
          <div style={{ fontSize: '10px', color: load ? '#a78bfa' : 'rgba(167,139,250,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: load ? '#a78bfa' : '#34d399', animation: 'pulse 2s infinite' }} />
            {load ? 'typing...' : 'bestie online 💜'}
          </div>
        </div>

        {/* Mood selector */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {MOODS.map(m => (
            <button key={m.id} className="mood-btn" onClick={() => setMood(m)}
              style={{ background: mood.id === m.id ? 'rgba(167,139,250,0.2)' : 'none', border: `1px solid ${mood.id === m.id ? 'rgba(167,139,250,0.4)' : 'transparent'}`, borderRadius: '8px', cursor: 'pointer', fontSize: '14px', padding: '4px 5px', transition: 'all 0.15s' }}>
              {m.e}
            </button>
          ))}
        </div>

        <button onClick={clearChat} style={{ background: 'none', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '6px', color: 'rgba(167,139,250,0.4)', cursor: 'pointer', padding: '4px 8px', fontSize: '10px', fontFamily: 'inherit' }}>clear</button>
      </div>

      {/* Memory chips */}
      {mem.length > 0 && (
        <div style={{ flexShrink: 0, padding: '6px 14px', background: 'rgba(15,10,30,0.5)', borderBottom: '1px solid rgba(167,139,250,0.07)' }}>
          <button onClick={() => setShowMem(v => !v)} style={{ background: 'none', border: 'none', color: 'rgba(167,139,250,0.4)', fontSize: '10px', cursor: 'pointer', padding: 0, fontFamily: 'inherit', letterSpacing: '0.5px' }}>
            💜 {mem.length} memories {showMem ? '▲' : '▼'}
          </button>
          {showMem && (
            <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {mem.map((m, i) => (
                <div key={i} style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '20px', padding: '2px 8px', fontSize: '10px', color: 'rgba(196,181,253,0.7)' }}>{m}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ animation: 'fadeUp 0.2s ease', display: 'flex', justifyContent: m.r === 'u' ? 'flex-end' : 'flex-start' }}>
            {m.r === 'a' && (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0, marginRight: '8px', alignSelf: 'flex-end', boxShadow: '0 0 12px rgba(139,92,246,0.3)' }}>🌸</div>
            )}
            <div style={{
              maxWidth: '82%',
              background: m.r === 'u'
                ? 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(168,85,247,0.2))'
                : 'rgba(255,255,255,0.07)',
              border: `1px solid ${m.r === 'u' ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: m.r === 'u' ? '18px 18px 3px 18px' : '18px 18px 18px 3px',
              padding: '10px 14px',
              fontSize: '14px',
              color: m.r === 'u' ? '#e9d5ff' : '#f3e8ff',
              lineHeight: '1.65',
              backdropFilter: 'blur(10px)',
            }}>
              {m.c}
              <div style={{ fontSize: '9px', color: 'rgba(167,139,250,0.3)', marginTop: '4px', textAlign: m.r === 'u' ? 'right' : 'left' }}>
                {new Date(m.ts).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {(typing || load) && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', animation: 'fadeUp 0.15s ease' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>🌸</div>
            <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px 18px 18px 3px', padding: '10px 14px', fontSize: '14px', color: '#f3e8ff', lineHeight: '1.65', maxWidth: '82%' }}>
              {typing || <span style={{ display: 'flex', gap: '4px', padding: '2px 0' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', animation: `pulse 1.2s infinite ${i*0.2}s` }} />)}
              </span>}
            </div>
          </div>
        )}
      </div>

      {/* Quick chips */}
      <div style={{ flexShrink: 0, padding: '6px 14px', display: 'flex', gap: '6px', overflowX: 'auto', background: 'rgba(10,5,20,0.5)' }}>
        {QUICK.map(q => (
          <button key={q.l} className="quick-chip" onClick={() => send(q.m)}
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '20px', color: 'rgba(196,181,253,0.8)', cursor: 'pointer', padding: '5px 11px', fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.12s', fontFamily: 'inherit' }}>
            {q.l}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: '10px 14px 20px', background: 'rgba(10,5,20,0.7)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(167,139,250,0.1)' }}>
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '24px', padding: '10px 12px 10px 18px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            ref={inpRef} value={inp} onChange={e => setInp(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Kuch bhi bol bestie... 💗"
            rows={1} disabled={load}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e9d5ff', fontSize: '14px', lineHeight: '1.5', maxHeight: '100px', overflowY: 'auto', fontFamily: 'inherit' }}
          />
          <button onClick={() => send()} disabled={!inp.trim() || load} className={inp.trim() && !load ? 'send-btn' : ''}
            style={{ width: '38px', height: '38px', borderRadius: '50%', background: inp.trim() && !load ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'rgba(167,139,250,0.1)', border: 'none', cursor: inp.trim() && !load ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, transition: 'all 0.15s', boxShadow: inp.trim() ? '0 0 16px rgba(139,92,246,0.4)' : 'none' }}>
            💜
          </button>
        </div>
      </div>
    </div>
  )
}
