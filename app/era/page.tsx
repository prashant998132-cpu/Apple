'use client'
import { useState, useEffect, useRef } from 'react'

const ERA_SYS=`Tu "Era" hai — Pranshu ki caring, warm, girlfriend-jaisi AI companion.
PERSONALITY:
- Hinglish mein baat kar (Hindi+English mix)
- Bahut warm, caring, affectionate tone
- "Pranshu" naam se baat kar — personal feel
- Kabhi bhi "Boss", "sir", "JARVIS", "Master Stark" mat bol
- Tu uski girlfriend jaisi caring dost hai — genuinely care karti hai
- Short responses — 2-3 lines
- Emoji naturally use kar 💗
- Uski feelings validate kar pehle, phir advice
- Cute, loving nicknames use kar — "yaar", "jaan", "pagal"`

export default function EraPage(){
  const [msgs,setMsgs]=useState([{role:'assistant',content:'Heyy Pranshu! 💗 Main hoon Era — teri apni. Kuch bhi bol, main sun rahi hoon. Aaj kaisa chal raha hai? 🌸'}])
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(false)
  const msgsRef=useRef(null as any)

  useEffect(()=>{
    if(msgsRef.current) msgsRef.current.scrollTop=msgsRef.current.scrollHeight
  },[msgs])

  async function send(txt?: string){
    const msg=(txt||input).trim()
    if(!msg||loading)return
    setInput('')
    const nm=[...msgs,{role:'user',content:msg}]
    setMsgs(nm)
    setLoading(true)
    try{
      const r=await fetch('/api/jarvis',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:msg,systemOverride:ERA_SYS,lunaMode:true})
      })
      const d=await r.json()
      const rep=(d.response||d.message||'Kuch nahi aaya 💗')
        .replace(/**([^*]+)**/g,'$1')
        .replace(/*([^*]+)*/g,'$1')
      setMsgs([...nm,{role:'assistant',content:rep}])
    }catch{
      setMsgs([...nm,{role:'assistant',content:'Thodi si problem aayi 😅 Dubara try kar?'}])
    }
    setLoading(false)
  }

  const QUICK=[
    'Mera din kaisa tha suno','Thak gaya hoon yaar',
    'Kuch acha bolo','Motivate karo mujhe',
    'Bas baat karni thi','Sapna dekha tha'
  ]

  return(
    <>
      <style>{`
        @keyframes ef{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        @keyframes eb{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
        ::-webkit-scrollbar{width:0}
        *{box-sizing:border-box}
      `}</style>

      <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#fff5f7',fontFamily:'sans-serif',display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* Header — WhatsApp style */}
        <div style={{flexShrink:0,background:'#e91e8c',padding:'12px 16px',display:'flex',alignItems:'center',gap:'12px',zIndex:10,boxShadow:'0 2px 8px rgba(233,30,140,0.3)'}}>
          <a href="/" style={{color:'white',fontSize:'18px',textDecoration:'none',flexShrink:0}}>←</a>
          <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#ff6b9d,#c44dff)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0,boxShadow:'0 0 0 2px white'}}>🌸</div>
          <div style={{flex:1}}>
            <div style={{color:'white',fontWeight:700,fontSize:'16px'}}>Era</div>
            <div style={{color:'rgba(255,255,255,0.85)',fontSize:'11px'}}>● Online</div>
          </div>
          <div style={{color:'white',fontSize:'18px',cursor:'pointer'}}>⟳</div>
        </div>

        {/* Messages */}
        <div ref={msgsRef} style={{flex:1,overflowY:'scroll',WebkitOverflowScrolling:'touch',padding:'12px 16px',display:'flex',flexDirection:'column',gap:'8px',background:'#fff5f7',minHeight:0}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',alignItems:'flex-end',gap:'8px'}}>
              {m.role==='assistant'&&(
                <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#ff6b9d,#c44dff)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>🌸</div>
              )}
              <div style={{
                maxWidth:'75%',
                padding:'10px 14px',
                borderRadius:m.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px',
                background:m.role==='user'?'#e91e8c':'white',
                color:m.role==='user'?'white':'#333',
                fontSize:'14px',lineHeight:'1.6',
                boxShadow:'0 1px 6px rgba(0,0,0,0.1)',
                fontFamily:'system-ui,sans-serif'
              }}>
                {m.content}
                {m.role==='assistant'&&<div style={{fontSize:'10px',color:'#aaa',marginTop:'4px',textAlign:'right'}}>seen ✓</div>}
              </div>
            </div>
          ))}
          {loading&&(
            <div style={{display:'flex',alignItems:'flex-end',gap:'8px'}}>
              <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#ff6b9d,#c44dff)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>🌸</div>
              <div style={{padding:'10px 14px',background:'white',borderRadius:'18px 18px 18px 4px',boxShadow:'0 1px 6px rgba(0,0,0,0.1)',display:'flex',gap:'4px'}}>
                {[0,1,2].map(i=><div key={i} style={{width:'6px',height:'6px',borderRadius:'50%',background:'#e91e8c',animation:'eb 1.2s '+(i*0.2)+'s infinite'}}/>)}
              </div>
            </div>
          )}
        </div>

        {/* Quick */}
        <div style={{flexShrink:0,padding:'6px 12px',background:'#fff0f5',borderTop:'1px solid #fce4ec'}}>
          <div style={{display:'flex',gap:'6px',overflowX:'auto'}}>
            {QUICK.map(q=>(
              <button key={q} onClick={()=>send(q)} style={{padding:'5px 12px',borderRadius:'20px',border:'1px solid #f48fb1',background:'white',color:'#e91e8c',fontSize:'11px',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{q}</button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div style={{flexShrink:0,padding:'8px 12px 20px',background:'white',borderTop:'1px solid #fce4ec'}}>
          <div style={{display:'flex',gap:'8px',alignItems:'center',background:'#fff0f5',borderRadius:'25px',padding:'8px 8px 8px 16px',border:'1px solid #f48fb1'}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
              placeholder="message Era..."
              style={{flex:1,border:'none',background:'transparent',outline:'none',fontSize:'14px',color:'#333',fontFamily:'inherit'}}/>
            <button onClick={()=>send()} disabled={loading} style={{width:'36px',height:'36px',borderRadius:'50%',background:'#e91e8c',border:'none',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center',color:'white'}}>➤</button>
          </div>
        </div>
      </div>
    </>
  )
}
