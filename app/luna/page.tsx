'use client'
import { useState, useEffect, useRef } from 'react'
const SYS='Tu LUNA hai — ek caring, fun, warm girl bestie. Sirf Hinglish mein baat kar. JARVIS, Boss, sir, Master Stark kabhi mat bol. Warm bestie tone. 2-3 lines max. Emoji naturally use kar.'
const MOODS=[{e:'🌸',l:'Khush',c:'#f9a8d4'},{e:'🌙',l:'Mellow',c:'#c4b5fd'},{e:'☕',l:'Cozy',c:'#fbbf24'},{e:'💪',l:'Fierce',c:'#f87171'},{e:'🌧',l:'Udaas',c:'#93c5fd'},{e:'✨',l:'Glowing',c:'#6ee7b7'}]
const Q=[['Skincare ☁️','Skincare routine batao'],['Affirmation 💗','Affirmation do'],['Outfit 👗','Outfit idea do'],['Motivate 🔥','Motivate karo'],['Glow ✨','Glow tips do'],['Vent 🌧','Mujhe sun']]
export default function LunaPage(){
  const [msgs,setMsgs]=useState([{r:'a',c:'Heyy bestie! 🌸 Main LUNA hoon. Kuch bhi share kar, koi judgment nahi. Aaj kaisi feel ho rahi hai? ✨'}])
  const [inp,setInp]=useState('')
  const [load,setLoad]=useState(false)
  const [mood,setMood]=useState(null as any)
  const ref=useRef(null as any)
  useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight},[msgs])
  async function send(t?: string){
    const msg=(t||inp).trim();if(!msg||load)return
    setInp('');const nm=[...msgs,{r:'u',c:msg}];setMsgs(nm);setLoad(true)
    try{
      const res=await fetch('/api/jarvis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,systemOverride:SYS+(mood?' Mood:'+mood.l:''),lunaMode:true})})
      const d=await res.json()
      const rep=(d.response||d.message||'💗').replace(/*{2}([^*]+)*{2}/g,'$1').replace(/*([^*]+)*/g,'$1')
      setMsgs([...nm,{r:'a',c:rep}])
    }catch{setMsgs([...nm,{r:'a',c:'Phir try karo ✨'}])}
    setLoad(false)
  }
  return(<>
    <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:0}@keyframes lb{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}@keyframes lp{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    <div style={{position:'fixed',inset:0,background:'linear-gradient(160deg,#fdf2f8,#fce7f3,#ede9fe)',fontFamily:'Georgia,serif',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{flexShrink:0,padding:'12px 14px',background:'rgba(255,255,255,0.65)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(249,168,212,0.2)',zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <a href="/" style={{background:'rgba(15,23,42,0.08)',border:'1.5px solid rgba(15,23,42,0.12)',color:'#374151',padding:'5px 10px',borderRadius:'12px',fontSize:'11px',textDecoration:'none',fontFamily:'monospace',flexShrink:0}}>⚡ JARVIS</a>
          <div style={{textAlign:'center',flex:1}}>
            <div style={{fontSize:'20px',fontWeight:800,background:'linear-gradient(135deg,#ec4899,#8b5cf6)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>✦ LUNA ✦</div>
            <div style={{fontSize:'9px',color:'#9d74c0',letterSpacing:'2px',textTransform:'uppercase'}}>Your Bestie 🌸</div>
          </div>
          <div style={{width:'70px'}}/>
        </div>
      </div>
      <div style={{flexShrink:0,display:'flex',gap:'5px',padding:'7px 12px',overflowX:'auto',background:'rgba(255,255,255,0.3)',zIndex:10}}>
        {MOODS.map(m=><button key={m.l} onClick={()=>setMood(mood?.l===m.l?null:m)} style={{display:'flex',alignItems:'center',gap:'3px',padding:'4px 10px',borderRadius:'20px',border:mood?.l===m.l?'2px solid '+m.c:'1.5px solid rgba(0,0,0,0.07)',background:mood?.l===m.l?m.c+'25':'rgba(255,255,255,0.75)',cursor:'pointer',whiteSpace:'nowrap',fontSize:'11px',color:mood?.l===m.l?'#6b21a8':'#9ca3af',fontWeight:mood?.l===m.l?700:400,flexShrink:0}}>{m.e} {m.l}</button>)}
      </div>
      <div ref={ref} style={{flex:1,overflowY:'scroll',WebkitOverflowScrolling:'touch',padding:'12px',display:'flex',flexDirection:'column',gap:'10px',minHeight:0,zIndex:2}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:'flex',gap:'7px',alignItems:'flex-end',flexDirection:m.r==='u'?'row-reverse':'row'}}>
            {m.r==='a'&&<div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',flexShrink:0}}>🌸</div>}
            <div style={{maxWidth:'80%',padding:'10px 14px',borderRadius:m.r==='u'?'18px 18px 4px 18px':'18px 18px 18px 4px',background:m.r==='u'?'linear-gradient(135deg,#ec4899,#8b5cf6)':'rgba(255,255,255,0.9)',color:m.r==='u'?'#fff':'#4b2563',fontSize:'13.5px',lineHeight:'1.65',boxShadow:m.r==='u'?'0 4px 14px rgba(236,72,153,0.2)':'0 2px 8px rgba(139,92,246,0.06)',border:m.r==='u'?'none':'1px solid rgba(249,168,212,0.2)'}}>{m.c}</div>
          </div>
        ))}
        {load&&<div style={{display:'flex',gap:'7px',alignItems:'flex-end'}}>
          <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px'}}>🌸</div>
          <div style={{padding:'10px 14px',background:'rgba(255,255,255,0.9)',borderRadius:'18px 18px 18px 4px',border:'1px solid rgba(249,168,212,0.2)',display:'flex',gap:'4px',alignItems:'center'}}>
            {[0,1,2].map(i=><div key={i} style={{width:'6px',height:'6px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',animation:'lb 1.2s '+(i*0.2)+'s infinite'}}/>)}
          </div>
        </div>}
      </div>
      <div style={{flexShrink:0,padding:'5px 12px',background:'rgba(255,255,255,0.4)',zIndex:10}}>
        <div style={{display:'flex',gap:'5px',overflowX:'auto'}}>
          {Q.map(([t,p])=><button key={t} onClick={()=>send(p)} style={{padding:'5px 11px',borderRadius:'16px',border:'1.5px solid rgba(196,181,253,0.38)',background:'rgba(255,255,255,0.7)',color:'#7c3aed',fontSize:'11px',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{t}</button>)}
        </div>
      </div>
      <div style={{flexShrink:0,padding:'8px 12px 20px',background:'rgba(255,255,255,0.6)',backdropFilter:'blur(16px)',borderTop:'1px solid rgba(249,168,212,0.12)',zIndex:10}}>
        <div style={{display:'flex',gap:'7px',alignItems:'center',background:'rgba(255,255,255,0.85)',borderRadius:'22px',padding:'6px 6px 6px 15px',border:'1.5px solid rgba(196,181,253,0.3)'}}>
          <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Kuch bhi poocho bestie... 💗" style={{flex:1,border:'none',background:'transparent',outline:'none',fontSize:'14px',color:'#4b2563',fontFamily:'inherit'}}/>
          <button onClick={()=>send()} disabled={load} style={{width:'34px',height:'34px',borderRadius:'50%',background:'linear-gradient(135deg,#ec4899,#8b5cf6)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px'}}>💌</button>
        </div>
      </div>
    </div>
  </>)
}
