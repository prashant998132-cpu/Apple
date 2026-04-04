'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '../components/shared/Sidebar'

type Msg = {
  r: 'u' | 'a'
  c: string
  imageUrl?: string
  videoUrl?: string
  widget?: string
  thinking?: string
  richData?: any
  provider?: string
}
type ChatMode = 'auto' | 'flash' | 'think' | 'deep'

const STORAGE_KEY = 'jarvis_chat_v2'
const MEMORY_KEY  = 'jarvis_memory_prompt'
const MODE_KEY    = 'jarvis_chat_mode'

// ── Widgets ──────────────────────────────────────────────────
function CalcWidget() {
  const [expr, setExpr] = useState('')
  const [res, setRes]   = useState('0')
  const rows = [['7','8','9','DIV'],['4','5','6','MUL'],['1','2','3','-'],['0','.','DEL','+'],['C','(',')', '=']]
  const sym: Record<string,string> = { DIV:'÷', MUL:'×', DEL:'⌫' }
  function tap(k: string) {
    if (k === 'C') { setExpr(''); setRes('0'); return }
    if (k === 'DEL') { setExpr(e => e.slice(0, -1)); return }
    if (k === '=') {
      try { const r = String(Function('"use strict";return(' + expr.replace(/DIV/g,'/').replace(/MUL/g,'*') + ')')());setRes(r);setExpr(r) }
      catch { setRes('Err') }
      return
    }
    const n = expr + (k === 'DIV' ? '/' : k === 'MUL' ? '*' : k)
    setExpr(n)
    try { setRes(String(Function('"use strict";return(' + n.replace(/DIV/g,'/').replace(/MUL/g,'*') + ')')()) } catch {}
  }
  return (
    <div style={{ background:'#0a1628', border:'1px solid #1a3a5a', borderRadius:'16px', padding:'12px', maxWidth:'240px' }}>
      <div style={{ fontSize:'11px', color:'#00e5ff', marginBottom:'8px' }}>Calculator</div>
      <div style={{ background:'#030a14', borderRadius:'8px', padding:'10px', textAlign:'right', fontSize:'22px', fontWeight:700, marginBottom:'6px', minHeight:'42px', color:'#00e5ff', overflow:'auto' }}>{res}</div>
      <div style={{ fontSize:'10px', color:'#334', textAlign:'right', marginBottom:'6px', minHeight:'14px' }}>{expr}</div>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'5px', marginBottom:'5px' }}>
          {row.map(k => (
            <button key={k} onClick={() => tap(k)} style={{ padding:'11px 4px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'14px', fontWeight:600, background: k==='='?'#00e5ff22':k==='C'?'#ff525222':['DIV','MUL','-','+'].includes(k)?'#1a3a5a':'#111d2e', color: k==='='?'#00e5ff':k==='C'?'#ff5252':'#e0f0ff' }}>
              {sym[k] || k}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

function QrWidget({ text }: { text: string }) {
  const [v, setV]   = useState(text)
  const [url, setUrl] = useState(text ? 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(text) : '')
  return (
    <div style={{ background:'#0a1628', border:'1px solid #1a3a5a', borderRadius:'16px', padding:'12px', maxWidth:'220px' }}>
      <div style={{ fontSize:'11px', color:'#00e5ff', marginBottom:'8px' }}>QR Code</div>
      <input value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === 'Enter' && setUrl('https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(v))} placeholder="Text ya URL..." style={{ width:'100%', background:'#030a14', border:'1px solid #1a3a5a', borderRadius:'8px', color:'#e0f0ff', padding:'6px 10px', fontSize:'12px', outline:'none', marginBottom:'8px', boxSizing:'border-box' }} />
      <button onClick={() => setUrl('https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(v))} style={{ width:'100%', background:'#00e5ff22', border:'1px solid #00e5ff', borderRadius:'8px', color:'#00e5ff', padding:'6px', cursor:'pointer', fontSize:'12px', marginBottom:'8px' }}>Generate</button>
      {url && <div style={{ textAlign:'center' }}><img src={url} alt="QR" style={{ borderRadius:'8px', width:'150px', height:'150px' }} /></div>}
    </div>
  )
}

function ImageMsg({ url, prompt }: { url: string; prompt: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div style={{ maxWidth:'280px' }}>
      <div style={{ fontSize:'11px', color:'#888', marginBottom:'6px' }}>Image: {prompt.slice(0, 40)}</div>
      {!loaded && <div style={{ width:'260px', height:'180px', background:'#0a1628', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', color:'#4fc3f7' }}>Generating...</div>}
      <img src={url} alt={prompt} onLoad={() => setLoaded(true)} style={{ width:'100%', borderRadius:'12px', display: loaded ? 'block' : 'none', border:'1px solid #1a3a5a' }} />
      {loaded && <a href={url} target="_blank" rel="noreferrer" style={{ fontSize:'10px', color:'#00e5ff', marginTop:'4px', display:'block' }}>Save Image</a>}
    </div>
  )
}

function ThinkingBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom:'6px' }}>
      <button onClick={() => setOpen(v => !v)} style={{ background:'none', border:'1px solid #8b5cf644', borderRadius:'8px', color:'#8b5cf6', padding:'3px 10px', cursor:'pointer', fontSize:'11px', fontWeight:600 }}>
        {open ? '▲ Soch band karo' : '▼ Think mode — soch dekho'}
      </button>
      {open && (
        <div style={{ marginTop:'6px', padding:'10px', background:'#8b5cf611', border:'1px solid #8b5cf633', borderRadius:'10px', color:'#c4b5fd', fontSize:'12px', lineHeight:'1.6', whiteSpace:'pre-wrap', maxHeight:'200px', overflowY:'auto' }}>
          {text}
        </div>
      )}
    </div>
  )
}

function RichDataCard({ data }: { data: any }) {
  if (!data) return null
  const t = data.type
  const d = data.data
  if (t === 'weather' && d) return (
    <div style={{ background:'#0a1628', border:'1px solid #00e5ff33', borderRadius:'12px', padding:'10px', marginBottom:'6px', maxWidth:'220px' }}>
      <div style={{ color:'#4fc3f7', fontSize:'11px', marginBottom:'4px' }}>🌤 Weather</div>
      <div style={{ color:'#00e5ff', fontSize:'22px', fontWeight:700 }}>{d.temp || d.temperature || '?'}°C</div>
      <div style={{ color:'#e0f0ff', fontSize:'12px' }}>{d.description || d.condition || ''}</div>
      {d.city && <div style={{ fontSize:'11px', color:'#4fc3f755', marginTop:'2px' }}>📍 {d.city}</div>}
    </div>
  )
  if (t === 'news' && Array.isArray(d)) return (
    <div style={{ background:'#0a1628', border:'1px solid #4fc3f733', borderRadius:'12px', padding:'10px', marginBottom:'6px', maxWidth:'270px' }}>
      <div style={{ color:'#4fc3f7', fontSize:'11px', marginBottom:'6px' }}>📰 News</div>
      {d.slice(0, 3).map((a: any, i: number) => (
        <div key={i} style={{ fontSize:'12px', color:'#e0f0ff', marginBottom:'4px', paddingBottom:'4px', borderBottom: i < 2 ? '1px solid #1a3a5a' : 'none', lineHeight:'1.4' }}>{a.title || a.headline || ''}</div>
      ))}
    </div>
  )
  if (t === 'finance' && d) return (
    <div style={{ background:'#0a1628', border:'1px solid #22c55e33', borderRadius:'12px', padding:'10px', marginBottom:'6px', maxWidth:'200px' }}>
      <div style={{ color:'#22c55e', fontSize:'11px', marginBottom:'4px' }}>💰 Finance</div>
      <div style={{ color:'#e0f0ff', fontSize:'13px' }}>{JSON.stringify(d).slice(0, 100)}</div>
    </div>
  )
  return null
}

function renderText(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => (
    <span key={i} style={{ display:'block' }}>
      {line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, j) => {
        if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={j}>{p.slice(2, -2)}</strong>
        if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return <code key={j} style={{ background:'#1a3a5a', borderRadius:'4px', padding:'1px 5px', fontSize:'12px', fontFamily:'monospace' }}>{p.slice(1, -1)}</code>
        return <span key={j}>{p}</span>
      })}
    </span>
  ))
}

// ── Constants ─────────────────────────────────────────────────
const MODES: { id: ChatMode; icon: string; label: string; color: string }[] = [
  { id:'auto',  icon:'⚡', label:'Auto',  color:'#00e5ff' },
  { id:'flash', icon:'🔥', label:'Flash', color:'#ffa500' },
  { id:'think', icon:'🧠', label:'Think', color:'#8b5cf6' },
  { id:'deep',  icon:'🔬', label:'Deep',  color:'#22c55e' },
]

const QUICK = [
  { l:'🖼️ Image', m:'image banao ' },
  { l:'🔢 Calc',   m:'/calc' },
  { l:'📱 QR',     m:'/qr ' },
  { l:'📰 News',   m:'aaj ki khabar kya hai' },
  { l:'☀️ Mausam', m:'Rewa ka mausam batao' },
  { l:'🏏 Cricket', m:'cricket score batao' },
  { l:'📷 Photo',  m:'' },
]

function genPass() {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*()'
  return Array.from({ length: 16 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}

// ── Main Component ─────────────────────────────────────────────
export default function Home() {
  const [msgs,      setMsgs]      = useState<Msg[]>([{ r:'a', c:'Hey Pranshu! ⚡ Main JARVIS hoon. Kya karna hai aaj? Seedha bol!' }])
  const [inp,       setInp]       = useState('')
  const [load,      setLoad]      = useState(false)
  const [tts,       setTts]       = useState(false)
  const [sidebar,   setSidebar]   = useState(false)
  const [recording, setRecording] = useState(false)
  const [chatMode,  setChatMode]  = useState<ChatMode>('auto')
  const [memPrompt, setMemPrompt] = useState('')

  const ref      = useRef<HTMLDivElement>(null)
  const inpRef   = useRef<HTMLInputElement>(null)
  const mediaRef = useRef<any>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  // ── Load from localStorage ───────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) { const p = JSON.parse(saved); if (p.length > 0) setMsgs(p) }
      const mem = localStorage.getItem(MEMORY_KEY)
      if (mem) setMemPrompt(mem)
      const mode = localStorage.getItem(MODE_KEY) as ChatMode | null
      if (mode && ['auto','flash','think','deep'].includes(mode)) setChatMode(mode)
    } catch {}
  }, [])

  // ── Save to localStorage ─────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-60))) } catch {}
  }, [msgs])

  // ── Scroll to bottom ─────────────────────────────────────────
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [msgs, load])

  function changeChatMode(mode: ChatMode) {
    setChatMode(mode)
    try { localStorage.setItem(MODE_KEY, mode) } catch {}
  }

  async function speak(text: string) {
    if (!tts) return
    try {
      const r = await fetch('/api/tts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: text.substring(0, 300) }) })
      if (r.ok) { const b = await r.blob(); new Audio(URL.createObjectURL(b)).play() }
    } catch {}
  }

  async function toggleVoice() {
    if (recording) { mediaRef.current?.stop(); setRecording(false); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      const chunks: Blob[] = []
      mr.ondataavailable = e => chunks.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const fd = new FormData()
        fd.append('audio', new Blob(chunks, { type:'audio/webm' }), 'audio.webm')
        try {
          const r = await fetch('/api/stt', { method:'POST', body: fd })
          const d = await r.json()
          if (d.text) { setInp(d.text); inpRef.current?.focus() }
        } catch {}
      }
      mr.start(); mediaRef.current = mr; setRecording(true)
      setTimeout(() => { if (mr.state === 'recording') mr.stop() }, 10000)
    } catch { alert('Mic permission chahiye!') }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const nm: Msg[] = [...msgs, { r:'u', c:'📷 Photo bheja' }]
      setMsgs(nm); setLoad(true)
      try {
        const r = await fetch('/api/photo', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ imageBase64: reader.result }) })
        const d = await r.json()
        const rep = d.answer || 'Samajh nahi aaya'
        setMsgs([...nm, { r:'a', c: rep }]); speak(rep)
      } catch {
        setMsgs([...nm, { r:'a', c:'Photo analyse nahi ho payi' }])
      }
      setLoad(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const send = useCallback(async (text?: string) => {
    const msg = (text || inp).trim()
    if (!msg || load) return
    setInp('')

    // Slash commands
    if (msg.startsWith('/')) {
      const parts = msg.slice(1).split(' ')
      const cmd   = parts[0].toLowerCase()
      const args  = parts.slice(1).join(' ')
      if (cmd === 'calc')     { setMsgs(m => [...m, { r:'u', c: msg }, { r:'a', c:'', widget:'calc' }]); return }
      if (cmd === 'qr')       { setMsgs(m => [...m, { r:'u', c: msg }, { r:'a', c:'', widget:'qr:' + args }]); return }
      if (cmd === 'password') { setMsgs(m => [...m, { r:'u', c: msg }, { r:'a', c:'🔐 Password: ' + genPass() + '\n\nCopy kar lo!' }]); return }
      if (cmd === 'clear')    { setMsgs([{ r:'a', c:'Clear! Kya karna hai? ⚡' }]); try { localStorage.removeItem(STORAGE_KEY) } catch {} return }
      if (cmd === 'luna')     { window.location.href = '/luna'; return }
      if (cmd === 'era')      { window.location.href = '/era'; return }
    }

    const m  = msg.toLowerCase()
    const nm: Msg[] = [...msgs, { r:'u', c: msg }]
    setMsgs(nm); setLoad(true)

    // Client-side fast paths
    if (/image banao|photo banao|picture banao|wallpaper|generate image|art banao/.test(m)) {
      const p    = msg.replace(/image banao|photo banao|picture banao|wallpaper|generate image|art banao/gi, '').trim() || msg
      const seed = Math.floor(Math.random() * 999999)
      setMsgs([...nm, { r:'a', c: p, imageUrl:'https://image.pollinations.ai/prompt/' + encodeURIComponent(p) + '?model=flux&width=1024&height=1024&seed=' + seed + '&nologo=true' }])
      setLoad(false); return
    }
    if (/video banao|clip banao/.test(m)) {
      const p = msg.replace(/video banao|clip banao/gi, '').trim() || msg
      setMsgs([...nm, { r:'a', c:'Video generate ho raha hai...', videoUrl:'https://video.pollinations.ai/' + encodeURIComponent(p) }])
      setLoad(false); return
    }
    if (/password banao|strong password/.test(m)) {
      setMsgs([...nm, { r:'a', c:'🔐 Password: ' + genPass() + '\n\nCopy kar lo!' }])
      setLoad(false); return
    }

    // API call
    try {
      const r = await fetch('/api/jarvis', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          message: msg,
          conversationHistory: nm.slice(-8).map(x => ({ r: x.r, c: x.c })),
          chatMode,
          memoryPrompt: memPrompt || undefined,
          userName: 'Pranshu',
        })
      })
      const d   = await r.json()
      const rep = d.response || d.message || 'Samajh nahi aaya'
      const newMsg: Msg = {
        r: 'a',
        c: rep,
        thinking: d.thinking || undefined,
        richData: d.richData || undefined,
        provider: d.provider || undefined,
      }
      if (d.imageUrl) newMsg.imageUrl = d.imageUrl
      if (d.videoUrl) newMsg.videoUrl = d.videoUrl
      setMsgs([...nm, newMsg])
      speak(rep)
    } catch {
      setMsgs([...nm, { r:'a', c:'Network issue, retry karo!' }])
    }
    setLoad(false)
  }, [inp, load, msgs, tts, chatMode, memPrompt])

  // ── Colors ────────────────────────────────────────────────────
  const bg   = '#040e1a'
  const card  = '#0a1628'
  const tc    = '#e0f0ff'
  const bc    = '#1a3a5a'
  const mode  = MODES.find(x => x.id === chatMode) || MODES[0]

  return (
    <div style={{ position:'fixed', inset:0, background: bg, display:'flex', flexDirection:'column', fontFamily:'system-ui,sans-serif', color: tc }}>
      <style>{`@keyframes p{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}::-webkit-scrollbar{width:0}input::placeholder{color:#556}`}</style>

      <Sidebar isOpen={sidebar} onClose={() => setSidebar(false)} />

      {/* ── Header ── */}
      <div style={{ flexShrink:0, background:'#030a14', borderBottom:'1px solid ' + bc, padding:'10px 14px', display:'flex', alignItems:'center', gap:'10px', zIndex:20 }}>
        <button onClick={() => setSidebar(true)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'22px', color: tc, lineHeight:1 }}>☰</button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:'15px', letterSpacing:'1px', color:'#00e5ff' }}>⚡ JARVIS</div>
          <div style={{ fontSize:'9px', color:'#4fc3f7', letterSpacing:'2px' }}>AI ASSISTANT v10.46</div>
        </div>
        <button onClick={() => setTts(v => !v)} title="Toggle TTS" style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', opacity: tts ? 1 : 0.3 }}>🔊</button>
      </div>

      {/* ── Chat Mode Selector ── */}
      <div style={{ flexShrink:0, padding:'6px 12px', background:'#030a14', borderBottom:'1px solid ' + bc, display:'flex', gap:'6px' }}>
        {MODES.map(({ id, icon, label, color }) => (
          <button key={id} onClick={() => changeChatMode(id)} style={{
            flex:1, padding:'6px 4px', borderRadius:'10px', border:'1px solid',
            borderColor: chatMode === id ? color : bc,
            background:  chatMode === id ? color + '22' : 'transparent',
            color:        chatMode === id ? color : '#4fc3f7',
            fontSize:'11px', fontWeight:700, cursor:'pointer', transition:'all 0.2s',
          }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── Messages ── */}
      <div ref={ref} style={{ flex:1, overflowY:'scroll', padding:'12px', display:'flex', flexDirection:'column', gap:'12px', minHeight:0 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display:'flex', justifyContent: m.r === 'u' ? 'flex-end' : 'flex-start', alignItems:'flex-end', gap:'8px' }}>
            {m.r === 'a' && (
              <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', flexShrink:0 }}>⚡</div>
            )}
            <div style={{ maxWidth:'82%' }}>
              {m.r === 'a' && m.thinking && <ThinkingBlock text={m.thinking} />}
              {m.r === 'a' && m.richData  && <RichDataCard data={m.richData} />}
              {m.widget === 'calc' && <CalcWidget />}
              {m.widget?.startsWith('qr:') && <QrWidget text={m.widget.slice(3)} />}
              {m.imageUrl && <ImageMsg url={m.imageUrl} prompt={m.c} />}
              {m.videoUrl && !m.imageUrl && (
                <div style={{ background: card, border:'1px solid ' + bc, borderRadius:'12px', padding:'12px', maxWidth:'260px' }}>
                  <div style={{ fontSize:'13px', marginBottom:'8px' }}>{m.c}</div>
                  <a href={m.videoUrl} target="_blank" rel="noreferrer" style={{ display:'block', background:'#8b5cf622', border:'1px solid #8b5cf6', borderRadius:'8px', padding:'8px', textAlign:'center', color:'#8b5cf6', textDecoration:'none', fontSize:'12px' }}>🎬 Video Dekho</a>
                </div>
              )}
              {!m.widget && !m.imageUrl && !m.videoUrl && m.c && (
                <div style={{ padding:'11px 15px', borderRadius: m.r === 'u' ? '20px 20px 5px 20px' : '20px 20px 20px 5px', background: m.r === 'u' ? 'linear-gradient(135deg,#00e5ff22,#8b5cf622)' : card, border:'1px solid ' + (m.r === 'u' ? '#00e5ff44' : bc), color: tc, fontSize:'14px', lineHeight:'1.65' }}>
                  {renderText(m.c)}
                  {m.r === 'a' && m.provider && (
                    <div style={{ fontSize:'10px', color:'#4fc3f755', marginTop:'6px' }}>{m.provider}</div>
                  )}
                  {m.r === 'a' && tts && (
                    <button onClick={() => speak(m.c)} style={{ display:'block', marginTop:'4px', background:'none', border:'none', color:'#4fc3f7', cursor:'pointer', fontSize:'11px' }}>🔊 Suno</button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {load && (
          <div style={{ display:'flex', gap:'8px', alignItems:'flex-end' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px' }}>⚡</div>
            <div style={{ padding:'11px 15px', background: card, border:'1px solid ' + bc, borderRadius:'20px 20px 20px 5px', display:'flex', gap:'5px', alignItems:'center' }}>
              <div style={{ fontSize:'10px', color: mode.color, marginRight:'4px' }}>{mode.icon} {mode.label}</div>
              {[0,1,2].map(j => <div key={j} style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#00e5ff', animation:'p 1.2s ' + (j*0.2) + 's infinite' }} />)}
            </div>
          </div>
        )}
      </div>

      {/* ── Quick chips ── */}
      <div style={{ flexShrink:0, padding:'5px 12px', background:'#030a14', borderTop:'1px solid ' + bc }}>
        <div style={{ display:'flex', gap:'6px', overflowX:'auto' }}>
          {QUICK.map(q => (
            <button key={q.l} onClick={() => {
              if (q.m === '') { photoRef.current?.click(); return }
              if (q.m.endsWith(' ')) setInp(q.m)
              else send(q.m)
            }} style={{ padding:'6px 12px', borderRadius:'18px', border:'1px solid ' + bc, background: card, color: tc, fontSize:'11px', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
              {q.l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input bar ── */}
      <div style={{ flexShrink:0, padding:'8px 12px 20px', background:'#030a14', borderTop:'1px solid ' + bc }}>
        <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhoto} />
        <div style={{ display:'flex', gap:'8px', alignItems:'center', background: card, borderRadius:'28px', padding:'8px 8px 8px 16px', border:'1.5px solid ' + (inp ? '#00e5ff' : bc) }}>
          <input
            ref={inpRef}
            value={inp}
            onChange={e => setInp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={recording ? '🎤 Sun raha hoon...' : 'Kuch bhi poocho, /calc, /qr...'}
            style={{ flex:1, border:'none', background:'transparent', outline:'none', fontSize:'14px', color: tc }}
          />
          <button onClick={toggleVoice} style={{ width:'36px', height:'36px', borderRadius:'50%', background: recording ? 'rgba(255,82,82,0.15)' : 'transparent', border: recording ? '2px solid #ff5252' : 'none', cursor:'pointer', fontSize:'20px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {recording ? '⏹️' : '🎤'}
          </button>
          <button onClick={() => send()} disabled={load || !inp.trim()} style={{ width:'38px', height:'38px', borderRadius:'50%', background: inp.trim() ? 'linear-gradient(135deg,#00e5ff,#8b5cf6)' : '#1a3a5a', border:'none', cursor:'pointer', fontSize:'18px', flexShrink:0, color: inp.trim() ? '#000' : '#888', display:'flex', alignItems:'center', justifyContent:'center' }}>▶</button>
        </div>
      </div>
    </div>
  )
}
