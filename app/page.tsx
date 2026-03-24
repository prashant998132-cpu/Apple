'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

type Msg={r:'u'|'a';c:string;imageUrl?:string;videoUrl?:string;widget?:string}

function getQrUrl(t:string){return 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data='+encodeURIComponent(t)}
function genPass(){const c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';return Array.from({length:16},()=>c[Math.floor(Math.random()*c.length)]).join('')}

function CalcWidget(){
  const [expr,setExpr]=useState('');const [res,setRes]=useState('0')
  const rows=[['7','8','9','DIV'],['4','5','6','MUL'],['1','2','3','-'],['0','.','DEL','+'],['C','(',')', '=']]
  const sym:Record<string,string>={DIV:'Ã·',MUL:'Ã',DEL:'â«'}
  function tap(k:string){
    if(k==='C'){setExpr('');setRes('0');return}
    if(k==='DEL'){setExpr(e=>e.slice(0,-1));return}
    if(k==='='){try{const r=String(Function('"use strict";return('+expr.replace(/DIV/g,'/').replace(/MUL/g,'*')+')()')()); setRes(r);setExpr(r)}catch{setRes('Err')};return}
    const n=expr+(k==='DIV'?'/':k==='MUL'?'*':k);setExpr(n)
    try{setRes(String(Function('"use strict";return('+n.replace(/DIV/g,'/').replace(/MUL/g,'*')+')')()))}catch{}
  }
  return(
    <div style={{background:'#0a1628',border:'1px solid #1a3a5a',borderRadius:'16px',padding:'12px',maxWidth:'240px'}}>
      <div style={{fontSize:'11px',color:'#00e5ff',marginBottom:'8px'}}>Calculator</div>
      <div style={{background:'#030a14',borderRadius:'8px',padding:'10px',textAlign:'right',fontSize:'22px',fontWeight:700,marginBottom:'6px',minHeight:'42px',color:'#00e5ff',overflow:'auto'}}>{res}</div>
      <div style={{fontSize:'10px',color:'#334',textAlign:'right',marginBottom:'6px',minHeight:'14px'}}>{expr}</div>
      {rows.map((row,ri)=>(
        <div key={ri} style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'5px',marginBottom:'5px'}}>
          {row.map(k=><button key={k} onClick={()=>tap(k)} style={{padding:'11px 4px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'14px',fontWeight:600,background:k==='='?'#00e5ff22':k==='C'?'#ff525222':['DIV','MUL','-','+'].includes(k)?'#1a3a5a':'#111d2e',color:k==='='?'#00e5ff':k==='C'?'#ff5252':'#e0f0ff'}}>{sym[k]||k}</button>)}
        </div>
      ))}
    </div>
  )
}

function QrWidget({text}:{text:string}){
  const [v,setV]=useState(text);const [url,setUrl]=useState(text?getQrUrl(text):'')
  return(
    <div style={{background:'#0a1628',border:'1px solid #1a3a5a',borderRadius:'16px',padding:'12px',maxWidth:'220px'}}>
      <div style={{fontSize:'11px',color:'#00e5ff',marginBottom:'8px'}}>QR Code</div>
      <input value={v} onChange={e=>setV(e.target.value)} onKeyDown={e=>e.key==='Enter'&&setUrl(getQrUrl(v))} placeholder="Text ya URL..." style={{width:'100%',background:'#030a14',border:'1px solid #1a3a5a',borderRadius:'8px',color:'#e0f0ff',padding:'6px 10px',fontSize:'12px',outline:'none',marginBottom:'8px'}}/>
      <button onClick={()=>setUrl(getQrUrl(v))} style={{width:'100%',background:'#00e5ff22',border:'1px solid #00e5ff',borderRadius:'8px',color:'#00e5ff',padding:'6px',cursor:'pointer',fontSize:'12px',marginBottom:'8px'}}>Generate</button>
      {url&&<div style={{textAlign:'center'}}><img src={url} alt="QR" style={{borderRadius:'8px',width:'150px',height:'150px'}}/></div>}
    </div>
  )
}

function ImageMsg({url,prompt}:{url:string;prompt:string}){
  const [loaded,setLoaded]=useState(false)
  return(
    <div style={{maxWidth:'280px'}}>
      <div style={{fontSize:'11px',color:'#888',marginBottom:'6px'}}>Image: {prompt}</div>
      {!loaded&&<div style={{width:'260px',height:'180px',background:'#0a1628',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',color:'#4fc3f7'}}>Generating...</div>}
      <img src={url} alt={prompt} onLoad={()=>setLoaded(true)} style={{width:'100%',borderRadius:'12px',display:loaded?'block':'none',border:'1px solid #1a3a5a'}}/>
      {loaded&&<a href={url} target="_blank" style={{fontSize:'10px',color:'#00e5ff',marginTop:'4px',display:'block'}}>Save Image</a>}
    </div>
  )
}

const QUICK=[
  {l:'ð¼ï¸ Image',m:'image banao '},
  {l:'ð¢ Calc',m:'/calc'},
  {l:'ð± QR',m:'/qr '},
  {l:'ð Password',m:'password banao'},
  {l:'ð° News',m:'aaj ki khabar kya hai'},
  {l:'âï¸ Weather',m:'Rewa ka mausam batao'},
  {l:'ð Cricket',m:'cricket score batao'},
  {l:'ð· Photo',m:''},
]

export default function Home(){
  const [msgs,setMsgs]=useState<Msg[]>([{r:'a',c:'Hey Pranshu! â¡ Main JARVIS hoon. Kya karna hai aaj? Seedha bol!'}])
  const [inp,setInp]=useState('');const [load,setLoad]=useState(false)
  const [tts,setTts]=useState(false);const [theme,setTheme]=useState<'dark'|'light'>('dark')
  const [menu,setMenu]=useState(false);const [recording,setRecording]=useState(false)
  const ref=useRef<any>(null);const inpRef=useRef<any>(null)
  const mediaRef=useRef<any>(null);const photoRef=useRef<any>(null)

  useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight},[msgs,load])

  async function speak(text:string){if(!tts)return;try{const r=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text.substring(0,300)})});if(r.ok){const b=await r.blob();new Audio(URL.createObjectURL(b)).play()}}catch{}}

  async function toggleVoice(){
    if(recording){mediaRef.current?.stop();setRecording(false);return}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true})
      const mr=new MediaRecorder(stream,{mimeType:'audio/webm'});const chunks:Blob[]=[]
      mr.ondataavailable=e=>chunks.push(e.data)
      mr.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());const fd=new FormData();fd.append('audio',new Blob(chunks,{type:'audio/webm'}),'audio.webm');try{const r=await fetch('/api/stt',{method:'POST',body:fd});const d=await r.json();if(d.text){setInp(d.text);inpRef.current?.focus()}}catch{}}
      mr.start();mediaRef.current=mr;setRecording(true);setTimeout(()=>{if(mr.state==='recording')mr.stop()},10000)
    }catch{alert('Mic permission chahiye!')}
  }

  async function handlePhoto(e:any){
    const file=e.target.files?.[0];if(!file)return
    const reader=new FileReader()
    reader.onload=async()=>{
      const nm=[...msgs,{r:'u' as const,c:'ð· Photo bheja'}];setMsgs(nm);setLoad(true)
      try{const r=await fetch('/api/photo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageBase64:reader.result})});const d=await r.json();const rep=d.answer||'Samajh nahi aaya';setMsgs([...nm,{r:'a',c:rep}]);speak(rep)}
      catch{setMsgs([...nm,{r:'a',c:'Photo analyse nahi ho payi'}])}
      setLoad(false)
    }
    reader.readAsDataURL(file);e.target.value=''
  }

  const send=useCallback(async(text?:string)=>{
    const msg=(text||inp).trim();if(!msg||load)return;setInp('')
    if(msg.startsWith('/')){
      const parts=msg.slice(1).split(' ');const cmd=parts[0].toLowerCase();const args=parts.slice(1).join(' ')
      if(cmd==='calc'){setMsgs(m=>[...m,{r:'u',c:msg},{r:'a',c:'',widget:'calc'}]);return}
      if(cmd==='qr'){setMsgs(m=>[...m,{r:'u',c:msg},{r:'a',c:'',widget:'qr:'+args}]);return}
      if(cmd==='password'){setMsgs(m=>[...m,{r:'u',c:msg},{r:'a',c:'ð Password: '+genPass()+'

Copy kar lo!'}]);return}
      if(cmd==='clear'){setMsgs([{r:'a',c:'Clear! Kya karna hai? â¡'}]);return}
      if(cmd==='luna'){window.location.href='/luna';return}
      if(cmd==='era'){window.location.href='/era';return}
    }
    const m=msg.toLowerCase();const nm=[...msgs,{r:'u' as const,c:msg}];setMsgs(nm);setLoad(true)
    if(/image banao|photo banao|picture banao|wallpaper|generate image|art banao/.test(m)){
      const p=msg.replace(/image banao|photo banao|picture banao|wallpaper|generate image|art banao/gi,'').trim()||msg
      setMsgs([...nm,{r:'a',c:p,imageUrl:'https://image.pollinations.ai/prompt/'+encodeURIComponent(p)+'?model=flux&width=1024&height=1024&seed='+Math.floor(Math.random()*999999)+'&nologo=true'}]);setLoad(false);return
    }
    if(/video banao|clip banao/.test(m)){const p=msg.replace(/video banao|clip banao/gi,'').trim()||msg;setMsgs([...nm,{r:'a',c:'Video generate ho raha hai...',videoUrl:'https://video.pollinations.ai/'+encodeURIComponent(p)}]);setLoad(false);return}
    if(/password banao|strong password/.test(m)){setMsgs([...nm,{r:'a',c:'ð Password: '+genPass()+'

Copy kar lo!'}]);setLoad(false);return}
    try{const r=await fetch('/api/jarvis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,conversationHistory:nm.slice(-8).map(x=>({r:x.r,c:x.c}))})});const d=await r.json();const rep=d.response||d.message||'Samajh nahi aaya';setMsgs([...nm,{r:'a',c:rep}]);speak(rep)}
    catch{setMsgs([...nm,{r:'a',c:'Network issue, retry karo!'}])}
    setLoad(false)
  },[inp,load,msgs,tts])

  const dark=theme==='dark';const bg=dark?'#040e1a':'#f0f4ff';const card=dark?'#0a1628':'#fff';const tc=dark?'#e0f0ff':'#1a2040';const bc=dark?'#1a3a5a':'#d0d8f0'

  return(
    <div style={{position:'fixed',inset:0,background:bg,display:'flex',flexDirection:'column',fontFamily:'system-ui,sans-serif',color:tc}}>
      <style>{`@keyframes p{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}::-webkit-scrollbar{width:0}input::placeholder{color:#556}`}</style>

      <div style={{flexShrink:0,background:dark?'#030a14':'#fff',borderBottom:'1px solid '+bc,padding:'10px 14px',display:'flex',alignItems:'center',gap:'10px',zIndex:20}}>
        <button onClick={()=>setMenu(v=>!v)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'22px',color:tc,lineHeight:1}}>&#9776;</button>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:'15px',letterSpacing:'1px',color:'#00e5ff'}}>&#9889; JARVIS</div>
          <div style={{fontSize:'9px',color:'#4fc3f7',letterSpacing:'2px'}}>AI ASSISTANT v10.43</div>
        </div>
        <button onClick={()=>setTts(v=>!v)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',opacity:tts?1:0.3}}>ð</button>
        <button onClick={()=>setTheme(t=>t==='dark'?'light':'dark')} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px'}}>{theme==='dark'?'ð':'âï¸'}</button>
        <a href="/luna" style={{textDecoration:'none',fontSize:'20px'}}>ð¸</a>
      </div>

      {menu&&(
        <div style={{position:'fixed',inset:0,zIndex:100,display:'flex'}}>
          <div style={{width:'240px',background:dark?'#040e1a':'#fff',borderRight:'1px solid '+bc,padding:'16px',display:'flex',flexDirection:'column',gap:'8px'}}>
            <div style={{fontWeight:700,fontSize:'14px',color:'#00e5ff',marginBottom:'8px'}}>&#9889; JARVIS Menu</div>
            {[['&#9889; JARVIS','/'],['&#127800; LUNA','/luna'],['ð Era','/era'],['ð &#65039; Tools','/tools']].map(([l,h])=>(
              <a key={h} href={h} style={{display:'block',padding:'12px 14px',borderRadius:'12px',background:card,border:'1px solid '+bc,color:tc,textDecoration:'none',fontSize:'13px',fontWeight:600}} dangerouslySetInnerHTML={{__html:l}}/>
            ))}
            <div style={{borderTop:'1px solid '+bc,paddingTop:'10px',marginTop:'4px'}}>
              <div style={{fontSize:'11px',color:'#888',marginBottom:'8px'}}>Slash Commands:</div>
              {['/calc','/qr [text]','/password','/clear','/luna','/era'].map(c=><div key={c} style={{fontSize:'11px',color:'#4fc3f7',padding:'3px 0'}}>{c}</div>)}
            </div>
          </div>
          <div style={{flex:1,background:'rgba(0,0,0,0.5)'}} onClick={()=>setMenu(false)}/>
        </div>
      )}

      <div ref={ref} style={{flex:1,overflowY:'scroll',padding:'12px',display:'flex',flexDirection:'column',gap:'12px',minHeight:0}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:m.r==='u'?'flex-end':'flex-start',alignItems:'flex-end',gap:'8px'}}>
            {m.r==='a'&&<div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',flexShrink:0}}>&#9889;</div>}
            <div style={{maxWidth:'82%'}}>
              {m.widget==='calc'&&<CalcWidget/>}
              {m.widget?.startsWith('qr:')&&<QrWidget text={m.widget.slice(3)}/>}
              {m.imageUrl&&<ImageMsg url={m.imageUrl} prompt={m.c}/>}
              {m.videoUrl&&!m.imageUrl&&<div style={{background:card,border:'1px solid '+bc,borderRadius:'12px',padding:'12px',maxWidth:'260px'}}><div style={{fontSize:'13px',marginBottom:'8px'}}>{m.c}</div><a href={m.videoUrl} target="_blank" style={{display:'block',background:'#8b5cf622',border:'1px solid #8b5cf6',borderRadius:'8px',padding:'8px',textAlign:'center',color:'#8b5cf6',textDecoration:'none',fontSize:'12px'}}>ð¬ Video Dekho</a></div>}
              {!m.widget&&!m.imageUrl&&!m.videoUrl&&m.c&&(
                <div style={{padding:'11px 15px',borderRadius:m.r==='u'?'20px 20px 5px 20px':'20px 20px 20px 5px',background:m.r==='u'?'linear-gradient(135deg,#00e5ff22,#8b5cf622)':card,border:'1px solid '+(m.r==='u'?'#00e5ff44':bc),color:tc,fontSize:'14px',lineHeight:'1.65',whiteSpace:'pre-wrap'}}>
                  {m.c}
                  {m.r==='a'&&tts&&<button onClick={()=>speak(m.c)} style={{display:'block',marginTop:'4px',background:'none',border:'none',color:'#4fc3f7',cursor:'pointer',fontSize:'11px'}}>ð Suno</button>}
                </div>
              )}
            </div>
          </div>
        ))}
        {load&&<div style={{display:'flex',gap:'8px',alignItems:'flex-end'}}>
          <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px'}}>&#9889;</div>
          <div style={{padding:'11px 15px',background:card,border:'1px solid '+bc,borderRadius:'20px 20px 20px 5px',display:'flex',gap:'5px',alignItems:'center'}}>
            {[0,1,2].map(i=><div key={i} style={{width:'7px',height:'7px',borderRadius:'50%',background:'#00e5ff',animation:'p 1.2s '+(i*0.2)+'s infinite'}}/>)}
          </div>
        </div>}
      </div>

      <div style={{flexShrink:0,padding:'5px 12px',background:dark?'#030a14':'#f8faff',borderTop:'1px solid '+bc}}>
        <div style={{display:'flex',gap:'6px',overflowX:'auto'}}>
          {QUICK.map(q=><button key={q.l} onClick={()=>{if(q.m===''){photoRef.current?.click();return};if(q.m.endsWith(' '))setInp(q.m);else send(q.m)}} style={{padding:'6px 12px',borderRadius:'18px',border:'1px solid '+bc,background:card,color:tc,fontSize:'11px',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{q.l}</button>)}
        </div>
      </div>

      <div style={{flexShrink:0,padding:'8px 12px 20px',background:dark?'#030a14':'#fff',borderTop:'1px solid '+bc}}>
        <input ref={photoRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhoto}/>
        <div style={{display:'flex',gap:'8px',alignItems:'center',background:card,borderRadius:'28px',padding:'8px 8px 8px 16px',border:'1.5px solid '+(inp?'#00e5ff':bc)}}>
          <input ref={inpRef} value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder={recording?'ð¤ Sun raha hoon...':'Kuch bhi poocho, /calc, /qr...'} style={{flex:1,border:'none',background:'transparent',outline:'none',fontSize:'14px',color:tc}}/>
          <button onClick={toggleVoice} style={{width:'36px',height:'36px',borderRadius:'50%',background:recording?'rgba(255,82,82,0.15)':'transparent',border:recording?'2px solid #ff5252':'none',cursor:'pointer',fontSize:'20px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>{recording?'â¹ï¸':'ð¤'}</button>
          <button onClick={()=>send()} disabled={load||!inp.trim()} style={{width:'38px',height:'38px',borderRadius:'50%',background:inp.trim()?'linear-gradient(135deg,#00e5ff,#8b5cf6)':'#1a3a5a',border:'none',cursor:'pointer',fontSize:'18px',flexShrink:0,color:inp.trim()?'#000':'#888',display:'flex',alignItems:'center',justifyContent:'center'}}>&#10148;</button>
        </div>
      </div>

      <a href="/luna" style={{position:'fixed',bottom:'100px',right:'12px',background:'linear-gradient(135deg,#ec4899,#8b5cf6)',borderRadius:'28px',padding:'10px 16px',color:'#fff',textDecoration:'none',fontSize:'13px',fontWeight:700,boxShadow:'0 4px 20px rgba(236,72,153,0.4)',zIndex:50,display:'flex',alignItems:'center',gap:'6px'}}>
        ð¸ Girl Mode
      </a>
    </div>
  )
}
