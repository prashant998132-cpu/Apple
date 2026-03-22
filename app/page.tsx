'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

// Message types
type MsgType = 'text' | 'image' | 'video' | 'widget' | 'search' | 'error' | 'thinking'
interface Msg {
  r: 'u' | 'a'
  c: string
  type?: MsgType
  imageUrl?: string
  videoUrl?: string
  widget?: string
  searchResults?: any[]
  ttsUrl?: string
}

// Inline widgets data
function calcWidget(expr: string): string {
  try { return String(Function('"use strict";return(' + expr + ')()')) }
  catch { return 'Error' }
}

function getQrUrl(text: string): string {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(text)
}

function genPassword(len = 16): string {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'
  let p = ''
  for (let i = 0; i < len; i++) p += c[Math.floor(Math.random() * c.length)]
  return p
}

// Slash command detector
function detectSlash(msg: string): { cmd: string; args: string } | null {
  const m = msg.trim()
  if (!m.startsWith('/')) return null
  const parts = m.slice(1).split(' ')
  return { cmd: parts[0].toLowerCase(), args: parts.slice(1).join(' ') }
}

// Quick action type detector
function detectQuickAction(msg: string): string | null {
  const m = msg.toLowerCase()
  if (/^(\d[\d\s+\-*/().%^]+)$/.test(msg.trim())) return 'calc'
  if (/image banao|photo banao|picture banao|ek photo|generate image|wallpaper banao|art banao/.test(m)) return 'image'
  if (/video banao|clip banao|animation banao/.test(m)) return 'video'
  if (/qr banao|qr code|qr generate/.test(m)) return 'qr'
  if (/password banao|strong password|new password/.test(m)) return 'password'
  if (/news|kya hua|latest|aaj ki|live score|cricket score|weather|mausam/.test(m)) return 'search'
  if (msg.includes('http://') || msg.includes('https://')) return 'url'
  return null
}

// ══════ INLINE WIDGET COMPONENTS ══════

function CalcWidget({ onClose }: { onClose: () => void }) {
  const [expr, setExpr] = useState('')
  const [res, setRes] = useState('0')
  const btns = [['7','8','9','÷'],['4','5','6','×'],['1','2','3','-'],['0','.','⌫','+'],[  'C','(',')', '=']]
  function tap(k: string) {
    if (k === 'C') { setExpr(''); setRes('0'); return }
    if (k === '=') { try { const r = String(Function('"use strict";return(' + expr.replace(/÷/g,'/').replace(/×/g,'*') + ')()'); setRes(r); setExpr(r) } catch { setRes('Err') }; return }
    if (k === '⌫') { const e = expr.slice(0,-1); setExpr(e); return }
    const n = expr + k; setExpr(n)
    try { setRes(String(Function('"use strict";return(' + n.replace(/÷/g,'/').replace(/×/g,'*') + ')()')); } catch {}
  }
  return (
    <div style={{background:'#0a1628',border:'1px solid #1a3a5a',borderRadius:'16px',padding:'12px',maxWidth:'260px'}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
        <span style={{fontSize:'11px',color:'#00e5ff'}}>🔢 Calculator</span>
        <button onClick={onClose} style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:'14px'}}>✕</button>
      </div>
      <div style={{background:'#030a14',borderRadius:'8px',padding:'10px',textAlign:'right',fontSize:'22px',fontWeight:700,marginBottom:'8px',minHeight:'44px',color:'#00e5ff',overflowX:'auto'}}>{res}</div>
      <div style={{fontSize:'10px',color:'#556',textAlign:'right',marginBottom:'8px',minHeight:'16px'}}>{expr}</div>
      {btns.map((row,ri) => (
        <div key={ri} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'5px',marginBottom:'5px'}}>
          {row.map(k => (
            <button key={k} onClick={() => tap(k)} style={{padding:'11px 4px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'14px',fontWeight:600,background:k==='='?'#00e5ff22':k==='C'?'#ff525222':['+','-','×','÷'].includes(k)?'#1a3a5a':'#111d2e',color:k==='='?'#00e5ff':k==='C'?'#ff5252':'#e0f0ff'}}>{k}</button>
          ))}
        </div>
      ))}
    </div>
  )
}

function QrWidget({ text, onClose }: { text: string; onClose: () => void }) {
  const [input, setInput] = useState(text)
  const [url, setUrl] = useState(text ? getQrUrl(text) : '')
  return (
    <div style={{background:'#0a1628',border:'1px solid #1a3a5a',borderRadius:'16px',padding:'12px',maxWidth:'220px'}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
        <span style={{fontSize:'11px',color:'#00e5ff'}}>📱 QR Code</span>
        <button onClick={onClose} style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:'14px'}}>✕</button>
      </div>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&setUrl(getQrUrl(input))} placeholder="Text ya URL..." style={{width:'100%',background:'#030a14',border:'1px solid #1a3a5a',borderRadius:'8px',color:'#e0f0ff',padding:'6px 10px',fontSize:'12px',outline:'none',marginBottom:'8px'}}/>
      <button onClick={()=>setUrl(getQrUrl(input))} style={{width:'100%',background:'#00e5ff22',border:'1px solid #00e5ff',borderRadius:'8px',color:'#00e5ff',padding:'6px',cursor:'pointer',fontSize:'12px',marginBottom:'8px'}}>Generate</button>
      {url && <div style={{textAlign:'center'}}><img src={url} alt="QR" style={{borderRadius:'8px',width:'150px',height:'150px'}}/><br/><a href={url} download="qr.png" style={{color:'#00e5ff',fontSize:'10px'}}>⬇️ Download</a></div>}
    </div>
  )
}

function ImageMsg({ url, prompt }: { url: string; prompt: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div style={{maxWidth:'280px'}}>
      <div style={{fontSize:'11px',color:'#888',marginBottom:'6px'}}>🖼️ {prompt}</div>
      {!loaded && <div style={{width:'280px',height:'200px',background:'#0a1628',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',color:'#4fc3f7'}}>⏳ Generating...</div>}
      <img src={url} alt={prompt} onLoad={()=>setLoaded(true)} style={{width:'100%',borderRadius:'12px',display:loaded?'block':'none',border:'1px solid #1a3a5a'}}/>
      {loaded && <a href={url} target="_blank" download style={{fontSize:'10px',color:'#00e5ff',marginTop:'4px',display:'block'}}>⬇️ Save Image</a>}
    </div>
  )
}

function SearchResults({ results }: { results: any[] }) {
  return (
    <div style={{maxWidth:'320px',display:'flex',flexDirection:'column',gap:'8px'}}>
      {results.slice(0,3).map((r: any, i: number) => (
        <a key={i} href={r.link} target="_blank" style={{background:'#0a1628',border:'1px solid #1a3a5a',borderRadius:'10px',padding:'10px',textDecoration:'none',display:'block'}}>
          <div style={{fontSize:'12px',color:'#00e5ff',fontWeight:600,marginBottom:'3px',lineHeight:'1.3'}}>{r.title}</div>
          <div style={{fontSize:'11px',color:'#aaa',lineHeight:'1.4'}}>{r.snippet}</div>
        </a>
      ))}
    </div>
  )
}

// ══════ MAIN COMPONENT ══════
export default function Home() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { r: 'a', c: 'Hey Pranshu! Main JARVIS hoon. Kya karna hai aaj? Sidha bolo — kuch bhi type karo ya voice mein bolo. 🚀', type: 'text' }
  ])
  const [inp, setInp] = useState('')
  const [load, setLoad] = useState(false)
  const [recording, setRecording] = useState(false)
  const [showCalc, setShowCalc] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [theme, setTheme] = useState<'dark'|'light'>('dark')
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [sidebar, setSidebar] = useState(false)
  const ref = useRef<any>(null)
  const mediaRef = useRef<any>(null)
  const inputRef = useRef<any>(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [msgs, load])

  // TTS player
  async function playTTS(text: string) {
    if (!ttsEnabled) return
    try {
      const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.substring(0, 300) }) })
      if (r.ok) {
        const blob = await r.blob()
        const url = URL.createObjectURL(blob)
        new Audio(url).play()
      }
    } catch {}
  }

  // Voice recording
  async function toggleVoice() {
    if (recording) {
      mediaRef.current?.stop()
      setRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      const chunks: Blob[] = []
      mr.ondataavailable = (e) => chunks.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const fd = new FormData()
        fd.append('audio', blob, 'audio.webm')
        try {
          const r = await fetch('/api/stt', { method: 'POST', body: fd })
          const d = await r.json()
          if (d.text) { setInp(d.text); inputRef.current?.focus() }
        } catch {}
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
      setTimeout(() => { if (mr.state === 'recording') mr.stop() }, 10000)
    } catch { alert('Mic permission do!') }
  }

  // Photo upload
  async function handlePhoto(e: any) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      const userMsg: Msg = { r: 'u', c: '📷 Photo bheja', type: 'text' }
      setMsgs(m => [...m, userMsg])
      setLoad(true)
      try {
        const r = await fetch('/api/photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64 }) })
        const d = await r.json()
        const reply = d.answer || 'Samajh nahi aaya'
        setMsgs(m => [...m, { r: 'a', c: reply, type: 'text' }])
        playTTS(reply)
      } catch { setMsgs(m => [...m, { r: 'a', c: 'Photo analyse nahi ho payi', type: 'error' }]) }
      setLoad(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Main send
  const send = useCallback(async (text?: string) => {
    const msg = (text || inp).trim()
    if (!msg || load) return
    setInp('')

    // Check slash commands first
    const slash = detectSlash(msg)
    if (slash) {
      if (slash.cmd === 'calc') { setMsgs(m => [...m, { r: 'u', c: msg, type: 'text' }, { r: 'a', c: '', type: 'widget', widget: 'calc' }]); return }
      if (slash.cmd === 'qr') { setMsgs(m => [...m, { r: 'u', c: msg, type: 'text' }, { r: 'a', c: '', type: 'widget', widget: 'qr:' + slash.args }]); return }
      if (slash.cmd === 'password') { const p = genPassword(); setMsgs(m => [...m, { r: 'u', c: msg, type: 'text' }, { r: 'a', c: '🔐 Password: ' + p + '\n\nCopy kar lo!', type: 'text' }]); return }
      if (slash.cmd === 'tools') { window.location.href = '/tools'; return }
      if (slash.cmd === 'luna') { window.location.href = '/luna'; return }
      if (slash.cmd === 'era') { window.location.href = '/era'; return }
      if (slash.cmd === 'clear') { setMsgs([{ r: 'a', c: 'Chat clear ho gaya! Kya karna hai? 🚀', type: 'text' }]); return }
    }

    const userMsg: Msg = { r: 'u', c: msg, type: 'text' }
    const newMsgs = [...msgs, userMsg]
    setMsgs(newMsgs)
    setLoad(true)

    // Check quick actions
    const qa = detectQuickAction(msg)

    try {
      // IMAGE
      if (qa === 'image') {
        const clean = msg.replace(/image banao|photo banao|picture banao|wallpaper banao|ek photo|generate image|art banao/gi, '').trim() || msg
        const seed = Math.floor(Math.random() * 999999)
        const imgUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(clean) + '?model=flux&width=1024&height=1024&seed=' + seed + '&nologo=true&enhance=true'
        setMsgs([...newMsgs, { r: 'a', c: clean, type: 'image', imageUrl: imgUrl }])
        setLoad(false); return
      }

      // VIDEO
      if (qa === 'video') {
        const clean = msg.replace(/video banao|clip banao|animation banao/gi, '').trim() || msg
        const vidUrl = 'https://video.pollinations.ai/' + encodeURIComponent(clean)
        setMsgs([...newMsgs, { r: 'a', c: 'Video generate ho raha hai... 30-60s lagenge', type: 'text', videoUrl: vidUrl }])
        setLoad(false); return
      }

      // QR
      if (qa === 'qr') {
        const clean = msg.replace(/qr banao|qr code|qr generate/gi, '').trim() || 'https://apple-lemon-zeta.vercel.app'
        setMsgs([...newMsgs, { r: 'a', c: '', type: 'widget', widget: 'qr:' + clean }])
        setLoad(false); return
      }

      // PASSWORD
      if (qa === 'password') {
        const p = genPassword()
        setMsgs([...newMsgs, { r: 'a', c: '🔐 Tera naya password:\n' + p + '\n\nCopy kar lo, kahin save kar lo!', type: 'text' }])
        setLoad(false); return
      }

      // Normal AI call
      const history = newMsgs.slice(-8).map(m => ({ r: m.r, c: m.c }))
      const r = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, conversationHistory: history })
      })
      const d = await r.json()

      if (d.response === 'IMAGE_GENERATED' && d.imageUrl) {
        setMsgs([...newMsgs, { r: 'a', c: d.imagePrompt || msg, type: 'image', imageUrl: d.imageUrl }])
      } else if (d.response === 'VIDEO_GENERATED' && d.videoUrl) {
        setMsgs([...newMsgs, { r: 'a', c: '🎬 Video ready! ' + d.note, type: 'text', videoUrl: d.videoUrl }])
      } else if (d.searchResults) {
        setMsgs([...newMsgs, { r: 'a', c: d.response || '', type: 'search', searchResults: d.searchResults }])
      } else {
        const reply = d.response || d.message || 'Samajh nahi aaya'
        setMsgs([...newMsgs, { r: 'a', c: reply, type: 'text' }])
        playTTS(reply)
      }
    } catch {
      setMsgs([...newMsgs, { r: 'a', c: 'Network issue, phir try karo!', type: 'error' }])
    }
    setLoad(false)
  }, [inp, load, msgs, ttsEnabled])

  const bg = theme === 'dark' ? '#040e1a' : '#f0f4ff'
  const cardBg = theme === 'dark' ? '#0a1628' : '#fff'
  const textColor = theme === 'dark' ? '#e0f0ff' : '#1a2040'
  const borderColor = theme === 'dark' ? '#1a3a5a' : '#d0d8f0'

  const QUICK_CMDS = [
    { label: '🖼️ Image', msg: 'image banao ' },
    { label: '🔢 Calc', msg: '/calc' },
    { label: '📱 QR', msg: '/qr ' },
    { label: '🔐 Pass', msg: 'password banao' },
    { label: '📰 News', msg: 'aaj ki news kya hai' },
    { label: '🌤️ Weather', msg: 'Rewa ka mausam' },
    { label: '🏏 Cricket', msg: 'cricket score' },
    { label: '🎬 Video', msg: 'video banao ' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: bg, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif', color: textColor }}>

      {/* HEADER */}
      <div style={{ flexShrink: 0, background: theme === 'dark' ? '#030a14' : '#fff', borderBottom: '1px solid ' + borderColor, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 20 }}>
        <button onClick={() => setSidebar(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: textColor }}>☰</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '1px', color: '#00e5ff' }}>⚡ JARVIS</div>
          <div style={{ fontSize: '9px', color: '#4fc3f7', letterSpacing: '2px' }}>AI ASSISTANT • REWA</div>
        </div>
        <button onClick={() => setTtsEnabled(v => !v)} title="Voice" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', opacity: ttsEnabled ? 1 : 0.4 }}>🔊</button>
        <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>{theme === 'dark' ? '🌙' : '☀️'}</button>
      </div>

      {/* SIDEBAR */}
      {sidebar && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
          <div style={{ width: '220px', background: theme === 'dark' ? '#040e1a' : '#fff', borderRight: '1px solid ' + borderColor, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#00e5ff', marginBottom: '8px' }}>⚡ JARVIS Menu</div>
            {[
              ['🏠 JARVIS', '/'],
              ['🌸 LUNA', '/luna'],
              ['💗 Era', '/era'],
              ['🛠️ Tools', '/tools'],
            ].map(([label, href]) => (
              <a key={href} href={href} style={{ display: 'block', padding: '10px 12px', borderRadius: '10px', background: cardBg, border: '1px solid ' + borderColor, color: textColor, textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>{label}</a>
            ))}
            <div style={{ borderTop: '1px solid ' + borderColor, paddingTop: '8px', marginTop: '4px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>Slash Commands:</div>
              {['/calc','/qr [text]','/password','/clear','/luna','/era'].map(c => (
                <div key={c} style={{ fontSize: '11px', color: '#4fc3f7', padding: '3px 0' }}>{c}</div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} onClick={() => setSidebar(false)} />
        </div>
      )}

      {/* MESSAGES */}
      <div ref={ref} style={{ flex: 1, overflowY: 'scroll', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0, WebkitOverflowScrolling: 'touch' as any }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.r === 'u' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
            {m.r === 'a' && <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>⚡</div>}

            <div style={{ maxWidth: '80%' }}>
              {/* WIDGET MESSAGE */}
              {m.type === 'widget' && m.widget?.startsWith('calc') && <CalcWidget onClose={() => {}} />}
              {m.type === 'widget' && m.widget?.startsWith('qr:') && <QrWidget text={m.widget.slice(3)} onClose={() => {}} />}

              {/* IMAGE MESSAGE */}
              {m.type === 'image' && m.imageUrl && <ImageMsg url={m.imageUrl} prompt={m.c} />}

              {/* VIDEO MESSAGE */}
              {m.videoUrl && (
                <div style={{ background: cardBg, border: '1px solid ' + borderColor, borderRadius: '12px', padding: '12px', maxWidth: '280px' }}>
                  <div style={{ fontSize: '12px', marginBottom: '8px' }}>{m.c}</div>
                  <a href={m.videoUrl} target="_blank" style={{ display: 'block', background: '#8b5cf622', border: '1px solid #8b5cf6', borderRadius: '8px', padding: '8px', textAlign: 'center', color: '#8b5cf6', textDecoration: 'none', fontSize: '12px' }}>🎬 Video Dekho</a>
                </div>
              )}

              {/* SEARCH RESULTS */}
              {m.type === 'search' && m.searchResults && (
                <div>
                  {m.c && <div style={{ fontSize: '13px', marginBottom: '8px', color: textColor }}>{m.c}</div>}
                  <SearchResults results={m.searchResults} />
                </div>
              )}

              {/* TEXT MESSAGE */}
              {(m.type === 'text' || m.type === 'error' || !m.type) && m.c && (
                <div style={{ padding: '10px 14px', borderRadius: m.r === 'u' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.r === 'u' ? 'linear-gradient(135deg,#00e5ff22,#8b5cf622)' : cardBg, border: '1px solid ' + (m.r === 'u' ? '#00e5ff44' : borderColor), color: textColor, fontSize: '13.5px', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>
                  {m.c}
                  {m.r === 'a' && ttsEnabled && (
                    <button onClick={() => playTTS(m.c)} style={{ display: 'block', marginTop: '6px', background: 'none', border: 'none', color: '#4fc3f7', cursor: 'pointer', fontSize: '10px' }}>🔊 Suno</button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* TYPING INDICATOR */}
        {load && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>⚡</div>
            <div style={{ padding: '10px 14px', background: cardBg, border: '1px solid ' + borderColor, borderRadius: '18px 18px 18px 4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00e5ff', animation: 'pulse 1.2s ' + (i*0.2) + 's infinite' }} />)}
            </div>
          </div>
        )}
      </div>

      {/* QUICK COMMANDS */}
      <div style={{ flexShrink: 0, padding: '5px 12px', background: theme === 'dark' ? '#030a14' : '#f8faff', borderTop: '1px solid ' + borderColor }}>
        <div style={{ display: 'flex', gap: '5px', overflowX: 'auto' }}>
          {QUICK_CMDS.map(q => (
            <button key={q.label} onClick={() => { if (q.msg.endsWith(' ')) setInp(q.msg); else send(q.msg) }} style={{ padding: '5px 11px', borderRadius: '16px', border: '1px solid ' + borderColor, background: cardBg, color: textColor, fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>{q.label}</button>
          ))}
        </div>
      </div>

      {/* INPUT BAR */}
      <div style={{ flexShrink: 0, padding: '8px 12px 20px', background: theme === 'dark' ? '#030a14' : '#fff', borderTop: '1px solid ' + borderColor }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: cardBg, borderRadius: '26px', padding: '6px 6px 6px 14px', border: '1.5px solid ' + (inp ? '#00e5ff' : borderColor) }}>

          {/* Photo upload */}
          <label style={{ cursor: 'pointer', fontSize: '18px', flexShrink: 0, opacity: 0.7 }} title="Photo bhejo">
            📷<input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          </label>

          {/* Input */}
          <input
            ref={inputRef}
            value={inp}
            onChange={e => setInp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={recording ? '🎤 Sun raha hoon...' : 'Kuch bhi poocho, /calc, /qr...'}
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', color: textColor }}
          />

          {/* Voice */}
          <button onClick={toggleVoice} style={{ width: '34px', height: '34px', borderRadius: '50%', background: recording ? '#ff525233' : 'transparent', border: recording ? '2px solid #ff5252' : 'none', cursor: 'pointer', fontSize: '18px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {recording ? '⏹️' : '🎤'}
          </button>

          {/* Send */}
          <button onClick={() => send()} disabled={load || !inp.trim()} style={{ width: '34px', height: '34px', borderRadius: '50%', background: inp.trim() ? 'linear-gradient(135deg,#00e5ff,#8b5cf6)' : '#1a3a5a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>➤</button>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
        ::-webkit-scrollbar{width:0;height:0}
        input::placeholder{color:#556}
      `}</style>
    </div>
  )
}
