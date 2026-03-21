'use client'
import { useState, useEffect, useRef } from 'react'

const SYSTEM = `Tu LUNA hai — ek warm, stylish AI bestie for girls.
Personality: Hinglish mein baat kar. Caring, funny, honest.
Topics: skincare, fashion, self-love, mental health, relationships, fun.
Always respond in Hinglish. Warm bestie tone. 2-4 lines max unless detailed needed.`

const MOODS = [
  { e: '🌸', l: 'Khush', c: '#f9a8d4' },
  { e: '🌙', l: 'Mellow', c: '#c4b5fd' },
  { e: '☕', l: 'Cozy', c: '#fbbf24' },
  { e: '💪', l: 'Fierce', c: '#f87171' },
  { e: '🌧', l: 'Udaas', c: '#93c5fd' },
  { e: '✨', l: 'Glowing', c: '#6ee7b7' },
]

const QUICK = [
  'Aaj ka skincare routine ☁️',
  'Self-love affirmation do 💗',
  'Outfit idea for college 👗',
  'Motivate karo 🔥',
  'Chai peete baatein ☕',
  'Sapna interpret karo 🌙',
]

export default function LunaPage() {
  const [msgs, setMsgs] = useState([{
    role: 'assistant',
    content: 'Heyy bestie! 🌸 Main LUNA hoon — teri AI bestie. Skincare, outfit, ya dil ki baat — sab yahan. Aaj kaisi feel ho rahi hai? ✨'
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mood, setMood] = useState<any>(null)
  const endRef = useRef<any>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function send(txt?: string) {
    const msg = txt || input.trim()
    if (!msg) return
    setInput('')
    const newMsgs = [...msgs, { role: 'user', content: msg }]
    setMsgs(newMsgs)
    setLoading(true)
    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          systemOverride: SYSTEM + (mood ? ` User mood: ${mood.l} ${mood.e}` : ''),
          lunaMode: true
        })
      })
      const d = await res.json()
      setMsgs([...newMsgs, { role: 'assistant', content: d.response || d.message || 'Kuch nahi aaya bestie 💗' }])
    } catch {
      setMsgs([...newMsgs, { role: 'assistant', content: 'Connection issue 😅 Thoda wait kar ✨' }])
    }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @keyframes fl{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-20px) rotate(10deg)}}
        @keyframes bn{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-8px)}}
        ::-webkit-scrollbar{display:none}
        .luna-input::placeholder{color:#d8b4fe;font-style:italic}
      `}</style>
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#fdf2f8,#fce7f3,#ede9fe,#ddd6fe)',fontFamily:'Georgia,serif',display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
        
        {/* Particles */}
        {['🌸','✨','💗','🌙','⭐','🫧'].map((e,i)=>(
          <div key={i} style={{position:'fixed',left:`${15+i*15}%`,top:`${10+i*12}%`,fontSize:'20px',opacity:.12,animation:`fl ${6+i}s ${i*0.8}s infinite ease-in-out`,pointerEvents:'none',zIndex:0}}>{e}</div>
        ))}

        {/* Header */}
        <div style={{padding:'20px 16px 12px',textAlign:'center',background:'rgba(255,255,255,0.6)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(249,168,212,0.3)',position:'relative',zIndex:2}}>
          <div style={{fontSize:'26px',fontWeight:'700',background:'linear-gradient(135deg,#ec4899,#8b5cf6,#06b6d4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>✦ LUNA ✦</div>
          <div style={{fontSize:'10px',color:'#9d74c0',letterSpacing:'2px',textTransform:'uppercase',marginTop:'2px'}}>Your AI Bestie 🌸</div>
          {/* Back to JARVIS */}
          <a href="/" style={{position:'absolute',top:'14px',left:'14px',background:'rgba(139,92,246,0.15)',border:'1px solid #c4b5fd',color:'#7c3aed',padding:'5px 10px',borderRadius:'12px',fontSize:'10px',textDecoration:'none'}}>← JARVIS</a>
        </div>

        {/* Mood */}
        <div style={{display:'flex',gap:'8px',padding:'10px 16px',overflowX:'auto',scrollbarWidth:'none',zIndex:2}}>
          {MOODS.map(m=>(
            <div key={m.l} onClick={()=>setMood(mood?.l===m.l?null:m)}
              style={{display:'flex',alignItems:'center',gap:'4px',padding:'5px 12px',borderRadius:'20px',border:mood?.l===m.l?`2px solid ${m.c}`:'2px solid rgba(0,0,0,0.06)',background:mood?.l===m.l?`${m.c}30`:'rgba(255,255,255,0.7)',cursor:'pointer',whiteSpace:'nowrap',fontSize:'11px',color:mood?.l===m.l?'#6b21a8':'#9ca3af',fontWeight:mood?.l===m.l?'600':'400'}}>
              <span>{m.e}</span><span>{m.l}</span>
            </div>
          ))}
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'12px',zIndex:2}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:'flex',gap:'8px',alignItems:'flex-end',flexDirection:m.role==='user'?'row-reverse':'row'}}>
              {m.role==='assistant'&&<div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',flexShrink:0}}>🌸</div>}
              <div style={{maxWidth:'82%',padding:'12px 16px',borderRadius:m.role==='user'?'20px 20px 4px 20px':'20px 20px 20px 4px',background:m.role==='user'?'linear-gradient(135deg,#ec4899,#8b5cf6)':'rgba(255,255,255,0.85)',color:m.role==='user'?'#fff':'#4b2563',fontSize:'14px',lineHeight:'1.6',boxShadow:m.role==='user'?'0 4px 15px rgba(236,72,153,0.3)':'0 2px 12px rgba(139,92,246,0.1)',border:m.role==='user'?'none':'1px solid rgba(249,168,212,0.3)'}}>
                {m.content}
              </div>
            </div>
          ))}
          {loading&&(
            <div style={{display:'flex',gap:'8px',alignItems:'flex-end'}}>
              <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center'}}>🌸</div>
              <div style={{padding:'14px 18px',background:'rgba(255,255,255,0.85)',borderRadius:'20px 20px 20px 4px',display:'flex',gap:'4px'}}>
                {[0,1,2].map(i=><div key={i} style={{width:'6px',height:'6px',borderRadius:'50%',background:'#c4b5fd',animation:`bn 1.2s ${i*0.2}s infinite`}}/>)}
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>

        {/* Quick prompts */}
        <div style={{padding:'8px 16px',zIndex:2}}>
          <div style={{fontSize:'10px',color:'#c4b5fd',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:'6px'}}>✦ Quick Talk</div>
          <div style={{display:'flex',gap:'8px',overflowX:'auto',scrollbarWidth:'none'}}>
            {QUICK.map(q=>(
              <button key={q} onClick={()=>send(q)} style={{padding:'7px 14px',borderRadius:'20px',border:'1.5px solid rgba(196,181,253,0.5)',background:'rgba(255,255,255,0.6)',color:'#7c3aed',fontSize:'11px',cursor:'pointer',whiteSpace:'nowrap',outline:'none'}}>
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div style={{padding:'12px 16px 24px',background:'rgba(255,255,255,0.5)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(249,168,212,0.2)',zIndex:2}}>
          <div style={{display:'flex',gap:'10px',alignItems:'center',background:'rgba(255,255,255,0.8)',borderRadius:'25px',padding:'8px 8px 8px 18px',border:'1.5px solid rgba(196,181,253,0.4)'}}>
            <input className="luna-input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
              placeholder="Kuch bhi poocho bestie... 💗"
              style={{flex:1,border:'none',background:'transparent',outline:'none',fontSize:'14px',color:'#4b2563',fontFamily:'inherit'}}/>
            <button onClick={()=>send()} style={{width:'38px',height:'38px',borderRadius:'50%',background:'linear-gradient(135deg,#ec4899,#8b5cf6)',border:'none',cursor:'pointer',fontSize:'16px',flexShrink:0}}>
              💌
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
