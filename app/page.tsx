'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '../components/shared/Sidebar'

type Msg = { r:'u'|'a'; c:string; imageUrl?:string; videoUrl?:string; widget?:string; thinking?:string; richData?:any; provider?:string; ts?:number }
type ChatMode = 'auto'|'flash'|'think'|'deep'

const STORAGE_KEY = 'jarvis_v3'
const MODE_KEY    = 'jarvis_mode_v3'

// -- UPGRADE 15: Markdown lite renderer -----------------------
function Md({ t }: { t: string }) {
  return (
    <span>
      {t.split('\n').map((line, i) => {
        const isH = /^#{1,3} /.test(line)
        const isLi = /^[-*] /.test(line)
        const text = line.replace(/^#{1,3} /,'').replace(/^[-*] /,'')
        const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p,j) => {
          if (p.startsWith('**') && p.endsWith('**') && p.length>4) return <strong key={j}>{p.slice(2,-2)}</strong>
          if (p.startsWith('`') && p.endsWith('`') && p.length>2) return <code key={j} style={{background:'#1a3a5a',borderRadius:'3px',padding:'1px 5px',fontSize:'12px',fontFamily:'monospace'}}>{p.slice(1,-1)}</code>
          return <span key={j}>{p}</span>
        })
        if (line.trim()==='') return <br key={i}/>
        if (isH) return <div key={i} style={{fontWeight:800,color:'#00e5ff',marginTop:'6px'}}>{parts}</div>
        if (isLi) return <div key={i} style={{paddingLeft:'10px'}}>{'> '}{parts}</div>
        return <div key={i}>{parts}</div>
      })}
    </span>
  )
}

// -- UPGRADE 13: ThinkingBlock ---------------------------------
function Think({ text, live }: { text:string; live?:boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{marginBottom:'6px'}}>
      <button onClick={()=>setOpen(v=>!v)} style={{background:'none',border:'1px solid #8b5cf644',borderRadius:'8px',color:'#8b5cf6',padding:'3px 10px',cursor:'pointer',fontSize:'11px',fontWeight:600}}>
        {live ? '...' : (open ? 'Hide reasoning' : 'Show reasoning')}
      </button>
      {open && <div style={{marginTop:'6px',padding:'10px',background:'#8b5cf611',border:'1px solid #8b5cf633',borderRadius:'10px',color:'#c4b5fd',fontSize:'11px',lineHeight:'1.7',whiteSpace:'pre-wrap',maxHeight:'180px',overflowY:'auto'}}>{text.replace(/<\/?think>/g,'').trim()}</div>}
    </div>
  )
}

// -- UPGRADE 14: RichData cards --------------------------------
function Rich({ data }: { data:any }) {
  if (!data) return null
  const { type:t, data:d } = data
  if (t==='weather' && d) return (
    <div style={{background:'#0a1628',border:'1px solid #00e5ff33',borderRadius:'12px',padding:'10px',marginBottom:'6px',maxWidth:'200px'}}>
      <div style={{color:'#4fc3f7',fontSize:'10px',marginBottom:'3px'}}>Weather</div>
      <div style={{color:'#00e5ff',fontSize:'24px',fontWeight:800}}>{d.temp??'?'}C</div>
      <div style={{color:'#e0f0ff',fontSize:'12px'}}>{d.description??d.condition??''}</div>
      {d.city && <div style={{fontSize:'10px',color:'#4fc3f755',marginTop:'2px'}}>{d.city}</div>}
    </div>
  )
  if (t==='news' && Array.isArray(d)) return (
    <div style={{background:'#0a1628',border:'1px solid #4fc3f733',borderRadius:'12px',padding:'10px',marginBottom:'6px',maxWidth:'270px'}}>
      <div style={{color:'#4fc3f7',fontSize:'10px',marginBottom:'6px'}}>Top News</div>
      {d.slice(0,3).map((a:any,i:number)=>(
        <div key={i} style={{fontSize:'12px',color:'#e0f0ff',marginBottom:'4px',paddingBottom:'4px',borderBottom:i<2?'1px solid #1a3a5a':'none',lineHeight:'1.4'}}>{a.title??''}</div>
      ))}
    </div>
  )
  return null
}

// -- UPGRADE 9: CalcWidget - only ASCII in logic ---------------
// Display chars: / * stored as DIV MUL in array, shown via label map
function Calc() {
  const [expr, setExpr] = useState('')
  const [res, setRes]   = useState('0')
  // rows use ASCII-safe keys only
  const rows = [['7','8','9','DIV'],['4','5','6','MUL'],['1','2','3','-'],['0','.','BAK','+'],['C','(',')', '=']]
  const label: Record<string,string> = { DIV:'/', MUL:'*', BAK:'<' }
  function safe(e: string) { return e.replace(/DIV/g,'/').replace(/MUL/g,'*') }
  function tap(k: string) {
    if (k==='C')   { setExpr(''); setRes('0'); return }
    if (k==='BAK') { setExpr(e=>e.slice(0,-1)); return }
    if (k==='=') {
      try { const r=String(Function('"use strict";return('+safe(expr)+')')());setRes(r);setExpr(r) } catch { setRes('Err') }
      return
    }
    const n = expr + k
    setExpr(n)
    try { setRes(String(Function('"use strict";return('+safe(n)+')')()) } catch {}
  }
  return (
    <div style={{background:'#0a1628',border:'1px solid #1a3a5a',borderRadius:'16px',padding:'12px',maxWidth:'240px'}}>
      <div style={{background:'#030a14',borderRadius:'8px',padding:'10px',textAlign:'right',fontSize:'22px',fontWeight:700,marginBottom:'6px',minHeight:'42px',color:'#00e5ff'}}>{res}</div>
      <div style={{fontSize:'10px',color:'#334',textAlign:'right',minHeight:'14px',marginBottom:'6px'}}>{safe(expr)}</div>
      {rows.map((row,ri)=>(
        <div key={ri} style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'5px',marginBottom:'5px'}}>
          {row.map(k=><button key={k} onClick={()=>tap(k)} style={{padding:'11px 4px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'14px',fontWeight:600,background:k==='='?'#00e5ff22':k==='C'?'#ff525222':['DIV','MUL','-','+'].includes(k)?'#1a3a5a':'#111d2e',color:k==='='?'#00e5ff':k==='C'?'#ff5252':'#e0f0ff'}}>{label[k]??k}</button>)}
        </div>
      ))}
    </div>
  )
}

function Qr({ text }: { text:string }) {
  const [v,setV]=useState(text)
  const [url,setUrl]=useState(text?'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data='+encodeURIComponent(text):'')
  return (
    <div style={{background:'#0a1628',border:'1px solid #1a3a5a',borderRadius:'16px',padding:'12px',maxWidth:'220px'}}>
      <div style={{fontSize:'11px',color:'#00e5ff',marginBottom:'8px'}}>QR Generator</div>
      <input value={v} onChange={e=>setV(e.target.value)} onKeyDown={e=>e.key==='Enter'&&setUrl('https://api.qrserver.com/v1/create-qr-code/?size=180x180&data='+encodeURIComponent(v))} placeholder="Text ya URL..." style={{width:'100%',background:'#030a14',border:'1px solid #1a3a5a',borderRadius:'8px',color:'#e0f0ff',padding:'6px 10px',fontSize:'12px',outline:'none',marginBottom:'8px',boxSizing:'border-box'}}/>
      <button onClick={()=>setUrl('https://api.qrserver.com/v1/create-qr-code/?size=180x180&data='+encodeURIComponent(v))} style={{width:'100%',background:'#00e5ff22',border:'1px solid #00e5ff',borderRadius:'8px',color:'#00e5ff',padding:'6px',cursor:'pointer',fontSize:'12px',marginBottom:'8px'}}>Generate</button>
      {url&&<div style={{textAlign:'center'}}><img src={url} alt="QR" style={{borderRadius:'8px',width:'150px',height:'150px'}}/></div>}
    </div>
  )
}

// -- UPGRADE 10: Image with skeleton + save --------------------
function Img({ url, prompt }: { url:string; prompt:string }) {
  const [loaded,setLoaded]=useState(false)
  const [err,setErr]=useState(false)
  return (
    <div style={{maxWidth:'290px'}}>
      <div style={{fontSize:'11px',color:'#888',marginBottom:'6px'}}>{prompt.slice(0,50)}</div>
      {!loaded&&!err&&<div style={{width:'270px',height:'190px',background:'#0a1628',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #1a3a5a',flexDirection:'column',gap:'8px'}}><span style={{fontSize:'24px'}}>*</span><span style={{fontSize:'12px',color:'#4fc3f7'}}>Generating...</span></div>}
      {err&&<div style={{fontSize:'12px',color:'#ff5252'}}>Load failed. Retry.</div>}
      <img src={url} alt={prompt} onLoad={()=>setLoaded(true)} onError={()=>setErr(true)} style={{width:'100%',borderRadius:'12px',display:loaded?'block':'none',border:'1px solid #1a3a5a'}}/>
      {loaded&&<a href={url} target="_blank" rel="noreferrer" style={{fontSize:'11px',color:'#00e5ff',marginTop:'6px',display:'inline-block'}}>Save Image</a>}
    </div>
  )
}

// -- UPGRADE 11: Copy button -----------------------------------
function Copy({ text }: { text:string }) {
  const [done,setDone]=useState(false)
  return <button onClick={()=>{navigator.clipboard?.writeText(text).then(()=>{setDone(true);setTimeout(()=>setDone(false),1500)})}} style={{background:'none',border:'none',color:done?'#22c55e':'#4fc3f744',cursor:'pointer',fontSize:'12px',padding:'0 4px'}} title="Copy">{done?'v':''}</button>
}

// -- UPGRADE 1: Streaming indicator ---------------------------
function Dots({ color }: { color:string }) {
  return (
    <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
      {[0,1,2].map(i=><div key={i} style={{width:'6px',height:'6px',borderRadius:'50%',background:color,animation:'p 1.2s '+(i*0.2)+'s infinite'}}/>)}
    </div>
  )
}

function genPass() {
  const c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*()'
  return Array.from({length:16},()=>c[Math.floor(Math.random()*c.length)]).join('')
}

// -- Chat modes ------------------------------------------------
const MODES = [
  {id:'auto'  as ChatMode, icon:'A', label:'Auto',  color:'#00e5ff', tip:'Smart routing'},
  {id:'flash' as ChatMode, icon:'F', label:'Flash', color:'#ffa500', tip:'Fastest Llama 8B'},
  {id:'think' as ChatMode, icon:'T', label:'Think', color:'#8b5cf6', tip:'DeepSeek R1 reasoning'},
  {id:'deep'  as ChatMode, icon:'D', label:'Deep',  color:'#22c55e', tip:'Gemini 2.0 + 46 tools'},
]

// -- UPGRADE 7: Quick actions ----------------------------------
const QUICK = [
  {l:'Image', m:'image banao '},
  {l:'Calc',  m:'/calc'},
  {l:'QR',    m:'/qr '},
  {l:'News',  m:'aaj ki news kya hai'},
  {l:'Weather',m:'Rewa ka mausam'},
  {l:'Cricket',m:'cricket score batao'},
  {l:'Joke',  m:'ek accha joke sunao'},
  {l:'Photo', m:''},
]

// -- UPGRADE 5: Chat search ------------------------------------
function useChatSearch(msgs: Msg[]) {
  const [q, setQ] = useState('')
  const results = q.trim().length > 1
    ? msgs.filter(m=>m.c.toLowerCase().includes(q.toLowerCase()))
    : []
  return { q, setQ, results }
}

// -------------------------------------------------------------
export default function Home() {
  const [msgs,       setMsgs]       = useState<Msg[]>([{r:'a',c:'Hey Pranshu! JARVIS ready. Kya karna hai?',ts:Date.now()}])
  const [inp,        setInp]        = useState('')
  const [load,       setLoad]       = useState(false)
  const [tts,        setTts]        = useState(false)
  const [sidebar,    setSidebar]    = useState(false)
  const [recording,  setRecording]  = useState(false)
  const [chatMode,   setChatMode]   = useState<ChatMode>('auto')
  const [memPrompt,  setMemPrompt]  = useState('')
  // UPGRADE 1: streaming
  const [streamText, setStreamText] = useState('')
  const [streamThink,setStreamThink]= useState('')
  const [streamProv, setStreamProv] = useState('')
  const [streaming,  setStreaming]  = useState(false)
  // UPGRADE 5: search
  const [showSearch, setShowSearch] = useState(false)
  const { q: sq, setQ: setSq, results: sResults } = useChatSearch(msgs)
  // UPGRADE 6: theme
  const [dark, setDark] = useState(true)

  const ref      = useRef<HTMLDivElement>(null)
  const inpRef   = useRef<HTMLInputElement>(null)
  const mediaRef = useRef<any>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController|null>(null)

  useEffect(()=>{
    try {
      const s=localStorage.getItem(STORAGE_KEY)
      if(s){const p=JSON.parse(s);if(p?.length>0)setMsgs(p)}
      const mem=localStorage.getItem('jarvis_mem')
      if(mem)setMemPrompt(mem)
      const mode=localStorage.getItem(MODE_KEY) as ChatMode|null
      if(mode&&['auto','flash','think','deep'].includes(mode))setChatMode(mode)
    } catch {}
  },[])

  useEffect(()=>{
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(msgs.slice(-60)))}catch{}
  },[msgs])

  useEffect(()=>{
    if(ref.current)ref.current.scrollTop=ref.current.scrollHeight
  },[msgs,load,streamText])

  function changeMode(m:ChatMode){setChatMode(m);try{localStorage.setItem(MODE_KEY,m)}catch{}}

  // UPGRADE 2: TTS
  async function speak(text:string){
    if(!tts)return
    try{
      const r=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text.slice(0,300)})})
      if(r.ok){const b=await r.blob();new Audio(URL.createObjectURL(b)).play()}
    }catch{}
  }

  // UPGRADE 3: Voice STT
  async function toggleVoice(){
    if(recording){mediaRef.current?.stop();setRecording(false);return}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true})
      const mr=new MediaRecorder(stream,{mimeType:'audio/webm'})
      const chunks:Blob[]=[]
      mr.ondataavailable=e=>chunks.push(e.data)
      mr.onstop=async()=>{
        stream.getTracks().forEach(t=>t.stop())
        const fd=new FormData()
        fd.append('audio',new Blob(chunks,{type:'audio/webm'}),'audio.webm')
        try{const r=await fetch('/api/stt',{method:'POST',body:fd});const d=await r.json();if(d.text){setInp(d.text);inpRef.current?.focus()}}catch{}
      }
      mr.start();mediaRef.current=mr;setRecording(true)
      setTimeout(()=>{if(mr.state==='recording')mr.stop()},10000)
    }catch{alert('Mic permission chahiye!')}
  }

  // UPGRADE 4: Photo analysis
  async function handlePhoto(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return
    const reader=new FileReader()
    reader.onload=async()=>{
      const nm:Msg[]=[...msgs,{r:'u',c:'Photo bheja',ts:Date.now()}]
      setMsgs(nm);setLoad(true)
      try{
        const r=await fetch('/api/photo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageBase64:reader.result})})
        const d=await r.json();const rep=d.answer||'Samajh nahi aaya'
        setMsgs([...nm,{r:'a',c:rep,provider:'Gemini Vision',ts:Date.now()}]);speak(rep)
      }catch{setMsgs([...nm,{r:'a',c:'Photo analyse nahi ho payi',ts:Date.now()}])}
      setLoad(false)
    }
    reader.readAsDataURL(file);e.target.value=''
  }

  // -- UPGRADE 1: SSE Streaming send ----------------------------
  const send=useCallback(async(text?:string)=>{
    const msg=(text||inp).trim()
    if(!msg||load||streaming)return
    setInp('')

    // Slash commands
    if(msg.startsWith('/')){
      const parts=msg.slice(1).split(' ')
      const cmd=parts[0].toLowerCase()
      const args=parts.slice(1).join(' ')
      if(cmd==='calc') {setMsgs(m=>[...m,{r:'u',c:msg,ts:Date.now()},{r:'a',c:'',widget:'calc',ts:Date.now()}]);return}
      if(cmd==='qr')   {setMsgs(m=>[...m,{r:'u',c:msg,ts:Date.now()},{r:'a',c:'',widget:'qr:'+args,ts:Date.now()}]);return}
      if(cmd==='pass') {setMsgs(m=>[...m,{r:'u',c:msg,ts:Date.now()},{r:'a',c:'Password: '+genPass(),ts:Date.now()}]);return}
      if(cmd==='clear'){setMsgs([{r:'a',c:'Clear! Kya karna hai?',ts:Date.now()}]);try{localStorage.removeItem(STORAGE_KEY)}catch{};return}
      if(cmd==='luna') {window.location.href='/luna';return}
      if(cmd==='era')  {window.location.href='/era';return}
    }

    const m=msg.toLowerCase()
    const nm:Msg[]=[...msgs,{r:'u',c:msg,ts:Date.now()}]
    setMsgs(nm)

    // Fast client paths
    if(/image banao|photo banao|generate image|draw|sketch|wallpaper/i.test(m)){
      const p=msg.replace(/image banao|photo banao|generate image|draw|sketch|wallpaper/gi,'').trim()||msg
      setMsgs([...nm,{r:'a',c:p,imageUrl:'https://image.pollinations.ai/prompt/'+encodeURIComponent(p)+'?model=flux&width=1024&height=1024&seed='+Math.floor(Math.random()*999999)+'&nologo=true',provider:'Pollinations FLUX',ts:Date.now()}])
      return
    }
    if(/video banao|clip banao/i.test(m)){
      setMsgs([...nm,{r:'a',c:'Video generating...',videoUrl:'https://video.pollinations.ai/'+encodeURIComponent(msg),ts:Date.now()}])
      return
    }
    if(/password banao|strong password/i.test(m)){
      setMsgs([...nm,{r:'a',c:'Password: '+genPass(),ts:Date.now()}])
      return
    }

    // SSE Streaming
    setStreaming(true);setStreamText('');setStreamThink('');setStreamProv('Connecting...')
    abortRef.current=new AbortController()
    let full='',think='',prov=''

    try{
      const res=await fetch('/api/stream',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          message:msg,
          history:nm.slice(-8).map(x=>({role:x.r==='u'?'user':'assistant',content:x.c})),
          chatMode,
          memoryPrompt:memPrompt||undefined,
          userName:'Pranshu',
        }),
        signal:abortRef.current.signal,
      })
      if(!res.ok||!res.body)throw new Error('Stream failed')
      const reader=res.body.getReader()
      const dec=new TextDecoder()
      let buf=''
      while(true){
        const {done,value}=await reader.read()
        if(done)break
        buf+=dec.decode(value,{stream:true})
        const lines=buf.split('\n');buf=lines.pop()||''
        for(const line of lines){
          if(!line.startsWith('data: '))continue
          const raw=line.slice(6).trim()
          if(!raw||raw==='[DONE]')continue
          try{
            const ev=JSON.parse(raw)
            if(ev.type==='start'){prov=ev.provider||'';setStreamProv(prov)}
            else if(ev.type==='token'){full+=ev.text;setStreamText(full)}
            else if(ev.type==='think'){think+=ev.text;setStreamThink(think)}
            else if(ev.type==='fallback'&&ev.message==='USE_PUTER'){full='Sab providers busy. Puter.js try karo.'}
          }catch{}
        }
      }
      const final:Msg={r:'a',c:full||'...',thinking:think.replace(/<\/?think>/g,'').trim()||undefined,provider:prov||undefined,ts:Date.now()}
      setMsgs([...nm,final]);speak(full)
    }catch(err:any){
      if(err?.name!=='AbortError')setMsgs([...nm,{r:'a',c:'Network issue - retry karo!',ts:Date.now()}])
    }finally{
      setStreaming(false);setStreamText('');setStreamThink('');setStreamProv('')
    }
  },[inp,load,streaming,msgs,tts,chatMode,memPrompt])

  // Colors
  const bg='#040e1a', card=dark?'#0a1628':'#111d2e', tc='#e0f0ff', bc='#1a3a5a'
  const cur=MODES.find(x=>x.id===chatMode)||MODES[0]

  return (
    <div style={{position:'fixed',inset:0,background:bg,display:'flex',flexDirection:'column',fontFamily:'system-ui,sans-serif',color:tc}}>
      <style>{`@keyframes p{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}@keyframes fd{from{opacity:0}to{opacity:1}}::-webkit-scrollbar{width:0}input::placeholder{color:#4fc3f744}`}</style>
      <Sidebar isOpen={sidebar} onClose={()=>setSidebar(false)}/>

      {/* HEADER */}
      <div style={{flexShrink:0,background:'#030a14',borderBottom:'1px solid '+bc,padding:'10px 14px',display:'flex',alignItems:'center',gap:'10px',zIndex:20}}>
        <button onClick={()=>setSidebar(true)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:tc}}>menu</button>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:'15px',letterSpacing:'1px',color:'#00e5ff'}}>JARVIS</div>
          <div style={{fontSize:'9px',color:'#4fc3f7',letterSpacing:'2px'}}>v10.47 - 15 UPGRADES</div>
        </div>
        {/* UPGRADE 8: TTS toggle */}
        <button onClick={()=>setTts(v=>!v)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'18px',opacity:tts?1:0.3}} title="TTS">TTS</button>
        {/* UPGRADE 6: Dark/light */}
        <button onClick={()=>setDark(v=>!v)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'18px'}} title="Theme">{dark?'day':'night'}</button>
        {/* UPGRADE 5: Search toggle */}
        <button onClick={()=>setShowSearch(v=>!v)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'18px',color:showSearch?'#00e5ff':tc}} title="Search">Find</button>
      </div>

      {/* UPGRADE 5: Search bar */}
      {showSearch && (
        <div style={{flexShrink:0,padding:'8px 12px',background:'#030a14',borderBottom:'1px solid '+bc}}>
          <input value={sq} onChange={e=>setSq(e.target.value)} placeholder="Chat mein search karo..." style={{width:'100%',background:card,border:'1px solid '+(sq?'#00e5ff':bc),borderRadius:'20px',color:tc,padding:'7px 14px',fontSize:'13px',outline:'none'}}/>
          {sResults.length>0&&<div style={{fontSize:'11px',color:'#4fc3f7',marginTop:'4px'}}>{sResults.length} result(s) found</div>}
        </div>
      )}

      {/* UPGRADE 2: Chat Mode Selector */}
      <div style={{flexShrink:0,padding:'5px 12px',background:'#030a14',borderBottom:'1px solid '+bc,display:'flex',gap:'5px'}}>
        {MODES.map(({id,icon,label,color})=>(
          <button key={id} onClick={()=>changeMode(id)} title={label} style={{flex:1,padding:'5px 2px',borderRadius:'10px',border:'1px solid',borderColor:chatMode===id?color:bc,background:chatMode===id?color+'22':'transparent',color:chatMode===id?color:'#4fc3f777',fontSize:'10px',fontWeight:700,cursor:'pointer',transition:'all 0.15s'}}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* MESSAGES */}
      <div ref={ref} style={{flex:1,overflowY:'scroll',padding:'12px',display:'flex',flexDirection:'column',gap:'10px',minHeight:0}}>
        {/* UPGRADE 5: Search highlight */}
        {(showSearch && sq && sResults.length > 0 ? sResults : msgs).map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:m.r==='u'?'flex-end':'flex-start',alignItems:'flex-end',gap:'8px',animation:'fd 0.2s ease'}}>
            {m.r==='a'&&<div style={{width:'30px',height:'30px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',flexShrink:0}}>J</div>}
            <div style={{maxWidth:'84%'}}>
              {m.r==='a'&&m.thinking&&<Think text={m.thinking}/>}
              {m.r==='a'&&m.richData&&<Rich data={m.richData}/>}
              {m.widget==='calc'&&<Calc/>}
              {m.widget?.startsWith('qr:')&&<Qr text={m.widget.slice(3)}/>}
              {m.imageUrl&&<Img url={m.imageUrl} prompt={m.c}/>}
              {m.videoUrl&&!m.imageUrl&&(
                <div style={{background:card,border:'1px solid '+bc,borderRadius:'12px',padding:'12px',maxWidth:'260px'}}>
                  <div style={{fontSize:'13px',marginBottom:'8px'}}>{m.c}</div>
                  <a href={m.videoUrl} target="_blank" rel="noreferrer" style={{display:'block',background:'#8b5cf622',border:'1px solid #8b5cf6',borderRadius:'8px',padding:'8px',textAlign:'center',color:'#8b5cf6',textDecoration:'none',fontSize:'12px'}}>Watch Video</a>
                </div>
              )}
              {!m.widget&&!m.imageUrl&&!m.videoUrl&&m.c&&(
                <div style={{padding:'10px 14px',borderRadius:m.r==='u'?'18px 18px 4px 18px':'18px 18px 18px 4px',background:m.r==='u'?'linear-gradient(135deg,#00e5ff22,#8b5cf622)':card,border:'1px solid '+(m.r==='u'?'#00e5ff44':bc),color:tc,fontSize:'14px',lineHeight:'1.7'}}>
                  {/* UPGRADE 15: Markdown renderer */}
                  <Md t={m.c}/>
                  {m.r==='a'&&(
                    <div style={{display:'flex',alignItems:'center',gap:'4px',marginTop:'5px'}}>
                      {/* UPGRADE 11: Copy button */}
                      <Copy text={m.c}/>
                      {/* UPGRADE 12: Provider badge */}
                      {m.provider&&<span style={{fontSize:'10px',color:'#4fc3f744'}}>{m.provider}</span>}
                      {tts&&<button onClick={()=>speak(m.c)} style={{background:'none',border:'none',color:'#4fc3f744',cursor:'pointer',fontSize:'11px'}}>TTS</button>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* UPGRADE 1: Live streaming bubble */}
        {streaming&&(
          <div style={{display:'flex',gap:'8px',alignItems:'flex-end',animation:'fd 0.2s ease'}}>
            <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',flexShrink:0}}>J</div>
            <div style={{maxWidth:'84%'}}>
              {streamThink&&<Think text={streamThink} live/>}
              <div style={{padding:'10px 14px',background:card,border:'1px solid '+bc,borderRadius:'18px 18px 18px 4px',color:tc,fontSize:'14px',lineHeight:'1.7'}}>
                {streamText?<Md t={streamText}/>:<div style={{display:'flex',alignItems:'center',gap:'8px'}}><span style={{fontSize:'11px',color:cur.color}}>{cur.label}</span><Dots color={cur.color}/></div>}
                {streamText&&streamProv&&<div style={{fontSize:'10px',color:'#4fc3f744',marginTop:'4px'}}>{streamProv}</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* UPGRADE 7: Quick chips */}
      <div style={{flexShrink:0,padding:'5px 12px',background:'#030a14',borderTop:'1px solid '+bc}}>
        <div style={{display:'flex',gap:'5px',overflowX:'auto',paddingBottom:'2px'}}>
          {QUICK.map(q=>(
            <button key={q.l} onClick={()=>{
              if(q.m===''){photoRef.current?.click();return}
              if(q.m.endsWith(' '))setInp(q.m)
              else send(q.m)
            }} style={{padding:'5px 10px',borderRadius:'16px',border:'1px solid '+bc,background:card,color:tc,fontSize:'11px',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
              {q.l}
            </button>
          ))}
        </div>
      </div>

      {/* INPUT */}
      <div style={{flexShrink:0,padding:'8px 12px 20px',background:'#030a14',borderTop:'1px solid '+bc}}>
        <input ref={photoRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhoto}/>
        <div style={{display:'flex',gap:'6px',alignItems:'center',background:card,borderRadius:'26px',padding:'6px 6px 6px 14px',border:'1.5px solid '+(inp?'#00e5ff':streaming?cur.color:bc),transition:'border-color 0.2s'}}>
          <input
            ref={inpRef}
            value={inp}
            onChange={e=>setInp(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
            placeholder={recording?'Listening...':streaming?cur.label+' mode...':'Kuch bhi poocho...'}
            disabled={streaming}
            style={{flex:1,border:'none',background:'transparent',outline:'none',fontSize:'14px',color:tc}}
          />
          {/* UPGRADE 3: Voice */}
          <button onClick={toggleVoice} style={{width:'34px',height:'34px',borderRadius:'50%',background:recording?'rgba(255,82,82,0.15)':'transparent',border:recording?'2px solid #ff5252':'none',cursor:'pointer',fontSize:'18px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {recording?'[stop]':'mic'}
          </button>
          {/* UPGRADE 1: Stop streaming button */}
          {streaming
            ?<button onClick={()=>abortRef.current?.abort()} style={{width:'36px',height:'36px',borderRadius:'50%',background:'#ff525222',border:'1px solid #ff5252',cursor:'pointer',fontSize:'16px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>stop</button>
            :<button onClick={()=>send()} disabled={!inp.trim()} style={{width:'36px',height:'36px',borderRadius:'50%',background:inp.trim()?'linear-gradient(135deg,#00e5ff,#8b5cf6)':'#1a3a5a',border:'none',cursor:'pointer',fontSize:'16px',flexShrink:0,color:inp.trim()?'#000':'#888',display:'flex',alignItems:'center',justifyContent:'center'}}>send</button>
          }
        </div>
      </div>
    </div>
  )
}
