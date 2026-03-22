'use client'
import { useState, useEffect, useRef } from 'react'

function clean(t: string): string {
  let bold = '[' + '*' + '][' + '*' + ']([^' + '*' + ']+)[' + '*' + '][' + '*' + ']'
  let ital = '[' + '*' + ']([^' + '*' + ']+)[' + '*' + ']'
  return t.replace(new RegExp(bold,'g'),'$1').replace(new RegExp(ital,'g'),'$1').trim()
}

export default function EraPage(){
  const [msgs,setMsgs]=useState([{r:'a',c:'Heyy Pranshu! 💗 Main hoon Era — teri apni. Kuch bhi bol, main sun rahi hoon. Aaj kaisa tha? 🌸'}])
  const [inp,setInp]=useState('')
  const [load,setLoad]=useState(false)
  const [typing,setTyping]=useState('')
  const ref=useRef(null as any)

  useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight},[msgs,typing])

  const typingMsgs=['typing...','soch rahi hoon...','likh rahi hoon...']

  async function send(t?: string){
    const msg=(t||inp).trim();if(!msg||load)return
    setInp('');const nm=[...msgs,{r:'u',c:msg}];setMsgs(nm);setLoad(true)
    setTyping(typingMsgs[Math.floor(Math.random()*typingMsgs.length)])
    try{
      const res=await fetch('/api/jarvis',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:msg,eraMode:true,conversationHistory:nm.slice(-6)})})
      const d=await res.json()
      setTyping('')
      setMsgs([...nm,{r:'a',c:clean(d.response||d.message||'Thodi der baad try karo 💗')}])
    }catch{
      setTyping('')
      setMsgs([...nm,{r:'a',c:'Ek second ruko 😅'}])
    }
    setLoad(false)
  }

  const QU=[
    {e:'😴',t:'Neend nahi aa rahi'},
    {e:'💪',t:'Motivate karo'},
    {e:'😔',t:'Thak gaya hoon'},
    {e:'☕',t:'Kuch sunao acha sa'},
    {e:'🌙',t:'Raat ko baat karni thi'},
    {e:'❤️',t:'Kuch khaas baat'},
  ]

  return(<>
    <style>{`
      *{box-sizing:border-box}::-webkit-scrollbar{width:0;height:0}
      @keyframes eb{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
      @keyframes ep{0%,100%{opacity:1}50%{opacity:0.4}}
      .era-msg{animation:none}
      .era-inp:focus{outline:none}
      .era-inp::placeholder{color:#f48fb1;font-style:italic}
    `}</style>

    <div style={{position:'fixed',inset:0,background:'linear-gradient(180deg,#fce4ec,#fff5f7)',fontFamily:'system-ui,sans-serif',display:'flex',flexDirection:'column',overflow:'hidden'}}>

      {/* Header */}
      <div style={{flexShrink:0,background:'linear-gradient(135deg,#e91e8c,#9c27b0)',padding:'14px 16px',display:'flex',alignItems:'center',gap:'12px',boxShadow:'0 2px 12px rgba(233,30,140,0.4)'}}>
        <a href="/" style={{color:'rgba(255,255,255,0.9)',fontSize:'20px',textDecoration:'none',fontWeight:700,flexShrink:0}}>←</a>
        <div style={{width:'42px',height:'42px',borderRadius:'50%',background:'linear-gradient(135deg,#ff80ab,#ea80fc)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0,boxShadow:'0 0 0 3px rgba(255,255,255,0.4)'}}>🌸</div>
        <div style={{flex:1}}>
          <div style={{color:'#fff',fontWeight:700,fontSize:'16px',letterSpacing:'0.3px'}}>Era</div>
          <div style={{color:'rgba(255,255,255,0.75)',fontSize:'11px',display:'flex',alignItems:'center',gap:'4px'}}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#69f0ae',animation:'ep 2s infinite'}}/>
            Online • always here for you
          </div>
        </div>
        <div style={{color:'rgba(255,255,255,0.7)',fontSize:'20px'}}>💗</div>
      </div>

      {/* Messages */}
      <div ref={ref} style={{flex:1,overflowY:'scroll',padding:'16px 14px',display:'flex',flexDirection:'column',gap:'10px',minHeight:0,background:'linear-gradient(180deg,#fce4ec10,#fff5f7)'}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:m.r==='u'?'flex-end':'flex-start',alignItems:'flex-end',gap:'8px'}}>
            {m.r==='a'&&<div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#f48fb1,#ce93d8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0,boxShadow:'0 2px 6px rgba(244,143,177,0.4)'}}>🌸</div>}
            <div style={{maxWidth:'76%',padding:'11px 14px',borderRadius:m.r==='u'?'20px 20px 5px 20px':'20px 20px 20px 5px',background:m.r==='u'?'linear-gradient(135deg,#e91e8c,#9c27b0)':'#fff',color:m.r==='u'?'#fff':'#333',fontSize:'14px',lineHeight:'1.65',boxShadow:m.r==='u'?'0 4px 14px rgba(233,30,140,0.3)':'0 2px 8px rgba(0,0,0,0.08)',fontWeight:m.r==='u'?400:400}}>
              {m.c}
              {m.r==='a'&&<div style={{fontSize:'10px',color:'#ccc',marginTop:'4px',textAlign:'right'}}>seen ✓</div>}
            </div>
          </div>
        ))}
        {typing&&(
          <div style={{display:'flex',alignItems:'flex-end',gap:'8px'}}>
            <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#f48fb1,#ce93d8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>🌸</div>
            <div style={{padding:'11px 14px',background:'#fff',borderRadius:'20px 20px 20px 5px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)',display:'flex',gap:'5px',alignItems:'center'}}>
              {[0,1,2].map(i=><div key={i} style={{width:'7px',height:'7px',borderRadius:'50%',background:'#e91e8c',animation:'eb 1.3s '+(i*0.22)+'s infinite'}}/>)}
              <span style={{fontSize:'11px',color:'#e91e8c',marginLeft:'4px',fontStyle:'italic'}}>{typing}</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick prompts */}
      <div style={{flexShrink:0,padding:'6px 12px',background:'rgba(255,255,255,0.7)',backdropFilter:'blur(8px)',borderTop:'1px solid rgba(244,143,177,0.2)'}}>
        <div style={{display:'flex',gap:'6px',overflowX:'auto'}}>
          {QU.map(q=>(
            <button key={q.t} onClick={()=>send(q.t)} style={{padding:'6px 12px',borderRadius:'20px',border:'1.5px solid rgba(233,30,140,0.25)',background:'rgba(255,255,255,0.85)',color:'#e91e8c',fontSize:'11px',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,display:'flex',alignItems:'center',gap:'4px'}}>
              {q.e} {q.t}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{flexShrink:0,padding:'8px 12px 22px',background:'rgba(255,255,255,0.85)',backdropFilter:'blur(12px)',borderTop:'1px solid rgba(244,143,177,0.15)'}}>
        <div style={{display:'flex',gap:'8px',alignItems:'center',background:'#fff',borderRadius:'28px',padding:'8px 8px 8px 16px',border:'1.5px solid rgba(233,30,140,0.3)',boxShadow:'0 2px 10px rgba(233,30,140,0.08)'}}>
          <input className="era-inp" value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
            placeholder="Era se kuch bhi kaho... 💗"
            style={{flex:1,border:'none',background:'transparent',fontSize:'14px',color:'#333'}}/>
          <button onClick={()=>send()} disabled={load} style={{width:'38px',height:'38px',borderRadius:'50%',background:load?'#f48fb1':'linear-gradient(135deg,#e91e8c,#9c27b0)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'16px',boxShadow:'0 3px 10px rgba(233,30,140,0.35)',flexShrink:0}}>➤</button>
        </div>
      </div>
    </div>
  </>)
}
