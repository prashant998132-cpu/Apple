'use client'
import { useState, useEffect, useRef } from 'react'

const SYS=`Tu LUNA hai — ek caring, fun, warm girl bestie.
RULES (HAMESHA FOLLOW KAR):
- Sirf Hinglish mein baat kar
- Warm, caring tone — jaise sab se pyaari dost
- "Master Stark", "JARVIS", "Boss", "sir" KABHI MAT BOL
- Tu ek girl bestie hai, AI assistant nahi
- Chhoti responses — 2-3 lines max
- Emoji naturally use kar
- Seedhi baat kar, bakwaas nahi
- User ko "yaar", "bestie", "dost" bol`

const MOODS=[{e:'🌸',l:'Khush',c:'#f9a8d4'},{e:'🌙',l:'Mellow',c:'#c4b5fd'},{e:'☕',l:'Cozy',c:'#fbbf24'},{e:'💪',l:'Fierce',c:'#f87171'},{e:'🌧',l:'Udaas',c:'#93c5fd'},{e:'✨',l:'Glowing',c:'#6ee7b7'}]
const QUICK=[['Skincare ☁️','Aaj ka simple skincare routine batao'],['Affirmation 💗','Ek powerful self-love affirmation do'],['Outfit 👗','College ke liye cute outfit idea do'],['Motivate 🔥','Mujhe motivate karo please'],['Glow tips ✨','Natural glow ke liye 5 easy tips do'],['Vent 🌧','Mujhe bas sun, kuch share karna hai']]
const AFFS=['Tu jitni hai utni hi perfect hai 💗','Teri energy room ki vibe badal deti hai ✨','Aaj ka din tera hai — own it! 🌸','Tu strong hai, even when it doesnt feel so 🌙','Work in progress hona okay hai 🌱']

export default function LunaPage(){
  const [msgs,setMsgs]=useState([{role:'assistant',content:'Heyy bestie! 🌸 Main LUNA hoon — teri pakki dost. Kuch bhi share kar, koi judgment nahi. Aaj kaisi feel ho rahi hai? ✨'}])
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(false)
  const [mood,setMood]=useState(null as any)
  const [affIdx,setAffIdx]=useState(0)
  const endRef=useRef(null as any)
  const msgsRef=useRef(null as any)

  useEffect(()=>{
    if(msgsRef.current){
      msgsRef.current.scrollTop=msgsRef.current.scrollHeight
    }
  },[msgs])
  
  useEffect(()=>{
    const id=setInterval(()=>setAffIdx(i=>(i+1)%AFFS.length),3500)
    return()=>clearInterval(id)
  },[])

  async function send(txt?: string){
    const msg=(txt||input).trim()
    if(!msg||loading)return
    setInput('')
    const nm=[...msgs,{role:'user',content:msg}]
    setMsgs(nm)
    setLoading(true)
    try{
      const sys=SYS+(mood?' Mood: '+mood.l+' '+mood.e:'')
      const r=await fetch('/api/jarvis',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:msg,systemOverride:sys,lunaMode:true})
      })
      const d=await r.json()
      const rep=(d.response||d.message||d.reply||'Kuch nahi aaya bestie 💗')
        .replace(/**([^*]+)**/g,'$1')
        .replace(/*([^*]+)*/g,'$1')
        .replace(/^[s]*[-*•]s+/gm,'')
      setMsgs([...nm,{role:'assistant',content:rep}])
    }catch{
      setMsgs([...nm,{role:'assistant',content:'Connection issue 😅 Phir try karo ✨'}])
    }
    setLoading(false)
  }

  return(
    <>
      <style>{`
        @keyframes lf{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes lb{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
        @keyframes lp{0%,100%{opacity:1}50%{opacity:0.5}}
        ::-webkit-scrollbar{width:0;height:0}
        * { box-sizing: border-box; }
      `}</style>

      {/* Full viewport container */}
      <div style={{
        position:'fixed',top:0,left:0,right:0,bottom:0,
        background:'linear-gradient(160deg,#fdf2f8,#fce7f3,#ede9fe)',
        fontFamily:'Georgia,serif',
        display:'flex',flexDirection:'column',
        overflow:'hidden'
      }}>
        {/* BG decorations */}
        {['🌸','💗','✨','🌙','⭐'].map((e,i)=>(
          <div key={i} style={{position:'absolute',left:(8+i*20)+'%',top:(5+i*16)+'%',fontSize:'16px',opacity:.06,animation:'lf '+(5+i)+'s '+(i*0.7)+'s infinite ease-in-out',pointerEvents:'none',zIndex:0}}>{e}</div>
        ))}

        {/* HEADER - fixed height */}
        <div style={{flexShrink:0,padding:'12px 14px',background:'rgba(255,255,255,0.65)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(249,168,212,0.2)',zIndex:10}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <a href="/" style={{background:'rgba(15,23,42,0.08)',border:'1.5px solid rgba(15,23,42,0.12)',color:'#374151',padding:'5px 10px',borderRadius:'12px',fontSize:'11px',textDecoration:'none',fontFamily:'monospace',whiteSpace:'nowrap',flexShrink:0}}>⚡ JARVIS</a>
            <div style={{textAlign:'center',flex:1}}>
              <div style={{fontSize:'20px',fontWeight:800,background:'linear-gradient(135deg,#ec4899,#8b5cf6)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>✦ LUNA ✦</div>
              <div style={{fontSize:'9px',color:'#9d74c0',letterSpacing:'2px',textTransform:'uppercase'}}>Your Bestie 🌸</div>
            </div>
            <div style={{fontSize:'10px',color:'#8b5cf6',maxWidth:'75px',lineHeight:'1.3',fontStyle:'italic',animation:'lp 3.5s infinite',flexShrink:0,textAlign:'right'}}>{AFFS[affIdx]}</div>
          </div>
        </div>

        {/* MOOD ROW - fixed height */}
        <div style={{flexShrink:0,display:'flex',gap:'5px',padding:'7px 12px',overflowX:'auto',background:'rgba(255,255,255,0.3)',zIndex:10}}>
          {MOODS.map(m=>(
            <button key={m.l} onClick={()=>setMood(mood?.l===m.l?null:m)} style={{display:'flex',alignItems:'center',gap:'3px',padding:'4px 10px',borderRadius:'20px',border:mood?.l===m.l?'2px solid '+m.c:'1.5px solid rgba(0,0,0,0.07)',background:mood?.l===m.l?m.c+'25':'rgba(255,255,255,0.75)',cursor:'pointer',whiteSpace:'nowrap',fontSize:'11px',color:mood?.l===m.l?'#6b21a8':'#9ca3af',fontWeight:mood?.l===m.l?700:400,flexShrink:0}}>
              {m.e} {m.l}
            </button>
          ))}
        </div>

        {/* MESSAGES - flex:1, overflow scroll */}
        <div
          ref={msgsRef}
          style={{
            flex:1,
            overflowY:'scroll',
            WebkitOverflowScrolling:'touch',
            padding:'12px',
            display:'flex',
            flexDirection:'column',
            gap:'10px',
            zIndex:2,
            minHeight:0  /* important for flex scroll */
          }}
        >
          {msgs.map((m,i)=>(
            <div key={i} style={{display:'flex',gap:'7px',alignItems:'flex-end',flexDirection:m.role==='user'?'row-reverse':'row'}}>
              {m.role==='assistant'&&(
                <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',flexShrink:0}}>🌸</div>
              )}
              <div style={{maxWidth:'80%',padding:'10px 14px',borderRadius:m.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px',background:m.role==='user'?'linear-gradient(135deg,#ec4899,#8b5cf6)':'rgba(255,255,255,0.9)',color:m.role==='user'?'#fff':'#4b2563',fontSize:'13.5px',lineHeight:'1.65',boxShadow:m.role==='user'?'0 4px 14px rgba(236,72,153,0.22)':'0 2px 10px rgba(139,92,246,0.07)',border:m.role==='user'?'none':'1px solid rgba(249,168,212,0.22)'}}>
                {m.content}
              </div>
            </div>
          ))}
          {loading&&(
            <div style={{display:'flex',gap:'7px',alignItems:'flex-end'}}>
              <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px'}}>🌸</div>
              <div style={{padding:'10px 14px',background:'rgba(255,255,255,0.9)',borderRadius:'18px 18px 18px 4px',border:'1px solid rgba(249,168,212,0.22)',display:'flex',gap:'4px',alignItems:'center'}}>
                {[0,1,2].map(i=><div key={i} style={{width:'6px',height:'6px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',animation:'lb 1.2s '+(i*0.2)+'s infinite'}}/>)}
                <span style={{fontSize:'10px',color:'#c4b5fd',marginLeft:'3px'}}>typing...</span>
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>

        {/* QUICK PROMPTS - fixed */}
        <div style={{flexShrink:0,padding:'5px 12px',background:'rgba(255,255,255,0.4)',zIndex:10}}>
          <div style={{display:'flex',gap:'5px',overflowX:'auto'}}>
            {QUICK.map(([t,p])=>(
              <button key={t} onClick={()=>send(p)} style={{padding:'5px 11px',borderRadius:'16px',border:'1.5px solid rgba(196,181,253,0.38)',background:'rgba(255,255,255,0.7)',color:'#7c3aed',fontSize:'11px',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{t}</button>
            ))}
          </div>
        </div>

        {/* INPUT - fixed */}
        <div style={{flexShrink:0,padding:'8px 12px 20px',background:'rgba(255,255,255,0.6)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(249,168,212,0.15)',zIndex:10}}>
          <div style={{display:'flex',gap:'7px',alignItems:'center',background:'rgba(255,255,255,0.85)',borderRadius:'22px',padding:'6px 6px 6px 15px',border:'1.5px solid rgba(196,181,253,0.3)'}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
              placeholder="Kuch bhi poocho bestie... 💗"
              style={{flex:1,border:'none',background:'transparent',outline:'none',fontSize:'14px',color:'#4b2563',fontFamily:'inherit'}}/>
            <button onClick={()=>send()} disabled={loading} style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#ec4899,#8b5cf6)',border:'none',cursor:'pointer',fontSize:'14px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>💌</button>
          </div>
        </div>
      </div>
    </>
  )
}
