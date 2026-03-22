'use client'
import { useState, useEffect, useRef } from 'react'

function clean(t: string): string {
  let bold = '[' + '*' + '][' + '*' + ']([^' + '*' + ']+)[' + '*' + '][' + '*' + ']'
  let ital = '[' + '*' + ']([^' + '*' + ']+)[' + '*' + ']'
  return t.replace(new RegExp(bold,'g'),'$1').replace(new RegExp(ital,'g'),'$1').trim()
}

const MOODS=[
  {e:'🌸',l:'Khush',c:'#f9a8d4',bg:'#fdf2f8'},
  {e:'🌙',l:'Mellow',c:'#c4b5fd',bg:'#f5f3ff'},
  {e:'☕',l:'Cozy',c:'#fbbf24',bg:'#fffbeb'},
  {e:'💪',l:'Fierce',c:'#f87171',bg:'#fff1f2'},
  {e:'🌧',l:'Udaas',c:'#93c5fd',bg:'#eff6ff'},
  {e:'✨',l:'Glowing',c:'#6ee7b7',bg:'#f0fdf4'},
]

const Q=[
  ['Skincare ☁️','Aaj ka simple skincare routine batao'],
  ['Affirmation 💗','Ek powerful affirmation do'],
  ['Outfit 👗','College ke liye outfit idea do'],
  ['Motivate 🔥','Mujhe motivate karo'],
  ['Glow ✨','Natural glow tips do'],
  ['Vent 🌧','Bas sun mujhe, share karna hai'],
]

const AFFS=[
  'Tu perfect hai jaise bhi hai 💗',
  'Aaj ka din tera hai ✨',
  'Khud pe yakeen rakh 🌸',
  'Teri smile magical hai 🌙',
]

export default function LunaPage(){
  const [msgs,setMsgs]=useState([{r:'a',c:'Heyy bestie! 🌸 Main LUNA hoon — teri pakki dost. Kuch bhi share kar. Aaj kaisi feel ho rahi hai? ✨'}])
  const [inp,setInp]=useState('')
  const [load,setLoad]=useState(false)
  const [mood,setMood]=useState(null as any)
  const [affIdx,setAffIdx]=useState(0)
  const ref=useRef(null as any)

  useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight},[msgs])
  useEffect(()=>{
    const id=setInterval(()=>setAffIdx(i=>(i+1)%AFFS.length),4000)
    return()=>clearInterval(id)
  },[])

  async function send(t?: string){
    const msg=(t||inp).trim();if(!msg||load)return
    setInp('');const nm=[...msgs,{r:'u',c:msg}];setMsgs(nm);setLoad(true)
    try{
      const res=await fetch('/api/jarvis',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:msg,lunaMode:true,conversationHistory:nm.slice(-6)})})
      const d=await res.json()
      setMsgs([...nm,{r:'a',c:clean(d.response||d.message||'Phir try karo ✨')}])
    }catch{setMsgs([...nm,{r:'a',c:'Thodi der baad try karo bestie ✨'}])}
    setLoad(false)
  }

  const bg=mood?.bg||'#fdf2f8'

  return(<>
    <style>{`
      *{box-sizing:border-box}::-webkit-scrollbar{width:0;height:0}
      @keyframes lb{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
      @keyframes lp{0%,100%{opacity:1}50%{opacity:0.3}}
      @keyframes lf{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      .luna-inp::placeholder{color:#d8b4fe;font-style:italic}
      .luna-inp:focus{outline:none}
    `}</style>

    <div style={{position:'fixed',inset:0,background:'linear-gradient(160deg,'+bg+',#fce7f3,#ede9fe)',fontFamily:'Georgia,serif',display:'flex',flexDirection:'column',overflow:'hidden',transition:'background 0.6s'}}>

      {/* Floating deco */}
      {['🌸','💗','✨','🌙'].map((e,i)=>(
        <div key={i} style={{position:'fixed',left:(8+i*25)+'%',top:(5+i*18)+'%',fontSize:'14px',opacity:.07,animation:'lf '+(5+i)+'s '+(i*0.8)+'s infinite ease-in-out',pointerEvents:'none',zIndex:0}}>{e}</div>
      ))}

      {/* Header */}
      <div style={{flexShrink:0,padding:'12px 14px',background:'rgba(255,255,255,0.65)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(249,168,212,0.25)',zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <a href="/" style={{background:'rgba(15,23,42,0.08)',border:'1.5px solid rgba(15,23,42,0.1)',color:'#374151',padding:'5px 10px',borderRadius:'12px',fontSize:'11px',textDecoration:'none',fontFamily:'monospace',flexShrink:0}}>⚡ JARVIS</a>
          <div style={{textAlign:'center',flex:1}}>
            <div style={{fontSize:'19px',fontWeight:800,background:'linear-gradient(135deg,#ec4899,#8b5cf6)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>✦ LUNA ✦</div>
            <div style={{fontSize:'9px',color:'#9d74c0',letterSpacing:'2px',textTransform:'uppercase'}}>Your Bestie 🌸</div>
          </div>
          <div style={{fontSize:'10px',color:'#8b5cf6',maxWidth:'72px',lineHeight:'1.3',fontStyle:'italic',animation:'lp 4s infinite',flexShrink:0,textAlign:'right'}}>{AFFS[affIdx]}</div>
        </div>
      </div>

      {/* Mood */}
      <div style={{flexShrink:0,display:'flex',gap:'5px',padding:'7px 12px',overflowX:'auto',background:'rgba(255,255,255,0.35)',zIndex:10}}>
        {MOODS.map(m=>(
          <button key={m.l} onClick={()=>setMood(mood?.l===m.l?null:m)} style={{display:'flex',alignItems:'center',gap:'3px',padding:'4px 10px',borderRadius:'20px',border:mood?.l===m.l?'2px solid '+m.c:'1.5px solid rgba(0,0,0,0.06)',background:mood?.l===m.l?m.c+'30':'rgba(255,255,255,0.78)',cursor:'pointer',whiteSpace:'nowrap',fontSize:'11px',color:mood?.l===m.l?'#6b21a8':'#9ca3af',fontWeight:mood?.l===m.l?700:400,flexShrink:0,transition:'all 0.2s'}}>{m.e} {m.l}</button>
        ))}
      </div>

      {/* Messages */}
      <div ref={ref} style={{flex:1,overflowY:'scroll',WebkitOverflowScrolling:'touch',padding:'12px',display:'flex',flexDirection:'column',gap:'10px',minHeight:0,zIndex:2}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:'flex',gap:'7px',alignItems:'flex-end',flexDirection:m.r==='u'?'row-reverse':'row'}}>
            {m.r==='a'&&<div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',flexShrink:0,boxShadow:'0 2px 6px rgba(249,168,212,0.4)'}}>🌸</div>}
            <div style={{maxWidth:'80%',padding:'10px 14px',borderRadius:m.r==='u'?'18px 18px 4px 18px':'18px 18px 18px 4px',background:m.r==='u'?'linear-gradient(135deg,#ec4899,#8b5cf6)':'rgba(255,255,255,0.92)',color:m.r==='u'?'#fff':'#4b2563',fontSize:'13.5px',lineHeight:'1.65',boxShadow:m.r==='u'?'0 4px 14px rgba(236,72,153,0.22)':'0 2px 8px rgba(139,92,246,0.07)',border:m.r==='u'?'none':'1px solid rgba(249,168,212,0.2)'}}>{m.c}</div>
          </div>
        ))}
        {load&&(
          <div style={{display:'flex',gap:'7px',alignItems:'flex-end'}}>
            <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px'}}>🌸</div>
            <div style={{padding:'10px 14px',background:'rgba(255,255,255,0.92)',borderRadius:'18px 18px 18px 4px',border:'1px solid rgba(249,168,212,0.2)',display:'flex',gap:'4px',alignItems:'center'}}>
              {[0,1,2].map(i=><div key={i} style={{width:'6px',height:'6px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',animation:'lb 1.2s '+(i*0.2)+'s infinite'}}/>)}
              <span style={{fontSize:'10px',color:'#c4b5fd',marginLeft:'3px',fontStyle:'italic'}}>typing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick */}
      <div style={{flexShrink:0,padding:'5px 12px',background:'rgba(255,255,255,0.4)',zIndex:10}}>
        <div style={{display:'flex',gap:'5px',overflowX:'auto'}}>
          {Q.map(([t,p])=><button key={t} onClick={()=>send(p)} style={{padding:'5px 11px',borderRadius:'16px',border:'1.5px solid rgba(196,181,253,0.35)',background:'rgba(255,255,255,0.72)',color:'#7c3aed',fontSize:'11px',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{t}</button>)}
        </div>
      </div>

      {/* Input */}
      <div style={{flexShrink:0,padding:'8px 12px 22px',background:'rgba(255,255,255,0.62)',backdropFilter:'blur(16px)',borderTop:'1px solid rgba(249,168,212,0.12)',zIndex:10}}>
        <div style={{display:'flex',gap:'7px',alignItems:'center',background:'rgba(255,255,255,0.88)',borderRadius:'22px',padding:'6px 6px 6px 15px',border:'1.5px solid rgba(196,181,253,0.35)',boxShadow:'0 2px 10px rgba(236,72,153,0.07)'}}>
          <input className="luna-inp" value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Kuch bhi poocho bestie... 💗" style={{flex:1,border:'none',background:'transparent',fontSize:'14px',color:'#4b2563',fontFamily:'inherit'}}/>
          <button onClick={()=>send()} disabled={load} style={{width:'34px',height:'34px',borderRadius:'50%',background:'linear-gradient(135deg,#ec4899,#8b5cf6)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',boxShadow:'0 3px 10px rgba(236,72,153,0.3)',flexShrink:0}}>💌</button>
        </div>
      </div>
    </div>
  </>)
}
