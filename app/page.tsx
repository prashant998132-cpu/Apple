'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '../components/shared/Sidebar'
import { initProactiveEngine } from '../lib/proactive'
import { awardXP } from '../lib/xp'

type Role = 'user' | 'assistant'
type ChatMode = 'auto' | 'flash' | 'think' | 'deep'
type Msg = {
  id: string
  role: Role
  content: string
  provider?: string
  thinking?: string
  imageUrl?: string
  videoUrl?: string
  ts: number
  reactions?: string[]
}

const STORE = 'j_msgs_v5'
const MSTORE = 'j_mode_v4'

function uid() { return Math.random().toString(36).slice(2) }

function genPass() {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$'
  return Array.from({ length: 16 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return 'abhi'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h'
  return new Date(ts).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })
}

function MdText({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let codeBlock = false
  let codeLang = ''
  let codeLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('```')) {
      if (codeBlock) {
        elements.push(
          <div key={i} style={{ position: 'relative', margin: '10px 0' }}>
            {codeLang && (
              <div style={{ position: 'absolute', top: '8px', left: '12px', fontSize: '10px', color: '#00e5ff88', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {codeLang}
              </div>
            )}
            <pre style={{ background: '#060c18', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '10px', padding: codeLang ? '28px 12px 12px' : '12px', overflowX: 'auto', fontSize: '12px', color: '#9ac8e8', fontFamily: "'Space Mono', monospace", lineHeight: '1.6', whiteSpace: 'pre' }}>
              {codeLines.join('\n')}
            </pre>
            <QuickCopy text={codeLines.join('\n')} />
          </div>
        )
        codeLines = []; codeLang = ''; codeBlock = false
      } else {
        codeBlock = true; codeLang = line.slice(3).trim()
      }
      continue
    }
    if (codeBlock) { codeLines.push(line); continue }
    if (line === '') { elements.push(<div key={i} style={{ height: '6px' }} />); continue }

    const isBullet = /^[-*•] /.test(line)
    const isNum = /^\d+\. /.test(line)
    const isH1 = line.startsWith('# ')
    const isH2 = line.startsWith('## ')
    const isH3 = line.startsWith('### ')
    const isHr = line === '---' || line === '***'

    if (isHr) { elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '8px 0' }} />); continue }

    const raw = line.replace(/^[-*•] /, '').replace(/^\d+\. /, '').replace(/^#{1,3} /, '')
    const styled = raw.split(/(\*\*[^*]+\*\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
        return <strong key={j} style={{ color: '#e8f4ff' }}>{part.slice(2, -2)}</strong>
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
        return <code key={j} style={{ background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '4px', padding: '1px 6px', fontSize: '12px', fontFamily: "'Space Mono', monospace", color: '#6dc8f0' }}>{part.slice(1, -1)}</code>
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (linkMatch) return <a key={j} href={linkMatch[2]} target="_blank" rel="noreferrer" style={{ color: '#00e5ff', textDecoration: 'underline' }}>{linkMatch[1]}</a>
      return <span key={j}>{part}</span>
    })

    if (isH1) elements.push(<div key={i} style={{ fontSize: '17px', fontWeight: 700, color: '#f0f8ff', margin: '14px 0 5px', letterSpacing: '-0.2px' }}>{styled}</div>)
    else if (isH2) elements.push(<div key={i} style={{ fontSize: '15px', fontWeight: 700, color: '#e0efff', margin: '11px 0 4px' }}>{styled}</div>)
    else if (isH3) elements.push(<div key={i} style={{ fontSize: '14px', fontWeight: 600, color: '#c8dff0', margin: '8px 0 3px' }}>{styled}</div>)
    else if (isBullet || isNum) elements.push(
      <div key={i} style={{ display: 'flex', gap: '8px', margin: '3px 0', paddingLeft: '4px', lineHeight: '1.6' }}>
        <span style={{ color: '#00e5ff88', flexShrink: 0, width: '12px', textAlign: 'center' }}>{isNum ? '•' : '–'}</span>
        <span>{styled}</span>
      </div>
    )
    else elements.push(<div key={i} style={{ margin: '2px 0', lineHeight: '1.7' }}>{styled}</div>)
  }
  return <div>{elements}</div>
}

function QuickCopy({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500) }}
      style={{ position: 'absolute', top: '8px', right: '8px', background: ok ? 'rgba(52,211,153,0.15)' : 'rgba(0,229,255,0.08)', border: '1px solid', borderColor: ok ? '#34d39944' : 'rgba(0,229,255,0.15)', borderRadius: '5px', color: ok ? '#34d399' : '#00e5ff99', cursor: 'pointer', fontSize: '10px', padding: '3px 7px', fontFamily: 'monospace' }}>
      {ok ? '✓' : 'copy'}
    </button>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000) }}
      style={{ background: ok ? 'rgba(52,211,153,0.1)' : 'rgba(0,229,255,0.06)', border: '1px solid', borderColor: ok ? '#34d39933' : 'rgba(0,229,255,0.1)', borderRadius: '5px', color: ok ? '#34d399' : '#00e5ff88', cursor: 'pointer', fontSize: '11px', padding: '3px 8px', transition: 'all 0.15s', fontWeight: 500 }}>
      {ok ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function ThinkBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const clean = text.replace(/<\/?think>/g, '').trim()
  if (!clean) return null
  return (
    <div style={{ margin: '6px 0' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '6px', color: '#a78bfa99', cursor: 'pointer', fontSize: '11px', padding: '4px 10px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '10px' }}>{open ? '▼' : '▶'}</span>
        {open ? 'Hide reasoning' : 'Show reasoning...'}
      </button>
      {open && (
        <div style={{ margin: '6px 0', padding: '10px 12px', background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: '8px', color: '#8b8ea8', fontSize: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto', animation: 'fadeIn 0.15s ease' }}>
          {clean}
        </div>
      )}
    </div>
  )
}

function ImageMsg({ url, prompt }: { url: string; prompt: string }) {
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(false)
  return (
    <div style={{ maxWidth: '320px', margin: '6px 0' }}>
      <div style={{ fontSize: '11px', color: '#4a7090', marginBottom: '6px', fontStyle: 'italic' }}>{prompt.slice(0, 60)}</div>
      {!loaded && !err && (
        <div style={{ width: '300px', height: '200px', background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#00e5ff', fontSize: '13px' }}>
          <div style={{ width: '24px', height: '24px', border: '2px solid #00e5ff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          Generating...
        </div>
      )}
      {err && <div style={{ fontSize: '12px', color: '#ff6b6b' }}>Image load failed.</div>}
      <img src={url} alt={prompt} onLoad={() => setLoaded(true)} onError={() => setErr(true)} style={{ width: '100%', borderRadius: '12px', border: '1px solid rgba(0,229,255,0.1)', display: loaded ? 'block' : 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }} />
      {loaded && (
        <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#00e5ff88', marginTop: '6px', display: 'inline-block' }}>↓ Save image</a>
      )}
    </div>
  )
}

const MODES: Array<{ id: ChatMode; label: string; desc: string; color: string; icon: string }> = [
  { id: 'auto',  label: 'Auto',  desc: 'Smart routing', color: '#00e5ff', icon: '⚡' },
  { id: 'flash', label: 'Flash', desc: 'Fastest',        color: '#f87171', icon: '🔥' },
  { id: 'think', label: 'Think', desc: 'Reasoning',      color: '#a78bfa', icon: '🧠' },
  { id: 'deep',  label: 'Deep',  desc: '46 tools',       color: '#34d399', icon: '🔭' },
]

const QUICK_PROMPTS = [
  { l: '🖼️ Image banao', m: 'image banao ' },
  { l: '📰 Aaj ki news', m: 'aaj ki news kya hai' },
  { l: '🌤️ Mausam', m: 'Rewa ka mausam batao' },
  { l: '💻 Code karo', m: 'Python mein ' },
  { l: '🔢 Math', m: '' },
  { l: '📝 Summary', m: 'summarize karo: ' },
]

export default function Home() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [inp, setInp] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [streamThink, setStreamThink] = useState('')
  const [streamProv, setStreamProv] = useState('')
  const [chatMode, setChatMode] = useState<ChatMode>('auto')
  const [sidebar, setSidebar] = useState(false)
  const [recording, setRecording] = useState(false)
  const [tts, setTts] = useState(false)
  const [modeMenu, setModeMenu] = useState(false)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inpRef = useRef<HTMLTextAreaElement>(null)
  const mediaRef = useRef<any>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORE)
      if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) setMsgs(p) }
      const m = localStorage.getItem(MSTORE) as ChatMode | null
      if (m && ['auto', 'flash', 'think', 'deep'].includes(m)) setChatMode(m)
    } catch {}
    try { initProactiveEngine('', 'main') } catch {}

    // Keyboard shortcuts
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setSearchOpen(v => !v) }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSidebar(true) }
      if (e.key === 'Escape') { setModeMenu(false); setSearchOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(msgs.slice(-80))) } catch {}
  }, [msgs])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, streamText])

  // Auto-resize textarea
  useEffect(() => {
    if (inpRef.current) {
      inpRef.current.style.height = 'auto'
      inpRef.current.style.height = Math.min(inpRef.current.scrollHeight, 120) + 'px'
    }
  }, [inp])

  function changeMode(m: ChatMode) {
    setChatMode(m); setModeMenu(false)
    try { localStorage.setItem(MSTORE, m) } catch {}
  }

  function clearChat() {
    setMsgs([])
    try { localStorage.removeItem(STORE) } catch {}
  }

  function addReaction(msgId: string, emoji: string) {
    setMsgs(prev => prev.map(m =>
      m.id === msgId
        ? { ...m, reactions: m.reactions?.includes(emoji) ? m.reactions.filter(r => r !== emoji) : [...(m.reactions || []), emoji] }
        : m
    ))
  }

  async function speak(text: string) {
    if (!tts) return
    try {
      const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 300) }) })
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
        fd.append('audio', new Blob(chunks, { type: 'audio/webm' }), 'audio.webm')
        try {
          const r = await fetch('/api/stt', { method: 'POST', body: fd })
          const d = await r.json()
          if (d.text) setInp(d.text)
        } catch {}
      }
      mr.start(); mediaRef.current = mr; setRecording(true)
      setTimeout(() => { if (mr.state === 'recording') mr.stop() }, 10000)
    } catch { alert('Mic permission chahiye!') }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const question = inp.trim() || 'Is image mein kya dikh raha hai? Hinglish mein batao.'
    const userLabel = inp.trim() ? inp.trim() : 'Photo sent for analysis'
    if (inp.trim()) setInp('')
    const reader = new FileReader()
    reader.onload = async () => {
      const newMsgs: Msg[] = [...msgs, { id: uid(), role: 'user', content: userLabel, ts: Date.now() }]
      setMsgs(newMsgs); setStreaming(true); setStreamText(''); setStreamProv('Gemini Vision')
      try {
        const r = await fetch('/api/photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: reader.result, question }) })
        const d = await r.json()
        const rep = d.answer || 'Could not analyse'
        setMsgs([...newMsgs, { id: uid(), role: 'assistant', content: rep, provider: 'Gemini Vision', ts: Date.now() }])
        speak(rep)
      } catch {
        setMsgs([...newMsgs, { id: uid(), role: 'assistant', content: 'Photo analyse nahi ho payi.', ts: Date.now() }])
      }
      setStreaming(false); setStreamText(''); setStreamProv('')
    }
    reader.readAsDataURL(file); e.target.value = ''
  }

  const send = useCallback(async (override?: string) => {
    const text = (override ?? inp).trim()
    if (!text || streaming) return
    setInp('')

    if (text.toLowerCase() === '/clear') { clearChat(); return }
    if (text.toLowerCase() === '/pass' || text.toLowerCase() === '/password') {
      const p = genPass()
      setMsgs(m => [...m, { id: uid(), role: 'user', content: text, ts: Date.now() }, { id: uid(), role: 'assistant', content: `🔐 Password: \`${p}\`\n\nStrong 16-char password! Copy karo.`, ts: Date.now() }])
      return
    }
    if (text.toLowerCase() === '/luna') { window.location.href = '/luna'; return }
    if (text.toLowerCase() === '/era') { window.location.href = '/era'; return }
    if (text.toLowerCase() === '/mood') { window.location.href = '/mood'; return }
    if (text.toLowerCase() === '/notes') { window.location.href = '/notes'; return }
    if (text.toLowerCase() === '/timer') { window.location.href = '/timer'; return }
    if (text.toLowerCase() === '/dash') { window.location.href = '/dashboard'; return }

    const t = text.toLowerCase()
    const userMsg: Msg = { id: uid(), role: 'user', content: text, ts: Date.now() }
    const newMsgs = [...msgs, userMsg]
    setMsgs(newMsgs)

    if (/image banao|photo banao|generate image|draw|wallpaper|sketch/i.test(t)) {
      const prompt = text.replace(/image banao|photo banao|generate image|draw|wallpaper|sketch/gi, '').trim() || text
      const seed = Math.floor(Math.random() * 999999)
      const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) + '?model=flux&width=1024&height=1024&seed=' + seed + '&nologo=true'
      setMsgs([...newMsgs, { id: uid(), role: 'assistant', content: prompt, imageUrl: url, provider: 'Pollinations FLUX', ts: Date.now() }])
      return
    }

    if (/video banao|clip banao/i.test(t)) {
      const prompt = text.replace(/video banao|clip banao/gi, '').trim() || text
      const url = 'https://video.pollinations.ai/' + encodeURIComponent(prompt)
      setMsgs([...newMsgs, { id: uid(), role: 'assistant', content: 'Video generating...', videoUrl: url, provider: 'Pollinations Video', ts: Date.now() }])
      return
    }

    setStreaming(true); setStreamText(''); setStreamThink(''); setStreamProv('Connecting...')
    abortRef.current = new AbortController()
    let full = '', think = '', prov = ''

    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: newMsgs.slice(-8).map(x => ({ role: x.role === 'user' ? 'user' : 'assistant', content: x.content })),
          chatMode,
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
        const lines = buf.split('\n'); buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw || raw === '[DONE]') continue
          try {
            const ev = JSON.parse(raw)
            if (ev.type === 'start') { prov = ev.provider || ''; setStreamProv(prov) }
            else if (ev.type === 'token') { full += ev.text; setStreamText(full) }
            else if (ev.type === 'think') { think += ev.text; setStreamThink(think) }
          } catch {}
        }
      }

      const finalMsg: Msg = { id: uid(), role: 'assistant', content: full || 'No response', thinking: think.replace(/<\/?think>/g, '').trim() || undefined, provider: prov || undefined, ts: Date.now() }
      setMsgs([...newMsgs, finalMsg])
      speak(full)
      awardXP('chat_message')
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setMsgs([...newMsgs, { id: uid(), role: 'assistant', content: '⚠️ Network issue — retry karo!', ts: Date.now() }])
      }
    } finally {
      setStreaming(false); setStreamText(''); setStreamThink(''); setStreamProv('')
    }
  }, [inp, streaming, msgs, chatMode, tts])

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const curMode = MODES.find(m => m.id === chatMode) || MODES[0]
  const filteredMsgs = search ? msgs.filter(m => m.content.toLowerCase().includes(search.toLowerCase())) : msgs

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse-ring { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.05)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 3px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(0,229,255,0.2); border-radius: 3px }
        textarea::placeholder { color: #1e3248 }
        textarea { resize: none }
        .msg-bubble:hover .msg-actions { opacity: 1; }
        .msg-actions { opacity: 0; transition: opacity 0.15s; }
        .quick-btn:hover { border-color: rgba(0,229,255,0.3) !important; background: rgba(0,229,255,0.06) !important; }
        .mode-btn:hover { background: rgba(255,255,255,0.05) !important; }
        .tool-btn:hover { background: rgba(0,229,255,0.1) !important; border-color: rgba(0,229,255,0.3) !important; color: #00e5ff !important; }
        .send-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .send-btn:active { transform: translateY(0); }
        .react-btn:hover { background: rgba(255,255,255,0.1) !important; transform: scale(1.2); }
        .react-btn { transition: all 0.15s; }
      `}</style>

      <Sidebar isOpen={sidebar} onClose={() => setSidebar(false)} />

      {/* Header */}
      <header style={{ flexShrink: 0, height: '54px', background: 'rgba(8,13,24,0.95)', borderBottom: '1px solid rgba(0,229,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: '10px', zIndex: 10, backdropFilter: 'blur(12px)' }}>
        <button onClick={() => setSidebar(true)} style={{ background: 'none', border: 'none', color: '#4a7090', cursor: 'pointer', padding: '6px', borderRadius: '8px', fontSize: '18px', lineHeight: 1 }}>
          ☰
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #0077ff, #00e5ff)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 800, color: '#000', boxShadow: '0 0 12px rgba(0,229,255,0.3)', flexShrink: 0 }}>J</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#ddeeff', letterSpacing: '1px' }}>JARVIS</div>
            <div style={{ fontSize: '9px', color: '#1e6080', letterSpacing: '2px' }}>LIFE OS v11.0</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={() => setSearchOpen(v => !v)}
            style={{ background: searchOpen ? 'rgba(0,229,255,0.1)' : 'none', border: '1px solid', borderColor: searchOpen ? 'rgba(0,229,255,0.3)' : 'transparent', borderRadius: '6px', color: searchOpen ? '#00e5ff' : '#4a7090', cursor: 'pointer', padding: '5px 7px', fontSize: '13px' }}
            title="Search (Ctrl+F)">🔍</button>
          <button onClick={() => setTts(v => !v)}
            style={{ background: tts ? 'rgba(0,229,255,0.1)' : 'none', border: '1px solid', borderColor: tts ? 'rgba(0,229,255,0.3)' : 'transparent', borderRadius: '6px', color: tts ? '#00e5ff' : '#4a7090', cursor: 'pointer', padding: '5px 8px', fontSize: '11px', fontWeight: 600 }}>
            TTS
          </button>
          <button onClick={clearChat}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: '#4a7090', cursor: 'pointer', padding: '5px 8px', fontSize: '11px' }}>
            Clear
          </button>
        </div>
      </header>

      {/* Search bar */}
      {searchOpen && (
        <div style={{ flexShrink: 0, padding: '8px 14px', background: 'rgba(8,13,24,0.9)', borderBottom: '1px solid rgba(0,229,255,0.08)', animation: 'slideDown 0.15s ease' }}>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Messages mein search karo..."
            style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '8px', color: '#ddeeff', padding: '7px 12px', fontSize: '13px', width: '100%', outline: 'none' }}
          />
          {search && <div style={{ fontSize: '11px', color: '#2a5070', marginTop: '4px' }}>{filteredMsgs.length} results</div>}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0 4px' }}>
        {msgs.length === 0 && !streaming && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px', padding: '20px' }}>
            {/* Animated Logo */}
            <div style={{ position: 'relative', width: '80px', height: '80px' }}>
              <div style={{ position: 'absolute', inset: '-8px', borderRadius: '50%', border: '1px solid rgba(0,229,255,0.15)', animation: 'pulse-ring 2s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', inset: '-16px', borderRadius: '50%', border: '1px solid rgba(0,229,255,0.07)', animation: 'pulse-ring 2s ease-in-out infinite 0.5s' }} />
              <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #0055cc, #00e5ff)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '34px', fontWeight: 900, color: '#000', boxShadow: '0 0 30px rgba(0,229,255,0.3)' }}>J</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#ddeeff', marginBottom: '6px' }}>Namaste Pranshu 👋</div>
              <div style={{ fontSize: '13px', color: '#2a5070' }}>JARVIS ready hai. Kya karna hai aaj?</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxWidth: '340px', width: '100%' }}>
              {QUICK_PROMPTS.map(q => (
                <button key={q.l} className="quick-btn" onClick={() => { if (q.m.endsWith(' ') || q.m === '') setInp(q.m); else send(q.m) }}
                  style={{ background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '10px', color: '#7ca5c0', cursor: 'pointer', padding: '11px 12px', fontSize: '12px', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                  {q.l}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '10px', color: '#152030', textAlign: 'center' }}>Ctrl+K menu · Ctrl+F search · /clear /pass /luna /era</div>
          </div>
        )}

        {(search ? filteredMsgs : msgs).map((msg) => (
          <div key={msg.id} className="msg-bubble" style={{ padding: '3px 0', animation: 'fadeIn 0.18s ease' }}>
            {msg.role === 'user' ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '3px 14px' }}>
                <div style={{ maxWidth: '82%' }}>
                  <div style={{ background: 'rgba(0,119,255,0.15)', border: '1px solid rgba(0,119,255,0.25)', borderRadius: '16px 16px 3px 16px', padding: '9px 14px', fontSize: '14px', color: '#ddeeff', lineHeight: '1.6' }}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: '10px', color: '#152030', textAlign: 'right', marginTop: '3px', paddingRight: '4px' }}>{timeAgo(msg.ts)}</div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '6px 14px' }}>
                <div style={{ display: 'flex', gap: '10px', maxWidth: '800px', margin: '0 auto' }}>
                  <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #0055cc, #00e5ff)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#000', flexShrink: 0, marginTop: '2px' }}>J</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {msg.thinking && <ThinkBlock text={msg.thinking} />}
                    {msg.imageUrl && <ImageMsg url={msg.imageUrl} prompt={msg.content} />}
                    {msg.videoUrl && (
                      <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '10px', padding: '12px', maxWidth: '280px' }}>
                        <div style={{ fontSize: '13px', marginBottom: '8px', color: '#7a7090' }}>{msg.content}</div>
                        <a href={msg.videoUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '6px', padding: '6px 12px', color: '#a78bfa', textDecoration: 'none', fontSize: '12px' }}>▶ Watch Video</a>
                      </div>
                    )}
                    {!msg.imageUrl && !msg.videoUrl && (
                      <div style={{ fontSize: '14px', color: '#c8dff0', lineHeight: '1.7' }}>
                        <MdText text={msg.content} />
                      </div>
                    )}
                    {/* Actions row */}
                    <div className="msg-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '7px', flexWrap: 'wrap' }}>
                      {!msg.imageUrl && !msg.videoUrl && <CopyBtn text={msg.content} />}
                      {tts && !msg.imageUrl && (
                        <button onClick={() => speak(msg.content)} style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '5px', color: '#00e5ff88', cursor: 'pointer', fontSize: '11px', padding: '3px 8px', fontFamily: 'inherit' }}>🔊</button>
                      )}
                      {['👍', '❤️', '✨'].map(emoji => (
                        <button key={emoji} className="react-btn" onClick={() => addReaction(msg.id, emoji)}
                          style={{ background: msg.reactions?.includes(emoji) ? 'rgba(255,255,255,0.1)' : 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '2px 5px', borderRadius: '5px', opacity: msg.reactions?.includes(emoji) ? 1 : 0.4 }}>
                          {emoji}
                        </button>
                      ))}
                      {msg.provider && <span style={{ fontSize: '10px', color: '#152030', marginLeft: 'auto' }}>{msg.provider}</span>}
                      <span style={{ fontSize: '10px', color: '#0e2030' }}>{timeAgo(msg.ts)}</span>
                    </div>
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div style={{ marginTop: '5px', fontSize: '14px', letterSpacing: '2px' }}>{msg.reactions.join('')}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {streaming && (
          <div style={{ padding: '6px 14px', animation: 'fadeIn 0.18s ease' }}>
            <div style={{ display: 'flex', gap: '10px', maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #0055cc, #00e5ff)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#000', flexShrink: 0, marginTop: '2px' }}>J</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {streamThink && <ThinkBlock text={streamThink} />}
                <div style={{ fontSize: '14px', color: '#c8dff0', lineHeight: '1.7' }}>
                  {streamText ? (
                    <>
                      <MdText text={streamText} />
                      <span style={{ display: 'inline-block', width: '2px', height: '14px', background: '#00e5ff', marginLeft: '2px', animation: 'blink 0.8s infinite', verticalAlign: 'middle' }} />
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[0,1,2].map(i => <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: curMode.color, animation: `blink 1.2s infinite ${i * 0.2}s` }} />)}
                      </div>
                      <span style={{ color: '#1e3248', fontSize: '12px' }}>{streamProv || curMode.icon + ' ' + curMode.label}...</span>
                    </div>
                  )}
                </div>
                {streamProv && streamText && <div style={{ fontSize: '10px', color: '#152030', marginTop: '5px' }}>{streamProv}</div>}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div style={{ flexShrink: 0, background: 'rgba(8,13,24,0.95)', borderTop: '1px solid rgba(0,229,255,0.07)', padding: '10px 14px 16px', backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ background: 'rgba(12,20,34,0.9)', border: '1px solid', borderColor: streaming ? curMode.color + '44' : inp ? 'rgba(0,229,255,0.2)' : 'rgba(0,229,255,0.08)', borderRadius: '14px', padding: '10px 12px', transition: 'border-color 0.2s', boxShadow: inp ? '0 0 0 1px rgba(0,229,255,0.04)' : 'none' }}>
            <textarea
              ref={inpRef}
              value={inp}
              onChange={e => setInp(e.target.value)}
              onKeyDown={handleKey}
              placeholder={recording ? '🎙 Listening...' : 'Message JARVIS... (Shift+Enter = new line)'}
              disabled={streaming}
              rows={1}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#ddeeff', fontSize: '14px', lineHeight: '1.5', maxHeight: '120px', overflowY: 'auto', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '5px', position: 'relative' }}>
                {/* Mode selector */}
                <button className="mode-btn" onClick={() => setModeMenu(v => !v)}
                  style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '7px', color: curMode.color, cursor: 'pointer', padding: '4px 10px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit' }}>
                  <span>{curMode.icon}</span> {curMode.label} <span style={{ opacity: 0.5, fontSize: '10px' }}>▾</span>
                </button>
                {modeMenu && (
                  <div style={{ position: 'absolute', bottom: '36px', left: 0, background: 'rgba(8,13,24,0.98)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '12px', padding: '6px', zIndex: 50, minWidth: '190px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', animation: 'slideDown 0.12s ease' }}>
                    {MODES.map(m => (
                      <button key={m.id} onClick={() => changeMode(m.id)}
                        style={{ width: '100%', background: chatMode === m.id ? m.color + '12' : 'none', border: 'none', borderRadius: '7px', color: chatMode === m.id ? m.color : '#4a7090', cursor: 'pointer', padding: '8px 11px', fontSize: '13px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit' }}>
                        <span style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
                          <span>{m.icon}</span>
                          <span style={{ fontWeight: chatMode === m.id ? 700 : 400 }}>{m.label}</span>
                        </span>
                        <span style={{ fontSize: '10px', opacity: 0.5 }}>{m.desc}</span>
                      </button>
                    ))}
                  </div>
                )}

                <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
                <button className="tool-btn" onClick={() => photoRef.current?.click()}
                  style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '7px', color: '#2a5070', cursor: 'pointer', padding: '4px 9px', fontSize: '13px', transition: 'all 0.15s' }}>📷</button>
                <button className="tool-btn" onClick={toggleVoice}
                  style={{ background: recording ? 'rgba(255,107,107,0.1)' : 'rgba(0,229,255,0.04)', border: '1px solid', borderColor: recording ? 'rgba(255,107,107,0.3)' : 'rgba(0,229,255,0.08)', borderRadius: '7px', color: recording ? '#ff6b6b' : '#2a5070', cursor: 'pointer', padding: '4px 9px', fontSize: '13px', transition: 'all 0.15s', animation: recording ? 'recording 1.5s infinite' : 'none' }}>
                  {recording ? '⏹' : '🎙'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {inp && <span style={{ fontSize: '10px', color: '#1e3248' }}>{inp.length}</span>}
                {streaming ? (
                  <button onClick={() => abortRef.current?.abort()}
                    style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: '8px', color: '#ff6b6b', cursor: 'pointer', padding: '6px 14px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit' }}>Stop</button>
                ) : (
                  <button onClick={() => send()} disabled={!inp.trim()} className={inp.trim() ? 'send-btn' : ''}
                    style={{ background: inp.trim() ? 'linear-gradient(135deg, #0077ff, #00e5ff)' : 'rgba(0,229,255,0.04)', border: 'none', borderRadius: '8px', color: inp.trim() ? '#000' : '#152030', cursor: inp.trim() ? 'pointer' : 'not-allowed', padding: '6px 16px', fontSize: '13px', fontWeight: 700, transition: 'all 0.15s', fontFamily: 'inherit' }}>
                    Send
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
