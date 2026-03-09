'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

export type ChatMode = 'auto' | 'flash' | 'think' | 'deep'

const MODES = [
  { id:'auto'  as ChatMode, icon:'🤖', label:'Auto',  color:'#00e5ff' },
  { id:'flash' as ChatMode, icon:'⚡', label:'Flash', color:'#ffd600' },
  { id:'think' as ChatMode, icon:'🧠', label:'Think', color:'#a78bfa' },
  { id:'deep'  as ChatMode, icon:'🔬', label:'Deep',  color:'#00e676' },
]

const COMPRESS_OPTS = [
  { id:'short',  icon:'✂️',  label:'Short',  desc:'~30% shorter', color:'#00e676',
    prompt:'Lightly compress. Remove duplicates. Keep most details. Same language.' },
  { id:'medium', icon:'📝', label:'Medium', desc:'~50% shorter', color:'#00e5ff',
    prompt:'Compress to key points. Remove filler. Same language.' },
  { id:'tiny',   icon:'⚡', label:'Tiny',   desc:'~70% — 1 line', color:'#a78bfa',
    prompt:'Summarize in ONE short sentence. Core idea only. Same language.' },
]

interface Props {
  onSend: (text: string, mode: ChatMode, file?: File) => void
  isLoading: boolean
  mode: ChatMode
  onModeChange: (m: ChatMode) => void
}

export default function InputBar({ onSend, isLoading, mode, onModeChange }: Props) {
  const [input, setInput]           = useState('')
  const [isRecording, setRec]       = useState(false)
  const [isCompressing, setComp]    = useState(false)
  const [showPlus, setShowPlus]     = useState(false)
  const [showCompress, setShowComp] = useState(false)
  const [attachFile, setAttach]     = useState<File|null>(null)
  const [attachPreview, setPreview] = useState<string|null>(null)

  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const recRef       = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraRef    = useRef<HTMLInputElement>(null)

  const resize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 110) + 'px'
  }

  useEffect(() => {
    if (!showPlus && !showCompress) return
    const close = (e: Event) => {
      const t = e.target as HTMLElement
      if (t.closest('[data-popup]') || t.closest('[data-popup-btn]')) return
      setShowPlus(false); setShowComp(false)
    }
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', close, { capture: true })
    }, 80)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', close, { capture: true })
    }
  }, [showPlus, showCompress])

  const handleSend = useCallback(() => {
    if ((!input.trim() && !attachFile) || isLoading) return
    onSend(input.trim(), mode, attachFile || undefined)
    setInput(''); setAttach(null); setPreview(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [input, isLoading, onSend, mode, attachFile])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setAttach(f); setShowPlus(false)
    if (f.type.startsWith('image/')) {
      const r = new FileReader()
      r.onload = (ev) => setPreview(ev.target?.result as string)
      r.readAsDataURL(f)
    }
  }

  const handleCompress = async (promptText: string) => {
    if (!input.trim() || isCompressing) return
    setShowComp(false); setComp(true)
    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText + '\n\nText to compress:\n' + input,
          history: [], userId: 'compress', chatId: 'compress', chatMode: 'flash'
        })
      })
      const d = await res.json()
      setInput(d.reply || d.text || input)
      setTimeout(resize, 0)
    } catch { /* keep original */ }
    setComp(false)
  }

  const toggleRecord = () => {
    if (isRecording) { recRef.current?.stop(); setRec(false); return }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'hi-IN'; rec.continuous = false; rec.interimResults = false
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript
      setInput(p => p + (p ? ' ' : '') + t); setTimeout(resize, 0)
    }
    rec.onend = () => setRec(false)
    rec.start(); recRef.current = rec; setRec(true)
  }

  const curMode = MODES.find(m => m.id === mode)!
  const hasContent = !!(input.trim() || attachFile)

  const popupBtn = (): React.CSSProperties => ({
    display:'flex', alignItems:'center', gap:10, width:'100%',
    padding:'10px 14px', background:'transparent', border:'none',
    cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,.04)',
    textAlign:'left' as const,
  })

  return (
    <div style={{
      padding: '8px 12px 10px',
      background: 'rgba(9,13,24,.97)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(255,255,255,.06)',
      position: 'relative',
      zIndex: 100,
      overflow: 'visible',
    }}>

      {/* Attach preview */}
      {attachPreview && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8,
          padding:'5px 10px', background:'rgba(0,229,255,.06)',
          borderRadius:10, border:'1px solid rgba(0,229,255,.15)' }}>
          <img src={attachPreview} alt="" style={{ width:36, height:36, borderRadius:6, objectFit:'cover' }} />
          <span style={{ fontSize:11, color:'#90caf9', flex:1 }}>{attachFile?.name}</span>
          <button onClick={()=>{setAttach(null);setPreview(null)}}
            style={{ background:'none', border:'none', color:'#ef5350', fontSize:16, cursor:'pointer' }}>✕</button>
        </div>
      )}

      {/* ── MAIN ROW: [+]  [textarea ........... 🎤]  [send] ── */}
      <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>

        {/* ── LEFT: + button ── */}
        <div style={{ position:'relative', flexShrink:0, zIndex:200 }}>
          <button
            data-popup-btn="plus"
            onPointerDown={e=>{e.stopPropagation();setShowPlus(p=>!p);setShowComp(false)}}
            style={{
              width: 40, height: 40, borderRadius: 12,
              border: `1.5px solid ${showPlus ? curMode.color : 'rgba(255,255,255,.14)'}`,
              background: showPlus ? `${curMode.color}18` : 'rgba(255,255,255,.06)',
              cursor: 'pointer', color: '#a0bcd0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .18s', flexShrink: 0,
            }}>
            {/* Plus SVG — clean */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 3v12M3 9h12" stroke={showPlus ? curMode.color : '#7090a8'} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          {/* + Popup */}
          {showPlus && (
            <div data-popup="plus" style={{
              position:'fixed', bottom:72, left:8, zIndex:9999,
              background:'#071828', border:'1px solid rgba(0,229,255,.2)',
              borderRadius:14, overflow:'hidden', minWidth:180,
              boxShadow:'0 -8px 32px rgba(0,0,0,.85)'
            }}>
              <div style={{ padding:'6px 14px 3px', fontSize:9, color:'#37474f', letterSpacing:2, fontWeight:700 }}>MODE</div>
              {MODES.map(m => (
                <button key={m.id} data-popup="plus"
                  onPointerDown={()=>{onModeChange(m.id);setShowPlus(false)}}
                  style={{ ...popupBtn(), background: mode===m.id ? `${m.color}18` : 'transparent' }}>
                  <span style={{ fontSize:15 }}>{m.icon}</span>
                  <span style={{ color: mode===m.id ? m.color : '#c8e0f0', fontSize:13, fontWeight: mode===m.id?700:400 }}>{m.label}</span>
                  {mode===m.id && <span style={{ marginLeft:'auto', color:m.color, fontSize:12 }}>✓</span>}
                </button>
              ))}
              <div style={{ padding:'6px 14px 3px', fontSize:9, color:'#37474f', letterSpacing:2, fontWeight:700, borderTop:'1px solid rgba(0,229,255,.08)', marginTop:2 }}>ATTACH</div>
              <button data-popup="plus"
                onPointerDown={()=>{cameraRef.current?.click();setShowPlus(false)}}
                style={popupBtn()}>
                <span style={{ fontSize:15 }}>📷</span>
                <span style={{ color:'#c8e0f0', fontSize:13 }}>Camera</span>
              </button>
              <button data-popup="plus"
                onPointerDown={()=>{fileInputRef.current?.click();setShowPlus(false)}}
                style={popupBtn()}>
                <span style={{ fontSize:15 }}>🖼️</span>
                <span style={{ color:'#c8e0f0', fontSize:13 }}>Image / PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* ── MIDDLE: Textarea with mic inside right ── */}
        <div style={{ flex:1, position:'relative' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); setTimeout(resize,0) }}
            onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()} }}
            placeholder="Kuch bhi poocho..."
            rows={1}
            style={{
              width: '100%', minHeight: 42, maxHeight: 110,
              resize: 'none', boxSizing: 'border-box',
              padding: '11px 44px 11px 14px', // right padding for mic
              borderRadius: 22,
              background: 'rgba(255,255,255,.07)',
              border: '1.5px solid rgba(255,255,255,.12)',
              color: '#e8f4ff', fontSize: 15, lineHeight: 1.4,
              fontFamily: 'inherit', outline: 'none', caretColor: '#00e5ff',
              display: 'block',
            }}
            onFocus={e=>e.target.style.borderColor='rgba(0,229,255,.4)'}
            onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.12)'}
          />
          {/* Mic — inside textarea, right side */}
          <button
            onClick={toggleRecord}
            style={{
              position: 'absolute', right: 6, bottom: 5,
              width: 32, height: 32, borderRadius: '50%',
              border: 'none',
              background: isRecording ? 'rgba(239,83,80,.3)' : 'transparent',
              cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .18s', color: isRecording ? '#ef5350' : '#5a7a8a',
            }}>
            {isRecording ? '⏹️' : '🎤'}
          </button>
        </div>

        {/* ── RIGHT: Send button (circle) + compress tiny above ── */}
        <div style={{ position:'relative', flexShrink:0 }}>

          {/* Compress — tiny button above-left of send */}
          <button
            data-popup-btn="compress"
            onPointerDown={e=>{e.stopPropagation();if(!input.trim())return;setShowComp(p=>!p);setShowPlus(false)}}
            disabled={isCompressing || !input.trim()}
            title="Compress"
            style={{
              position: 'absolute',
              top: -22, right: 0,
              width: 26, height: 22,
              borderRadius: 7,
              border: '1px solid rgba(0,229,255,.2)',
              background: showCompress ? 'rgba(0,229,255,.18)' : 'rgba(0,229,255,.07)',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              opacity: input.trim() ? 1 : 0,  // invisible when no input
              fontSize: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .2s', color: '#00e5ff',
              pointerEvents: input.trim() ? 'auto' : 'none',
            }}>
            {isCompressing ? '⏳' : '✂️'}
          </button>

          {/* Compress popup */}
          {showCompress && (
            <div data-popup="compress" style={{
              position:'fixed', bottom:72, right:8, zIndex:9999,
              background:'#071828', border:'1px solid rgba(0,229,255,.22)',
              borderRadius:14, overflow:'hidden', minWidth:168,
              boxShadow:'0 -8px 32px rgba(0,0,0,.8)'
            }}>
              <div style={{ padding:'6px 14px 3px', fontSize:9, color:'#37474f', letterSpacing:2, fontWeight:700 }}>COMPRESS</div>
              {COMPRESS_OPTS.map(opt => (
                <button key={opt.id} data-popup="compress"
                  onPointerDown={()=>handleCompress(opt.prompt)}
                  style={popupBtn()}>
                  <span style={{ fontSize:15 }}>{opt.icon}</span>
                  <div>
                    <div style={{ color:opt.color, fontSize:13, fontWeight:600 }}>{opt.label}</div>
                    <div style={{ color:'#546e7a', fontSize:10 }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Send — circle */}
          <button
            onClick={handleSend}
            disabled={isLoading || !hasContent}
            style={{
              width: 42, height: 42, borderRadius: '50%',
              border: 'none', flexShrink: 0,
              background: hasContent && !isLoading
                ? 'linear-gradient(135deg,#00c6e0,#006aad)'
                : 'rgba(255,255,255,.08)',
              opacity: isLoading || !hasContent ? 0.4 : 1,
              cursor: isLoading || !hasContent ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .18s',
              boxShadow: hasContent && !isLoading ? '0 3px 12px rgba(0,180,220,.4)' : 'none',
            }}>
            {isLoading
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="rgba(255,255,255,.3)" strokeWidth="3"/><path d="M12 4a8 8 0 010 16" stroke="#fff" strokeWidth="3" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur=".8s" repeatCount="indefinite"/></path></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            }
          </button>
        </div>
      </div>

      {/* Mode dot indicator */}
      <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:5, paddingLeft:2 }}>
        <div style={{ width:5, height:5, borderRadius:'50%', background:curMode.color, boxShadow:`0 0 4px ${curMode.color}` }} />
        <span style={{ fontSize:10, color:'#546e7a' }}>{curMode.icon} {curMode.label}</span>
        <span style={{ marginLeft:'auto', fontSize:9, color:'#263238' }}>Enter = send</span>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display:'none' }} onChange={handleFile} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleFile} />
    </div>
  )
}
