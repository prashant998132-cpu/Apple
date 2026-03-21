'use client'
import { useState, useEffect, useRef } from 'react'

const LUNA_SYSTEM = `Tu LUNA hai — ek warm, stylish AI bestie for girls.
Personality: Hinglish mein baat kar. Caring, funny, honest — jaise real best friend.
Topics: skincare, fashion, self-love, mental health, relationships, fun.
Hinglish only. Warm bestie tone. Emoji natural. 2-4 lines max.`

const MOODS = [
  { e:'🌸', l:'Khush',   c:'#f9a8d4', bg:'linear-gradient(160deg,#fdf2f8,#fce7f3,#ede9fe)' },
  { e:'🌙', l:'Mellow',  c:'#c4b5fd', bg:'linear-gradient(160deg,#f5f3ff,#ede9fe,#fce7f3)' },
  { e:'☕', l:'Cozy',    c:'#fbbf24', bg:'linear-gradient(160deg,#fffbeb,#fef3c7,#fce7f3)' },
  { e:'💪', l:'Fierce',  c:'#f87171', bg:'linear-gradient(160deg,#fff1f2,#fce7f3,#ede9fe)' },
  { e:'🌧', l:'Udaas',   c:'#93c5fd', bg:'linear-gradient(160deg,#eff6ff,#dbeafe,#ede9fe)' },
  { e:'✨', l:'Glowing', c:'#6ee7b7', bg:'linear-gradient(160deg,#f0fdf4,#dcfce7,#fce7f3)' },
]

const QUICK = [
  { t:'Skincare ☁️',    p:'Aaj ka simple skincare routine batao' },
  { t:'Affirmation 💗', p:'Ek powerful self-love affirmation do' },
  { t:'Outfit 👗',       p:'College ke liye cute outfit idea do' },
  { t:'Motivate 🔥',    p:'Mujhe motivate karo please' },
  { t:'Glow tips ✨',    p:'Natural glow ke liye 5 easy tips do' },
  { t:'Vent 🌧',         p:'Mujhe bas sun, kuch share karna hai' },
]

const AFFS = [
  'Tu jitni hai utni hi perfect hai 💗',
  'Teri energy room ki vibe badal deti hai ✨',
  'Aaj ka din tera hai — own it! 🌸',
  'Tu strong hai, even when it doesnt feel so 🌙',
  'Work in progress hona okay hai 🌱',
]

export default function LunaPage() {
  const [msgs, setMsgs] = useState([{
    role:'assistant',
    content:'Heyy bestie! 🌸 Main LUNA hoon — teri AI bestie. Kuch bhi share kar, koi judgment nahi. Aaj kaisi feel ho rahi hai? ✨'
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mood, setMood] = useState<any>(null)
  const [listening, setListening] = useState(false)
  const [affIdx, setAffIdx] = useState(0)
  const endRef = useRef<any>(null)

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) },[msgs])
  useEffect(()=>{
    const id = setInterval(()=>setAffIdx(i=>(i+1)%AFFS.length), 3500)
    return ()=>clearInterval(id)
  },[])

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'hi-IN'
    rec.onstart = ()=>setListening(true)
    rec.onend = ()=>setListening(false)
    rec.onresult = (e:any)=>{
      const txt = e.results[0][0].transcript
      setInput(txt)
      setTimeout(()=>send(txt), 200)
    }
    rec.start()
  }

  async function send(txt?: string) {
    const msg = (txt||input).trim()
    if (!msg||loading) return
    setInput('')
    const newMsgs = [...msgs,{role:'user',content:msg}]
    setMsgs(newMsgs)
    setLoading(true)
    try {
      const res = await fetch('/api/jarvis',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          message: msg,
          systemOverride: LUNA_SYSTEM+(mood?` Mood: ${mood.l} ${mood.e}`:''),
          lunaMode: true
        })
      })
      const d = await res.json()
      const reply = d.response||d.message||d.reply||'Kuch nahi aaya bestie 💗'
      setMsgs([...newMsgs,{role:'assistant',content:reply}])
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(reply.replace(/[^\x00-\x7F]/g,''))
        u.lang='hi-IN'; u.rate=0.9; u.pitch=1.1
        window.speechSynthesis.speak(u)
      }
    } catch {
      setMsgs([...newMsgs,{role:'assistant',content:'Connection issue 😅 Phir try karo ✨'}])
    }
    setLoading(false)
  }

  const bgGrad = mood?.bg || 'linear-gradient(160deg,#fdf2f8,#fce7f3,#ede9fe)'

  const btnBase: React.CSSProperties = {
    border:'none', cursor:'pointer', display:'flex',
    alignItems:'center', justifyContent:'center',
    flexShrink:0, transition:'all 0.2s'
  }

  return (
    <>
      <style>{`
        @keyframes lunaFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes lunaBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}
        @keyframes lunaFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes lunaPulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .luna-msg{animation:lunaFadeIn 0.25s ease}
        .luna-qbtn:active{transform:scale(0.97)}
        .luna-qbtn{cursor:pointer;border:1.5px solid rgba(196,181,253,0.38);background:rgba(255,255,255,0.68);color:#7c3aed;font-size:11px;padding:5px 11px;border-radius:16px;white-space:nowrap;transition:all 0.15s;outline:none}
        ::-webkit-scrollbar{display:none}
        .luna-input::placeholder{color:#d8b4fe;font-style:italic;font-size:13px}
      `}</style>

      <div style={{minHeight:'100vh',background:bgGrad,fontFamily:'"Georgia",serif',display:'flex',flexDirection:'column',transition:'background 0.6s ease',position:'relative',overflow:'hidden'}}>

        {/* Floating deco */}
        <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
          {['🌸','💗','✨','🌙','⭐'].map((e,i)=>(
            <div key={i} style={{position:'absolute',left:`${8+i*20}%`,top:`${5+i*16}%`,fontSize:'16px',opacity:.08,animation:`lunaFloat ${5+i}s ${i*0.7}s infinite ease-in-out`}}>{e}</div>
          ))}
        </div>

        {/* Header */}
        <div style={{padding:'14px 14px 10px',background:'rgba(255,255,255,0.62)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(249,168,212,0.2)',position:'sticky',top:0,zIndex:50}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'}}>
            <a href="/" style={{background:'rgba(15,23,42,0.08)',border:'1.5px solid rgba(15,23,42,0.12)',color:'#374151',padding:'5px 10px',borderRadius:'12px',fontSize:'11px',textDecoration:'none',whiteSpace:'nowrap',fontFamily:'monospace'}}>⚡ JARVIS</a>
            <div style={{textAlign:'center',flex:1}}>
              <div style={{fontSize:'20px',fontWeight:'800',background:'linear-gradient(135deg,#ec4899,#8b5cf6)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>✦ LUNA ✦</div>
              <div style={{fontSize:'9px',color:'#9d74c0',letterSpacing:'2px',textTransform:'uppercase'}}>Your AI Bestie 🌸</div>
            </div>
            <div style={{fontSize:'10px',textAlign:'center',color:'#8b5cf6',maxWidth:'80px',lineHeight:'1.3',fontStyle:'italic',animation:'lunaPulse 3.5s infinite',flexShrink:0}}>
              {AFFS[affIdx]}
            </div>
          </div>
        </div>

        {/* Mood row */}
        <div style={{display:'flex',gap:'5px',padding:'8px 12px',overflowX:'auto',scrollbarWidth:'none',zIndex:2,flexShrink:0}}>
          {MOODS.map(m=>(
            <button key={m.l} onClick={()=>setMood(mood?.l===m.l?null:m)} style={{
              ...btnBase,
              gap:'3px',padding:'4px 10px',borderRadius:'20px',
              border:mood?.l===m.l?`2px solid ${m.c}`:'1.5px solid rgba(0,0,0,0.07)',
              background:mood?.l===m.l?`${m.c}25`:'rgba(255,255,255,0.75)',
              color:mood?.l===m.l?'#6b21a8':'#9ca3af',
              fontWeight:mood?.l===m.l?700:400,
              whiteSpace:'nowrap',fontSize:'11px'
            }}>
              {m.e} {m.l}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:'auto',padding:'12px',display:'flex',flexDirection:'column',gap:'10px',zIndex:2}}>
          {msgs.map((m,i)=>(
            <div key={i} className="luna-msg" style={{display:'flex',gap:'7px',alignItems:'flex-end',flexDirection:m.role==='user'?'row-reverse':'row'}}>
              {m.role==='assistant'&&(
                <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',flexShrink:0,boxShadow:'0 2px 8px rgba(249,168,212,0.35)'}}>🌸</div>
              )}
              <div style={{
                maxWidth:'80%',padding:'10px 14px',
                borderRadius:m.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px',
                background:m.role==='user'?'linear-gradient(135deg,#ec4899,#8b5cf6)':'rgba(255,255,255,0.87)',
                color:m.role==='user'?'#fff':'#4b2563',
                fontSize:'13.5px',lineHeight:'1.65',
                boxShadow:m.role==='user'?'0 4px 14px rgba(236,72,153,0.22)':'0 2px 10px rgba(139,92,246,0.07)',
                border:m.role==='user'?'none':'1px solid rgba(249,168,212,0.22)',
                backdropFilter:'blur(8px)'
              }}>{m.content}</div>
            </div>
          ))}
          {loading&&(
            <div style={{display:'flex',gap:'7px',alignItems:'flex-end'}}>
              <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px'}}>🌸</div>
              <div style={{padding:'11px 14px',background:'rgba(255,255,255,0.87)',borderRadius:'18px 18px 18px 4px',border:'1px solid rgba(249,168,212,0.22)',display:'flex',gap:'4px',alignItems:'center'}}>
                {[0,1,2].map(i=><div key={i} style={{width:'6px',height:'6px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',animation:`lunaBounce 1.2s ${i*0.2}s infinite`}}/>)}
                <span style={{fontSize:'10px',color:'#c4b5fd',marginLeft:'3px'}}>typing...</span>
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>

        {/* Quick */}
        <div style={{padding:'5px 12px',zIndex:2,flexShrink:0}}>
          <div style={{display:'flex',gap:'5px',overflowX:'auto',scrollbarWidth:'none'}}>
            {QUICK.map(q=>(
              <button key={q.t} className="luna-qbtn" onClick={()=>send(q.p)}>{q.t}</button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div style={{padding:'8px 12px 28px',background:'rgba(255,255,255,0.52)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(249,168,212,0.12)',zIndex:2,flexShrink:0}}>
          <div style={{display:'flex',gap:'7px',alignItems:'center',background:'rgba(255,255,255,0.82)',borderRadius:'22px',padding:'6px 6px 6px 15px',border:'1.5px solid rgba(196,181,253,0.3)'}}>
            <input className="luna-input" value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&send()}
              placeholder="Kuch bhi poocho bestie... 💗"
              style={{flex:1,border:'none',background:'transparent',outline:'none',fontSize:'14px',color:'#4b2563',fontFamily:'inherit'}}/>
            <button onClick={startVoice} style={{
              ...btnBase,
              width:'34px',height:'34px',borderRadius:'50%',
              background:listening?'linear-gradient(135deg,#ec4899,#f87171)':'rgba(249,168,212,0.25)',
              fontSize:'14px',
              animation:listening?'lunaPulse 0.8s infinite':undefined
            }}>🎤</button>
            <button onClick={()=>send()} disabled={loading} style={{
              ...btnBase,
              width:'36px',height:'36px',borderRadius:'50%',
              background:'linear-gradient(135deg,#ec4899,#8b5cf6)',
              fontSize:'14px',
              boxShadow:'0 3px 12px rgba(236,72,153,0.3)'
            }}>💌</button>
          </div>
        </div>
      </div>
    </>
  )
}
