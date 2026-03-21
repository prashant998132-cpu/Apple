'use client'
import { useState, useEffect, useRef } from 'react'

const SYSTEM = `Tu LUNA hai — ek warm, stylish AI bestie for girls.
Personality: Hinglish mein baat kar (Hindi + English mix). Caring, funny, honest like a best friend.
Topics tu samajhti hai: skincare, fashion, self-love, mental health, relationships, fun gossip, food, music.
Rules:
- Always respond in Hinglish
- Warm bestie tone — jaise real friend baat kar rahi ho
- Emoji use kar naturally
- 2-4 lines max unless asking for detailed info
- Never be judgy or preachy
- Validate feelings pehle, advice baad mein`

const MOODS = [
  { e: '🌸', l: 'Khush', c: '#f9a8d4', bg: '#fdf2f8' },
  { e: '🌙', l: 'Mellow', c: '#c4b5fd', bg: '#f5f3ff' },
  { e: '☕', l: 'Cozy', c: '#fbbf24', bg: '#fffbeb' },
  { e: '💪', l: 'Fierce', c: '#f87171', bg: '#fef2f2' },
  { e: '🌧', l: 'Udaas', c: '#93c5fd', bg: '#eff6ff' },
  { e: '✨', l: 'Glowing', c: '#6ee7b7', bg: '#f0fdf4' },
]

const QUICK = [
  { text: 'Skincare routine ☁️', prompt: 'Aaj ka simple skincare routine batao' },
  { text: 'Affirmation 💗', prompt: 'Ek powerful self-love affirmation do' },
  { text: 'Outfit idea 👗', prompt: 'College ke liye cute outfit idea do' },
  { text: 'Motivate karo 🔥', prompt: 'Mujhe motivate karo, thoda low feel ho raha hai' },
  { text: 'Chai gossip ☕', prompt: 'Yaar chai peete kuch baat karte hain, kya chal raha hai tere saath?' },
  { text: 'Glow tips ✨', prompt: 'Natural glow ke liye 5 tips do' },
  { text: 'Vent mode 🌧', prompt: 'Mujhe bas sun, kuch share karna hai' },
  { text: 'Sapna 🌙', prompt: 'Ek weird sapna aaya, interpret karo' },
]

const AFFIRMATIONS = [
  'Tu jitni hai utni hi perfect hai 💗',
  'Teri energy is room ki vibe badal deti hai ✨',
  'Aaj ka din tera hai — own it! 🌸',
  'Tu strong hai, even when it doesnt feel like it 🌙',
  'Teri smile literally kisi ka din bana sakti hai ☀️',
  'Work in progress hona okay hai — growth ho rahi hai 🌱',
]

export default function LunaPage() {
  const [msgs, setMsgs] = useState([{
    role: 'assistant',
    content: 'Heyy bestie! 🌸 Main LUNA hoon — teri AI bestie. Kuch bhi share kar, koi judgment nahi. Aaj kaisi feel ho rahi hai? ✨'
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mood, setMood] = useState<any>(null)
  const [listening, setListening] = useState(false)
  const [affIdx, setAffIdx] = useState(0)
  const [showAff, setShowAff] = useState(false)
  const endRef = useRef<any>(null)
  const recRef = useRef<any>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])
  
  useEffect(() => {
    const id = setInterval(() => setAffIdx(i => (i + 1) % AFFIRMATIONS.length), 4000)
    return () => clearInterval(id)
  }, [])

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Voice not supported on this browser'); return }
    const rec = new SR()
    rec.lang = 'hi-IN'
    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onresult = (e: any) => {
      const txt = e.results[0][0].transcript
      setInput(txt)
      setTimeout(() => send(txt), 300)
    }
    rec.start()
    recRef.current = rec
  }

  async function send(txt?: string) {
    const msg = (txt || input).trim()
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
          systemOverride: SYSTEM + (mood ? ` User ka mood: ${mood.l} ${mood.e}` : ''),
          lunaMode: true,
          conversationHistory: newMsgs.slice(-6)
        })
      })
      const d = await res.json()
      const reply = d.response || d.message || d.reply || 'Kuch nahi aaya bestie 💗'
      setMsgs([...newMsgs, { role: 'assistant', content: reply }])
      // TTS
      if ('speechSynthesis' in window) {
        const utt = new SpeechSynthesisUtterance(reply.replace(/[🌸✨💗🌙☕💪🌧]/g, ''))
        utt.lang = 'hi-IN'
        utt.rate = 0.95
        utt.pitch = 1.1
        window.speechSynthesis.speak(utt)
      }
    } catch {
      setMsgs([...newMsgs, { role: 'assistant', content: 'Connection issue 😅 Phir try karo ✨' }])
    }
    setLoading(false)
  }

  const bg = mood ? mood.bg : '#fdf2f8'

  return (
    <>
      <style>{`
        @keyframes float {0%,100%{transform:translateY(0)}50%{transform:translateY(-15px)}}
        @keyframes pulse {0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(0.95)}}
        @keyframes fadeIn {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce {0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-8px)}}
        @keyframes shimmer {0%{background-position:-200% 0}100%{background-position:200% 0}}
        ::-webkit-scrollbar{display:none}
        .luna-input::placeholder{color:#d8b4fe;font-style:italic}
        .msg-bubble{animation:fadeIn 0.3s ease}
        .quick-btn:hover{transform:scale(1.03);border-color:#ec4899 !important}
        .send-btn:active{transform:scale(0.95)}
      `}</style>

      <div style={{minHeight:'100vh',background:`linear-gradient(160deg, ${bg} 0%, #fce7f3 40%, #ede9fe 100%)`,fontFamily:'"Georgia", serif',display:'flex',flexDirection:'column',transition:'background 0.5s ease'}}>

        {/* Floating bg elements */}
        <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
          {['🌸','💗','✨','🌙','⭐'].map((e,i)=>(
            <div key={i} style={{position:'absolute',left:`${10+i*20}%`,top:`${5+i*18}%`,fontSize:'18px',opacity:.1,animation:`float ${5+i*1.5}s ${i*0.7}s infinite ease-in-out`}}>{e}</div>
          ))}
        </div>

        {/* Header */}
        <div style={{padding:'16px 16px 12px',background:'rgba(255,255,255,0.65)',backdropFilter:'blur(24px)',borderBottom:'1px solid rgba(249,168,212,0.25)',position:'sticky',top:0,zIndex:50}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <a href="/" style={{background:'rgba(139,92,246,0.1)',border:'1px solid #c4b5fd',color:'#7c3aed',padding:'5px 10px',borderRadius:'12px',fontSize:'11px',textDecoration:'none',fontFamily:'monospace'}}>← JARVIS</a>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'22px',fontWeight:'800',background:'linear-gradient(135deg,#ec4899,#8b5cf6)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:'-0.5px'}}>✦ LUNA ✦</div>
              <div style={{fontSize:'9px',color:'#9d74c0',letterSpacing:'2.5px',textTransform:'uppercase'}}>Your AI Bestie</div>
            </div>
            <button onClick={()=>setShowAff(!showAff)} style={{background:'rgba(249,168,212,0.2)',border:'1px solid #f9a8d4',color:'#ec4899',padding:'5px 10px',borderRadius:'12px',fontSize:'11px',cursor:'pointer',width:'auto',marginBottom:0}}>
              💗
            </button>
          </div>

          {/* Affirmation banner */}
          {showAff && (
            <div style={{marginTop:'10px',padding:'10px 14px',background:'linear-gradient(135deg,rgba(249,168,212,0.3),rgba(196,181,253,0.3))',borderRadius:'12px',border:'1px solid rgba(249,168,212,0.4)',textAlign:'center',fontSize:'12px',color:'#6b21a8',fontStyle:'italic',animation:'fadeIn 0.3s ease'}}>
              {AFFIRMATIONS[affIdx]}
            </div>
          )}
        </div>

        {/* Mood row */}
        <div style={{display:'flex',gap:'6px',padding:'10px 14px',overflowX:'auto',scrollbarWidth:'none',background:'rgba(255,255,255,0.3)',zIndex:1}}>
          {MOODS.map(m=>(
            <button key={m.l} onClick={()=>setMood(mood?.l===m.l?null:m)}
              style={{display:'flex',alignItems:'center',gap:'4px',padding:'5px 11px',borderRadius:'20px',border:mood?.l===m.l?`2px solid ${m.c}`:'1.5px solid rgba(0,0,0,0.07)',background:mood?.l===m.l?`${m.c}25`:'rgba(255,255,255,0.8)',cursor:'pointer',whiteSpace:'nowrap',fontSize:'11px',color:mood?.l===m.l?'#6b21a8':'#9ca3af',fontWeight:mood?.l===m.l?'700':'400',transition:'all 0.2s',width:'auto',marginBottom:0}}>
              {m.e} {m.l}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:'auto',padding:'14px',display:'flex',flexDirection:'column',gap:'10px',zIndex:1}}>
          {msgs.map((m,i)=>(
            <div key={i} className="msg-bubble" style={{display:'flex',gap:'8px',alignItems:'flex-end',flexDirection:m.role==='user'?'row-reverse':'row'}}>
              {m.role==='assistant'&&(
                <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',flexShrink:0,boxShadow:'0 2px 10px rgba(249,168,212,0.4)'}}>🌸</div>
              )}
              <div style={{maxWidth:'80%',padding:'11px 15px',borderRadius:m.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px',background:m.role==='user'?'linear-gradient(135deg,#ec4899,#8b5cf6)':'rgba(255,255,255,0.88)',color:m.role==='user'?'#fff':'#4b2563',fontSize:'13.5px',lineHeight:'1.65',boxShadow:m.role==='user'?'0 4px 16px rgba(236,72,153,0.25)':'0 2px 12px rgba(139,92,246,0.08)',border:m.role==='user'?'none':'1px solid rgba(249,168,212,0.25)',backdropFilter:'blur(8px)'}}>
                {m.content}
              </div>
            </div>
          ))}

          {loading&&(
            <div style={{display:'flex',gap:'8px',alignItems:'flex-end'}}>
              <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px'}}>🌸</div>
              <div style={{padding:'12px 16px',background:'rgba(255,255,255,0.88)',borderRadius:'18px 18px 18px 4px',border:'1px solid rgba(249,168,212,0.25)',display:'flex',gap:'5px',alignItems:'center'}}>
                {[0,1,2].map(i=><div key={i} style={{width:'7px',height:'7px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',animation:`bounce 1.3s ${i*0.22}s infinite`}}/>)}
                <span style={{fontSize:'11px',color:'#c4b5fd',marginLeft:'4px'}}>typing...</span>
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>

        {/* Quick prompts */}
        <div style={{padding:'6px 14px 4px',zIndex:1}}>
          <div style={{display:'flex',gap:'6px',overflowX:'auto',scrollbarWidth:'none',paddingBottom:'2px'}}>
            {QUICK.map(q=>(
              <button key={q.text} className="quick-btn" onClick={()=>send(q.prompt)}
                style={{padding:'6px 13px',borderRadius:'18px',border:'1.5px solid rgba(196,181,253,0.4)',background:'rgba(255,255,255,0.7)',color:'#7c3aed',fontSize:'11px',cursor:'pointer',whiteSpace:'nowrap',backdropFilter:'blur(8px)',transition:'all 0.2s',width:'auto',marginBottom:0,outline:'none'}}>
                {q.text}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div style={{padding:'8px 14px 24px',background:'rgba(255,255,255,0.55)',backdropFilter:'blur(24px)',borderTop:'1px solid rgba(249,168,212,0.15)',zIndex:1}}>
          <div style={{display:'flex',gap:'8px',alignItems:'center',background:'rgba(255,255,255,0.85)',borderRadius:'24px',padding:'7px 7px 7px 16px',border:'1.5px solid rgba(196,181,253,0.35)',boxShadow:'0 4px 20px rgba(236,72,153,0.08)'}}>
            <input className="luna-input" value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&send()}
              placeholder="Kuch bhi poocho bestie... 💗"
              style={{flex:1,border:'none',background:'transparent',outline:'none',fontSize:'14px',color:'#4b2563',fontFamily:'inherit'}}/>
            {/* Voice btn */}
            <button onClick={startVoice}
              style={{width:'36px',height:'36px',borderRadius:'50%',background:listening?'linear-gradient(135deg,#ec4899,#f87171)':'rgba(249,168,212,0.3)',border:'none',cursor:'pointer',fontSize:'16px',flexShrink:0,transition:'all 0.2s',animation:listening?'pulse 1s infinite':'none',width:'auto',marginBottom:0}}>
              🎤
            </button>
            <button className="send-btn" onClick={()=>send()} disabled={loading}
              style={{width:'38px',height:'38px',borderRadius:'50%',background:'linear-gradient(135deg,#ec4899,#8b5cf6)',border:'none',cursor:'pointer',fontSize:'15px',flexShrink:0,boxShadow:'0 4px 14px rgba(236,72,153,0.35)',transition:'all 0.2s',width:'auto',marginBottom:0}}>
              💌
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
