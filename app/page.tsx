'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '../components/shared/Sidebar'

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
}

const STORE = 'j_msgs_v4'
const MSTORE = 'j_mode_v4'

function uid() {
  return Math.random().toString(36).slice(2)
}

function genPass() {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 16 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}

function safeCalc(expr: string): string {
  try {
    const clean = expr
      .replace(/[^0-9+\-*/().%\s]/g, '')
      .trim()
    if (!clean) return '0'
    let result = 0
    const fn = new Function('return (' + clean + ')')
    result = fn()
    if (typeof result !== 'number' || !isFinite(result)) return 'Error'
    return String(parseFloat(result.toFixed(10)))
  } catch (e) {
    return 'Error'
  }
}

function MdText({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let codeBlock = false
  let codeLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('```')) {
      if (codeBlock) {
        elements.push(
          <pre key={i} style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', padding: '12px', overflowX: 'auto', fontSize: '12px', margin: '8px 0', color: '#e6edf3', fontFamily: 'monospace', whiteSpace: 'pre' }}>
            {codeLines.join('\n')}
          </pre>
        )
        codeLines = []
        codeBlock = false
      } else {
        codeBlock = true
      }
      continue
    }
    if (codeBlock) {
      codeLines.push(line)
      continue
    }

    if (line === '') {
      elements.push(<div key={i} style={{ height: '8px' }} />)
      continue
    }

    const isBullet = /^[-*] /.test(line)
    const isNum = /^\d+\. /.test(line)
    const isH1 = line.startsWith('# ')
    const isH2 = line.startsWith('## ')
    const isH3 = line.startsWith('### ')

    const raw = line.replace(/^[-*] /, '').replace(/^\d+\. /, '').replace(/^#{1,3} /, '')

    const styled = raw.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={j}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return <code key={j} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '4px', padding: '1px 6px', fontSize: '12px', fontFamily: 'monospace', color: '#79c0ff' }}>{part.slice(1, -1)}</code>
      }
      return <span key={j}>{part}</span>
    })

    if (isH1) {
      elements.push(<div key={i} style={{ fontSize: '18px', fontWeight: 700, color: '#e6edf3', margin: '12px 0 4px' }}>{styled}</div>)
    } else if (isH2) {
      elements.push(<div key={i} style={{ fontSize: '16px', fontWeight: 700, color: '#e6edf3', margin: '10px 0 4px' }}>{styled}</div>)
    } else if (isH3) {
      elements.push(<div key={i} style={{ fontSize: '14px', fontWeight: 700, color: '#c9d1d9', margin: '8px 0 4px' }}>{styled}</div>)
    } else if (isBullet || isNum) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: '8px', margin: '3px 0', paddingLeft: '4px' }}>
          <span style={{ color: '#58a6ff', flexShrink: 0 }}>{isNum ? String(i) + '.' : '-'}</span>
          <span>{styled}</span>
        </div>
      )
    } else {
      elements.push(<div key={i} style={{ margin: '2px 0', lineHeight: '1.6' }}>{styled}</div>)
    }
  }

  return <div>{elements}</div>
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  function copy() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setOk(true)
        setTimeout(() => setOk(false), 2000)
      })
    }
  }
  return (
    <button onClick={copy} style={{ background: 'none', border: '1px solid', borderColor: ok ? '#238636' : '#30363d', borderRadius: '6px', color: ok ? '#3fb950' : '#8b949e', cursor: 'pointer', fontSize: '11px', padding: '3px 8px', transition: 'all 0.2s' }}>
      {ok ? 'Copied' : 'Copy'}
    </button>
  )
}

function ThinkBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const clean = text.replace(/<\/?think>/g, '').trim()
  if (!clean) return null
  return (
    <div style={{ margin: '6px 0' }}>
      <button onClick={() => setOpen(v => !v)} style={{ background: '#161b22', border: '1px solid #6e40c9', borderRadius: '6px', color: '#a371f7', cursor: 'pointer', fontSize: '12px', padding: '4px 10px', fontStyle: 'italic' }}>
        {open ? 'Hide reasoning' : 'Show reasoning...'}
      </button>
      {open && (
        <div style={{ margin: '6px 0', padding: '10px', background: '#0d1117', border: '1px solid #6e40c944', borderRadius: '8px', color: '#8b949e', fontSize: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
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
      <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '6px', fontStyle: 'italic' }}>{prompt.slice(0, 60)}</div>
      {!loaded && !err && (
        <div style={{ width: '300px', height: '200px', background: '#161b22', border: '1px solid #30363d', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#58a6ff', fontSize: '13px' }}>
          <div style={{ width: '24px', height: '24px', border: '2px solid #58a6ff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          Generating...
        </div>
      )}
      {err && <div style={{ fontSize: '12px', color: '#f85149' }}>Image load failed.</div>}
      <img src={url} alt={prompt} onLoad={() => setLoaded(true)} onError={() => setErr(true)} style={{ width: '100%', borderRadius: '10px', border: '1px solid #30363d', display: loaded ? 'block' : 'none' }} />
      {loaded && (
        <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#58a6ff', marginTop: '6px', display: 'inline-block' }}>Save image</a>
      )}
    </div>
  )
}

const MODES: Array<{ id: ChatMode; label: string; desc: string; color: string }> = [
  { id: 'auto', label: 'Auto', desc: 'Smart routing', color: '#58a6ff' },
  { id: 'flash', label: 'Flash', desc: 'Fastest', color: '#f78166' },
  { id: 'think', label: 'Think', desc: 'Reasoning', color: '#a371f7' },
  { id: 'deep', label: 'Deep', desc: '46 tools', color: '#3fb950' },
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

  const bottomRef = useRef<HTMLDivElement>(null)
  const inpRef = useRef<HTMLTextAreaElement>(null)
  const mediaRef = useRef<any>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORE)
      if (s) {
        const p = JSON.parse(s)
        if (Array.isArray(p) && p.length > 0) setMsgs(p)
      }
      const m = localStorage.getItem(MSTORE) as ChatMode | null
      if (m && ['auto', 'flash', 'think', 'deep'].includes(m)) setChatMode(m)
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(msgs.slice(-80))) } catch {}
  }, [msgs])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, streamText])

  function changeMode(m: ChatMode) {
    setChatMode(m)
    setModeMenu(false)
    try { localStorage.setItem(MSTORE, m) } catch {}
  }

  function clearChat() {
    setMsgs([])
    try { localStorage.removeItem(STORE) } catch {}
  }

  async function speak(text: string) {
    if (!tts) return
    try {
      const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 300) }) })
      if (r.ok) {
        const b = await r.blob()
        new Audio(URL.createObjectURL(b)).play()
      }
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
    const reader = new FileReader()
    reader.onload = async () => {
      const newMsgs: Msg[] = [...msgs, { id: uid(), role: 'user', content: 'Photo sent for analysis', ts: Date.now() }]
      setMsgs(newMsgs)
      setStreaming(true)
      setStreamText('')
      setStreamProv('Gemini Vision')
      try {
        const r = await fetch('/api/photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: reader.result }) })
        const d = await r.json()
        const rep = d.answer || 'Could not analyse'
        const final: Msg = { id: uid(), role: 'assistant', content: rep, provider: 'Gemini Vision', ts: Date.now() }
        setMsgs([...newMsgs, final])
        speak(rep)
      } catch {
        setMsgs([...newMsgs, { id: uid(), role: 'assistant', content: 'Photo analyse nahi ho payi.', ts: Date.now() }])
      }
      setStreaming(false)
      setStreamText('')
      setStreamProv('')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const send = useCallback(async (override?: string) => {
    const text = (override ?? inp).trim()
    if (!text || streaming) return
    setInp('')

    if (text.toLowerCase() === '/clear') { clearChat(); return }
    if (text.toLowerCase() === '/pass' || text.toLowerCase() === '/password') {
      const p = genPass()
      setMsgs(m => [...m, { id: uid(), role: 'user', content: text, ts: Date.now() }, { id: uid(), role: 'assistant', content: 'Password: ' + p + '\n\nStrong 16-char password. Copy karo!', ts: Date.now() }])
      return
    }
    if (text.toLowerCase() === '/luna') { window.location.href = '/luna'; return }
    if (text.toLowerCase() === '/era') { window.location.href = '/era'; return }

    const t = text.toLowerCase()
    const userMsg: Msg = { id: uid(), role: 'user', content: text, ts: Date.now() }
    const newMsgs = [...msgs, userMsg]
    setMsgs(newMsgs)

    if (/image banao|photo banao|generate image|draw|wallpaper/i.test(t)) {
      const prompt = text.replace(/image banao|photo banao|generate image|draw|wallpaper/gi, '').trim() || text
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

    setStreaming(true)
    setStreamText('')
    setStreamThink('')
    setStreamProv('Connecting...')
    abortRef.current = new AbortController()

    let full = ''
    let think = ''
    let prov = ''

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
        const lines = buf.split('\n')
        buf = lines.pop() || ''
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

      const finalMsg: Msg = {
        id: uid(),
        role: 'assistant',
        content: full || 'No response',
        thinking: think.replace(/<\/?think>/g, '').trim() || undefined,
        provider: prov || undefined,
        ts: Date.now(),
      }
      setMsgs([...newMsgs, finalMsg])
      speak(full)
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setMsgs([...newMsgs, { id: uid(), role: 'assistant', content: 'Network issue - retry karo!', ts: Date.now() }])
      }
    } finally {
      setStreaming(false)
      setStreamText('')
      setStreamThink('')
      setStreamProv('')
    }
  }, [inp, streaming, msgs, chatMode, tts])

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const curMode = MODES.find(m => m.id === chatMode) || MODES[0]

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0d1117', color: '#e6edf3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 6px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px }
        textarea::placeholder { color: #484f58 }
        textarea { resize: none }
      `}</style>

      <Sidebar isOpen={sidebar} onClose={() => setSidebar(false)} />

      <header style={{ flexShrink: 0, height: '56px', background: '#161b22', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px', zIndex: 10 }}>
        <button onClick={() => setSidebar(true)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
          {String.fromCharCode(9776)}
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #58a6ff, #a371f7)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#0d1117' }}>J</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3', letterSpacing: '0.5px' }}>JARVIS</div>
            <div style={{ fontSize: '10px', color: '#484f58' }}>v10.47</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={() => setTts(v => !v)} style={{ background: tts ? '#1f2937' : 'none', border: '1px solid', borderColor: tts ? '#58a6ff' : 'transparent', borderRadius: '6px', color: tts ? '#58a6ff' : '#8b949e', cursor: 'pointer', padding: '5px 8px', fontSize: '13px' }}>
            TTS
          </button>
          <button onClick={clearChat} style={{ background: 'none', border: '1px solid #30363d', borderRadius: '6px', color: '#8b949e', cursor: 'pointer', padding: '5px 8px', fontSize: '12px' }}>
            Clear
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
        {msgs.length === 0 && !streaming && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '24px', padding: '20px' }}>
            <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #58a6ff, #a371f7)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 800, color: '#0d1117' }}>J</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#e6edf3', marginBottom: '8px' }}>Namaste Pranshu</div>
              <div style={{ fontSize: '14px', color: '#8b949e' }}>JARVIS ready hai. Kya karna hai aaj?</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxWidth: '340px', width: '100%' }}>
              {[
                { l: 'Image banao', m: 'image banao ' },
                { l: 'Aaj ki news', m: 'aaj ki news kya hai' },
                { l: 'Rewa mausam', m: 'Rewa ka mausam batao' },
                { l: 'Code likhna', m: 'Python mein ' },
              ].map(q => (
                <button key={q.l} onClick={() => { if (q.m.endsWith(' ')) setInp(q.m); else send(q.m) }} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '10px', color: '#c9d1d9', cursor: 'pointer', padding: '12px 14px', fontSize: '13px', textAlign: 'left', transition: 'border-color 0.2s' }}>
                  {q.l}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((msg) => (
          <div key={msg.id} style={{ padding: '4px 0', animation: 'fadeIn 0.2s ease' }}>
            {msg.role === 'user' ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 16px' }}>
                <div style={{ maxWidth: '80%', background: '#1f2937', border: '1px solid #374151', borderRadius: '18px 18px 4px 18px', padding: '10px 16px', fontSize: '14px', color: '#e6edf3', lineHeight: '1.6' }}>
                  {msg.content}
                </div>
              </div>
            ) : (
              <div style={{ padding: '8px 16px' }}>
                <div style={{ display: 'flex', gap: '10px', maxWidth: '780px', margin: '0 auto' }}>
                  <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #58a6ff, #a371f7)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#0d1117', flexShrink: 0, marginTop: '2px' }}>J</div>
                  <div style={{ flex: 1 }}>
                    {msg.thinking && <ThinkBlock text={msg.thinking} />}
                    {msg.imageUrl && <ImageMsg url={msg.imageUrl} prompt={msg.content} />}
                    {msg.videoUrl && (
                      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '10px', padding: '12px', maxWidth: '280px' }}>
                        <div style={{ fontSize: '13px', marginBottom: '8px', color: '#8b949e' }}>{msg.content}</div>
                        <a href={msg.videoUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#6e40c922', border: '1px solid #a371f7', borderRadius: '6px', padding: '6px 12px', color: '#a371f7', textDecoration: 'none', fontSize: '12px' }}>Watch Video</a>
                      </div>
                    )}
                    {!msg.imageUrl && !msg.videoUrl && (
                      <div style={{ fontSize: '14px', color: '#e6edf3', lineHeight: '1.7' }}>
                        <MdText text={msg.content} />
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      {!msg.imageUrl && !msg.videoUrl && <CopyBtn text={msg.content} />}
                      {msg.provider && <span style={{ fontSize: '11px', color: '#484f58' }}>{msg.provider}</span>}
                      {tts && !msg.imageUrl && (
                        <button onClick={() => speak(msg.content)} style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', fontSize: '11px', padding: '2px 6px' }}>Listen</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {streaming && (
          <div style={{ padding: '8px 16px', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ display: 'flex', gap: '10px', maxWidth: '780px', margin: '0 auto' }}>
              <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #58a6ff, #a371f7)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#0d1117', flexShrink: 0, marginTop: '2px' }}>J</div>
              <div style={{ flex: 1 }}>
                {streamThink && <ThinkBlock text={streamThink} />}
                <div style={{ fontSize: '14px', color: '#e6edf3', lineHeight: '1.7' }}>
                  {streamText ? (
                    <MdText text={streamText} />
                  ) : (
                    <span style={{ color: curMode.color, fontSize: '13px' }}>{streamProv || curMode.label + ' thinking...'}</span>
                  )}
                  {streamText && <span style={{ display: 'inline-block', width: '2px', height: '14px', background: '#58a6ff', marginLeft: '2px', animation: 'blink 1s infinite', verticalAlign: 'middle' }} />}
                </div>
                {streamProv && streamText && <div style={{ fontSize: '11px', color: '#484f58', marginTop: '6px' }}>{streamProv}</div>}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{ flexShrink: 0, background: '#161b22', borderTop: '1px solid #21262d', padding: '12px 16px 20px' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <div style={{ background: '#0d1117', border: '1px solid', borderColor: streaming ? curMode.color : inp ? '#58a6ff44' : '#30363d', borderRadius: '12px', padding: '10px 12px', transition: 'border-color 0.2s' }}>
            <textarea
              ref={inpRef}
              value={inp}
              onChange={e => setInp(e.target.value)}
              onKeyDown={handleKey}
              placeholder={recording ? 'Listening...' : 'Message JARVIS... (Shift+Enter for new line)'}
              disabled={streaming}
              rows={1}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#e6edf3', fontSize: '14px', lineHeight: '1.5', maxHeight: '120px', overflowY: 'auto', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', position: 'relative' }}>
                <button onClick={() => setModeMenu(v => !v)} style={{ background: curMode.color + '22', border: '1px solid ' + curMode.color + '44', borderRadius: '6px', color: curMode.color, cursor: 'pointer', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>
                  {curMode.label}
                </button>
                {modeMenu && (
                  <div style={{ position: 'absolute', bottom: '36px', left: 0, background: '#161b22', border: '1px solid #30363d', borderRadius: '10px', padding: '4px', zIndex: 50, minWidth: '180px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                    {MODES.map(m => (
                      <button key={m.id} onClick={() => changeMode(m.id)} style={{ width: '100%', background: chatMode === m.id ? m.color + '22' : 'none', border: 'none', borderRadius: '6px', color: chatMode === m.id ? m.color : '#8b949e', cursor: 'pointer', padding: '8px 12px', fontSize: '13px', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: chatMode === m.id ? 700 : 400 }}>{m.label}</span>
                        <span style={{ fontSize: '11px', opacity: 0.7 }}>{m.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
                <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
                <button onClick={() => photoRef.current?.click()} style={{ background: '#21262d', border: '1px solid #30363d', borderRadius: '6px', color: '#8b949e', cursor: 'pointer', padding: '4px 8px', fontSize: '12px' }}>Photo</button>
                <button onClick={toggleVoice} style={{ background: recording ? '#f8514922' : '#21262d', border: '1px solid', borderColor: recording ? '#f85149' : '#30363d', borderRadius: '6px', color: recording ? '#f85149' : '#8b949e', cursor: 'pointer', padding: '4px 8px', fontSize: '12px' }}>
                  {recording ? 'Stop' : 'Mic'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {streaming ? (
                  <button onClick={() => abortRef.current?.abort()} style={{ background: '#f8514922', border: '1px solid #f85149', borderRadius: '8px', color: '#f85149', cursor: 'pointer', padding: '6px 14px', fontSize: '13px', fontWeight: 600 }}>Stop</button>
                ) : (
                  <button onClick={() => send()} disabled={!inp.trim()} style={{ background: inp.trim() ? 'linear-gradient(135deg, #58a6ff, #a371f7)' : '#21262d', border: 'none', borderRadius: '8px', color: inp.trim() ? '#0d1117' : '#484f58', cursor: inp.trim() ? 'pointer' : 'not-allowed', padding: '6px 16px', fontSize: '13px', fontWeight: 700, transition: 'all 0.2s' }}>Send</button>
                )}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#484f58', textAlign: 'center', marginTop: '6px' }}>
            /clear /pass /luna /era
          </div>
        </div>
      </div>
    </div>
  )
}
