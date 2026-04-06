'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const SYS = `Tu Era hai — ek creative, expressive AI writer.
Poetry, stories, shayari, lyrics, scripts — sab likhti hai.
Style: bold, poetic, emotional. Hinglish + Hindi + English.
Never boring. Always creative. Short, punchy responses until asked for more.`

const TEMPLATES = [
  { icon: '💌', label: 'Shayari',    prompt: 'Ek beautiful Hindi shayari likho about: ' },
  { icon: '📖', label: 'Story',      prompt: 'Ek short story likho: ' },
  { icon: '🎵', label: 'Song Lyrics',prompt: 'Ek song ke lyrics likho about: ' },
  { icon: '✉️', label: 'Letter',     prompt: 'Ek emotional letter likho to: ' },
  { icon: '🎭', label: 'Dialogue',   prompt: 'Scene likho jisme: ' },
  { icon: '🌙', label: 'Poem',       prompt: 'Ek deep poem likho about: ' },
  { icon: '🔥', label: 'Rant',       prompt: 'Passionate rant likho about: ' },
  { icon: '💫', label: 'Caption',    prompt: 'Instagram caption likho for: ' },
]

const INSPO = [
  'mohabbat aur intezaar',
  'raaton ki khamoshi',
  'sapne jo toote nahi',
  'waqt ka safar',
  'dil ki baat',
  'azaadi ka ehsaas',
]

function lHist() { try { return JSON.parse(localStorage.getItem('era_h')||'[]') } catch { return [] } }
function sHist(m: any[]) { try { localStorage.setItem('era_h', JSON.stringify(m.slice(-40))) } catch {} }

export default function EraPage() {
  const [msgs, setMsgs] = useState<{r:string,c:string,ts:number}[]>([])
  const [inp, setInp] = useState('')
  const [load, setLoad] = useState(false)
  const [copiedId, setCopiedId] = useState<number|null>(null)
  const [template, setTemplate] = useState<typeof TEMPLATES[0]|null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const inpRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const h = lHist()
    setMsgs(h.length > 0 ? h : [{ r: 'a', c: 'Namaste ✨\n\nMain Era hoon — teri creative partner. Shayari, stories, lyrics, scripts — kuch bhi likh sakti hoon.\n\nKya likhein aaj?', ts: Date.now() }])
  }, [])

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [msgs])

  useEffect(() => {
    if (inpRef.current) {
      inpRef.current.style.height = 'auto'
      inpRef.current.style.height = Math.min(inpRef.current.scrollHeight, 120) + 'px'
    }
  }, [inp])

  function selectTemplate(t: typeof TEMPLATES[0]) {
    setTemplate(t)
    setInp(t.prompt)
    inpRef.current?.focus()
  }

  async function send(override?: string) {
    const msg = (override || inp).trim()
    if (!msg || load) return
    setInp(''); setTemplate(null)
    const nm = [...msgs, { r: 'u', c: msg, ts: Date.now() }]
    setMsgs(nm); setLoad(true)

    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: nm.slice(-8).map(x => ({ role: x.r === 'u' ? 'user' : 'assistant', content: x.c })),
          systemOverride: SYS,
          userName: 'Pranshu'
        })
      })
      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = '', full = ''
      const tempId = Date.now()

      setMsgs([...nm, { r: 'a', c: '...', ts: tempId }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw || raw === '[DONE]') continue
          try {
            const ev = JSON.parse(raw)
            if (ev.type === 'token') { full += ev.text; setMsgs([...nm, { r: 'a', c: full, ts: tempId }]) }
          } catch {}
        }
      }

      const fm = [...nm, { r: 'a', c: full || 'Ek sec...', ts: tempId }]
      setMsgs(fm); sHist(fm)
    } catch {
      const fm = [...nm, { r: 'a', c: 'Yaar connection problem 😔 Try again?', ts: Date.now() }]
      setMsgs(fm)
    }
    setLoad(false)
  }

  function copyMsg(text: string, idx: number) {
    navigator.clipboard?.writeText(text)
    setCopiedId(idx); setTimeout(() => setCopiedId(null), 2000)
  }

  function clearChat() {
    const init = [{ r: 'a', c: 'Nayi shuruat ✨ Kya likhein?', ts: Date.now() }]
    setMsgs(init); sHist(init)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0510', color: '#f0e6ff', fontFamily: "'Georgia', serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 3px }
        ::-webkit-scrollbar-thumb { background: rgba(251,113,133,0.2); border-radius: 3px }
        textarea { resize: none; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .tmpl-btn:hover { background: rgba(251,113,133,0.15) !important; border-color: rgba(251,113,133,0.35) !important; }
        .inspo-btn:hover { color: #fda4af !important; }
        pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; }
      `}</style>

      {/* Gradient background */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 20%, rgba(79,29,110,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(159,18,57,0.2) 0%, transparent 60%)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ flexShrink: 0, padding: '12px 14px', background: 'rgba(10,5,16,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(251,113,133,0.1)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 10, position: 'relative' }}>
        <Link href="/" style={{ color: 'rgba(251,113,133,0.5)', fontSize: '18px', textDecoration: 'none' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 900, background: 'linear-gradient(135deg, #fda4af, #f9a8d4, #c4b5fd)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 4s ease infinite', letterSpacing: '1px' }}>ERA</div>
          <div style={{ fontSize: '10px', color: 'rgba(251,113,133,0.5)', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>creative writing AI</div>
        </div>
        <button onClick={clearChat} style={{ background: 'none', border: '1px solid rgba(251,113,133,0.15)', borderRadius: '6px', color: 'rgba(251,113,133,0.4)', cursor: 'pointer', padding: '4px 8px', fontSize: '10px', fontFamily: 'inherit' }}>reset</button>
      </div>

      {/* Template grid */}
      <div style={{ flexShrink: 0, padding: '8px 12px', background: 'rgba(10,5,16,0.6)', borderBottom: '1px solid rgba(251,113,133,0.07)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '6px', width: 'max-content' }}>
          {TEMPLATES.map(t => (
            <button key={t.label} className="tmpl-btn" onClick={() => selectTemplate(t)}
              style={{ background: template?.label === t.label ? 'rgba(251,113,133,0.15)' : 'rgba(251,113,133,0.05)', border: `1px solid ${template?.label === t.label ? 'rgba(251,113,133,0.35)' : 'rgba(251,113,133,0.12)'}`, borderRadius: '20px', color: template?.label === t.label ? '#fda4af' : 'rgba(251,113,133,0.6)', cursor: 'pointer', padding: '5px 11px', fontSize: '11px', whiteSpace: 'nowrap', transition: 'all 0.12s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ animation: 'fadeUp 0.2s ease' }}>
            {m.r === 'u' ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ maxWidth: '80%', background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.2)', borderRadius: '16px 16px 3px 16px', padding: '10px 14px', fontSize: '14px', color: '#fecdd3', lineHeight: '1.6', fontFamily: "'Inter', sans-serif" }}>
                  {m.c}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(251,113,133,0.08)', borderRadius: '3px 16px 16px 16px', padding: '14px 16px', fontSize: '15px', color: '#fce7f3', lineHeight: '1.8', borderLeft: '3px solid rgba(251,113,133,0.3)' }}>
                  <pre style={{ margin: 0 }}>{m.c}{i === msgs.length-1 && load && <span style={{ animation: 'shimmer 1s infinite', display: 'inline-block', width: '2px', height: '14px', background: '#f9a8d4', marginLeft: '2px', verticalAlign: 'middle' }}>|</span>}</pre>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', paddingLeft: '4px' }}>
                  <button onClick={() => copyMsg(m.c, i)} style={{ background: 'none', border: '1px solid rgba(251,113,133,0.12)', borderRadius: '5px', color: copiedId === i ? '#fda4af' : 'rgba(251,113,133,0.4)', cursor: 'pointer', fontSize: '10px', padding: '2px 8px', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                    {copiedId === i ? '✓ Copied' : 'Copy'}
                  </button>
                  <button onClick={() => send('Isko aur extend karo, aur details do')} style={{ background: 'none', border: '1px solid rgba(251,113,133,0.12)', borderRadius: '5px', color: 'rgba(251,113,133,0.4)', cursor: 'pointer', fontSize: '10px', padding: '2px 8px', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                    Extend ↗
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {load && msgs[msgs.length-1]?.c === '...' && (
          <div style={{ display: 'flex', gap: '5px', padding: '8px 16px', animation: 'fadeUp 0.15s ease' }}>
            {[0,1,2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f9a8d4', animation: `shimmer 1.2s infinite ${i*0.2}s` }} />)}
          </div>
        )}
      </div>

      {/* Inspiration bar */}
      <div style={{ flexShrink: 0, padding: '5px 12px', background: 'rgba(10,5,16,0.5)', display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
        <span style={{ fontSize: '10px', color: 'rgba(251,113,133,0.3)', whiteSpace: 'nowrap', fontFamily: 'Georgia, serif' }}>✨ inspo:</span>
        {INSPO.map(s => (
          <button key={s} className="inspo-btn" onClick={() => send((template?.prompt || 'Shayari likho about ') + s)}
            style={{ background: 'none', border: 'none', color: 'rgba(251,113,133,0.4)', cursor: 'pointer', fontSize: '11px', padding: '3px 0', fontFamily: 'Georgia, serif', fontStyle: 'italic', whiteSpace: 'nowrap', transition: 'all 0.12s' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: '10px 14px 20px', background: 'rgba(10,5,16,0.85)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(251,113,133,0.08)' }}>
        {template && (
          <div style={{ fontSize: '11px', color: 'rgba(251,113,133,0.5)', marginBottom: '6px', fontFamily: 'inherit' }}>{template.icon} {template.label} mode</div>
        )}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(251,113,133,0.18)', borderRadius: '16px', padding: '10px 12px 10px 16px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea ref={inpRef} value={inp} onChange={e => setInp(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Kya likhein? Koi topic, feeling, ya idea..."
            rows={1} disabled={load}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fce7f3', fontSize: '14px', lineHeight: '1.5', maxHeight: '120px', overflowY: 'auto', fontFamily: 'Georgia, serif', fontStyle: inp ? 'normal' : 'italic' }}
          />
          <button onClick={() => send()} disabled={!inp.trim() || load}
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: inp.trim() && !load ? 'linear-gradient(135deg, #fb7185, #f9a8d4)' : 'rgba(251,113,133,0.1)', border: 'none', cursor: inp.trim() && !load ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, transition: 'all 0.15s' }}>
            💗
          </button>
        </div>
      </div>
    </div>
  )
}
