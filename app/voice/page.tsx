'use client'
// app/voice/page.tsx — JARVIS Voicebox v3
// Mobile Chrome compatible: webkitSpeechRecognition + Audio() playback
// Fixed: double onresult bug, thinking display, proper state machine

import { useState, useRef, useCallback, useEffect } from 'react'
import Sidebar from '../../components/shared/Sidebar'

type State = 'idle' | 'listening' | 'thinking' | 'speaking'
type Mode  = 'auto' | 'flash' | 'think' | 'deep'

const MODES: Array<{ id: Mode; icon: string; label: string; color: string }> = [
  { id:'auto',  icon:'🤖', label:'Auto',  color:'#00e5ff' },
  { id:'flash', icon:'⚡', label:'Flash', color:'#ffd600' },
  { id:'think', icon:'🧠', label:'Think', color:'#a78bfa' },
  { id:'deep',  icon:'🔬', label:'Deep',  color:'#00e676' },
]

const VOICES = [
  { id:'hi-IN-SwaraNeural',   label:'Swara (Hindi ♀)',  lang:'hi' },
  { id:'hi-IN-MadhurNeural',  label:'Madhur (Hindi ♂)', lang:'hi' },
  { id:'en-IN-NeerjaNeural',  label:'Neerja (English ♀)', lang:'en' },
  { id:'en-IN-PrabhatNeural', label:'Prabhat (English ♂)', lang:'en' },
]

export default function VoiceboxPage() {
  const [appState, setAppState]   = useState<State>('idle')
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim]     = useState('')
  const [reply, setReply]         = useState('')
  const [thinking, setThinking]   = useState('')
  const [showThink, setShowThink] = useState(false)
  const [imageUrl, setImageUrl]   = useState('')
  const [mode, setMode]           = useState<Mode>('auto')
  const [voice, setVoice]         = useState('hi-IN-SwaraNeural')
  const [speed, setSpeed]         = useState(1.0)
  const [wakeWord, setWakeWord]   = useState(false)
  const [showModes, setShowModes] = useState(false)
  const [history, setHistory]     = useState<{role:string;content:string}[]>([])

  const recRef   = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stateRef = useRef<State>('idle') // Sync ref for closures

  // Keep stateRef in sync
  useEffect(() => { stateRef.current = appState }, [appState])

  const cfg = {
    idle:      { color: '#00e5ff', label: 'Tap karo — baat karo',  icon: '🎤', pulse: false },
    listening: { color: '#ff4444', label: 'Sun raha hun...',        icon: '👂', pulse: true  },
    thinking:  { color: '#a78bfa', label: 'Soch raha hun...',       icon: '🧠', pulse: true  },
    speaking:  { color: '#00e676', label: 'Bol raha hun...',        icon: '🔊', pulse: true  },
  }[appState]

  // ── Wake Word ────────────────────────────────────────────
  useEffect(() => {
    if (!wakeWord) return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'hi-IN'; rec.continuous = true; rec.interimResults = false
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript).join('').toLowerCase()
      if ((text.includes('hey jarvis') || text.includes('jarvis')) && stateRef.current === 'idle') {
        rec.stop()
        setTimeout(startListening, 400)
      }
    }
    rec.onerror = () => {}
    rec.start()
    return () => { try { rec.stop() } catch {} }
  }, [wakeWord])

  // ── Start Listening ───────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Chrome browser mein voice kaam karta hai'); return }
    if (stateRef.current !== 'idle') return

    // Stop any playing audio
    if (audioRef.current) { try { audioRef.current.pause() } catch {} audioRef.current = null }

    const rec = new SR()
    recRef.current = rec
    rec.lang = 'hi-IN'
    rec.continuous = false
    rec.interimResults = true

    let finalText = ''

    setAppState('listening')
    setInterim('')
    setTranscript('')

    // FIXED: Single onresult handler
    rec.onresult = (e: any) => {
      let fin = '', inter = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript
        else inter += e.results[i][0].transcript
      }
      if (inter) setInterim(inter)
      if (fin)   { finalText = fin; setTranscript(fin); setInterim('') }
    }

    rec.onspeechend = () => { rec.stop() }

    rec.onend = () => {
      setInterim('')
      if (finalText.trim()) sendToJARVIS(finalText.trim())
      else setAppState('idle')
    }

    rec.onerror = (e: any) => {
      console.warn('Speech error:', e.error)
      setAppState('idle'); setInterim('')
    }

    rec.start()
  }, [])

  // ── Send to JARVIS ────────────────────────────────────────
  const sendToJARVIS = useCallback(async (text: string) => {
    if (!text?.trim()) { setAppState('idle'); return }
    setAppState('thinking')
    setReply(''); setThinking(''); setImageUrl('')

    // Image request → Pollinations (no key, works mobile)
    const isImageReq = /image|photo|picture|tasveer|banao.*pic|wallpaper|draw/i.test(text)
    if (isImageReq) {
      const cleanPrompt = text.replace(/image|photo|banao|dikhao|tasveer|please|karo|picture|wallpaper/gi,'').trim()
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=768&height=768&model=flux&nologo=true&seed=${Date.now()}`
      setImageUrl(url)
      const rep = 'Lo — image ban gayi! 🎨'
      setReply(rep)
      setHistory(h => [...h, { role:'user', content:text }, { role:'assistant', content:rep }])
      await speak(rep)
      return
    }

    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userId: (typeof window!=='undefined' ? localStorage.getItem('jarvis_uid')||'user' : 'user'),
          chatId: 'voice_session',
          chatMode: mode,
          history: history.slice(-6),
        })
      })
      const d = await res.json()

      // Extract thinking if present
      const thinkMatch = (d.reply || '').match(/<think>([\s\S]*?)<\/think>/i)
      if (thinkMatch || d.thinking) {
        setThinking(d.thinking || thinkMatch?.[1] || '')
      }

      const cleanReply = (d.reply || 'Kuch problem aayi')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/\[LEARN:[^\]]*\]/g, '')  // strip learn tags before speaking
        .trim()

      setReply(cleanReply)
      setHistory(h => [...h, { role:'user', content:text }, { role:'assistant', content:cleanReply }])

      // Image in rich data
      if (d.richData?.type === 'image' && d.richData?.data?.url) {
        setImageUrl(d.richData.data.url)
      }

      await speak(cleanReply)
    } catch (e: any) {
      const err = 'Network error. Check internet.'
      setReply(err)
      await speak(err)
    }
  }, [mode, history])

  // ── Speak — Edge TTS → Browser fallback ──────────────────
  const speak = useCallback(async (text: string) => {
    setAppState('speaking')
    const short = text.slice(0, 500) // Mobile: limit length

    try {
      // Try server-side TTS → base64 audio → Audio() play
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: short, lang: 'hi', speed, voiceName: voice }),
        signal: AbortSignal.timeout(12000),
      })
      const data = await res.json()

      if (data.audioBase64) {
        const audio = new Audio(`data:${data.mimeType || 'audio/mp3'};base64,${data.audioBase64}`)
        audioRef.current = audio
        await new Promise<void>((resolve) => {
          audio.onended  = () => resolve()
          audio.onerror  = () => resolve() // Fallback on error
          audio.playbackRate = speed
          audio.play().catch(() => resolve())
        })
        setAppState('idle')
        return
      }
    } catch {}

    // Browser Web Speech fallback — always works on mobile Chrome
    try {
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(short)
      utt.lang  = voice.startsWith('en') ? 'en-IN' : 'hi-IN'
      utt.rate  = speed
      utt.pitch = 1
      // Find best available voice
      const voices = window.speechSynthesis.getVoices()
      const hindiVoice = voices.find(v =>
        v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi')
      )
      if (hindiVoice) utt.voice = hindiVoice
      await new Promise<void>((resolve) => {
        utt.onend   = () => resolve()
        utt.onerror = () => resolve()
        window.speechSynthesis.speak(utt)
      })
    } catch {}
    setAppState('idle')
  }, [voice, speed])

  const handleMicTap = () => {
    if (appState === 'idle')      startListening()
    else if (appState === 'listening') { try { recRef.current?.stop() } catch {} }
    else if (appState === 'speaking')  {
      try { audioRef.current?.pause() } catch {}
      window.speechSynthesis.cancel()
      setAppState('idle')
    }
  }

  const modeInfo = MODES.find(m => m.id === mode)!

  return (
    <div style={{ position:'fixed', inset:0, display:'flex', flexDirection:'column',
      background:'#060b14', fontFamily:"'Inter','Noto Sans Devanagari',sans-serif" }}>

      {/* Header */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,.05)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'rgba(6,11,20,.97)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:18 }}>🎙️</span>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#e8f4ff', letterSpacing:2 }}>VOICEBOX</div>
            <div style={{ fontSize:9, color:'#1e3050' }}>Edge TTS · DeepSeek R1 · Pollinations</div>
          </div>
        </div>
        {/* Mode selector */}
        <div style={{ position:'relative' }}>
          <button onClick={() => setShowModes(p => !p)} style={{
            display:'flex', alignItems:'center', gap:6, padding:'5px 10px',
            background:'rgba(255,255,255,.04)', border:`1px solid ${modeInfo.color}40`,
            borderRadius:20, cursor:'pointer', color:modeInfo.color, fontSize:12,
          }}>
            {modeInfo.icon} {modeInfo.label} <span style={{ fontSize:9, opacity:.5 }}>▼</span>
          </button>
          {showModes && (
            <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0,
              background:'#0c1830', border:'1px solid rgba(0,229,255,.12)',
              borderRadius:12, padding:8, minWidth:160, zIndex:100,
              boxShadow:'0 8px 32px rgba(0,0,0,.7)' }}>
              {MODES.map(m => (
                <button key={m.id} onClick={() => { setMode(m.id); setShowModes(false) }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:8,
                    padding:'8px 10px', background: mode===m.id ? `${m.color}15` : 'transparent',
                    border:`1px solid ${mode===m.id ? m.color+'30' : 'transparent'}`,
                    borderRadius:8, cursor:'pointer', color:m.color, fontSize:13, marginBottom:2 }}>
                  {m.icon} {m.label}
                  {mode===m.id && <span style={{ marginLeft:'auto', fontSize:12 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>

        {/* Transcript */}
        {(transcript || interim) && (
          <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)',
            borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
            <div style={{ fontSize:9, color:'#4a7096', marginBottom:4 }}>TU</div>
            <div style={{ fontSize:15, color:'#c8e4ff' }}>{transcript || interim}</div>
          </div>
        )}

        {/* Think block */}
        {thinking && (
          <div style={{ marginBottom:12 }}>
            <button onClick={() => setShowThink(p => !p)} style={{
              display:'flex', alignItems:'center', gap:8, padding:'6px 12px',
              background:'rgba(167,139,250,.08)', border:'1px solid rgba(167,139,250,.2)',
              borderRadius:20, cursor:'pointer', color:'#a78bfa', fontSize:12, marginBottom:6,
            }}>
              🧠 Soch {showThink ? 'chhupao ▲' : 'dikhao ▼'}
              <span style={{ fontSize:10, opacity:.5 }}>({thinking.split('\n').length} lines)</span>
            </button>
            {showThink && (
              <div style={{ background:'rgba(167,139,250,.05)', borderLeft:'3px solid #a78bfa',
                borderRadius:8, padding:'10px 14px 10px 58px' }}>
                <div style={{ fontSize:9, color:'#a78bfa', marginBottom:4, letterSpacing:1 }}>
                  DEEPSEEK R1 — SOCH PROCESS
                </div>
                <pre style={{ fontSize:11, color:'#6b7280', whiteSpace:'pre-wrap',
                  wordBreak:'break-word', margin:0, lineHeight:1.6 }}>{thinking}</pre>
              </div>
            )}
          </div>
        )}

        {/* Reply */}
        {reply && (
          <div style={{ background:'rgba(0,229,255,.04)', border:'1px solid rgba(0,229,255,.08)',
            borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ fontSize:9, color:'#4a7096', marginBottom:6 }}>JARVIS</div>
            <div style={{ fontSize:15, color:'#e8f4ff', lineHeight:1.7 }}>{reply}</div>
          </div>
        )}

        {/* Pollinations Image */}
        {imageUrl && (
          <div style={{ marginBottom:12 }}>
            <img src={imageUrl} alt="Generated" loading="lazy"
              style={{ width:'100%', borderRadius:12, border:'1px solid rgba(0,229,255,.1)' }} />
            <a href={imageUrl} download target="_blank" rel="noreferrer"
              style={{ fontSize:11, color:'#00e676', display:'block', marginTop:6, textAlign:'center' }}>
              ⬇ Download
            </a>
          </div>
        )}

        {/* Idle hint */}
        {appState === 'idle' && !reply && (
          <div style={{ textAlign:'center', padding:'50px 20px' }}>
            <div style={{ fontSize:40, marginBottom:16, opacity:.3 }}>🎤</div>
            <div style={{ color:'#1e3858', fontSize:14, lineHeight:1.8 }}>
              Niche wale button pe tap karo<br/>
              aur JARVIS se baat karo<br/>
              <span style={{ fontSize:11, color:'#0e2035' }}>
                "Hey JARVIS, aaj ka mausam batao"
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div style={{ background:'rgba(6,11,20,.97)', borderTop:'1px solid rgba(255,255,255,.04)',
        padding:'8px 16px' }}>

        {/* Speed + Wake word */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <span style={{ fontSize:10, color:'#4a7096', minWidth:36 }}>Speed</span>
          <input type="range" min="0.5" max="2" step="0.1" value={speed}
            onChange={e => setSpeed(parseFloat(e.target.value))}
            style={{ flex:1, accentColor:'#00e5ff', height:3 }} />
          <span style={{ fontSize:11, color:'#00e5ff', minWidth:28 }}>{speed}x</span>

          {/* Wake word toggle */}
          <button onClick={() => setWakeWord(p => !p)} style={{
            padding:'3px 8px', borderRadius:10,
            background: wakeWord ? 'rgba(0,229,255,.1)' : 'transparent',
            border: `1px solid ${wakeWord ? '#00e5ff' : 'rgba(255,255,255,.08)'}`,
            color: wakeWord ? '#00e5ff' : '#2a4060', fontSize:10, cursor:'pointer',
          }}>
            👋 {wakeWord ? 'Wake ON' : 'Wake OFF'}
          </button>
        </div>

        {/* Voice select */}
        <div style={{ display:'flex', gap:4, marginBottom:12, overflowX:'auto' }}>
          {VOICES.map(v => (
            <button key={v.id} onClick={() => setVoice(v.id)} style={{
              padding:'4px 10px', borderRadius:10, whiteSpace:'nowrap',
              background: voice===v.id ? 'rgba(0,229,255,.1)' : 'transparent',
              border: `1px solid ${voice===v.id ? 'rgba(0,229,255,.3)' : 'rgba(255,255,255,.06)'}`,
              color: voice===v.id ? '#00e5ff' : '#2a4060', fontSize:10, cursor:'pointer',
            }}>{v.label}</button>
          ))}
        </div>

        {/* Big MIC button */}
        <div style={{ display:'flex', justifyContent:'center', paddingBottom:4 }}>
          <button onClick={handleMicTap} style={{
            width:88, height:88, borderRadius:'50%',
            background: appState === 'idle'
              ? 'radial-gradient(circle,rgba(0,229,255,.08),#020917)'
              : `radial-gradient(circle,${cfg.color}33,#020917)`,
            border: `3px solid ${cfg.color}`,
            boxShadow: cfg.pulse ? `0 0 30px ${cfg.color}55` : `0 0 10px ${cfg.color}22`,
            cursor:'pointer', fontSize:32,
            display:'flex', alignItems:'center', justifyContent:'center',
            animation: cfg.pulse ? 'pulse 1.5s ease-in-out infinite' : 'none',
            transition:'all .3s',
          }}>
            {cfg.icon}
          </button>
        </div>
        <div style={{ textAlign:'center', fontSize:11, color:cfg.color,
          paddingBottom:6, marginTop:4 }}>{cfg.label}</div>
      </div>

      <Sidebar/>

      <style>{`
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 20px ${cfg.color}33 }
          50%      { box-shadow: 0 0 45px ${cfg.color}77 }
        }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  )
}
