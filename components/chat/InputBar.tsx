'use client'
// InputBar v3 — + (Mode+Attach) · ✂️ Compress · 🎤 Voice · ➤ Send
import { useState, useRef, useCallback, useEffect } from 'react'

export type ChatMode = 'auto' | 'flash' | 'think' | 'deep'

const MODES = [
  { id: 'auto'  as ChatMode, icon: '🤖', label: 'Auto',  desc: 'JARVIS decides best AI', color: '#00e5ff' },
  { id: 'flash' as ChatMode, icon: '⚡', label: 'Flash', desc: 'Groq — fastest',          color: '#ffd600' },
  { id: 'think' as ChatMode, icon: '🧠', label: 'Think', desc: 'DeepSeek R1 — sochta',   color: '#a78bfa' },
  { id: 'deep'  as ChatMode, icon: '🔬', label: 'Deep',  desc: 'Gemini + 46 tools',       color: '#00e676' },
]

type CompressLevel = 'short' | 'medium' | 'tiny'
const COMPRESS: Record<CompressLevel, { label: string; desc: string; color: string; prompt: string }> = {
  short:  { label: '✂️ Short',  desc: '~30% shorter', color: '#00e676', prompt: 'Lightly compress. Remove duplicates. Keep most details. Same language.' },
  medium: { label: '📝 Medium', desc: '~50% shorter', color: '#00e5ff', prompt: 'Compress to key points. Remove filler. Same language.' },
  tiny:   { label: '⚡ Tiny',   desc: '~70% — 1 line', color: '#a78bfa', prompt: 'Summarize in ONE short sentence. Core idea only. Same language.' },
}

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
  const [hint, setHint]             = useState('')
  const [interim, setInterim]       = useState('')
  const [attachFile, setAttach]     = useState<File|null>(null)
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
    el.style.height = Math.min(el.scrollHeight, 130) + 'px'
  }

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (plusRef.current && !plusRef.current.contains(e.target as Node)) setShowPlus(false)
      if (compRef.current && !compRef.current.contains(e.target as Node)) setShowComp(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value); setHint(''); setTimeout(resize, 0)
  }
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleSend = useCallback(() => {
    if ((!input.trim() && !attachFile) || isLoading) return
    onSend(input.trim(), mode, attachFile || undefined)
    setInput(''); setHint(''); setInterim(''); setAttach(null); setPreview(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [input, isLoading, onSend, mode, attachFile])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setAttach(f); setShowPlus(false)
    if (f.type.startsWith('image/')) {
      const r = new FileReader()
      r.onload = ev => setPreview(ev.target?.result as string)
      r.readAsDataURL(f)
    } else { setPreview(null) }
    e.target.value = ''
  }

  const toggleVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Chrome use karo voice ke liye'); return }
    if (isRecording) { recRef.current?.stop(); return }
    const rec = new SR(); recRef.current = rec
    rec.lang = 'hi-IN'; rec.continuous = true; rec.interimResults = true
    rec.onstart = () => { setRec(true); setInterim('') }
    rec.onresult = (e: any) => {
      let final = '', inter = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        e.results[i].isFinal ? (final += e.results[i][0].transcript) : (inter += e.results[i][0].transcript)
      }
      if (final) { setInput(p => (p + ' ' + final).trim()); setInterim(''); setTimeout(resize, 0) }
      else setInterim(inter)
    }
    rec.onend = () => { setRec(false); setInterim('') }
    rec.onerror = () => { setRec(false); setInterim('') }
    rec.start()
  }, [isRecording])

  const compress = useCallback(async (level: CompressLevel) => {
    const text = input.trim()
    if (!text || text.length < 20) return
    setShowComp(false); setComp(true); setHint('')
    const info = COMPRESS[level]
    let out = ''
    const groqKey = localStorage.getItem('jarvis_key_GROQ_API_KEY') || ''
    if (groqKey) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama-3.1-8b-instant', max_tokens: 150,
            messages: [{ role: 'system', content: info.prompt + ' Return ONLY result.' }, { role: 'user', content: text }] }),
          signal: AbortSignal.timeout(6000),
        })
        if (res.ok) out = (await res.json()).choices?.[0]?.message?.content?.trim() || ''
      } catch {}
    }
    if (!out) {
      const s = text.split(/[।.!?]+/).map((x:string) => x.trim()).filter(Boolean)
      if (level === 'tiny') out = s[0] || text.slice(0, 80)
      else if (level === 'medium') out = s.slice(0, Math.ceil(s.length / 2)).join('. ')
      else out = s.filter((x:string, i:number, a:string[]) => a.indexOf(x) === i).join('. ')
      if (!out) out = text.slice(0, level === 'tiny' ? 60 : level === 'medium' ? 120 : 200)
    }
    if (out && out.length < text.length) {
      setHint(`✅ ${text.length}→${out.length} chars · ${Math.round((1-out.length/text.length)*100)}% shorter`)
      setInput(out); setTimeout(resize, 0)
    } else { setHint('✓ Already concise') }
    setComp(false)
  }, [input])

  useEffect(() => () => recRef.current?.stop(), [])

  const currentMode = MODES.find(m => m.id === mode) || MODES[0]
  const canSend = (input.trim().length > 0 || !!attachFile) && !isLoading

  return (
    <div style={S.wrap} className="safe-bottom">
      {attachFile && (
        <div style={S.attachBar}>
          {attachPreview
            ? <img src={attachPreview} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }}/>
            : <span style={{ fontSize: 20 }}>{attachFile.name.endsWith('.pdf') ? '📄' : '📁'}</span>
          }
          <span style={{ fontSize: 11, color: '#4a8090', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachFile.name}</span>
          <button onClick={() => { setAttach(null); setPreview(null) }} style={S.closeBtn}>×</button>
        </div>
      )}

      {hint && (
        <div style={S.hintBar}>
          <span style={{ fontSize: 11, color: hint.startsWith('✅') ? '#00e676' : '#ff9944' }}>{hint}</span>
          <button onClick={() => setHint('')} style={S.closeBtn}>×</button>
        </div>
      )}

      {interim && (
        <div style={{ padding: '3px 12px', fontSize: 12, color: '#4a7096', fontStyle: 'italic' }}>🎤 {interim}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 4px 2px', fontSize: 9, color: currentMode.color, opacity: 0.6 }}>
        <span>{currentMode.icon}</span>
        <span style={{ letterSpacing: 0.5 }}>{currentMode.label} — {currentMode.desc}</span>
      </div>

      <div style={S.row}>
        {/* + Button */}
        <div ref={plusRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => { setShowPlus(p => !p); setShowComp(false) }}
            style={{ ...S.iconBtn, background: showPlus ? 'rgba(0,229,255,.12)' : '#060f22', border: `1px solid ${showPlus ? 'rgba(0,229,255,.3)' : currentMode.color + '30'}`, color: currentMode.color, fontSize: 17 }}
          >
            {showPlus ? '×' : currentMode.icon}
          </button>

          {showPlus && (
            <div style={S.popup}>
              <div style={S.popupSection}>MODE</div>
              {MODES.map(m => (
                <button key={m.id} onClick={() => { onModeChange(m.id); setShowPlus(false) }}
                  style={{ ...S.popupRow, background: mode === m.id ? m.color + '15' : 'rgba(255,255,255,.02)', border: `1px solid ${mode === m.id ? m.color + '25' : 'transparent'}` }}>
                  <span style={{ fontSize: 15 }}>{m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: m.color }}>{m.label}</div>
                    <div style={{ fontSize: 9, color: '#2a4060' }}>{m.desc}</div>
                  </div>
                  {mode === m.id && <span style={{ color: m.color }}>✓</span>}
                </button>
              ))}

              <div style={{ ...S.popupSection, marginTop: 6 }}>ATTACH</div>
              <button onClick={() => cameraRef.current?.click()} style={S.popupRow}>
                <span style={{ fontSize: 15 }}>📷</span><span style={{ fontSize: 12, color: '#4a8090' }}>Camera</span>
              </button>
              <button onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = 'image/*'; fileInputRef.current.click() } }} style={S.popupRow}>
                <span style={{ fontSize: 15 }}>🖼️</span><span style={{ fontSize: 12, color: '#4a8090' }}>Image</span>
              </button>
              <button onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = '.pdf,application/pdf'; fileInputRef.current.click() } }} style={S.popupRow}>
                <span style={{ fontSize: 15 }}>📄</span><span style={{ fontSize: 12, color: '#4a8090' }}>PDF</span>
              </button>
            </div>
          )}
        </div>

        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFile} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />

        <textarea
          ref={textareaRef} value={input} onChange={handleInput} onKeyDown={handleKey}
          placeholder={isRecording ? '🎤 Bolo...' : 'Kuch bhi poocho...'}
          rows={1} disabled={isLoading}
          style={{ ...S.textarea, borderColor: isRecording ? 'rgba(255,68,68,.3)' : currentMode.color + '20' }}
        />

        <div style={S.rightCol}>
          {/* ✂️ Compress */}
          <div ref={compRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { if (input.trim().length >= 20 && !isCompressing) { setShowComp(p => !p); setShowPlus(false) } }}
              style={{ ...S.compBtn, opacity: input.trim().length >= 20 ? 1 : 0.2, cursor: input.trim().length >= 20 ? 'pointer' : 'default', background: showCompress ? 'rgba(167,139,250,.2)' : 'rgba(167,139,250,.08)', border: `1px solid ${showCompress ? 'rgba(167,139,250,.5)' : 'rgba(167,139,250,.2)'}` }}
            >
              {isCompressing
                ? <div style={S.spinner}/>
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="21" y2="3"/><line x1="3" y1="21" x2="14" y2="10"/></svg>
              }
            </button>
            {showCompress && (
              <div style={{ ...S.popup, left: 'auto', right: 0, minWidth: 185 }}>
                <div style={S.popupSection}>COMPRESS</div>
                {(Object.entries(COMPRESS) as [CompressLevel, typeof COMPRESS[CompressLevel]][]).map(([k, v]) => (
                  <button key={k} onClick={() => compress(k)} style={{ ...S.popupRow, border: `1px solid ${v.color}20` }}>
                    <span style={{ fontSize: 12, color: v.color, fontWeight: 600 }}>{v.label}</span>
                    <span style={{ fontSize: 9, color: '#2a4060', marginLeft: 'auto' }}>{v.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 🎤 Mic */}
          <button onClick={toggleVoice} style={{ ...S.iconBtn, ...(isRecording ? S.micOn : {}) }}>
            {isRecording
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="7" width="3" height="10" rx="1.5"/><rect x="8" y="4" width="3" height="16" rx="1.5"/><rect x="13" y="2" width="3" height="20" rx="1.5"/><rect x="18" y="6" width="3" height="12" rx="1.5"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            }
          </button>

          {/* ➤ Send */}
          <button onClick={handleSend} disabled={!canSend} style={{ ...S.sendBtn, opacity: canSend ? 1 : 0.3 }}>
            {isLoading
              ? <div style={{ ...S.spinner, borderTopColor: '#020917' }}/>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  wrap:        { padding: '4px 12px 8px', background: 'rgba(2,9,23,.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(0,229,255,.08)', flexShrink: 0, zIndex: 20 },
  attachBar:   { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 5, background: 'rgba(0,229,255,.04)', borderRadius: 9, border: '1px solid rgba(0,229,255,.1)' },
  hintBar:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', marginBottom: 4, background: 'rgba(0,230,118,.05)', borderRadius: 8, border: '1px solid rgba(0,230,118,.12)' },
  closeBtn:    { background: 'none', border: 'none', color: '#1e4060', fontSize: 18, cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1 },
  row:         { display: 'flex', gap: 7, alignItems: 'flex-end' },
  iconBtn:     { width: 40, height: 40, borderRadius: 11, border: '1px solid rgba(0,229,255,.12)', background: '#060f22', color: '#4a7096', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' },
  micOn:       { background: 'rgba(255,68,68,.1)', border: '1px solid rgba(255,68,68,.4)', color: '#ff4444', boxShadow: '0 0 10px rgba(255,68,68,.15)' },
  textarea:    { flex: 1, minHeight: 40, maxHeight: 130, padding: '10px 12px', borderRadius: 11, border: '1px solid', background: '#0a1628', color: '#e8f4ff', fontSize: 15, resize: 'none', outline: 'none', fontFamily: "'Noto Sans Devanagari','Inter',sans-serif", lineHeight: 1.5 },
  rightCol:    { display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0, alignItems: 'center' },
  compBtn:     { width: 40, height: 16, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .2s' },
  sendBtn:     { width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#00e5ff,#0099cc)', border: 'none', color: '#020917', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(0,229,255,.25)', cursor: 'pointer' },
  popup:       { position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, minWidth: 220, background: '#0c1830', border: '1px solid rgba(0,229,255,.12)', borderRadius: 13, padding: '10px 8px', boxShadow: '0 8px 32px rgba(0,0,0,.65)', zIndex: 100 },
  popupSection:{ fontSize: 8, color: '#1a3050', letterSpacing: 1.5, padding: '2px 8px 5px', textTransform: 'uppercase' as const },
  popupRow:    { width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', marginBottom: 3, background: 'rgba(255,255,255,.02)', border: '1px solid transparent', borderRadius: 9, cursor: 'pointer', textAlign: 'left' as const },
  spinner:     { width: 13, height: 13, border: '2px solid rgba(255,255,255,.15)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
}
