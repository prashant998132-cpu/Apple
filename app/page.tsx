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
  ms?: number
  error?: boolean
  reactions?: string[]
}

const STORE  = 'j_msgs_v5'
const MSTORE = 'j_mode_v5'
const DRAFT  = 'j_draft_v5'
const FSIZE  = 'j_fsize_v5'

function uid() { return Math.random().toString(36).slice(2) }

function genPass() {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 16 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}

// UPGRADE 6: linkify URLs
function linkify(text: string): string {
  return text.replace(/(https?:\/\/[^\s]+)/g, '<LINK:$1>')
}

function MdText({ text, fontSize }: { text: string; fontSize: number }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let codeBlock = false
  let codeLang = ''
  let codeLines: string[] = []
  let codeKey = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('```')) {
      if (codeBlock) {
        const codeContent = codeLines.join('\n')
        elements.push(
          <CodeBlock key={'cb' + codeKey++} code={codeContent} lang={codeLang} />
        )
        codeLines = []; codeLang = ''; codeBlock = false
      } else {
        codeBlock = true; codeLang = line.slice(3).trim()
      }
      continue
    }
    if (codeBlock) { codeLines.push(line); continue }
    if (line === '') { elements.push(<div key={i} style={{ height: '6px' }} />); continue }

    const isH1 = line.startsWith('# ')
    const isH2 = line.startsWith('## ')
    const isH3 = line.startsWith('### ')
    const isBullet = /^[-*] /.test(line)
    const isNum = /^\d+\. /.test(line)
    const raw = line.replace(/^#{1,3} /, '').replace(/^[-*] /, '').replace(/^\d+\. /, '')

    const inlineParse = (s: string): React.ReactNode[] =>
      s.split(/(\*\*[^*]+\*\*|`[^`]+`|<LINK:[^>]+>)/g).map((p, j) => {
        if (p.startsWith('**') && p.endsWith('**') && p.length > 4)
          return <strong key={j}>{p.slice(2,-2)}</strong>
        if (p.startsWith('`') && p.endsWith('`') && p.length > 2)
          return <code key={j} style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:'4px', padding:'1px 6px', fontSize:'12px', fontFamily:'monospace', color:'#79c0ff' }}>{p.slice(1,-1)}</code>
        if (p.startsWith('<LINK:') && p.endsWith('>')) {
          const url = p.slice(6,-1)
          return <a key={j} href={url} target="_blank" rel="noreferrer" style={{ color:'#58a6ff', textDecoration:'underline' }}>{url.length > 40 ? url.slice(0,40)+'...' : url}</a>
        }
        return <span key={j}>{p}</span>
      })

    const styled = inlineParse(linkify(raw))
    const base = { margin:'2px 0', lineHeight:'1.65', fontSize: fontSize + 'px' }

    if (isH1) elements.push(<div key={i} style={{ ...base, fontSize:(fontSize+4)+'px', fontWeight:700, color:'#e6edf3', marginTop:'10px' }}>{styled}</div>)
    else if (isH2) elements.push(<div key={i} style={{ ...base, fontSize:(fontSize+2)+'px', fontWeight:700, color:'#e6edf3', marginTop:'8px' }}>{styled}</div>)
    else if (isH3) elements.push(<div key={i} style={{ ...base, fontSize:(fontSize+1)+'px', fontWeight:700, color:'#c9d1d9', marginTop:'6px' }}>{styled}</div>)
    else if (isBullet || isNum)
      elements.push(
        <div key={i} style={{ ...base, display:'flex', gap:'6px', paddingLeft:'4px' }}>
          <span style={{ color:'#58a6ff', flexShrink:0 }}>{isNum ? (i+'.') : '-'}</span>
          <span>{styled}</span>
        </div>
      )
    else elements.push(<div key={i} style={base}>{styled}</div>)
  }
  return <div>{elements}</div>
}

// UPGRADE 7: Code block with lang label + copy
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(()=>setCopied(false),2000) })
  }
  return (
    <div style={{ margin:'8px 0', border:'1px solid #30363d', borderRadius:'8px', overflow:'hidden' }}>
      <div style={{ background:'#161b22', padding:'5px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:'11px', color:'#8b949e', fontFamily:'monospace' }}>{lang || 'code'}</span>
        <button onClick={copy} style={{ background:'none', border:'1px solid #30363d', borderRadius:'4px', color: copied ? '#3fb950' : '#8b949e', cursor:'pointer', fontSize:'11px', padding:'2px 8px' }}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <pre style={{ background:'#0d1117', padding:'12px', overflowX:'auto', fontSize:'12px', margin:0, color:'#e6edf3', fontFamily:'monospace', whiteSpace:'pre' }}>{code}</pre>
    </div>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(()=>setOk(false),2000) })
  }
  return (
    <button onClick={copy} style={{ background:'none', border:'1px solid', borderColor: ok?'#238636':'#30363d', borderRadius:'6px', color: ok?'#3fb950':'#8b949e', cursor:'pointer', fontSize:'11px', padding:'3px 8px', transition:'all 0.2s' }}>
      {ok ? 'Copied' : 'Copy'}
    </button>
  )
}

function ThinkBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const clean = text.replace(/<\/?think>/g,'').trim()
  if (!clean) return null
  return (
    <div style={{ margin:'6px 0' }}>
      <button onClick={()=>setOpen(v=>!v)} style={{ background:'#161b22', border:'1px solid #6e40c9', borderRadius:'6px', color:'#a371f7', cursor:'pointer', fontSize:'12px', padding:'4px 10px', fontStyle:'italic' }}>
        {open ? 'Hide reasoning' : 'Show reasoning...'}
      </button>
      {open && <div style={{ margin:'6px 0', padding:'10px', background:'#0d1117', border:'1px solid #6e40c944', borderRadius:'8px', color:'#8b949e', fontSize:'12px', lineHeight:'1.6', whiteSpace:'pre-wrap', maxHeight:'200px', overflowY:'auto' }}>{clean}</div>}
    </div>
  )
}

function ImageMsg({ url, prompt }: { url:string; prompt:string }) {
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(false)
  return (
    <div style={{ maxWidth:'320px', margin:'6px 0' }}>
      <div style={{ fontSize:'11px', color:'#8b949e', marginBottom:'6px', fontStyle:'italic' }}>{prompt.slice(0,60)}</div>
      {!loaded && !err && (
        <div style={{ width:'300px', height:'200px', background:'#161b22', border:'1px solid #30363d', borderRadius:'10px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px', color:'#58a6ff', fontSize:'13px' }}>
          <div style={{ width:'24px', height:'24px', border:'2px solid #58a6ff', borderTop:'2px solid transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>
          Generating...
        </div>
      )}
      {err && <div style={{ fontSize:'12px', color:'#f85149' }}>Image load failed.</div>}
      <img src={url} alt={prompt} onLoad={()=>setLoaded(true)} onError={()=>setErr(true)} style={{ width:'100%', borderRadius:'10px', border:'1px solid #30363d', display:loaded?'block':'none' }}/>
      {loaded && <a href={url} target="_blank" rel="noreferrer" style={{ fontSize:'11px', color:'#58a6ff', marginTop:'6px', display:'inline-block' }}>Save image</a>}
    </div>
  )
}

// UPGRADE 11: Emoji reactions
const EMOJIS = ['(y)','<3','lol','fire','ok']
function ReactionBar({ id, reactions, onReact }: { id:string; reactions:string[]; onReact:(id:string,e:string)=>void }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position:'relative', display:'inline-block' }}>
      <button onClick={()=>setShow(v=>!v)} style={{ background:'none', border:'1px solid #30363d', borderRadius:'6px', color:'#8b949e', cursor:'pointer', fontSize:'11px', padding:'2px 6px' }}>
        {reactions.length > 0 ? reactions.join(' ') : 'React'}
      </button>
      {show && (
        <div style={{ position:'absolute', bottom:'28px', left:0, background:'#161b22', border:'1px solid #30363d', borderRadius:'8px', padding:'6px', display:'flex', gap:'4px', zIndex:50 }}>
          {EMOJIS.map(e => (
            <button key={e} onClick={()=>{ onReact(id,e); setShow(false) }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'18px', padding:'2px', borderRadius:'4px' }}>{e}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// UPGRADE 1: Timestamp display
function Timestamp({ ts, ms }: { ts:number; ms?:number }) {
  const d = new Date(ts)
  const time = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0')
  return (
    <span style={{ fontSize:'10px', color:'#484f58' }}>
      {time}{ms ? '  ' + ms + 'ms' : ''}
    </span>
  )
}

const MODES: Array<{ id:ChatMode; label:string; desc:string; color:string }> = [
  { id:'auto',  label:'Auto',  desc:'Smart routing', color:'#58a6ff' },
  { id:'flash', label:'Flash', desc:'Fastest',        color:'#f78166' },
  { id:'think', label:'Think', desc:'Reasoning',      color:'#a371f7' },
  { id:'deep',  label:'Deep',  desc:'46 tools',       color:'#3fb950' },
]

export default function Home() {
  const [msgs,        setMsgs]        = useState<Msg[]>([])
  const [inp,         setInp]         = useState('')
  const [streaming,   setStreaming]   = useState(false)
  const [streamText,  setStreamText]  = useState('')
  const [streamThink, setStreamThink] = useState('')
  const [streamProv,  setStreamProv]  = useState('')
  const [chatMode,    setChatMode]    = useState<ChatMode>('auto')
  const [sidebar,     setSidebar]     = useState(false)
  const [recording,   setRecording]   = useState(false)
  const [tts,         setTts]         = useState(false)
  const [modeMenu,    setModeMenu]    = useState(false)
  // UPGRADE 12: font size
  const [fontSize,    setFontSize]    = useState(14)
  // UPGRADE 13: session title
  const [title,       setTitle]       = useState('JARVIS')
  // UPGRADE 8: scroll to bottom button
  const [showScroll,  setShowScroll]  = useState(false)
  // UPGRADE 14: char counter
  const charLimit = 4000

  const bottomRef = useRef<HTMLDivElement>(null)
  const inpRef    = useRef<HTMLTextAreaElement>(null)
  const chatRef   = useRef<HTMLDivElement>(null)
  const mediaRef  = useRef<any>(null)
  const photoRef  = useRef<HTMLInputElement>(null)
  const abortRef  = useRef<AbortController|null>(null)

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORE)
      if (s) { const p = JSON.parse(s); if (Array.isArray(p)&&p.length>0) setMsgs(p) }
      const m = localStorage.getItem(MSTORE) as ChatMode|null
      if (m && ['auto','flash','think','deep'].includes(m)) setChatMode(m)
      const d = localStorage.getItem(DRAFT)
      if (d) setInp(d)
      const f = localStorage.getItem(FSIZE)
      if (f) setFontSize(parseInt(f))
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(msgs.slice(-80))) } catch {}
    // UPGRADE 13: auto session title from first user message
    const first = msgs.find(m => m.role === 'user')
    if (first) setTitle(first.content.slice(0,30) + (first.content.length>30?'...':''))
    else setTitle('JARVIS')
  }, [msgs])

  // UPGRADE 2: auto-save draft
  useEffect(() => {
    try { localStorage.setItem(DRAFT, inp) } catch {}
    // UPGRADE 14: textarea auto-resize
    if (inpRef.current) {
      inpRef.current.style.height = 'auto'
      inpRef.current.style.height = Math.min(inpRef.current.scrollHeight, 120) + 'px'
    }
  }, [inp])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [msgs, streamText])

  // UPGRADE 8: scroll indicator
  function handleScroll() {
    if (!chatRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current
    setShowScroll(scrollHeight - scrollTop - clientHeight > 200)
  }
  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }

  function changeMode(m: ChatMode) {
    setChatMode(m); setModeMenu(false)
    try { localStorage.setItem(MSTORE, m) } catch {}
  }
  function changeFontSize(n: number) {
    setFontSize(n)
    try { localStorage.setItem(FSIZE, String(n)) } catch {}
  }

  function clearChat() {
    setMsgs([]); setTitle('JARVIS')
    try { localStorage.removeItem(STORE) } catch {}
  }

  async function speak(text: string) {
    if (!tts) return
    try {
      const r = await fetch('/api/tts', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ text:text.slice(0,300) }) })
      if (r.ok) { const b = await r.blob(); new Audio(URL.createObjectURL(b)).play() }
    } catch {}
  }

  async function toggleVoice() {
    if (recording) { mediaRef.current?.stop(); setRecording(false); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true })
      const mr = new MediaRecorder(stream, { mimeType:'audio/webm' })
      const chunks: Blob[] = []
      mr.ondataavailable = e => chunks.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach(t=>t.stop())
        const fd = new FormData()
        fd.append('audio', new Blob(chunks,{type:'audio/webm'}), 'audio.webm')
        try {
          const r = await fetch('/api/stt', { method:'POST', body:fd })
          const d = await r.json()
          if (d.text) setInp(d.text)
        } catch {}
      }
      mr.start(); mediaRef.current = mr; setRecording(true)
      setTimeout(() => { if (mr.state==='recording') mr.stop() }, 10000)
    } catch { alert('Mic permission chahiye!') }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const nm: Msg[] = [...msgs, { id:uid(), role:'user', content:'Photo sent', ts:Date.now() }]
      setMsgs(nm); setStreaming(true); setStreamProv('Gemini Vision')
      const t0 = Date.now()
      try {
        const r = await fetch('/api/photo', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ imageBase64:reader.result }) })
        const d = await r.json()
        const rep = d.answer || 'Could not analyse'
        setMsgs([...nm, { id:uid(), role:'assistant', content:rep, provider:'Gemini Vision', ts:Date.now(), ms:Date.now()-t0 }])
        speak(rep)
      } catch {
        setMsgs([...nm, { id:uid(), role:'assistant', content:'Photo analyse nahi ho payi.', ts:Date.now(), error:true }])
      }
      setStreaming(false); setStreamText(''); setStreamProv('')
    }
    reader.readAsDataURL(file); e.target.value = ''
  }

  // UPGRADE 9: retry last message
  async function retryMsg(msgId: string) {
    const idx = msgs.findIndex(m => m.id === msgId)
    if (idx < 1) return
    const userMsg = msgs[idx-1]
    if (!userMsg || userMsg.role !== 'user') return
    const trimmed = msgs.slice(0, idx)
    setMsgs(trimmed)
    await doSend(userMsg.content, trimmed)
  }

  async function doSend(text: string, history: Msg[]) {
    const t0 = Date.now()
    const userMsg: Msg = { id:uid(), role:'user', content:text, ts:Date.now() }
    const newMsgs = [...history, userMsg]
    setMsgs(newMsgs)

    if (/image banao|photo banao|generate image|draw|wallpaper/i.test(text)) {
      const prompt = text.replace(/image banao|photo banao|generate image|draw|wallpaper/gi,'').trim()||text
      const seed = Math.floor(Math.random()*999999)
      const url = 'https://image.pollinations.ai/prompt/'+encodeURIComponent(prompt)+'?model=flux&width=1024&height=1024&seed='+seed+'&nologo=true'
      setMsgs([...newMsgs, { id:uid(), role:'assistant', content:prompt, imageUrl:url, provider:'Pollinations FLUX', ts:Date.now() }])
      return
    }
    if (/video banao|clip banao/i.test(text)) {
      const prompt = text.replace(/video banao|clip banao/gi,'').trim()||text
      setMsgs([...newMsgs, { id:uid(), role:'assistant', content:'Video generating...', videoUrl:'https://video.pollinations.ai/'+encodeURIComponent(prompt), provider:'Pollinations', ts:Date.now() }])
      return
    }

    setStreaming(true); setStreamText(''); setStreamThink(''); setStreamProv('Connecting...')
    abortRef.current = new AbortController()
    let full = '', think = '', prov = ''

    try {
      const res = await fetch('/api/stream', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          message:text,
          history:newMsgs.slice(-8).map(x=>({ role:x.role==='user'?'user':'assistant', content:x.content })),
          chatMode,
          userName:'Pranshu',
        }),
        signal:abortRef.current.signal,
      })
      if (!res.ok||!res.body) throw new Error('Stream failed')
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value,{stream:true})
        const lines = buf.split('\n'); buf = lines.pop()||''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw||raw==='[DONE]') continue
          try {
            const ev = JSON.parse(raw)
            if (ev.type==='start') { prov=ev.provider||''; setStreamProv(prov) }
            else if (ev.type==='token') { full+=ev.text; setStreamText(full) }
            else if (ev.type==='think') { think+=ev.text; setStreamThink(think) }
          } catch {}
        }
      }
      const elapsed = Date.now()-t0
      const fin: Msg = { id:uid(), role:'assistant', content:full||'No response', thinking:think.replace(/<\/?think>/g,'').trim()||undefined, provider:prov||undefined, ts:Date.now(), ms:elapsed }
      setMsgs([...newMsgs, fin]); speak(full)
    } catch (err: any) {
      if (err?.name!=='AbortError')
        setMsgs([...newMsgs, { id:uid(), role:'assistant', content:'Network issue - retry karo!', ts:Date.now(), error:true }])
    } finally {
      setStreaming(false); setStreamText(''); setStreamThink(''); setStreamProv('')
    }
  }

  const send = useCallback(async (override?: string) => {
    const text = (override ?? inp).trim()
    if (!text || streaming) return
    setInp('')

    // UPGRADE 10: /help command
    if (text === '/help') {
      setMsgs(m => [...m,
        { id:uid(), role:'user', content:'/help', ts:Date.now() },
        { id:uid(), role:'assistant', content:'**Commands:**\n/clear - Chat clear karo\n/pass - Strong password banao\n/help - Yeh menu\n/luna - LUNA companion\n/era - Era companion\n\n**Quick tips:**\n- Shift+Enter for new line\n- Mic button for voice\n- Photo button for image analysis\n- Mode button for Auto/Flash/Think/Deep', ts:Date.now() }
      ])
      return
    }
    if (text === '/clear') { clearChat(); return }
    if (text === '/pass' || text === '/password') {
      const p = genPass()
      setMsgs(m => [...m,
        { id:uid(), role:'user', content:text, ts:Date.now() },
        { id:uid(), role:'assistant', content:'Password: ' + p + '\n\nStrong 16-char. Copy karo!', ts:Date.now() }
      ])
      return
    }
    if (text === '/luna') { window.location.href='/luna'; return }
    if (text === '/era')  { window.location.href='/era';  return }

    await doSend(text, msgs)
  }, [inp, streaming, msgs, chatMode, tts])

  // UPGRADE 11: reactions
  function addReaction(id: string, emoji: string) {
    setMsgs(prev => prev.map(m => {
      if (m.id !== id) return m
      const existing = m.reactions || []
      return { ...m, reactions: existing.includes(emoji) ? existing.filter(e=>e!==emoji) : [...existing, emoji] }
    }))
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const curMode = MODES.find(m=>m.id===chatMode)||MODES[0]

  return (
    <div style={{ position:'fixed', inset:0, background:'#0d1117', color:'#e6edf3', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif', display:'flex', flexDirection:'column' }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        * { box-sizing:border-box }
        ::-webkit-scrollbar { width:4px }
        ::-webkit-scrollbar-thumb { background:#30363d; border-radius:2px }
        textarea { resize:none }
        textarea::placeholder { color:#484f58 }
      `}</style>

      <Sidebar isOpen={sidebar} onClose={()=>setSidebar(false)}/>

      {/* HEADER */}
      <header style={{ flexShrink:0, height:'52px', background:'#161b22', borderBottom:'1px solid #21262d', display:'flex', alignItems:'center', padding:'0 14px', gap:'10px', zIndex:10 }}>
        <button onClick={()=>setSidebar(true)} style={{ background:'none', border:'none', color:'#8b949e', cursor:'pointer', padding:'6px', borderRadius:'6px', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {String.fromCharCode(9776)}
        </button>
        <div style={{ width:'28px', height:'28px', background:'linear-gradient(135deg,#58a6ff,#a371f7)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:800, color:'#0d1117', flexShrink:0 }}>J</div>
        <div style={{ flex:1, minWidth:0 }}>
          {/* UPGRADE 13: session title */}
          <div style={{ fontSize:'13px', fontWeight:700, color:'#e6edf3', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{title}</div>
          <div style={{ fontSize:'9px', color:'#484f58' }}>JARVIS v10.48</div>
        </div>
        {/* UPGRADE 12: font size */}
        <div style={{ display:'flex', gap:'3px' }}>
          {[12,14,16].map(n=>(
            <button key={n} onClick={()=>changeFontSize(n)} style={{ background:fontSize===n?'#21262d':'none', border:'1px solid', borderColor:fontSize===n?'#58a6ff':'transparent', borderRadius:'4px', color:fontSize===n?'#58a6ff':'#8b949e', cursor:'pointer', padding:'2px 5px', fontSize:'10px', fontWeight:700 }}>
              {n===12?'S':n===14?'M':'L'}
            </button>
          ))}
        </div>
        <button onClick={()=>setTts(v=>!v)} style={{ background:tts?'#1f2937':'none', border:'1px solid', borderColor:tts?'#58a6ff':'transparent', borderRadius:'6px', color:tts?'#58a6ff':'#8b949e', cursor:'pointer', padding:'4px 8px', fontSize:'12px' }}>TTS</button>
        <button onClick={clearChat} style={{ background:'none', border:'1px solid #30363d', borderRadius:'6px', color:'#8b949e', cursor:'pointer', padding:'4px 8px', fontSize:'11px' }}>Clear</button>
      </header>

      {/* MESSAGES */}
      <div ref={chatRef} onScroll={handleScroll} style={{ flex:1, overflowY:'auto', padding:'12px 0', paddingBottom:'8px' }}>
        {msgs.length===0 && !streaming && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'20px', padding:'20px' }}>
            <div style={{ width:'60px', height:'60px', background:'linear-gradient(135deg,#58a6ff,#a371f7)', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', fontWeight:800, color:'#0d1117' }}>J</div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'20px', fontWeight:700, color:'#e6edf3', marginBottom:'6px' }}>Namaste Pranshu</div>
              <div style={{ fontSize:'13px', color:'#8b949e' }}>JARVIS ready hai. Kya karna hai aaj?</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', maxWidth:'320px', width:'100%' }}>
              {[
                { l:'Image banao', m:'image banao ' },
                { l:'Aaj ki news', m:'aaj ki news kya hai' },
                { l:'Rewa mausam', m:'Rewa ka mausam batao' },
                { l:'Code likhna', m:'Python mein ' },
              ].map(q=>(
                <button key={q.l} onClick={()=>{ if(q.m.endsWith(' '))setInp(q.m); else send(q.m) }} style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:'10px', color:'#c9d1d9', cursor:'pointer', padding:'12px', fontSize:'13px', textAlign:'left' }}>
                  {q.l}
                </button>
              ))}
            </div>
            {/* UPGRADE 10: /help hint */}
            <div style={{ fontSize:'11px', color:'#484f58' }}>Type /help for commands</div>
          </div>
        )}

        {msgs.map((msg) => (
          <div key={msg.id} style={{ padding:'3px 0', animation:'fadeIn 0.2s ease' }}>
            {msg.role==='user' ? (
              <div style={{ display:'flex', justifyContent:'flex-end', padding:'3px 14px' }}>
                <div style={{ maxWidth:'82%' }}>
                  <div style={{ background:'#1f2937', border:'1px solid #374151', borderRadius:'18px 18px 4px 18px', padding:'10px 14px', fontSize:fontSize+'px', color:'#e6edf3', lineHeight:'1.6', wordBreak:'break-word' }}>
                    {msg.content}
                  </div>
                  {/* UPGRADE 1: timestamp */}
                  <div style={{ textAlign:'right', marginTop:'3px' }}><Timestamp ts={msg.ts}/></div>
                </div>
              </div>
            ) : (
              <div style={{ padding:'6px 14px' }}>
                <div style={{ display:'flex', gap:'8px', maxWidth:'780px', margin:'0 auto' }}>
                  <div style={{ width:'28px', height:'28px', background:msg.error?'#f8514922':'linear-gradient(135deg,#58a6ff,#a371f7)', border:msg.error?'1px solid #f85149':'none', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:800, color:msg.error?'#f85149':'#0d1117', flexShrink:0, marginTop:'2px' }}>J</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    {msg.thinking && <ThinkBlock text={msg.thinking}/>}
                    {msg.imageUrl && <ImageMsg url={msg.imageUrl} prompt={msg.content}/>}
                    {msg.videoUrl && (
                      <div style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:'10px', padding:'12px', maxWidth:'280px' }}>
                        <div style={{ fontSize:'13px', marginBottom:'8px', color:'#8b949e' }}>{msg.content}</div>
                        <a href={msg.videoUrl} target="_blank" rel="noreferrer" style={{ display:'inline-block', background:'#6e40c922', border:'1px solid #a371f7', borderRadius:'6px', padding:'6px 12px', color:'#a371f7', textDecoration:'none', fontSize:'12px' }}>Watch Video</a>
                      </div>
                    )}
                    {!msg.imageUrl && !msg.videoUrl && (
                      <div style={{ fontSize:fontSize+'px', color:msg.error?'#f85149':'#e6edf3', lineHeight:'1.7', wordBreak:'break-word' }}>
                        <MdText text={msg.content} fontSize={fontSize}/>
                      </div>
                    )}
                    {/* Action bar */}
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'6px', flexWrap:'wrap' }}>
                      {!msg.imageUrl&&!msg.videoUrl && <CopyBtn text={msg.content}/>}
                      {/* UPGRADE 11: reactions */}
                      <ReactionBar id={msg.id} reactions={msg.reactions||[]} onReact={addReaction}/>
                      {/* UPGRADE 9: retry on error */}
                      {msg.error && (
                        <button onClick={()=>retryMsg(msg.id)} style={{ background:'#f8514922', border:'1px solid #f85149', borderRadius:'6px', color:'#f85149', cursor:'pointer', fontSize:'11px', padding:'3px 8px' }}>Retry</button>
                      )}
                      {msg.provider && <span style={{ fontSize:'10px', color:'#484f58' }}>{msg.provider}</span>}
                      {/* UPGRADE 3: response time */}
                      {msg.ms && <Timestamp ts={msg.ts} ms={msg.ms}/>}
                      {tts && !msg.imageUrl && <button onClick={()=>speak(msg.content)} style={{ background:'none', border:'none', color:'#484f58', cursor:'pointer', fontSize:'11px', padding:'2px 6px' }}>Listen</button>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {streaming && (
          <div style={{ padding:'6px 14px', animation:'fadeIn 0.2s ease' }}>
            <div style={{ display:'flex', gap:'8px', maxWidth:'780px', margin:'0 auto' }}>
              <div style={{ width:'28px', height:'28px', background:'linear-gradient(135deg,#58a6ff,#a371f7)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:800, color:'#0d1117', flexShrink:0, marginTop:'2px' }}>J</div>
              <div style={{ flex:1, minWidth:0 }}>
                {streamThink && <ThinkBlock text={streamThink}/>}
                <div style={{ fontSize:fontSize+'px', color:'#e6edf3', lineHeight:'1.7' }}>
                  {streamText
                    ? <><MdText text={streamText} fontSize={fontSize}/><span style={{ display:'inline-block', width:'2px', height:'14px', background:'#58a6ff', marginLeft:'2px', animation:'blink 1s infinite', verticalAlign:'middle' }}/></>
                    : <span style={{ color:curMode.color, fontSize:'13px' }}>{streamProv||curMode.label+' thinking...'}</span>
                  }
                </div>
                {streamProv&&streamText && <div style={{ fontSize:'10px', color:'#484f58', marginTop:'4px' }}>{streamProv}</div>}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* UPGRADE 8: Scroll to bottom floating button */}
      {showScroll && (
        <button onClick={scrollToBottom} style={{ position:'fixed', bottom:'140px', right:'16px', background:'#161b22', border:'1px solid #30363d', borderRadius:'50%', width:'36px', height:'36px', color:'#8b949e', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(0,0,0,0.4)', zIndex:30 }}>
          v
        </button>
      )}

      {/* INPUT AREA */}
      <div style={{ flexShrink:0, background:'#161b22', borderTop:'1px solid #21262d', padding:'10px 14px 16px' }}>
        <div style={{ maxWidth:'780px', margin:'0 auto' }}>
          <div style={{ background:'#0d1117', border:'1px solid', borderColor:streaming?curMode.color:inp?'#58a6ff44':'#30363d', borderRadius:'12px', padding:'10px 12px', transition:'border-color 0.2s' }}>
            <textarea
              ref={inpRef}
              value={inp}
              onChange={e=>setInp(e.target.value.slice(0,charLimit))}
              onKeyDown={handleKey}
              placeholder={'Message JARVIS... (Shift+Enter for new line)'}
              disabled={streaming}
              rows={1}
              style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'#e6edf3', fontSize:fontSize+'px', lineHeight:'1.5', maxHeight:'120px', overflowY:'auto', fontFamily:'inherit' }}
            />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'8px', gap:'6px' }}>
              <div style={{ display:'flex', gap:'5px', position:'relative', flexWrap:'wrap' }}>
                {/* Mode selector */}
                <button onClick={()=>setModeMenu(v=>!v)} style={{ background:curMode.color+'22', border:'1px solid '+curMode.color+'44', borderRadius:'6px', color:curMode.color, cursor:'pointer', padding:'4px 10px', fontSize:'12px', fontWeight:600 }}>
                  {curMode.label}
                </button>
                {modeMenu && (
                  <div style={{ position:'absolute', bottom:'34px', left:0, background:'#161b22', border:'1px solid #30363d', borderRadius:'10px', padding:'4px', zIndex:50, minWidth:'180px', boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
                    {MODES.map(m=>(
                      <button key={m.id} onClick={()=>changeMode(m.id)} style={{ width:'100%', background:chatMode===m.id?m.color+'22':'none', border:'none', borderRadius:'6px', color:chatMode===m.id?m.color:'#8b949e', cursor:'pointer', padding:'8px 12px', fontSize:'13px', textAlign:'left', display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontWeight:chatMode===m.id?700:400 }}>{m.label}</span>
                        <span style={{ fontSize:'11px', opacity:0.7 }}>{m.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
                <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhoto}/>
                <button onClick={()=>photoRef.current?.click()} style={{ background:'#21262d', border:'1px solid #30363d', borderRadius:'6px', color:'#8b949e', cursor:'pointer', padding:'4px 8px', fontSize:'12px' }}>Photo</button>
                <button onClick={toggleVoice} style={{ background:recording?'#f8514922':'#21262d', border:'1px solid', borderColor:recording?'#f85149':'#30363d', borderRadius:'6px', color:recording?'#f85149':'#8b949e', cursor:'pointer', padding:'4px 8px', fontSize:'12px' }}>
                  {recording ? 'Stop' : 'Mic'}
                </button>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                {/* UPGRADE 14: char counter */}
                {inp.length > 100 && <span style={{ fontSize:'10px', color:inp.length>3500?'#f85149':'#484f58' }}>{inp.length}/{charLimit}</span>}
                {streaming
                  ? <button onClick={()=>abortRef.current?.abort()} style={{ background:'#f8514922', border:'1px solid #f85149', borderRadius:'8px', color:'#f85149', cursor:'pointer', padding:'6px 14px', fontSize:'13px', fontWeight:600 }}>Stop</button>
                  : <button onClick={()=>send()} disabled={!inp.trim()} style={{ background:inp.trim()?'linear-gradient(135deg,#58a6ff,#a371f7)':'#21262d', border:'none', borderRadius:'8px', color:inp.trim()?'#0d1117':'#484f58', cursor:inp.trim()?'pointer':'not-allowed', padding:'6px 16px', fontSize:'13px', fontWeight:700, transition:'all 0.2s', whiteSpace:'nowrap' }}>Send</button>
                }
              </div>
            </div>
          </div>
          {/* UPGRADE 15: message count */}
          {msgs.length > 0 && (
            <div style={{ fontSize:'10px', color:'#484f58', textAlign:'center', marginTop:'4px' }}>
              {msgs.length} messages  |  /help for commands
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
