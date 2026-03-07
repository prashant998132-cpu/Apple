'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

export type ChatMode = 'auto' | 'flash' | 'think' | 'deep'

const MODES = [
  { id:'auto'  as ChatMode, icon:'🤖', label:'Auto',  color:'#00e5ff' },
  { id:'flash' as ChatMode, icon:'⚡', label:'Flash', color:'#ffd600' },
  { id:'think' as ChatMode, icon:'🧠', label:'Think', color:'#a78bfa' },
  { id:'deep'  as ChatMode, icon:'🔬', label:'Deep',  color:'#00e676' },
]

interface Props {
  onSend: (text: string, mode: ChatMode, file?: File) => void
  isLoading: boolean
  mode: ChatMode
  onModeChange: (m: ChatMode) => void
}

export default function InputBar({ onSend, isLoading, mode, onModeChange }: Props) {
  const [input, setInput]       = useState('')
  const [isRecording, setRec]   = useState(false)
  const [showModes, setShowModes] = useState(false)
  const [attachFile, setAttach] = useState<File|null>(null)
  const [attachPreview, setPreview] = useState<string|null>(null)

  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const recRef       = useRef<any>(null)
  const modesRef     = useRef<HTMLDivElement>(null)
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
      if (modesRef.current && !modesRef.current.contains(e.target as Node)) setShowModes(false)
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
    setAttach(f)
    if (f.type.startsWith('image/')) {
      const r = new FileReader()
      r.onload = (ev) => setPreview(ev.target?.result as string)
      r.readAsDataURL(f)
    }
  }

  const toggleRecord = () => {
    if (isRecording) {
      recRef.current?.stop(); setRec(false); return
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'hi-IN'; rec.continuous = false; rec.interimResults = false
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript
      setInput(p => p + (p ? ' ' : '') + t)
      setTimeout(resize, 0)
    }
    rec.onend = () => setRec(false)
    rec.start(); recRef.current = rec; setRec(true)
  }

  const curMode = MODES.find(m => m.id === mode)!

  return (
    <div style={{ padding:'8px 12px 12px', background:'linear-gradient(180deg,transparent,rgba(5,12,28,.95))', backdropFilter:'blur(12px)' }}>
      {/* Attach preview */}
      {attachPreview && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, padding:'6px 10px', background:'rgba(0,229,255,.06)', borderRadius:10, border:'1px solid rgba(0,229,255,.15)' }}>
          <img src={attachPreview} alt="" style={{ width:40, height:40, borderRadius:6, objectFit:'cover' }} />
          <span style={{ fontSize:12, color:'#90caf9', flex:1 }}>{attachFile?.name}</span>
          <button onClick={()=>{setAttach(null);setPreview(null)}}
            style={{ background:'none', border:'none', color:'#ef5350', fontSize:16, cursor:'pointer', padding:'2px 6px' }}>✕</button>
        </div>
      )}

      <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
        {/* Mode selector */}
        <div ref={modesRef} style={{ position:'relative', flexShrink:0 }}>
          <button onClick={()=>setShowModes(p=>!p)}
            style={{ width:42, height:42, borderRadius:12, border:`1.5px solid ${curMode.color}44`,
              background:`${curMode.color}15`, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18, transition:'all .2s', boxShadow:showModes?`0 0 12px ${curMode.color}30`:undefined }}>
            {curMode.icon}
          </button>
          {showModes && (
            <div style={{ position:'absolute', bottom:'50px', left:0, zIndex:100,
              background:'#071828', border:'1px solid rgba(0,229,255,.2)',
              borderRadius:14, overflow:'hidden', minWidth:160,
              boxShadow:'0 8px 32px rgba(0,0,0,.6)' }}>
              {MODES.map(m => (
                <button key={m.id} onClick={()=>{onModeChange(m.id);setShowModes(false)}}
                  style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'11px 14px',
                    background: mode===m.id ? `${m.color}15` : 'transparent',
                    border:'none', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,.04)',
                    transition:'background .15s' }}>
                  <span style={{ fontSize:16 }}>{m.icon}</span>
                  <div style={{ textAlign:'left' }}>
                    <div style={{ color: mode===m.id ? m.color : '#c8e0f0', fontSize:13, fontWeight:600 }}>{m.label}</div>
                  </div>
                  {mode===m.id && <span style={{ marginLeft:'auto', color:m.color, fontSize:14 }}>✓</span>}
                </button>
              ))}
              {/* Attach from mode panel */}
              <button onClick={()=>{fileInputRef.current?.click();setShowModes(false)}}
                style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'11px 14px',
                  background:'transparent', border:'none', cursor:'pointer',
                  borderTop:'1px solid rgba(0,229,255,.1)' }}>
                <span style={{ fontSize:16 }}>📎</span>
                <span style={{ color:'#90caf9', fontSize:13 }}>File attach karo</span>
              </button>
              <button onClick={()=>{cameraRef.current?.click();setShowModes(false)}}
                style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'11px 14px',
                  background:'transparent', border:'none', cursor:'pointer',
                  borderTop:'1px solid rgba(0,229,255,.05)' }}>
                <span style={{ fontSize:16 }}>📷</span>
                <span style={{ color:'#90caf9', fontSize:13 }}>Camera se photo</span>
              </button>
            </div>
          )}
        </div>

        {/* Text input */}
        <div style={{ flex:1, position:'relative' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); setTimeout(resize, 0) }}
            onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend() } }}
            placeholder="Kuch bhi poocho..."
            rows={1}
            style={{ width:'100%', minHeight:42, maxHeight:120, resize:'none', boxSizing:'border-box',
              padding:'11px 14px', borderRadius:14,
              background:'rgba(255,255,255,.06)', backdropFilter:'blur(8px)',
              border:'1.5px solid rgba(0,229,255,.2)',
              color:'#e8f4ff', fontSize:14, lineHeight:1.5, fontFamily:'inherit',
              outline:'none', caretColor:'#00e5ff',
              transition:'border-color .2s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(0,229,255,.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(0,229,255,.2)'}
          />
        </div>

        {/* Voice */}
        <button onClick={toggleRecord}
          style={{ width:42, height:42, borderRadius:12, flexShrink:0,
            border: isRecording ? '1.5px solid #ef5350' : '1.5px solid rgba(255,255,255,.15)',
            background: isRecording ? 'rgba(239,83,80,.2)' : 'rgba(255,255,255,.05)',
            cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center',
            animation: isRecording ? 'pulse 1s infinite' : undefined,
            transition:'all .2s' }}>
          {isRecording ? '⏹️' : '🎤'}
        </button>

        {/* Send */}
        <button onClick={handleSend} disabled={isLoading || (!input.trim() && !attachFile)}
          style={{ width:42, height:42, borderRadius:12, flexShrink:0,
            border:'none', cursor: (isLoading||(!input.trim()&&!attachFile)) ? 'not-allowed' : 'pointer',
            background: (isLoading||(!input.trim()&&!attachFile))
              ? 'rgba(0,229,255,.1)'
              : 'linear-gradient(135deg,#00b4d8,#0077b6)',
            opacity: (isLoading||(!input.trim()&&!attachFile)) ? 0.5 : 1,
            fontSize:18, display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all .2s', boxShadow: isLoading ? 'none' : '0 4px 14px rgba(0,180,216,.35)' }}>
          {isLoading ? '⏳' : '➤'}
        </button>
      </div>

      {/* Mode indicator bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:7, paddingLeft:4 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:curMode.color, boxShadow:`0 0 6px ${curMode.color}` }} />
          <span style={{ fontSize:11, color:'#546e7a' }}>{curMode.label} mode</span>
        </div>
        <span style={{ fontSize:11, color:'#37474f' }}>Enter = send · Shift+Enter = newline</span>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display:'none' }} onChange={handleFile} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleFile} />
    </div>
  )
}
