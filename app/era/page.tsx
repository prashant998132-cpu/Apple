'use client'
import { useState, useEffect, useRef } from 'react'

const SYS='Tu Era hai. Pranshu ki caring, warm girlfriend-jaisi companion. Hinglish mein baat kar. Kabhi JARVIS, Boss, sir mat bol. Short 2-3 lines. Emoji use kar. Uski feelings pehle validate kar.'

function stripMd(t: string): string {
  let r=t
  r=r.split('').reduce((acc,ch,i)=>{
    return acc+ch
  },'')
  return r.replace(/*{2}([^*]+)*{2}/g,'$1').replace(/*([^*]+)*/g,'$1').trim()
}

export default function EraPage(){
  const [msgs,setMsgs]=useState([{r:'a',c:'Heyy Pranshu! 💗 Main hoon Era. Kuch bhi bol, main sun rahi hoon. Aaj kaisa tha tera din? 🌸'}])
  const [inp,setInp]=useState('')
  const [load,setLoad]=useState(false)
  const ref=useRef(null as any)
  useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight},[msgs])

  async function send(t?: string){
    const msg=(t||inp).trim();if(!msg||load)return
    setInp('')
    const nm=[...msgs,{r:'u',c:msg}]
    setMsgs(nm);setLoad(true)
    try{
      const res=await fetch('/api/jarvis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,systemOverride:SYS,lunaMode:true})})
      const d=await res.json()
      setMsgs([...nm,{r:'a',c:stripMd(d.response||d.message||'💗')}])
    }catch{setMsgs([...nm,{r:'a',c:'Thodi der baad try karo 😊'}])}
    setLoad(false)
  }

  const Q=['Thak gaya hoon yaar','Kuch sunao acha sa','Motivate karo','Baat karni thi bas','Mera din kaisa tha batao']

  return(<>
    <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:0}@keyframes b{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}`}</style>
    <div style={{position:'fixed',inset:0,background:'#fff5f7',display:'flex',flexDirection:'column',fontFamily:'system-ui'}}>
      <div style={{flexShrink:0,background:'#e91e8c',padding:'12px 16px',display:'flex',alignItems:'center',gap:'12px',boxShadow:'0 2px 8px rgba(233,30,140,0.3)'}}>
        <a href="/" style={{color:'#fff',fontSize:'20px',textDecoration:'none',fontWeight:700}}>←</a>
        <div style={{width:'38px',height:'38px',borderRadius:'50%',background:'linear-gradient(135deg,#ff6b9d,#c44dff)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0,boxShadow:'0 0 0 2px #fff'}}>🌸</div>
        <div><div style={{color:'#fff',fontWeight:700,fontSize:'16px'}}>Era</div><div style={{color:'rgba(255,255,255,0.8)',fontSize:'11px'}}>● Online</div></div>
      </div>
      <div ref={ref} style={{flex:1,overflowY:'scroll',padding:'12px 14px',display:'flex',flexDirection:'column',gap:'8px',minHeight:0}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:m.r==='u'?'flex-end':'flex-start',alignItems:'flex-end',gap:'8px'}}>
            {m.r==='a'&&<div style={{width:'30px',height:'30px',borderRadius:'50%',background:'linear-gradient(135deg,#ff6b9d,#c44dff)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',flexShrink:0}}>🌸</div>}
            <div style={{maxWidth:'75%',padding:'10px 13px',borderRadius:m.r==='u'?'18px 18px 4px 18px':'18px 18px 18px 4px',background:m.r==='u'?'#e91e8c':'#fff',color:m.r==='u'?'#fff':'#333',fontSize:'14px',lineHeight:'1.6',boxShadow:'0 1px 5px rgba(0,0,0,0.08)'}}>
              {m.c}
              {m.r==='a'&&<div style={{fontSize:'10px',color:'#bbb',marginTop:'3px',textAlign:'right'}}>seen ✓</div>}
            </div>
          </div>
        ))}
        {load&&<div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'linear-gradient(135deg,#ff6b9d,#c44dff)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px'}}>🌸</div>
          <div style={{padding:'10px 13px',background:'#fff',borderRadius:'18px 18px 18px 4px',boxShadow:'0 1px 5px rgba(0,0,0,0.08)',display:'flex',gap:'4px',alignItems:'center'}}>
            {[0,1,2].map(i=><div key={i} style={{width:'6px',height:'6px',borderRadius:'50%',background:'#e91e8c',animation:'b 1.2s '+(i*0.2)+'s infinite'}}/>)}
          </div>
        </div>}
      </div>
      <div style={{flexShrink:0,padding:'5px 12px',background:'#fff0f5',borderTop:'1px solid #fce4ec'}}>
        <div style={{display:'flex',gap:'5px',overflowX:'auto'}}>
          {Q.map(q=><button key={q} onClick={()=>send(q)} style={{padding:'5px 11px',borderRadius:'20px',border:'1px solid #f48fb1',background:'#fff',color:'#e91e8c',fontSize:'11px',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{q}</button>)}
        </div>
      </div>
      <div style={{flexShrink:0,padding:'8px 12px 20px',background:'#fff',borderTop:'1px solid #fce4ec'}}>
        <div style={{display:'flex',gap:'8px',alignItems:'center',background:'#fff0f5',borderRadius:'25px',padding:'7px 7px 7px 15px',border:'1px solid #f48fb1'}}>
          <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="message Era..." style={{flex:1,border:'none',background:'transparent',outline:'none',fontSize:'14px',color:'#333'}}/>
          <button onClick={()=>send()} disabled={load} style={{width:'34px',height:'34px',borderRadius:'50%',background:'#e91e8c',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'16px'}}>➤</button>
        </div>
      </div>
    </div>
  </>)
}
