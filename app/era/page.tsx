'use client'
import { useState, useEffect, useRef } from 'react'

const ERA_VOICE = 'Tu Era hai. Pranshu ki caring, warm, slightly mischievous companion.' +
  ' Directly baat karti hai. Opinions hain. Tease karti hai affectionately.' +
  ' Emotional — pehle feel karti hai uske saath, phir help.' +
  ' LANGUAGE: Hinglish. 1-3 lines. NEVER: Formal, JARVIS/Boss/Sir.'

function clean(t:string):string{
  const b='['+'*'+']['+'*'+']([^'+'*'+']+)['+'*'+']['+'*'+']'
  const i='['+'*'+']([^'+'*'+']+)['+'*'+']'
  return t.replace(new RegExp(b,'g'),'$1').replace(new RegExp(i,'g'),'$1').trim()
}

function lMem():string[]{try{return JSON.parse(localStorage.getItem('era_mem')||'[]')}catch{return []}}
function sMem(f:string[]){try{localStorage.setItem('era_mem',JSON.stringify(f.slice(-15)))}catch{}}
function lHist():{r:string,c:string}[]{try{return JSON.parse(localStorage.getItem('era_hist')||'[]')}catch{return []}}
function sHist(m:{r:string,c:string}[]){try{localStorage.setItem('era_hist',JSON.stringify(m.slice(-40)))}catch{}}

const GREETINGS=[
  'Heyy! Kitne time baad aaya tu. Kya chal raha hai? Sach mein batana 💗',
  'Arre tu aagaya! Kya hua aaj? 😤',
  'Hey Pranshu 💗 kuch specific baat karni thi ya bas yaise hi?',
  'Finally! Bol kya chal raha hai. Sab theek toh hai na? 🥺',
]

const MOODS=[
  {e:'🌸',l:'Normal'},{e:'🥲',l:'Udaas'},{e:'😊',l:'Khush'},
  {e:'😡',l:'Gussa'},{e:'😴',l:'Thaka'},{e:'😍',l:'Excited'},
]

const STARTERS=[
  {show:'Din kaisa tha?',send:'Aaj din kaisa tha tera?'},
  {show:'Kuch hua?',send:'Kuch interesting hua aaj life mein?'},
  {show:'Kya soch raha?',send:'Kya chal raha hai mind mein aajkal?'},
  {show:'Roast me 😅',send:'Mujhe thoda roast kar aaj'},
]

export default function EraPage(){
  const [msgs,setMsgs]=useState<{r:string,c:string}[]>([])
  const [inp,setInp]=useState('')
  const [load,setLoad]=useState(false)
  const [memory,setMemory]=useState<string[]>([])
  const [mood,setMood]=useState('Normal')
  const [dots,setDots]=useState('')
  const ref=useRef<any>(null)

  useEffect(()=>{const h=lHist(),m=lMem();setMemory(m);setMsgs(h.length>0?h:[{r:'a',c:GREETINGS[Math.floor(Math.random()*GREETINGS.length)]}])},[])
  useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight},[msgs,dots])
  useEffect(()=>{
    if(!load){setDots('');return}
    const fr=['','.','..',  '...'];let i=0
    const id=setInterval(()=>setDots(fr[i++%fr.length]),400)
    return()=>clearInterval(id)
  },[load])

  async function send(t?:string){
    const msg=(t||inp).trim();if(!msg||load)return
    setInp('');const nm=[...msgs,{r:'u',c:msg}];setMsgs(nm);setLoad(true)

    const memPart=memory.length>0?'\n\nJo tujhe Pranshu ke baare mein pata hai: '+memory.join(', '):''
    const moodPart=mood!=='Normal'?'\n\nPranshu ka mood: '+mood:''
    const sys=ERA_VOICE+memPart+moodPart

    try{
      const r=await fetch('/api/jarvis',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:msg,systemOverride:sys,eraMode:true,conversationHistory:nm.slice(-12)})})
      const d=await r.json()
      const reply=clean(d.response||d.message||'Ek second...')
      const fm=[...nm,{r:'a',c:reply}];setMsgs(fm);sHist(fm)
      if(fm.length%8===0){
        try{
          const convo=fm.slice(-8).map(m=>(m.r==='u'?'Pranshu':'Era')+': '+m.c).join('. ')
          const mr=await fetch('/api/jarvis',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({message:'Extract 1-2 facts about Pranshu. JSON array only. Empty if none: '+convo,systemOverride:'Return ONLY valid JSON array. Nothing else.'})})
          const md=await mr.json()
          const match=(md.response||'').match(/\[[\s\S]*\]/)
          if(match){const nf=JSON.parse(match[0]);if(nf.length>0){const u=[...new Set([...memory,...nf])].slice(-15);setMemory(u);sMem(u)}}
        }catch{}
      }
    }catch{setMsgs([...nm,{r:'a',c:'Yaar net issue 😥 retry kar'}])}
    setLoad(false)
  }

  return(<>
    <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:0;height:0}
      @keyframes eb{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}}
      @keyframes ep{0%,100%{opacity:1}50%{opacity:0.3}}
      @keyframes ef{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      .era-inp::placeholder{color:#f48fb1;font-style:italic}.era-inp:focus{outline:none}`}</style>
    <div style={{position:'fixed',inset:0,background:'linear-gradient(135deg,#1a0010,#0d0020)',display:'flex',flexDirection:'column',fontFamily:'system-ui,sans-serif',overflow:'hidden'}}>

      <div style={{flexShrink:0,padding:'14px 16px',background:'rgba(233,30,140,0.08)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(233,30,140,0.15)',display:'flex',alignItems:'center',gap:'12px'}}>
        <a href="/" style={{color:'rgba(255,255,255,0.5)',fontSize:'18px',textDecoration:'none'}}>{'<'}</a>
        <div style={{width:'42px',height:'42px',borderRadius:'50%',background:'linear-gradient(135deg,#e91e8c,#9c27b0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',boxShadow:'0 0 20px rgba(233,30,140,0.4)',flexShrink:0}}>{'🌸'}</div>
        <div style={{flex:1}}>
          <div style={{color:'#fff',fontWeight:700,fontSize:'17px'}}>Era</div>
          <div style={{fontSize:'10px',color:'rgba(233,30,140,0.8)',display:'flex',alignItems:'center',gap:'4px'}}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#e91e8c',animation:'ep 2s infinite'}}/>
            {load?'typing'+dots:'online • always here'}
          </div>
        </div>
        {memory.length>0&&<div style={{fontSize:'10px',color:'rgba(233,30,140,0.6)',background:'rgba(233,30,140,0.1)',padding:'3px 8px',borderRadius:'12px'}}>{'🧠'} {memory.length}</div>}
        <button onClick={()=>{localStorage.removeItem('era_mem');localStorage.removeItem('era_hist');setMemory([]);setMsgs([{r:'a',c:GREETINGS[Math.floor(Math.random()*GREETINGS.length)]}])}} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:'11px'}}>reset</button>
      </div>

      <div style={{flexShrink:0,display:'flex',gap:'6px',padding:'8px 14px',overflowX:'auto',background:'rgba(0,0,0,0.2)'}}>
        {MOODS.map(m=>(
          <button key={m.l} onClick={()=>setMood(m.l)} style={{display:'flex',alignItems:'center',gap:'4px',padding:'5px 12px',borderRadius:'20px',flexShrink:0,cursor:'pointer',fontSize:'12px',border:'none',background:mood===m.l?'rgba(233,30,140,0.3)':'rgba(255,255,255,0.06)',color:mood===m.l?'#ff80ab':'rgba(255,255,255,0.5)',fontWeight:mood===m.l?700:400}}>
            {m.e} {m.l}
          </button>
        ))}
      </div>

      <div ref={ref} style={{flex:1,overflowY:'scroll',padding:'14px',display:'flex',flexDirection:'column',gap:'12px',minHeight:0}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:m.r==='u'?'flex-end':'flex-start',alignItems:'flex-end',gap:'10px'}}>
            {m.r==='a'&&<div style={{width:'34px',height:'34px',borderRadius:'50%',background:'linear-gradient(135deg,#e91e8c,#9c27b0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>{'🌸'}</div>}
            <div style={{maxWidth:'78%',padding:'12px 15px',borderRadius:m.r==='u'?'20px 20px 5px 20px':'20px 20px 20px 5px',background:m.r==='u'?'linear-gradient(135deg,rgba(233,30,140,0.7),rgba(156,39,176,0.7))':'rgba(255,255,255,0.07)',color:'#fff',fontSize:'14px',lineHeight:'1.7',border:m.r==='a'?'1px solid rgba(233,30,140,0.15)':'none',whiteSpace:'pre-wrap'}}>
              {m.c}
            </div>
          </div>
        ))}
        {load&&<div style={{display:'flex',gap:'10px',alignItems:'flex-end'}}>
          <div style={{width:'34px',height:'34px',borderRadius:'50%',background:'linear-gradient(135deg,#e91e8c,#9c27b0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>{'🌸'}</div>
          <div style={{padding:'14px 18px',background:'rgba(255,255,255,0.07)',borderRadius:'20px 20px 20px 5px',border:'1px solid rgba(233,30,140,0.15)',display:'flex',gap:'5px',alignItems:'center'}}>
            {[0,1,2].map(i=><div key={i} style={{width:'8px',height:'8px',borderRadius:'50%',background:'#e91e8c',animation:'eb 1.4s '+(i*0.2)+'s infinite'}}/>)}
          </div>
        </div>}
      </div>

      <div style={{flexShrink:0,padding:'6px 14px',background:'rgba(0,0,0,0.3)'}}>
        <div style={{display:'flex',gap:'6px',overflowX:'auto'}}>
          {STARTERS.map(s=><button key={s.show} onClick={()=>send(s.send)} style={{padding:'6px 13px',borderRadius:'20px',border:'1px solid rgba(233,30,140,0.25)',background:'rgba(233,30,140,0.08)',color:'rgba(255,255,255,0.65)',fontSize:'11px',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{s.show}</button>)}
        </div>
      </div>

      <div style={{flexShrink:0,padding:'10px 14px 24px',background:'rgba(0,0,0,0.4)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(233,30,140,0.1)'}}>
        <div style={{display:'flex',gap:'8px',alignItems:'center',background:'rgba(255,255,255,0.06)',borderRadius:'28px',padding:'10px 10px 10px 18px',border:'1px solid '+(inp?'rgba(233,30,140,0.5)':'rgba(255,255,255,0.08)')}}>
          <input className="era-inp" value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={'Era se kuch bhi kaho... 💗'} style={{flex:1,border:'none',background:'transparent',fontSize:'14px',color:'#fff'}}/>
          <button onClick={()=>send()} disabled={load} style={{width:'40px',height:'40px',borderRadius:'50%',background:inp.trim()?'linear-gradient(135deg,#e91e8c,#9c27b0)':'rgba(255,255,255,0.05)',border:'none',cursor:'pointer',color:'#fff',fontSize:'18px',flexShrink:0}}>{'▶️'}</button>
        </div>
      </div>
    </div>
  </>)
}
