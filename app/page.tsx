'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '../components/shared/Sidebar'

// ── UPGRADE 1: Real Streaming types ──────────────────────────
type Msg = {
  r: 'u' | 'a'
  c: string
  imageUrl?: string
  videoUrl?: string
  widget?: string
  thinking?: string
  richData?: any
  provider?: string
  ts?: number
}
type ChatMode = 'auto' | 'flash' | 'think' | 'deep'

// ── UPGRADE 3: Persistence keys ──────────────────────────────
const STORAGE_KEY = 'jarvis_msgs_v3'
const MODE_KEY    = 'jarvis_mode_v3'
const MEM_KEY     = 'jarvis_memory_v3'

function genPass() {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*()'
  return Array.from({ length: 16 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}

// ── UPGRADE 7: Markdown renderer ─────────────────────────────
function MdText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <span>
      {lines.map((line, i) => {
        const isLi = /^[-*•]\s/.test(line)
        const isNum = /^\d+\.\s/.test(line)
        const isH  = /^#{1,3}\s/.test(line)
        const content = line
          .replace(/^#{1,3}\s/, '')
          .replace(/^[-*•]\s/, '')
          .replace(/^\d+\.\s/, '')
        const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
        const rendered = parts.map((p, j) => {
          if (p.startsWith('**') && p.endsWith('**') && p.length > 4)
            return <strong key={j}>{p.slice(2, -2)}</strong>
          if (p.startsWith('`') && p.endsWith('`') && p.length > 2)
            return <code key={j} style={{ background:'#1a3a5a', borderRadius:'3px', padding:'1px 5px', fontSize:'12px', fontFamily:'monospace' }}>{p.slice(1, -1)}</code>
          if (p.startsWith('*') && p.endsWith('*') && p.length > 2)
            return <em key={j}>{p.slice(1, -1)}</em>
          return <span key={j}>{p}</span>
        })
        if (isH) return <div key={i} style={{ fontWeight:800, color:'#00e5ff', marginTop:'8px', marginBottom:'2px' }}>{rendered}</div>
        if (isLi || isNum) return <div key={i} style={{ paddingLeft:'12px', marginTop:'2px' }}>{isNum ? '• ' : '→ '}{rendered}</div>
        if (line.trim() === '') return <br key={i} />
        return <div key={i}>{rendered}</div>
      })}
    </span>
  )
}

// ── UPGRADE 4: ThinkingBlock ──────────────────────────────────
function ThinkingBlock({ text, streaming }: { text: string; streaming?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom:'6px' }}>
      <button onClick={() => setOpen(v => !v)} style={{ background:'none', border:'1px solid #8b5cf644', borderRadius:'8px', color:'#8b5cf6', padding:'3px 10px', cursor:'pointer', fontSize:'11px', fontWeight:600, display:'flex', alignItems:'center', gap:'4px' }}>
        {streaming ? '🧠 Soch raha hoon...' : (open ? '▲ Soch band karo' : '▼ Reasoning dekho')}
      </button>
      {open && (
        <div style={{ marginTop:'6px', padding:'10px', background:'#8b5cf611', border:'1px solid #8b5cf633', borderRadius:'10px', color:'#c4b5fd', fontSize:'11px', lineHeight:'1.7', whiteSpace:'pre-wrap', maxHeight:'180px', overflowY:'auto' }}>
          {text.replace(/<think>|<\/think>/g, '').trim()}
        </div>
      )}
    </div>
  )
}

// ── UPGRADE 5: RichData cards ─────────────────────────────────
function RichCard({ data }: { data: any }) {
  if (!data) return null
  const { type: t, data: d } = data
  if (t === 'weather' && d) return (
    <div style={{ background:'#0a1628', border:'1px solid #00e5ff33', borderRadius:'12px', padding:'10px', marginBottom:'6px', maxWidth:'210px' }}>
      <div style={{ color:'#4fc3f7', fontSize:'10px', marginBottom:'3px' }}>🌤 Weather</div>
      <div style={{ color:'#00e5ff', fontSize:'24px', fontWeight:800 }}>{d.temp ?? d.temperature ?? '?'}°C</div>
      <div style={{ color:'#e0f0ff', fontSize:'12px' }}>{d.description ?? d.condition ?? ''}</div>
      {d.city && <div style={{ fontSize:'10px', color:'#4fc3f755', marginTop:'2px' }}>📍 {d.city}</div>}
      {d.humidity && <div style={{ fontSize:'10px', color:'#4fc3f7' }}>💧 {d.humidity}%</div>}
    </div>
  )
  if (t === 'news' && Array.isArray(d)) return (
    <div style={{ background:'#0a1628', border:'1px solid #4fc3f733', borderRadius:'12px', padding:'10px', marginBottom:'6px', maxWidth:'270px' }}>
      <div style={{ color:'#4fc3f7', fontSize:'10px', marginBottom:'6px' }}>📰 Top News</div>
      {d.slice(0, 3).map((a: any, i: number) => (
        <div key={i} style={{ fontSize:'12px', color:'#e0f0ff', marginBottom:'4px', paddingBottom:'4px', borderBottom: i < 2 ? '1px solid #1a3a5a' : 'none', lineHeight:'1.4' }}>
          {a.url ? <a href={a.url} target="_blank" rel="noreferrer" style={{ color:'#e0f0ff', textDecoration:'none' }}>{a.title ?? a.headline ?? ''}</a> : (a.title ?? a.headline ?? '')}
        </div>
      ))}
    </div>
  )
  if (t === 'finance' && d) return (
    <div style={{ background:'#0a1628', border:'1px solid #22c55e33', borderRadius:'12px', padding:'10px', marginBottom:'6px', maxWidth:'200px' }}>
      <div style={{ color:'#22c55e', fontSize:'10px', marginBottom:'3px' }}>💰 Finance</div>
      <div style={{ color:'#e0f0ff', fontSize:'12px' }}>{typeof d === 'object' ? Object.entries(d).slice(0,3).map(([k,v]) => k + ': ' + v).join(' | ') : String(d).slice(0,100)}</div>
    </div>
  )
  return null
}

// ── Widgets (CalcWidget, QrWidget, ImageMsg) ──────────────────
function CalcWidget() {
  const [expr, setExpr] = useState('')
  const [res, setRes]   = useState('0')
  const rows = [['7','8','9','÷'],['4','5','6','×'],['1','2','3','-'],['0','.','⌫','+'],['C','(',')', '=']]
  function tap(k: string) {
    if (k === 'C') { setExpr(''); setRes('0'); return }
    if (k === '⌫') { setExpr(e => e.slice(0,-1)); return }
    if (k === '=') {
      try { const r = String(Function('"use strict";return(' + expr.split("÷").join("/").split("×").join("*") + ')')());setRes(r);setExpr(r) }
      catch { setRes('Err') }
      return
    }
    const n = expr + (k === '÷' ? '/' : k === '×' ? '*' : k)
    setExpr(n)
    try { setRes(String(Function('"use strict";return(' + n.split("÷").join("/").split("×").join("*") + ')')()) } catch {}
  }
  return (
    <div style={{ background:'#0a1628', border:'1px solid #1a3a5a', borderRadius:'16px', padding:'12px', maxWidth:'240px' }}>
      <div style={{ background:'#030a14', borderRadius:'8px', padding:'10px', textAlign:'right', fontSize:'22px', fontWeight:700, marginBottom:'6px', minHeight:'42px', color:'#00e5ff' }}>{res}</div>
      <div style={{ fontSize:'10px', color:'#334', textAlign:'right', minHeight:'14px', marginBottom:'6px' }}>{expr}</div>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'5px', marginBottom:'5px' }}>
          {row.map(k => <button key={k} onClick={() => tap(k)} style={{ padding:'11px 4px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'14px', fontWeight:600, background: k==='='?'#00e5ff22':k==='C'?'#ff525222':['÷','×','-','+'].includes(k)?'#1a3a5a':'#111d2e', color: k==='='?'#00e5ff':k==='C'?'#ff5252':'#e0f0ff' }}>{k}</button>)}
        </div>
      ))}
    </div>
  )
}

function QrWidget({ text }: { text: string }) {
  const [v, setV] = useState(text)
  const [url, setUrl] = useState(text ? 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(text) : '')
  return (
    <div style={{ background:'#0a1628', border:'1px solid #1a3a5a', borderRadius:'16px', padding:'12px', maxWidth:'220px' }}>
      <div style={{ fontSize:'11px', color:'#00e5ff', marginBottom:'8px' }}>QR Generator</div>
      <input value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === 'Enter' && setUrl('https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(v))} placeholder="Text ya URL..." style={{ width:'100%', background:'#030a14', border:'1px solid #1a3a5a', borderRadius:'8px', color:'#e0f0ff', padding:'6px 10px', fontSize:'12px', outline:'none', marginBottom:'8px', boxSizing:'border-box' }} />
      <button onClick={() => setUrl('https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(v))} style={{ width:'100%', background:'#00e5ff22', border:'1px solid #00e5ff', borderRadius:'8px', color:'#00e5ff', padding:'6px', cursor:'pointer', fontSize:'12px', marginBottom:'8px' }}>Generate</button>
      {url && <div style={{ textAlign:'center' }}><img src={url} alt="QR" style={{ borderRadius:'8px', width:'150px', height:'150px' }} /></div>}
    </div>
  )
}

// ── UPGRADE 9: Better Image UI ────────────────────────────────
function ImageMsg({ url, prompt }: { url: string; prompt: string }) {
  const [loaded, setLoaded] = useState(false)
  const [err, setErr]       = useState(false)
  return (
    <div style={{ maxWidth:'290px' }}>
      <div style={{ fontSize:'11px', color:'#888', marginBottom:'6px' }}>🎨 {prompt.slice(0, 50)}{prompt.length > 50 ? '...' : ''}</div>
      {!loaded && !err && (
        <div style={{ width:'270px', height:'190px', background:'#0a1628', borderRadius:'12px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px', border:'1px solid #1a3a5a' }}>
          <div style={{ fontSize:'24px' }}>🎨</div>
          <div style={{ fontSize:'12px', color:'#4fc3f7' }}>Generating...</div>
        </div>
      )}
      {err && <div style={{ fontSize:'12px', color:'#ff5252' }}>Image load nahi hui. Retry karo.</div>}
      <img src={url} alt={prompt} onLoad={() => setLoaded(true)} onError={() => setErr(true)} style={{ width:'100%', borderRadius:'12px', display: loaded ? 'block' : 'none', border:'1px solid #1a3a5a' }} />
      {loaded && (
        <div style={{ display:'flex', gap:'8px', marginTop:'6px' }}>
          <a href={url} target="_blank" rel="noreferrer" style={{ fontSize:'11px', color:'#00e5ff' }}>⬇ Save</a>
          <button onClick={() => {const l=document.createElement('a');l.href=url;l.download='jarvis-image.jpg';l.click()}} style={{ background:'none', border:'none', color:'#8b5cf6', cursor:'pointer', fontSize:'11px' }}>📋 Copy Link</button>
        </div>
      )}
    </div>
  )
}

// ── UPGRADE 6: Copy button ────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(text).then(() => {
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    }).catch(() => {})
  }
  return (
    <button onClick={copy} style={{ background:'none', border:'none', color: done ? '#22c55e' : '#4fc3f766', cursor:'pointer', fontSize:'12px', padding:'0 4px' }} title="Copy">
      {done ? '✓' : '⎘'}
    </button>
  )
}

// ── UPGRADE 8: Provider badge ─────────────────────────────────
function ProviderBadge({ text }: { text: string }) {
  return (
    <span style={{ fontSize:'10px', color:'#4fc3f744', marginLeft:'4px' }}>{text}</span>
  )
}

// ── Chat mode config ──────────────────────────────────────────
const MODES: { id: ChatMode; icon: string; label: string; color: string; tip: string }[] = [
  { id:'auto',  icon:'⚡', label:'Auto',  color:'#00e5ff', tip:'Smart routing — best for everything' },
  { id:'flash', icon:'🔥', label:'Flash', color:'#ffa500', tip:'Fastest — Llama 8B, instant replies' },
  { id:'think', icon:'🧠', label:'Think', color:'#8b5cf6', tip:'DeepSeek R1 — step-by-step reasoning' },
  { id:'deep',  icon:'🔬', label:'Deep',  color:'#22c55e', tip:'Gemini 2.0 + 46 tools — most powerful' },
]

const QUICK = [
  { l:'🖼️ Image', m:'image banao ' },
  { l:'🔢 Calc',  m:'/calc' },
  { l:'📱 QR',    m:'/qr ' },
  { l:'📰 News',  m:'aaj ki news kya hai' },
  { l:'☀️ Mausam', m:'Rewa ka mausam batao' },
  { l:'🏏 Cricket', m:'cricket score batao' },
  { l:'💡 Idea',  m:'kuch creative idea do' },
  { l:'📷 Photo', m:'' },
]

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function Home() {
  const [msgs,      setMsgs]      = useState<Msg[]>([{ r:'a', c:'Hey Pranshu! ⚡ JARVIS ready. Kya karna hai?', ts: Date.now() }])
  const [inp,       setInp]       = useState('')
  const [load,      setLoad]      = useState(false)
  const [tts,       setTts]       = useState(false)
  const [sidebar,   setSidebar]   = useState(false)
  const [recording, setRecording] = useState(false)
  const [chatMode,  setChatMode]  = useState<ChatMode>('auto')
  const [memPrompt, setMemPrompt] = useState('')

  // ── UPGRADE 1: Streaming state ────────────────────────────
  const [streamText,  setStreamText]  = useState('')
  const [streamThink, setStreamThink] = useState('')
  const [streamProv,  setStreamProv]  = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const ref      = useRef<HTMLDivElement>(null)
  const inpRef   = useRef<HTMLInputElement>(null)
  const mediaRef = useRef<any>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // ── UPGRADE 3: Load from localStorage ────────────────────
  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY)
      if (s) { const p = JSON.parse(s); if (p?.length > 0) setMsgs(p) }
      const mem = localStorage.getItem(MEM_KEY)
      if (mem) setMemPrompt(mem)
      const mode = localStorage.getItem(MODE_KEY) as ChatMode | null
      if (mode && ['auto','flash','think','deep'].includes(mode)) setChatMode(mode)
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-60))) } catch {}
  }, [msgs])

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [msgs, load, streamText])

  function changeMode(mode: ChatMode) {
    setChatMode(mode)
    try { localStorage.setItem(MODE_KEY, mode) } catch {}
  }

  async function speak(text: string) {
    if (!tts) return
    try {
      const r = await fetch('/api/tts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: text.slice(0, 300) }) })
      if (r.ok) { const b = await r.blob(); new Audio(URL.createObjectURL(b)).play() }
    } catch {}
  }

  // ── UPGRADE 10: Voice STT ─────────────────────────────────
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
      const nm: Msg[] = [...msgs, { r:'u', c:'📷 Photo bheja', ts: Date.now() }]
      setMsgs(nm); setLoad(true)
      try {
        const r = await fetch('/api/photo', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ imageBase64: reader.result }) })
        const d = await r.json()
        const rep = d.answer || 'Samajh nahi aaya'
        setMsgs([...nm, { r:'a', c: rep, provider:'Gemini Vision', ts: Date.now() }])
        speak(rep)
      } catch {
        setMsgs([...nm, { r:'a', c:'Photo analyse nahi ho payi', ts: Date.now() }])
      }
      setLoad(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── UPGRADE 1: Real Streaming send ───────────────────────
  const send = useCallback(async (text?: string) => {
    const msg = (text || inp).trim()
    if (!msg || load || isStreaming) return
    setInp('')

    // Slash commands
    if (msg.startsWith('/')) {
      const parts = msg.slice(1).split(' ')
      const cmd = parts[0].toLowerCase()
      const args = parts.slice(1).join(' ')
      if (cmd === 'calc')    { setMsgs(m => [...m, {r:'u',c:msg,ts:Date.now()}, {r:'a',c:'',widget:'calc',ts:Date.now()}]); return }
      if (cmd === 'qr')      { setMsgs(m => [...m, {r:'u',c:msg,ts:Date.now()}, {r:'a',c:'',widget:'qr:'+args,ts:Date.now()}]); return }
      if (cmd === 'pass')    { setMsgs(m => [...m, {r:'u',c:msg,ts:Date.now()}, {r:'a',c:'🔐 Password: '+genPass()+'\n\nCopy kar lo!',ts:Date.now()}]); return }
      if (cmd === 'clear')   { setMsgs([{r:'a',c:'Clear! Kya karna hai? ⚡',ts:Date.now()}]); try{localStorage.removeItem(STORAGE_KEY)}catch{}; return }
      if (cmd === 'luna')    { window.location.href = '/luna'; return }
      if (cmd === 'era')     { window.location.href = '/era'; return }
    }

    const m = msg.toLowerCase()
    const nm: Msg[] = [...msgs, { r:'u', c: msg, ts: Date.now() }]
    setMsgs(nm)

    // Client-side fast paths
    if (/image banao|photo banao|picture banao|wallpaper|generate image|art banao|draw|sketch/i.test(m)) {
      const p = msg.replace(/image banao|photo banao|picture banao|wallpaper|generate image|art banao|draw|sketch/gi, '').trim() || msg
      const seed = Math.floor(Math.random() * 999999)
      setMsgs([...nm, { r:'a', c: p, imageUrl:'https://image.pollinations.ai/prompt/'+encodeURIComponent(p)+'?model=flux&width=1024&height=1024&seed='+seed+'&nologo=true', provider:'Pollinations FLUX', ts: Date.now() }])
      return
    }
    if (/video banao|clip banao/i.test(m)) {
      const p = msg.replace(/video banao|clip banao/gi, '').trim() || msg
      setMsgs([...nm, { r:'a', c:'🎬 Video generate ho raha hai...', videoUrl:'https://video.pollinations.ai/'+encodeURIComponent(p), ts: Date.now() }])
      return
    }
    if (/password banao|strong password/i.test(m)) {
      setMsgs([...nm, { r:'a', c:'🔐 Password: '+genPass()+'\n\nCopy kar lo!', ts: Date.now() }])
      return
    }

    // ── UPGRADE 1: SSE Streaming ───────────────────────────
    setIsStreaming(true)
    setStreamText('')
    setStreamThink('')
    setStreamProv('Connecting...')

    abortRef.current = new AbortController()

    let fullText = ''
    let thinkText = ''
    let provider = ''
    let richData: any = null

    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: nm.slice(-8).map(x => ({ role: x.r === 'u' ? 'user' : 'assistant', content: x.c })),
          chatMode,
          memoryPrompt: memPrompt || undefined,
          userName: 'Pranshu',
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw || raw === '[DONE]') continue
          try {
            const ev = JSON.parse(raw)
            if (ev.type === 'start') {
              provider = ev.provider || ''
              setStreamProv(provider)
            } else if (ev.type === 'token') {
              fullText += ev.text
              setStreamText(fullText)
            } else if (ev.type === 'think') {
              thinkText += ev.text
              setStreamThink(thinkText)
            } else if (ev.type === 'rich') {
              richData = ev.data
            } else if (ev.type === 'done') {
              break
            } else if (ev.type === 'fallback' && ev.message === 'USE_PUTER') {
              fullText = '⚡ Sab providers busy. Puter.js se try karo (Settings > Puter Cloud).'
            }
          } catch {}
        }
      }

      const finalMsg: Msg = {
        r: 'a',
        c: fullText || '...',
        thinking: thinkText.replace(/<think>|<\/think>/g, '').trim() || undefined,
        richData: richData || undefined,
        provider: provider || undefined,
        ts: Date.now(),
      }
      setMsgs([...nm, finalMsg])
      speak(fullText)
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setMsgs([...nm, { r:'a', c:'Network issue — retry karo!', ts: Date.now() }])
      }
    } finally {
      setIsStreaming(false)
      setStreamText('')
      setStreamThink('')
      setStreamProv('')
    }
  }, [inp, load, isStreaming, msgs, tts, chatMode, memPrompt])

  // ── Colors ────────────────────────────────────────────────
  const bg  = '#040e1a'
  const card = '#0a1628'
  const tc  = '#e0f0ff'
  const bc  = '#1a3a5a'
  const cur = MODES.find(x => x.id === chatMode) || MODES[0]

  return (
    <div style={{ position:'fixed', inset:0, background: bg, display:'flex', flexDirection:'column', fontFamily:'system-ui,sans-serif', color: tc }}>
      <style>{`@keyframes p{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}@keyframes fade{from{opacity:0}to{opacity:1}}::-webkit-scrollbar{width:0}input::placeholder{color:#556}`}</style>

      <Sidebar isOpen={sidebar} onClose={() => setSidebar(false)} />

      {/* ── HEADER ── */}
      <div style={{ flexShrink:0, background:'#030a14', borderBottom:'1px solid '+bc, padding:'10px 14px', display:'flex', alignItems:'center', gap:'10px', zIndex:20 }}>
        <button onClick={() => setSidebar(true)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'22px', color: tc, lineHeight:1 }}>☰</button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:'15px', letterSpacing:'1px', color:'#00e5ff' }}>⚡ JARVIS</div>
          <div style={{ fontSize:'9px', color:'#4fc3f7', letterSpacing:'2px' }}>v10.47 — MEGA UPGRADE</div>
        </div>
        <button onClick={() => setTts(v => !v)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'18px', opacity: tts ? 1 : 0.3 }} title="Toggle TTS">🔊</button>
      </div>

      {/* ── UPGRADE 2: Chat Mode Selector ── */}
      <div style={{ flexShrink:0, padding:'6px 12px', background:'#030a14', borderBottom:'1px solid '+bc, display:'flex', gap:'5px' }}>
        {MODES.map(({ id, icon, label, color }) => (
          <button key={id} onClick={() => changeMode(id)} title={MODES.find(x=>x.id===id)?.tip} style={{
            flex:1, padding:'5px 2px', borderRadius:'10px', border:'1px solid',
            borderColor: chatMode === id ? color : bc,
            background:  chatMode === id ? color + '22' : 'transparent',
            color:        chatMode === id ? color : '#4fc3f788',
            fontSize:'10px', fontWeight:700, cursor:'pointer', transition:'all 0.15s',
          }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── MESSAGES ── */}
      <div ref={ref} style={{ flex:1, overflowY:'scroll', padding:'12px', display:'flex', flexDirection:'column', gap:'10px', minHeight:0 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display:'flex', justifyContent: m.r==='u' ? 'flex-end' : 'flex-start', alignItems:'flex-end', gap:'8px', animation:'fade 0.2s ease' }}>
            {m.r === 'a' && (
              <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>⚡</div>
            )}
            <div style={{ maxWidth:'84%' }}>
              {m.r === 'a' && m.thinking && <ThinkingBlock text={m.thinking} />}
              {m.r === 'a' && m.richData  && <RichCard data={m.richData} />}
              {m.widget === 'calc' && <CalcWidget />}
              {m.widget?.startsWith('qr:') && <QrWidget text={m.widget.slice(3)} />}
              {m.imageUrl && <ImageMsg url={m.imageUrl} prompt={m.c} />}
              {m.videoUrl && !m.imageUrl && (
                <div style={{ background: card, border:'1px solid '+bc, borderRadius:'12px', padding:'12px', maxWidth:'260px' }}>
                  <div style={{ fontSize:'13px', marginBottom:'8px' }}>{m.c}</div>
                  <a href={m.videoUrl} target="_blank" rel="noreferrer" style={{ display:'block', background:'#8b5cf622', border:'1px solid #8b5cf6', borderRadius:'8px', padding:'8px', textAlign:'center', color:'#8b5cf6', textDecoration:'none', fontSize:'12px' }}>🎬 Video Dekho</a>
                </div>
              )}
              {!m.widget && !m.imageUrl && !m.videoUrl && m.c && (
                <div style={{ padding:'10px 14px', borderRadius: m.r==='u' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.r==='u' ? 'linear-gradient(135deg,#00e5ff22,#8b5cf622)' : card, border:'1px solid '+(m.r==='u'?'#00e5ff44':bc), color: tc, fontSize:'14px', lineHeight:'1.7' }}>
                  {/* ── UPGRADE 7: Markdown rendering ── */}
                  <MdText text={m.c} />
                  {m.r === 'a' && (
                    <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'6px' }}>
                      {/* ── UPGRADE 6: Copy button ── */}
                      <CopyBtn text={m.c} />
                      {/* ── UPGRADE 8: Provider badge ── */}
                      {m.provider && <ProviderBadge text={m.provider} />}
                      {tts && <button onClick={() => speak(m.c)} style={{ background:'none', border:'none', color:'#4fc3f766', cursor:'pointer', fontSize:'11px' }}>🔊</button>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* ── UPGRADE 1: Live Streaming bubble ── */}
        {isStreaming && (
          <div style={{ display:'flex', gap:'8px', alignItems:'flex-end', animation:'fade 0.2s ease' }}>
            <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>⚡</div>
            <div style={{ maxWidth:'84%' }}>
              {streamThink && <ThinkingBlock text={streamThink} streaming />}
              <div style={{ padding:'10px 14px', background: card, border:'1px solid '+bc, borderRadius:'18px 18px 18px 4px', color: tc, fontSize:'14px', lineHeight:'1.7' }}>
                {streamText ? <MdText text={streamText} /> : (
                  <div style={{ display:'flex', gap:'5px', alignItems:'center' }}>
                    <span style={{ fontSize:'10px', color: cur.color }}>{cur.icon} {streamProv || 'Thinking...'}</span>
                    {[0,1,2].map(j => <div key={j} style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#00e5ff', animation:'p 1.2s '+(j*0.2)+'s infinite' }} />)}
                  </div>
                )}
                {streamText && streamProv && <div style={{ fontSize:'10px', color:'#4fc3f744', marginTop:'4px' }}>{streamProv}</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick chips ── */}
      <div style={{ flexShrink:0, padding:'5px 12px', background:'#030a14', borderTop:'1px solid '+bc }}>
        <div style={{ display:'flex', gap:'5px', overflowX:'auto', paddingBottom:'2px' }}>
          {QUICK.map(q => (
            <button key={q.l} onClick={() => {
              if (q.m === '') { photoRef.current?.click(); return }
              if (q.m.endsWith(' ')) setInp(q.m)
              else send(q.m)
            }} style={{ padding:'5px 10px', borderRadius:'16px', border:'1px solid '+bc, background: card, color: tc, fontSize:'11px', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
              {q.l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input bar ── */}
      <div style={{ flexShrink:0, padding:'8px 12px 20px', background:'#030a14', borderTop:'1px solid '+bc }}>
        <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhoto} />
        <div style={{ display:'flex', gap:'6px', alignItems:'center', background: card, borderRadius:'26px', padding:'6px 6px 6px 14px', border:'1.5px solid '+(inp?'#00e5ff':isStreaming?cur.color:bc), transition:'border-color 0.2s' }}>
          <input
            ref={inpRef}
            value={inp}
            onChange={e => setInp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={recording ? '🎤 Sun raha hoon...' : isStreaming ? cur.icon+' '+cur.label+' mode...' : 'Kuch bhi poocho...'}
            disabled={isStreaming}
            style={{ flex:1, border:'none', background:'transparent', outline:'none', fontSize:'14px', color: tc }}
          />
          {/* ── UPGRADE 10: Voice button ── */}
          <button onClick={toggleVoice} style={{ width:'34px', height:'34px', borderRadius:'50%', background: recording?'rgba(255,82,82,0.15)':'transparent', border: recording?'2px solid #ff5252':'none', cursor:'pointer', fontSize:'18px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {recording ? '⏹️' : '🎤'}
          </button>
          {isStreaming ? (
            <button onClick={() => abortRef.current?.abort()} style={{ width:'36px', height:'36px', borderRadius:'50%', background:'#ff525222', border:'1px solid #ff5252', cursor:'pointer', fontSize:'16px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }} title="Stop">⏹</button>
          ) : (
            <button onClick={() => send()} disabled={!inp.trim()} style={{ width:'36px', height:'36px', borderRadius:'50%', background: inp.trim()?'linear-gradient(135deg,#00e5ff,#8b5cf6)':'#1a3a5a', border:'none', cursor:'pointer', fontSize:'16px', flexShrink:0, color: inp.trim()?'#000':'#888', display:'flex', alignItems:'center', justifyContent:'center' }}>▶</button>
          )}
        </div>
      </div>
    </div>
  )
}
