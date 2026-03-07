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
  const [input, setInput]         = useState('')
  const [isRecording, setRec]     = useState(false)
  const [isCompressing, setComp]  = useState(false)
  const [showPlus, setShowPlus]   = useState(false)
  const [showCompress, setShowComp] = useState(false)
  const [attachFile, setAttach]   = useState<File|null>(null)
  const [attachPreview, setPreview] = useState<string|null>(null)

  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const recRef       = useRef<any>(null)
  const plusRef      = useRef<HTMLDivElement>(null)
  const compRef      = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraRef    = useRef<HTMLInputElement>(null)

  const resize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (plusRef.current && !plusRef.current.contains(e.target as Node)) setShowPlus(false)
      if (compRef.current && !compRef.current.contains(e.target as Node)) setShowComp(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

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
      const compressed = d.reply || d.text || input
      setInput(compressed); setTimeout(resize, 0)
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

  // Popup row style
  const popupBtn = (color?: string): React.CSSProperties => ({
    display:'flex', alignItems:'center', gap:10, width:'100%',
    padding:'11px 14px', background:'transparent', border:'none',
    cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,.04)',
    transition:'background .15s', textAlign:'left' as const,
  })

  return (
    <div style={{ padding:'8px 10px 10px', background:'linear-gradient(180deg,transparent,rgba(5,12,28,.97))', backdropFilter:'blur(12px)' }}>

      {/* Attach preview */}
      {attachPreview && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8,
          padding:'6px 10px', background:'rgba(0,229,255,.06)',
          borderRadius:10, border:'1px solid rgba(0,229,255,.15)' }}>
          <img src={attachPreview} alt="" style={{ width:40, height:40, borderRadius:6, objectFit:'cover' }} />
          <span style={{ fontSize:12, color:'#90caf9', flex:1 }}>{attachFile?.name}</span>
          <button onClick={()=>{setAttach(null);setPreview(null)}}
            style={{ background:'none', border:'none', color:'#ef5350', fontSize:18, cursor:'pointer' }}>✕</button>
        </div>
      )}

      {/* Main row: [+] [textarea] [✂️] [🎤] [➤] */}
      <div style={{ display:'flex', gap:7, alignItems:'flex-end' }}>

        {/* + Button — Mode + Attach */}
        <div ref={plusRef} style={{ position:'relative', flexShrink:0 }}>
          <button onClick={()=>{setShowPlus(p=>!p); setShowComp(false)}}
            style={{ width:42, height:42, borderRadius:12,
              border:`1.5px solid ${showPlus ? curMode.color : 'rgba(0,229,255,.25)'}`,
              background: showPlus ? `${curMode.color}20` : 'rgba(0,229,255,.07)',
              cursor:'pointer', fontSize:19, fontWeight:700, color:'#00e5ff',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all .2s' }}>
            {showPlus ? '✕' : '+'}
          </button>

          {showPlus && (
            <div style={{ position:'absolute', bottom:50, left:0, zIndex:200,
              background:'#071828', border:'1px solid rgba(0,229,255,.2)',
              borderRadius:14, overflow:'hidden', minWidth:180,
              boxShadow:'0 8px 32px rgba(0,0,0,.7)' }}>

              {/* MODE section */}
              <div style={{ padding:'7px 14px 4px', fontSize:10, color:'#37474f', letterSpacing:2, fontWeight:700 }}>MODE</div>
              {MODES.map(m => (
                <button key={m.id} onClick={()=>{onModeChange(m.id);setShowPlus(false)}}
                  style={{ ...popupBtn(), background: mode===m.id ? `${m.color}18` : 'transparent' }}>
                  <span style={{ fontSize:16 }}>{m.icon}</span>
                  <span style={{ color: mode===m.id ? m.color : '#c8e0f0', fontSize:13, fontWeight: mode===m.id?700:400 }}>{m.label}</span>
                  {mode===m.id && <span style={{ marginLeft:'auto', color:m.color, fontSize:12 }}>✓</span>}
                </button>
              ))}

              {/* ATTACH section */}
              <div style={{ padding:'7px 14px 4px', fontSize:10, color:'#37474f', letterSpacing:2, fontWeight:700, borderTop:'1px solid rgba(0,229,255,.08)', marginTop:2 }}>ATTACH</div>
              <button onClick={()=>{cameraRef.current?.click();setShowPlus(false)}} style={popupBtn()}>
                <span style={{ fontSize:16 }}>📷</span>
                <span style={{ color:'#c8e0f0', fontSize:13 }}>Camera</span>
              </button>
              <button onClick={()=>{fileInputRef.current?.click();setShowPlus(false)}} style={popupBtn()}>
                <span style={{ fontSize:16 }}>🖼️</span>
                <span style={{ color:'#c8e0f0', fontSize:13 }}>Image / PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* Textarea */}
        <div style={{ flex:1, position:'relative' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); setTimeout(resize,0) }}
            onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()} }}
            placeholder="Kuch bhi poocho..."
            rows={1}
            style={{ width:'100%', minHeight:42, maxHeight:120, resize:'none',
              boxSizing:'border-box', padding:'11px 14px', borderRadius:14,
              background:'rgba(255,255,255,.07)', backdropFilter:'blur(8px)',
              border:'1.5px solid rgba(0,229,255,.22)',
              color:'#e8f4ff', fontSize:14, lineHeight:1.5, fontFamily:'inherit',
              outline:'none', caretColor:'#00e5ff' }}
            onFocus={e=>e.target.style.borderColor='rgba(0,229,255,.5)'}
            onBlur={e=>e.target.style.borderColor='rgba(0,229,255,.22)'}
          />
        </div>

        {/* ✂️ Compress */}
        <div ref={compRef} style={{ position:'relative', flexShrink:0 }}>
          <button onClick={()=>{if(!input.trim())return; setShowComp(p=>!p); setShowPlus(false)}}
            disabled={isCompressing || !input.trim()}
            title="Compress text"
            style={{ width:42, height:42, borderRadius:12,
              border:`1.5px solid ${showCompress?'rgba(0,229,255,.5)':'rgba(0,229,255,.2)'}`,
              background: isCompressing ? 'rgba(0,229,255,.15)' : showCompress ? 'rgba(0,229,255,.12)' : 'rgba(0,229,255,.05)',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              opacity: input.trim() ? 1 : 0.35,
              fontSize:17, display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all .2s', color:'#00e5ff' }}>
            {isCompressing ? '⏳' : '✂️'}
          </button>

          {showCompress && (
            <div style={{ position:'absolute', bottom:50, right:0, zIndex:200,
              background:'#071828', border:'1px solid rgba(0,229,255,.2)',
              borderRadius:14, overflow:'hidden', minWidth:170,
              boxShadow:'0 8px 32px rgba(0,0,0,.7)' }}>
              <div style={{ padding:'7px 14px 4px', fontSize:10, color:'#37474f', letterSpacing:2, fontWeight:700 }}>COMPRESS</div>
              {COMPRESS_OPTS.map(opt => (
                <button key={opt.id} onClick={()=>handleCompress(opt.prompt)}
                  style={{ ...popupBtn() }}>
                  <span style={{ fontSize:16 }}>{opt.icon}</span>
                  <div>
                    <div style={{ color:opt.color, fontSize:13, fontWeight:600 }}>{opt.label}</div>
                    <div style={{ color:'#546e7a', fontSize:11 }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 🎤 Voice */}
        <button onClick={toggleRecord}
          style={{ width:42, height:42, borderRadius:12, flexShrink:0,
            border: isRecording ? '1.5px solid #ef5350' : '1.5px solid rgba(255,255,255,.18)',
            background: isRecording ? 'rgba(239,83,80,.2)' : 'rgba(255,255,255,.06)',
            cursor:'pointer', fontSize:18,
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all .2s' }}>
          {isRecording ? '⏹️' : '🎤'}
        </button>

        {/* ➤ Send */}
        <button onClick={handleSend}
          disabled={isLoading || (!input.trim() && !attachFile)}
          style={{ width:42, height:42, borderRadius:12, flexShrink:0,
            border:'none',
            background: (isLoading||(!input.trim()&&!attachFile))
              ? 'rgba(0,229,255,.08)'
              : 'linear-gradient(135deg,#00b4d8,#0077b6)',
            opacity: (isLoading||(!input.trim()&&!attachFile)) ? 0.4 : 1,
            cursor: (isLoading||(!input.trim()&&!attachFile)) ? 'not-allowed' : 'pointer',
            fontSize:18, display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all .2s',
            boxShadow: (!isLoading&&(input.trim()||attachFile)) ? '0 4px 16px rgba(0,180,216,.4)' : 'none' }}>
          {isLoading ? '⏳' : '➤'}
        </button>
      </div>

      {/* Mode indicator */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, paddingLeft:2 }}>
        <div style={{ width:5, height:5, borderRadius:'50%', background:curMode.color, boxShadow:`0 0 5px ${curMode.color}` }} />
        <span style={{ fontSize:11, color:'#546e7a' }}>{curMode.icon} {curMode.label}</span>
        <span style={{ marginLeft:'auto', fontSize:10, color:'#37474f' }}>Enter = send</span>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display:'none' }} onChange={handleFile} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleFile} />
    </div>
  )
}
