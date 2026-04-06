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
  pinned?: boolean
  wordCount?: number
}

const STORE  = 'j_msgs_v6'
const MSTORE = 'j_mode_v6'
const DRAFT  = 'j_draft_v6'
const FSIZE  = 'j_fsize_v6'
const THEME  = 'j_theme_v6'
const LANG   = 'j_lang_v6'

function uid() { return Math.random().toString(36).slice(2) }
function genPass() {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 16 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}
function wordCount(text: string) { return text.trim().split(/\s+/).filter(Boolean).length }

// UPGRADE 1: Time-based greeting
function getGreeting(name: string): string {
  const h = new Date().getHours()
  if (h < 5)  return 'Late night ho gayi ' + name + '!'
  if (h < 12) return 'Good morning ' + name + '!'
  if (h < 17) return 'Good afternoon ' + name + '!'
  if (h < 21) return 'Good evening ' + name + '!'
  return 'Good night ' + name + '!'
}

// UPGRADE 3: Multi-language labels
type Lang = 'hi' | 'en'
const T: Record<Lang, Record<string, string>> = {
  hi: {
    placeholder: 'JARVIS se poocho... (Shift+Enter naya line)',
    send: 'Bhejo',
    stop: 'Ruko',
    clear: 'Saaf karo',
    photo: 'Photo',
    mic: 'Mic',
    recording: 'Sun raha...',
    copy: 'Copy',
    copied: 'Ho gaya',
    pin: 'Pin',
    unpin: 'Unpin',
    retry: 'Dobara try',
    thinking: 'Soch raha...',
    export: 'Export',
    search: 'Dhundo',
  },
  en: {
    placeholder: 'Message JARVIS... (Shift+Enter new line)',
    send: 'Send',
    stop: 'Stop',
    clear: 'Clear',
    photo: 'Photo',
    mic: 'Mic',
    recording: 'Listening...',
    copy: 'Copy',
    copied: 'Copied',
    pin: 'Pin',
    unpin: 'Unpin',
    retry: 'Retry',
    thinking: 'Thinking...',
    export: 'Export',
    search: 'Search',
  }
}

function MdText({ text, fontSize, collapsed }: { text: string; fontSize: number; collapsed?: boolean }) {
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
        elements.push(<CodeBlock key={'cb'+codeKey++} code={codeLines.join('\n')} lang={codeLang}/>)
        codeLines = []; codeLang = ''; codeBlock = false
      } else { codeBlock = true; codeLang = line.slice(3).trim() }
      continue
    }
    if (codeBlock) { codeLines.push(line); continue }
    if (line === '') { elements.push(<div key={i} style={{ height:'5px' }}/>); continue }

    const isH1 = line.startsWith('# ')
    const isH2 = line.startsWith('## ')
    const isH3 = line.startsWith('### ')
    const isBullet = /^[-*] /.test(line)
    const isNum = /^\d+\. /.test(line)
    const raw = line.replace(/^#{1,3} /,'').replace(/^[-*] /,'').replace(/^\d+\. /,'')

    const inline = (s: string): React.ReactNode[] =>
      s.split(/(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s]+)/g).map((p, j) => {
        if (p.startsWith('**') && p.endsWith('**') && p.length>4) return <strong key={j}>{p.slice(2,-2)}</strong>
        if (p.startsWith('`') && p.endsWith('`') && p.length>2) return <code key={j} style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:'3px', padding:'1px 5px', fontSize:'12px', fontFamily:'monospace', color:'#79c0ff' }}>{p.slice(1,-1)}</code>
        if (p.startsWith('http')) return <a key={j} href={p} target="_blank" rel="noreferrer" style={{ color:'#58a6ff', textDecoration:'underline' }}>{p.length>45?p.slice(0,45)+'...':p}</a>
        return <span key={j}>{p}</span>
      })

    const styled = inline(raw)
    const base = { margin:'2px 0', lineHeight:'1.65', fontSize:fontSize+'px' }
    if (isH1) elements.push(<div key={i} style={{ ...base, fontSize:(fontSize+4)+'px', fontWeight:700, color:'#e6edf3', marginTop:'10px' }}>{styled}</div>)
    else if (isH2) elements.push(<div key={i} style={{ ...base, fontSize:(fontSize+2)+'px', fontWeight:700, color:'#e6edf3', marginTop:'8px' }}>{styled}</div>)
    else if (isH3) elements.push(<div key={i} style={{ ...base, fontWeight:700, color:'#c9d1d9', marginTop:'6px' }}>{styled}</div>)
    else if (isBullet||isNum) elements.push(<div key={i} style={{ ...base, display:'flex', gap:'6px', paddingLeft:'4px' }}><span style={{ color:'#58a6ff', flexShrink:0 }}>{isNum?(i+'.'):'- '}</span><span>{styled}</span></div>)
    else elements.push(<div key={i} style={base}>{styled}</div>)
  }
  return <div>{collapsed ? elements.slice(0, 8) : elements}</div>
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ margin:'8px 0', border:'1px solid #30363d', borderRadius:'8px', overflow:'hidden' }}>
      <div style={{ background:'#161b22', padding:'4px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:'11px', color:'#8b949e', fontFamily:'monospace' }}>{lang||'code'}</span>
        <button onClick={()=>{ navigator.clipboard?.writeText(code).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000) }) }} style={{ background:'none', border:'1px solid #30363d', borderRadius:'4px', color:copied?'#3fb950':'#8b949e', cursor:'pointer', fontSize:'11px', padding:'2px 8px' }}>{copied?'Copied':'Copy'}</button>
      </div>
      <pre style={{ background:'#0d1117', padding:'12px', overflowX:'auto', fontSize:'12px', margin:0, color:'#e6edf3', fontFamily:'monospace', whiteSpace:'pre' }}>{code}</pre>
    </div>
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
      {open && <div style={{ margin:'6px 0', padding:'10px', background:'#0d1117', border:'1px solid #6e40c944', borderRadius:'8px', color:'#8b949e', fontSize:'12px', lineHeight:'1.6', whiteSpace:'pre-wrap', maxHeight:'180px', overflowY:'auto' }}>{clean}</div>}
    </div>
  )
}

function ImageMsg({ url, prompt }: { url:string; prompt:string }) {
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(false)
  return (
    <div style={{ maxWidth:'300px', margin:'6px 0' }}>
      <div style={{ fontSize:'11px', color:'#8b949e', marginBottom:'4px' }}>{prompt.slice(0,50)}</div>
      {!loaded&&!err&&<div style={{ width:'280px', height:'190px', background:'#161b22', border:'1px solid #30363d', borderRadius:'10px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px', color:'#58a6ff', fontSize:'12px' }}><div style={{ width:'20px', height:'20px', border:'2px solid #58a6ff', borderTop:'2px solid transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>Generating...</div>}
      {err && <div style={{ fontSize:'12px', color:'#f85149' }}>Load failed.</div>}
      <img src={url} alt={prompt} onLoad={()=>setLoaded(true)} onError={()=>setErr(true)} style={{ width:'100%', borderRadius:'10px', border:'1px solid #30363d', display:loaded?'block':'none' }}/>
      {loaded && <a href={url} target="_blank" rel="noreferrer" style={{ fontSize:'11px', color:'#58a6ff', marginTop:'4px', display:'inline-block' }}>Save</a>}
    </div>
  )
}

// UPGRADE 8: Keyboard shortcuts panel
function ShortcutsPanel({ onClose }: { onClose: ()=>void }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:'12px', padding:'20px', maxWidth:'320px', width:'90%' }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontWeight:700, color:'#e6edf3', marginBottom:'14px', fontSize:'14px' }}>Keyboard Shortcuts</div>
        {[
          ['Enter', 'Send message'],
          ['Shift+Enter', 'New line'],
          ['/clear', 'Clear chat'],
          ['/pass', 'Generate password'],
          ['/help', 'Show commands'],
          ['/luna', 'Open LUNA'],
          ['/era', 'Open Era'],
          ['/export', 'Export chat'],
          ['/pin', 'Pin last message'],
        ].map(([k,v])=>(
          <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #21262d', fontSize:'12px' }}>
            <code style={{ background:'#0d1117', border:'1px solid #30363d', borderRadius:'4px', padding:'1px 6px', color:'#79c0ff', fontFamily:'monospace' }}>{k}</code>
            <span style={{ color:'#8b949e' }}>{v}</span>
          </div>
        ))}
        <button onClick={onClose} style={{ width:'100%', marginTop:'14px', background:'#21262d', border:'1px solid #30363d', borderRadius:'8px', color:'#e6edf3', cursor:'pointer', padding:'8px', fontSize:'13px' }}>Close</button>
      </div>
    </div>
  )
}

// UPGRADE 9: Chat export
function exportChat(msgs: Msg[]) {
  const lines = msgs.map(m => {
    const time = new Date(m.ts).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
    const who = m.role === 'user' ? 'You' : 'JARVIS'
    return '[' + time + '] ' + who + ': ' + m.content
  })
  const blob = new Blob([lines.join('\n\n')], { type:'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'jarvis-chat-' + Date.now() + '.txt'; a.click()
  URL.revokeObjectURL(url)
}

// UPGRADE 6: Message search
function SearchBar({ msgs, onClose }: { msgs: Msg[]; onClose: ()=>void }) {
  const [q, setQ] = useState('')
  const results = q.trim().length > 1 ? msgs.filter(m => m.content.toLowerCase().includes(q.toLowerCase())) : []
  return (
    <div style={{ background:'#161b22', borderBottom:'1px solid #21262d', padding:'8px 14px' }}>
      <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
        <input value={q} onChange={e=>setQ(e.target.value)} autoFocus placeholder="Search in chat..." style={{ flex:1, background:'#0d1117', border:'1px solid #30363d', borderRadius:'8px', color:'#e6edf3', padding:'7px 12px', fontSize:'13px', outline:'none' }}/>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#8b949e', cursor:'pointer', fontSize:'13px' }}>Close</button>
      </div>
      {q && <div style={{ fontSize:'11px', color:'#58a6ff', marginTop:'4px' }}>{results.length} result{results.length!==1?'s':''}{results.length>0?' -- scroll up to see highlighted':''}</div>}
    </div>
  )
}

const MODES: Array<{id:ChatMode;label:string;desc:string;color:string}> = [
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
  const [fontSize,    setFontSize]    = useState(14)
  // UPGRADE 2: dark/light theme
  const [dark,        setDark]        = useState(true)
  // UPGRADE 3: language
  const [lang,        setLang]        = useState<Lang>('hi')
  // UPGRADE 5: scroll to bottom
  const [showScroll,  setShowScroll]  = useState(false)
  // UPGRADE 6: search
  const [showSearch,  setShowSearch]  = useState(false)
  const [searchQ,     setSearchQ_]    = useState('')
  // UPGRADE 7: collapsed long messages
  const [collapsed,   setCollapsed]   = useState<Set<string>>(new Set())
  // UPGRADE 8: shortcuts panel
  const [showShortcuts, setShowShortcuts] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inpRef    = useRef<HTMLTextAreaElement>(null)
  const chatRef   = useRef<HTMLDivElement>(null)
  const mediaRef  = useRef<any>(null)
  const photoRef  = useRef<HTMLInputElement>(null)
  const abortRef  = useRef<AbortController|null>(null)

  // Theme colors
  const BG    = dark ? '#0d1117' : '#ffffff'
  const CARD  = dark ? '#161b22' : '#f6f8fa'
  const BORDER = dark ? '#21262d' : '#d0d7de'
  const TEXT  = dark ? '#e6edf3' : '#1f2328'
  const MUTED = dark ? '#8b949e' : '#57606a'
  const USERBG = dark ? '#1f2937' : '#ddf4ff'
  const USERBORDER = dark ? '#374151' : '#0969da44'

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORE)
      if (s) { const p = JSON.parse(s); if (Array.isArray(p)&&p.length>0) setMsgs(p) }
      const m = localStorage.getItem(MSTORE) as ChatMode|null
      if (m && ['auto','flash','think','deep'].includes(m)) setChatMode(m)
      const d = localStorage.getItem(DRAFT); if (d) setInp(d)
      const f = localStorage.getItem(FSIZE); if (f) setFontSize(parseInt(f))
      const th = localStorage.getItem(THEME); if (th==='light') setDark(false)
      const lg = localStorage.getItem(LANG) as Lang|null; if (lg==='en'||lg==='hi') setLang(lg)
    } catch {}
  }, [])

  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(msgs.slice(-80))) } catch {} }, [msgs])
  useEffect(() => { try { localStorage.setItem(DRAFT, inp) } catch {}; if (inpRef.current) { inpRef.current.style.height='auto'; inpRef.current.style.height=Math.min(inpRef.current.scrollHeight,120)+'px' } }, [inp])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs, streamText])

  function toggleTheme() { const nd = !dark; setDark(nd); try { localStorage.setItem(THEME, nd?'dark':'light') } catch {} }
  function toggleLang()  { const nl: Lang = lang==='hi'?'en':'hi'; setLang(nl); try { localStorage.setItem(LANG, nl) } catch {} }
  function changeMode(m: ChatMode) { setChatMode(m); setModeMenu(false); try { localStorage.setItem(MSTORE, m) } catch {} }
  function changeFontSize(n: number) { setFontSize(n); try { localStorage.setItem(FSIZE, String(n)) } catch {} }
  function clearChat() { setMsgs([]); try { localStorage.removeItem(STORE) } catch {} }

  // UPGRADE 4: pin message
  function togglePin(id: string) { setMsgs(prev => prev.map(m => m.id===id ? { ...m, pinned:!m.pinned } : m)) }
  // UPGRADE 7: collapse/expand
  function toggleCollapse(id: string) { setCollapsed(prev => { const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s }) }

  function handleScroll() {
    if (!chatRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current
    setShowScroll(scrollHeight - scrollTop - clientHeight > 180)
  }

  async function speak(text: string) {
    if (!tts) return
    try { const r = await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text.slice(0,300)})}); if(r.ok){const b=await r.blob();new Audio(URL.createObjectURL(b)).play()} } catch {}
  }

  async function toggleVoice() {
    if (recording) { mediaRef.current?.stop(); setRecording(false); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true })
      const mr = new MediaRecorder(stream, { mimeType:'audio/webm' }); const chunks: Blob[] = []
      mr.ondataavailable = e => chunks.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach(t=>t.stop())
        const fd = new FormData(); fd.append('audio',new Blob(chunks,{type:'audio/webm'}),'audio.webm')
        try { const r=await fetch('/api/stt',{method:'POST',body:fd}); const d=await r.json(); if(d.text)setInp(d.text) } catch {}
      }
      mr.start(); mediaRef.current=mr; setRecording(true)
      setTimeout(()=>{ if(mr.state==='recording')mr.stop() }, 10000)
    } catch { alert('Mic permission chahiye!') }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0]; if(!file)return
    const reader=new FileReader()
    reader.onload=async()=>{
      const nm:Msg[]=[...msgs,{id:uid(),role:'user',content:'Photo sent',ts:Date.now()}]
      setMsgs(nm); setStreaming(true); setStreamProv('Gemini Vision'); const t0=Date.now()
      try {
        const r=await fetch('/api/photo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageBase64:reader.result})})
        const d=await r.json(); const rep=d.answer||'Could not analyse'
        setMsgs([...nm,{id:uid(),role:'assistant',content:rep,provider:'Gemini Vision',ts:Date.now(),ms:Date.now()-t0,wordCount:wordCount(rep)}]); speak(rep)
      } catch { setMsgs([...nm,{id:uid(),role:'assistant',content:'Photo analyse nahi ho payi.',ts:Date.now(),error:true}]) }
      setStreaming(false); setStreamText(''); setStreamProv('')
    }
    reader.readAsDataURL(file); e.target.value=''
  }

  async function retryMsg(msgId: string) {
    const idx=msgs.findIndex(m=>m.id===msgId); if(idx<1)return
    const userMsg=msgs[idx-1]; if(!userMsg||userMsg.role!=='user')return
    const trimmed=msgs.slice(0,idx); setMsgs(trimmed)
    await doSend(userMsg.content, trimmed)
  }

  async function doSend(text: string, history: Msg[]) {
    const t0=Date.now()
    const userMsg: Msg = { id:uid(), role:'user', content:text, ts:Date.now(), wordCount:wordCount(text) }
    const newMsgs=[...history,userMsg]; setMsgs(newMsgs)

    if (/image banao|photo banao|generate image|draw|wallpaper/i.test(text)) {
      const prompt=text.replace(/image banao|photo banao|generate image|draw|wallpaper/gi,'').trim()||text
      const url='https://image.pollinations.ai/prompt/'+encodeURIComponent(prompt)+'?model=flux&width=1024&height=1024&seed='+Math.floor(Math.random()*999999)+'&nologo=true'
      setMsgs([...newMsgs,{id:uid(),role:'assistant',content:prompt,imageUrl:url,provider:'Pollinations FLUX',ts:Date.now()}]); return
    }
    if (/video banao|clip banao/i.test(text)) {
      setMsgs([...newMsgs,{id:uid(),role:'assistant',content:'Video generating...',videoUrl:'https://video.pollinations.ai/'+encodeURIComponent(text),provider:'Pollinations',ts:Date.now()}]); return
    }

    setStreaming(true); setStreamText(''); setStreamThink(''); setStreamProv('Connecting...')
    abortRef.current=new AbortController()
    let full='', think='', prov=''
    try {
      const res=await fetch('/api/stream',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ message:text, history:newMsgs.slice(-8).map(x=>({role:x.role==='user'?'user':'assistant',content:x.content})), chatMode, userName:'Pranshu' }),
        signal:abortRef.current.signal,
      })
      if(!res.ok||!res.body)throw new Error('Stream failed')
      const reader=res.body.getReader(); const dec=new TextDecoder(); let buf=''
      while(true){
        const{done,value}=await reader.read(); if(done)break
        buf+=dec.decode(value,{stream:true})
        const lines=buf.split('\n'); buf=lines.pop()||''
        for(const line of lines){
          if(!line.startsWith('data: '))continue
          const raw=line.slice(6).trim(); if(!raw||raw==='[DONE]')continue
          try{ const ev=JSON.parse(raw); if(ev.type==='start'){prov=ev.provider||'';setStreamProv(prov)} else if(ev.type==='token'){full+=ev.text;setStreamText(full)} else if(ev.type==='think'){think+=ev.text;setStreamThink(think)} }catch{}
        }
      }
      const elapsed=Date.now()-t0
      const wc=wordCount(full)
      const fin: Msg={id:uid(),role:'assistant',content:full||'No response',thinking:think.replace(/<\/?think>/g,'').trim()||undefined,provider:prov||undefined,ts:Date.now(),ms:elapsed,wordCount:wc}
      setMsgs([...newMsgs,fin]); speak(full)
    } catch(err:any){
      if(err?.name!=='AbortError') setMsgs([...newMsgs,{id:uid(),role:'assistant',content:'Network issue - retry karo!',ts:Date.now(),error:true}])
    } finally { setStreaming(false); setStreamText(''); setStreamThink(''); setStreamProv('') }
  }

  const send=useCallback(async(override?: string)=>{
    const text=(override??inp).trim(); if(!text||streaming)return
    setInp('')
    if(text==='/clear'){clearChat();return}
    if(text==='/export'){exportChat(msgs);return}
    if(text==='/shortcuts'||text==='/keys'){setShowShortcuts(true);return}
    if(text==='/search'){setShowSearch(v=>!v);return}
    if(text==='/pin'){ const last=msgs.filter(m=>m.role==='assistant').slice(-1)[0]; if(last)togglePin(last.id); return }
    if(text==='/help'){
      setMsgs(m=>[...m,{id:uid(),role:'user',content:'/help',ts:Date.now()},{id:uid(),role:'assistant',content:'**Commands:**\n/clear - Chat clear\n/pass - Password banao\n/export - Chat download karo\n/search - Chat mein dhundo\n/pin - Last AI message pin karo\n/shortcuts - Keyboard shortcuts\n/luna - LUNA\n/era - Era\n\nMode: Auto Flash Think Deep',ts:Date.now()}])
      return
    }
    if(text==='/pass'||text==='/password'){
      const p=genPass()
      setMsgs(m=>[...m,{id:uid(),role:'user',content:text,ts:Date.now()},{id:uid(),role:'assistant',content:'Password: '+p+'\n\nStrong 16-char. Copy karo!',ts:Date.now()}])
      return
    }
    if(text==='/luna'){window.location.href='/luna';return}
    if(text==='/era'){window.location.href='/era';return}
    await doSend(text, msgs)
  },[inp,streaming,msgs,chatMode,tts])

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}
  }

  // UPGRADE 10: share message
  async function shareMsg(content: string) {
    if (navigator.share) {
      try { await navigator.share({ title:'JARVIS', text:content }) } catch {}
    } else {
      navigator.clipboard?.writeText(content)
    }
  }

  const curMode=MODES.find(m=>m.id===chatMode)||MODES[0]
  const pinnedMsgs=msgs.filter(m=>m.pinned)
  const searchResults=searchQ.trim().length>1 ? msgs.filter(m=>m.content.toLowerCase().includes(searchQ.toLowerCase())) : []

  return (
    <div style={{ position:'fixed', inset:0, background:BG, color:TEXT, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif', display:'flex', flexDirection:'column' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${dark?'#30363d':'#d0d7de'};border-radius:2px}
        textarea{resize:none}
        textarea::placeholder{color:${MUTED}44}
      `}</style>

      <Sidebar isOpen={sidebar} onClose={()=>setSidebar(false)}/>
      {showShortcuts && <ShortcutsPanel onClose={()=>setShowShortcuts(false)}/>}

      {/* HEADER */}
      <header style={{ flexShrink:0, height:'50px', background:CARD, borderBottom:'1px solid '+BORDER, display:'flex', alignItems:'center', padding:'0 12px', gap:'8px', zIndex:10 }}>
        <button onClick={()=>setSidebar(true)} style={{ background:'none', border:'none', color:MUTED, cursor:'pointer', padding:'5px', borderRadius:'6px', fontSize:'18px' }}>{String.fromCharCode(9776)}</button>
        <div style={{ width:'26px', height:'26px', background:'linear-gradient(135deg,#58a6ff,#a371f7)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:800, color:'#0d1117', flexShrink:0 }}>J</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:TEXT }}>JARVIS</div>
          <div style={{ fontSize:'9px', color:MUTED }}>v10.49</div>
        </div>
        {/* Font size */}
        <div style={{ display:'flex', gap:'2px' }}>
          {[12,14,16].map(n=>(
            <button key={n} onClick={()=>changeFontSize(n)} style={{ background:fontSize===n?CARD:'none', border:'1px solid', borderColor:fontSize===n?'#58a6ff':'transparent', borderRadius:'4px', color:fontSize===n?'#58a6ff':MUTED, cursor:'pointer', padding:'2px 5px', fontSize:'10px', fontWeight:700 }}>
              {n===12?'S':n===14?'M':'L'}
            </button>
          ))}
        </div>
        {/* UPGRADE 3: Lang toggle */}
        <button onClick={toggleLang} style={{ background:'none', border:'1px solid '+BORDER, borderRadius:'6px', color:MUTED, cursor:'pointer', padding:'3px 7px', fontSize:'11px', fontWeight:700 }}>{lang.toUpperCase()}</button>
        {/* UPGRADE 2: Theme toggle */}
        <button onClick={toggleTheme} style={{ background:'none', border:'1px solid '+BORDER, borderRadius:'6px', color:MUTED, cursor:'pointer', padding:'3px 7px', fontSize:'11px' }}>{dark?'Day':'Dark'}</button>
        <button onClick={()=>setTts(v=>!v)} style={{ background:tts?'#1f293788':'none', border:'1px solid', borderColor:tts?'#58a6ff':'transparent', borderRadius:'6px', color:tts?'#58a6ff':MUTED, cursor:'pointer', padding:'3px 7px', fontSize:'11px' }}>TTS</button>
        <button onClick={clearChat} style={{ background:'none', border:'1px solid '+BORDER, borderRadius:'6px', color:MUTED, cursor:'pointer', padding:'3px 7px', fontSize:'11px' }}>{T[lang].clear}</button>
      </header>

      {/* UPGRADE 4: Pinned bar */}
      {pinnedMsgs.length > 0 && (
        <div style={{ flexShrink:0, background:dark?'#1c2128':'#fff8c5', borderBottom:'1px solid '+BORDER, padding:'6px 14px', display:'flex', gap:'8px', alignItems:'center', overflowX:'auto' }}>
          <span style={{ fontSize:'11px', color:'#f78166', fontWeight:700, flexShrink:0 }}>Pinned:</span>
          {pinnedMsgs.map(m=>(
            <span key={m.id} style={{ fontSize:'11px', color:TEXT, background:CARD, border:'1px solid '+BORDER, borderRadius:'6px', padding:'2px 8px', whiteSpace:'nowrap', maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis' }}>{m.content.slice(0,40)}</span>
          ))}
        </div>
      )}

      {/* UPGRADE 6: Search bar */}
      {showSearch && (
        <div style={{ flexShrink:0, background:CARD, borderBottom:'1px solid '+BORDER, padding:'8px 14px' }}>
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            <input value={searchQ} onChange={e=>setSearchQ_(e.target.value)} autoFocus placeholder="Search in chat..." style={{ flex:1, background:BG, border:'1px solid '+BORDER, borderRadius:'8px', color:TEXT, padding:'7px 12px', fontSize:'13px', outline:'none' }}/>
            <button onClick={()=>{ setShowSearch(false); setSearchQ_('') }} style={{ background:'none', border:'none', color:MUTED, cursor:'pointer', fontSize:'13px' }}>Close</button>
          </div>
          {searchQ && <div style={{ fontSize:'11px', color:'#58a6ff', marginTop:'4px' }}>{searchResults.length} result{searchResults.length!==1?'s':''}</div>}
        </div>
      )}

      {/* MESSAGES */}
      <div ref={chatRef} onScroll={handleScroll} style={{ flex:1, overflowY:'auto', padding:'10px 0' }}>
        {msgs.length===0 && !streaming && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'18px', padding:'20px' }}>
            <div style={{ width:'58px', height:'58px', background:'linear-gradient(135deg,#58a6ff,#a371f7)', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontWeight:800, color:'#0d1117' }}>J</div>
            <div style={{ textAlign:'center' }}>
              {/* UPGRADE 1: time-based greeting */}
              <div style={{ fontSize:'19px', fontWeight:700, color:TEXT, marginBottom:'5px' }}>{getGreeting('Pranshu')}</div>
              <div style={{ fontSize:'13px', color:MUTED }}>JARVIS ready hai. Kya karna hai aaj?</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', maxWidth:'310px', width:'100%' }}>
              {[
                { l:'Image banao', m:'image banao ' },
                { l:'Aaj ki news', m:'aaj ki news kya hai' },
                { l:'Rewa mausam', m:'Rewa ka mausam batao' },
                { l:'Code likhna', m:'Python mein ' },
              ].map(q=>(
                <button key={q.l} onClick={()=>{ if(q.m.endsWith(' '))setInp(q.m); else send(q.m) }} style={{ background:CARD, border:'1px solid '+BORDER, borderRadius:'10px', color:TEXT, cursor:'pointer', padding:'11px', fontSize:'13px', textAlign:'left' }}>{q.l}</button>
              ))}
            </div>
            <div style={{ fontSize:'11px', color:MUTED }}>Type /help or /shortcuts for more</div>
          </div>
        )}

        {msgs.map((msg) => {
          const isCollapsed = collapsed.has(msg.id)
          const isLong = msg.content.split('\n').length > 10 || msg.content.length > 600
          const highlight = searchQ.trim().length>1 && msg.content.toLowerCase().includes(searchQ.toLowerCase())
          return (
            <div key={msg.id} style={{ padding:'3px 0', animation:'fadeIn 0.18s ease', outline: highlight?'2px solid #f7816644':'none', borderRadius:highlight?'6px':'0' }}>
              {msg.role==='user' ? (
                <div style={{ display:'flex', justifyContent:'flex-end', padding:'3px 14px' }}>
                  <div style={{ maxWidth:'82%' }}>
                    <div style={{ background:USERBG, border:'1px solid '+USERBORDER, borderRadius:'18px 18px 4px 18px', padding:'10px 14px', fontSize:fontSize+'px', color:TEXT, lineHeight:'1.6', wordBreak:'break-word' }}>
                      {msg.content}
                    </div>
                    <div style={{ textAlign:'right', marginTop:'2px', display:'flex', gap:'6px', justifyContent:'flex-end', alignItems:'center' }}>
                      {/* UPGRADE 11: word count */}
                      {msg.wordCount && msg.wordCount > 5 && <span style={{ fontSize:'10px', color:MUTED }}>{msg.wordCount}w</span>}
                      <span style={{ fontSize:'10px', color:MUTED }}>{new Date(msg.ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding:'5px 14px' }}>
                  <div style={{ display:'flex', gap:'8px', maxWidth:'780px', margin:'0 auto' }}>
                    <div style={{ width:'26px', height:'26px', background:msg.error?'#f8514922':'linear-gradient(135deg,#58a6ff,#a371f7)', border:msg.error?'1px solid #f85149':'none', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:800, color:msg.error?'#f85149':'#0d1117', flexShrink:0, marginTop:'2px' }}>J</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      {/* UPGRADE 4: pin indicator */}
                      {msg.pinned && <div style={{ fontSize:'10px', color:'#f78166', marginBottom:'3px' }}>Pinned</div>}
                      {msg.thinking && <ThinkBlock text={msg.thinking}/>}
                      {msg.imageUrl && <ImageMsg url={msg.imageUrl} prompt={msg.content}/>}
                      {msg.videoUrl && (
                        <div style={{ background:CARD, border:'1px solid '+BORDER, borderRadius:'10px', padding:'12px', maxWidth:'260px' }}>
                          <div style={{ fontSize:'13px', marginBottom:'8px', color:MUTED }}>{msg.content}</div>
                          <a href={msg.videoUrl} target="_blank" rel="noreferrer" style={{ display:'inline-block', background:'#6e40c922', border:'1px solid #a371f7', borderRadius:'6px', padding:'5px 10px', color:'#a371f7', textDecoration:'none', fontSize:'12px' }}>Watch</a>
                        </div>
                      )}
                      {!msg.imageUrl && !msg.videoUrl && (
                        <div style={{ fontSize:fontSize+'px', color:msg.error?'#f85149':TEXT, lineHeight:'1.7', wordBreak:'break-word' }}>
                          {/* UPGRADE 7: collapse long messages */}
                          <MdText text={msg.content} fontSize={fontSize} collapsed={isLong && isCollapsed}/>
                          {isLong && (
                            <button onClick={()=>toggleCollapse(msg.id)} style={{ background:'none', border:'none', color:'#58a6ff', cursor:'pointer', fontSize:'12px', padding:'2px 0', marginTop:'2px' }}>
                              {isCollapsed ? 'Show more...' : 'Show less'}
                            </button>
                          )}
                        </div>
                      )}
                      {/* Action bar */}
                      <div style={{ display:'flex', alignItems:'center', gap:'5px', marginTop:'5px', flexWrap:'wrap' }}>
                        {!msg.imageUrl&&!msg.videoUrl && (
                          <button onClick={()=>{ navigator.clipboard?.writeText(msg.content) }} style={{ background:'none', border:'1px solid '+BORDER, borderRadius:'5px', color:MUTED, cursor:'pointer', fontSize:'11px', padding:'2px 7px' }}>{T[lang].copy}</button>
                        )}
                        {/* UPGRADE 4: pin */}
                        <button onClick={()=>togglePin(msg.id)} style={{ background:msg.pinned?'#f7816622':'none', border:'1px solid', borderColor:msg.pinned?'#f78166':BORDER, borderRadius:'5px', color:msg.pinned?'#f78166':MUTED, cursor:'pointer', fontSize:'11px', padding:'2px 7px' }}>{msg.pinned?T[lang].unpin:T[lang].pin}</button>
                        {/* UPGRADE 10: share */}
                        <button onClick={()=>shareMsg(msg.content)} style={{ background:'none', border:'1px solid '+BORDER, borderRadius:'5px', color:MUTED, cursor:'pointer', fontSize:'11px', padding:'2px 7px' }}>Share</button>
                        {/* UPGRADE 5: retry on error */}
                        {msg.error && <button onClick={()=>retryMsg(msg.id)} style={{ background:'#f8514922', border:'1px solid #f85149', borderRadius:'5px', color:'#f85149', cursor:'pointer', fontSize:'11px', padding:'2px 7px' }}>{T[lang].retry}</button>}
                        {msg.provider && <span style={{ fontSize:'10px', color:MUTED }}>{msg.provider}</span>}
                        {/* UPGRADE 11: response time + word count */}
                        {msg.ms && <span style={{ fontSize:'10px', color:MUTED }}>{msg.ms}ms</span>}
                        {msg.wordCount && <span style={{ fontSize:'10px', color:MUTED }}>{msg.wordCount}w</span>}
                        <span style={{ fontSize:'10px', color:MUTED }}>{new Date(msg.ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
                        {tts && !msg.imageUrl && <button onClick={()=>speak(msg.content)} style={{ background:'none', border:'none', color:MUTED, cursor:'pointer', fontSize:'11px' }}>Listen</button>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {streaming && (
          <div style={{ padding:'5px 14px', animation:'fadeIn 0.18s ease' }}>
            <div style={{ display:'flex', gap:'8px', maxWidth:'780px', margin:'0 auto' }}>
              <div style={{ width:'26px', height:'26px', background:'linear-gradient(135deg,#58a6ff,#a371f7)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:800, color:'#0d1117', flexShrink:0, marginTop:'2px' }}>J</div>
              <div style={{ flex:1, minWidth:0 }}>
                {streamThink && <ThinkBlock text={streamThink}/>}
                <div style={{ fontSize:fontSize+'px', color:TEXT, lineHeight:'1.7' }}>
                  {streamText
                    ? <><MdText text={streamText} fontSize={fontSize}/><span style={{ display:'inline-block', width:'2px', height:'14px', background:'#58a6ff', marginLeft:'2px', animation:'blink 1s infinite', verticalAlign:'middle' }}/></>
                    : <span style={{ color:curMode.color, fontSize:'13px' }}>{streamProv||T[lang].thinking}</span>
                  }
                </div>
                {streamProv&&streamText&&<div style={{ fontSize:'10px', color:MUTED, marginTop:'3px' }}>{streamProv}</div>}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* UPGRADE 5: scroll to bottom */}
      {showScroll && (
        <button onClick={()=>bottomRef.current?.scrollIntoView({behavior:'smooth'})} style={{ position:'fixed', bottom:'130px', right:'14px', background:CARD, border:'1px solid '+BORDER, borderRadius:'50%', width:'34px', height:'34px', color:MUTED, cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(0,0,0,0.3)', zIndex:30 }}>v</button>
      )}

      {/* INPUT */}
      <div style={{ flexShrink:0, background:CARD, borderTop:'1px solid '+BORDER, padding:'10px 12px 16px' }}>
        <div style={{ maxWidth:'780px', margin:'0 auto' }}>
          <div style={{ background:BG, border:'1px solid', borderColor:streaming?curMode.color:inp?'#58a6ff44':BORDER, borderRadius:'12px', padding:'9px 12px', transition:'border-color 0.2s' }}>
            <textarea
              ref={inpRef}
              value={inp}
              onChange={e=>setInp(e.target.value.slice(0,4000))}
              onKeyDown={handleKey}
              placeholder={recording ? T[lang].recording : T[lang].placeholder}
              disabled={streaming}
              rows={1}
              style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:TEXT, fontSize:fontSize+'px', lineHeight:'1.5', maxHeight:'120px', overflowY:'auto', fontFamily:'inherit' }}
            />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'7px', gap:'5px' }}>
              <div style={{ display:'flex', gap:'4px', position:'relative', flexWrap:'wrap' }}>
                <button onClick={()=>setModeMenu(v=>!v)} style={{ background:curMode.color+'22', border:'1px solid '+curMode.color+'44', borderRadius:'6px', color:curMode.color, cursor:'pointer', padding:'4px 9px', fontSize:'12px', fontWeight:600 }}>{curMode.label}</button>
                {modeMenu && (
                  <div style={{ position:'absolute', bottom:'32px', left:0, background:CARD, border:'1px solid '+BORDER, borderRadius:'10px', padding:'4px', zIndex:50, minWidth:'175px', boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
                    {MODES.map(m=>(
                      <button key={m.id} onClick={()=>changeMode(m.id)} style={{ width:'100%', background:chatMode===m.id?m.color+'22':'none', border:'none', borderRadius:'6px', color:chatMode===m.id?m.color:MUTED, cursor:'pointer', padding:'7px 10px', fontSize:'12px', textAlign:'left', display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontWeight:chatMode===m.id?700:400 }}>{m.label}</span>
                        <span style={{ fontSize:'10px', opacity:0.7 }}>{m.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
                <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhoto}/>
                <button onClick={()=>photoRef.current?.click()} style={{ background:dark?'#21262d':BORDER, border:'1px solid '+BORDER, borderRadius:'6px', color:MUTED, cursor:'pointer', padding:'4px 8px', fontSize:'12px' }}>{T[lang].photo}</button>
                <button onClick={toggleVoice} style={{ background:recording?'#f8514922':dark?'#21262d':BORDER, border:'1px solid', borderColor:recording?'#f85149':BORDER, borderRadius:'6px', color:recording?'#f85149':MUTED, cursor:'pointer', padding:'4px 8px', fontSize:'12px' }}>
                  {recording ? T[lang].recording.slice(0,4)+'...' : T[lang].mic}
                </button>
                {/* UPGRADE 6: search button */}
                <button onClick={()=>setShowSearch(v=>!v)} style={{ background:showSearch?'#58a6ff22':dark?'#21262d':BORDER, border:'1px solid', borderColor:showSearch?'#58a6ff':BORDER, borderRadius:'6px', color:showSearch?'#58a6ff':MUTED, cursor:'pointer', padding:'4px 8px', fontSize:'12px' }}>{T[lang].search}</button>
                {/* UPGRADE 8: shortcuts */}
                <button onClick={()=>setShowShortcuts(true)} style={{ background:dark?'#21262d':BORDER, border:'1px solid '+BORDER, borderRadius:'6px', color:MUTED, cursor:'pointer', padding:'4px 8px', fontSize:'12px' }}>Keys</button>
                {/* UPGRADE 9: export */}
                <button onClick={()=>exportChat(msgs)} style={{ background:dark?'#21262d':BORDER, border:'1px solid '+BORDER, borderRadius:'6px', color:MUTED, cursor:'pointer', padding:'4px 8px', fontSize:'12px' }}>{T[lang].export}</button>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'5px', flexShrink:0 }}>
                {inp.length>100 && <span style={{ fontSize:'10px', color:inp.length>3500?'#f85149':MUTED }}>{inp.length}/4000</span>}
                {streaming
                  ? <button onClick={()=>abortRef.current?.abort()} style={{ background:'#f8514922', border:'1px solid #f85149', borderRadius:'8px', color:'#f85149', cursor:'pointer', padding:'5px 12px', fontSize:'13px', fontWeight:600 }}>{T[lang].stop}</button>
                  : <button onClick={()=>send()} disabled={!inp.trim()} style={{ background:inp.trim()?'linear-gradient(135deg,#58a6ff,#a371f7)':'#21262d', border:'none', borderRadius:'8px', color:inp.trim()?'#0d1117':MUTED, cursor:inp.trim()?'pointer':'not-allowed', padding:'5px 14px', fontSize:'13px', fontWeight:700, transition:'all 0.2s' }}>{T[lang].send}</button>
                }
              </div>
            </div>
          </div>
          {msgs.length>0 && (
            <div style={{ fontSize:'10px', color:MUTED, textAlign:'center', marginTop:'4px' }}>
              {msgs.length} messages  |  /help  /shortcuts  /export
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
