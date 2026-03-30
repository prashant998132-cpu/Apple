'use client'
import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react'

type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

const PALETTES = {
  idle:     { c1:'#00e5ff', c2:'#8b5cf6', c3:'#06b6d4', glow:'rgba(0,229,255,0.4)' },
  listening:{ c1:'#00ff88', c2:'#00e5ff', c3:'#00cc77', glow:'rgba(0,255,136,0.5)' },
  thinking: { c1:'#a78bfa', c2:'#6d28d9', c3:'#8b5cf6', glow:'rgba(167,139,250,0.5)' },
  speaking: { c1:'#f59e0b', c2:'#ef4444', c3:'#fbbf24', glow:'rgba(245,158,11,0.6)' }
}

const STATE_LABELS: Record<OrbState,string> = {
  idle:'STANDBY', listening:'LISTENING...', thinking:'PROCESSING', speaking:'SPEAKING'
}
const STATE_STATUS: Record<OrbState,string> = {
  idle:'Tap orb to activate', listening:'Listening to you...', thinking:'Analyzing request...', speaking:'JARVIS responding...'
}

function noise(x:number,y:number,t:number){
  return (Math.sin(x*1.7+t)*Math.cos(y*1.3+t*0.8)+Math.sin(x*0.9-t*0.6)*Math.cos(y*2.1+t*0.4)+Math.sin((x+y)*0.8+t*1.2)*0.3)/2.3
}
function lighten(hex:string,a=1){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16)
  return `rgba(${Math.min(255,r+80)},${Math.min(255,g+80)},${Math.min(255,b+80)},${a})`
}
function darken(hex:string){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16)
  return `rgb(${Math.max(0,r-40)},${Math.max(0,g-40)},${Math.max(0,b-40)})`
}

export default function OrbPage(){
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<OrbState>('idle')
  const tRef = useRef(0)
  const stateTimeRef = useRef(0)
  const animRef = useRef<number>(0)
  const lastTimeRef = useRef(0)
  const audioAmpRef = useRef(0)
  const smoothAmpRef = useRef(0)
  const breathRef = useRef(1)
  const glowRef = useRef(0.6)
  const morphRef = useRef(0.4)
  const rotRef = useRef(0)
  const orbOffXRef = useRef(0)
  const orbOffYRef = useRef(0)
  const springVelXRef = useRef(0)
  const springVelYRef = useRef(0)
  const rippleScaleRef = useRef(0)
  const rippleOpRef = useRef(0)
  const chargeRef = useRef(0)
  const isDraggingRef = useRef(false)
  const analyserRef = useRef<AnalyserNode|null>(null)
  const dataArrRef = useRef<Uint8Array|null>(null)
  const audioCtxRef = useRef<AudioContext|null>(null)
  const micActiveRef = useRef(false)
  const longPressRef = useRef<ReturnType<typeof setTimeout>|null>(null)
  const isChargingRef = useRef(false)

  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [fps, setFps] = useState(60)
  const [vol, setVol] = useState(0)
  const [micOn, setMicOn] = useState(false)
  const framesRef = useRef(0)
  const lastFpsTimeRef = useRef(0)

  const setStateVal = useCallback((s:OrbState)=>{
    stateRef.current = s
    stateTimeRef.current = 0
    setOrbState(s)
    // particle burst via DOM
    const wrap = document.getElementById('orb-wrap')
    if(wrap){
      for(let i=0;i<14;i++){
        const p = document.createElement('div')
        const angle=(i/14)*360+Math.random()*20
        const dist=60+Math.random()*70
        const size=2+Math.random()*4
        const dur=1.2+Math.random()*1.2
        Object.assign(p.style,{
          position:'absolute',borderRadius:'50%',
          width:size+'px',height:size+'px',
          left:'50%',top:'50%',
          marginLeft:-size/2+'px',marginTop:-size/2+'px',
          background:PALETTES[s].c1,
          boxShadow:`0 0 6px ${PALETTES[s].c1}`,
          pointerEvents:'none',
          transition:'none',
          animation:`none`,
        })
        wrap.appendChild(p)
        const x1=Math.cos(angle*Math.PI/180)*dist
        const y1=Math.sin(angle*Math.PI/180)*dist
        p.animate([
          {transform:'translate(0,0) scale(1)',opacity:'0.9'},
          {transform:`translate(${x1}px,${y1}px) scale(0)`,opacity:'0'}
        ],{duration:dur*1000,delay:Math.random()*300,fill:'forwards'}).onfinish=()=>p.remove()
      }
    }
  },[])

  useEffect(()=>{
    const canvas = canvasRef.current; if(!canvas) return
    const ctx = canvas.getContext('2d'); if(!ctx) return
    const W=440,H=440,R=220

    function drawFrame(){
      ctx!.clearRect(0,0,W,H)
      const s = stateRef.current
      const pal = PALETTES[s]
      const cx=R+orbOffXRef.current, cy=R+orbOffYRef.current
      const breath=breathRef.current, sa=smoothAmpRef.current
      const glow=glowRef.current, morph=morphRef.current

      // outer glow
      const outerR=140*breath+sa*18
      const og=ctx!.createRadialGradient(cx,cy,outerR*0.5,cx,cy,outerR*1.4)
      og.addColorStop(0,'rgba('+hexToRgb(pal.c1)+',0.12)')
      og.addColorStop(0.6,'rgba('+hexToRgb(pal.c1)+',0.04)')
      og.addColorStop(1,'transparent')
      ctx!.save(); ctx!.globalAlpha=glow
      ctx!.fillStyle=og
      ctx!.beginPath(); ctx!.arc(cx,cy,outerR*1.5,0,Math.PI*2); ctx!.fill()
      ctx!.restore()

      // blob
      const blobR=110*breath
      ctx!.save(); ctx!.beginPath()
      const pts=80
      for(let i=0;i<=pts;i++){
        const a=(i/pts)*Math.PI*2
        const nx=Math.cos(a),ny=Math.sin(a)
        const n=noise(nx,ny,tRef.current*0.4+stateTimeRef.current*0.5)
        const distort=morph*16+sa*22
        const r2=blobR+n*distort+sa*Math.sin(a*4+tRef.current)*8
        const x=cx+Math.cos(a)*r2, y=cy+Math.sin(a)*r2
        i===0?ctx!.moveTo(x,y):ctx!.lineTo(x,y)
      }
      ctx!.closePath()
      const bg=ctx!.createRadialGradient(cx-20,cy-25,5,cx,cy,blobR*1.1)
      bg.addColorStop(0,lighten(pal.c1,0.9)); bg.addColorStop(0.35,pal.c1)
      bg.addColorStop(0.65,pal.c2); bg.addColorStop(1,darken(pal.c3))
      ctx!.fillStyle=bg; ctx!.shadowColor=pal.c1; ctx!.shadowBlur=20+sa*25
      ctx!.fill(); ctx!.restore()

      // inner highlight
      ctx!.save()
      const ig=ctx!.createRadialGradient(cx-28,cy-28,2,cx,cy,blobR*0.6)
      ig.addColorStop(0,'rgba(255,255,255,0.7)'); ig.addColorStop(0.3,'rgba(255,255,255,0.15)'); ig.addColorStop(1,'transparent')
      ctx!.fillStyle=ig; ctx!.beginPath(); ctx!.arc(cx,cy,blobR*0.75,0,Math.PI*2); ctx!.fill(); ctx!.restore()

      // waveform rings
      if(s==='speaking'||s==='listening'){
        ctx!.save(); ctx!.globalAlpha=0.5+sa*0.4
        for(let ring=0;ring<3;ring++){
          const wR=blobR+4+ring*8; ctx!.beginPath()
          for(let i=0;i<=60;i++){
            const a=(i/60)*Math.PI*2
            const wave=Math.sin(a*(6+ring*2)+tRef.current*(2+ring)+stateTimeRef.current)*(sa*12+2)
            const wr=wR+wave
            const x=cx+Math.cos(a)*wr, y=cy+Math.sin(a)*wr
            i===0?ctx!.moveTo(x,y):ctx!.lineTo(x,y)
          }
          ctx!.closePath()
          ctx!.strokeStyle=ring===0?pal.c1:ring===1?pal.c2:pal.c3
          ctx!.lineWidth=1.5-ring*0.3; ctx!.stroke()
        }
        ctx!.restore()
      }

      // thinking pattern
      if(s==='thinking'){
        ctx!.save(); ctx!.translate(cx,cy); ctx!.rotate(rotRef.current)
        ctx!.globalAlpha=0.3+Math.sin(tRef.current*2)*0.1
        for(let i=0;i<8;i++){
          const a=(i/8)*Math.PI*2
          ctx!.beginPath(); ctx!.moveTo(Math.cos(a)*blobR*0.5,Math.sin(a)*blobR*0.5)
          ctx!.lineTo(Math.cos(a)*blobR*0.85,Math.sin(a)*blobR*0.85)
          ctx!.strokeStyle=i%2===0?pal.c1:pal.c2; ctx!.lineWidth=1; ctx!.stroke()
        }
        ctx!.restore()
      }

      // ripple
      if(rippleOpRef.current>0){
        ctx!.save(); ctx!.globalAlpha=rippleOpRef.current
        ctx!.beginPath(); ctx!.arc(cx,cy,blobR*rippleScaleRef.current,0,Math.PI*2)
        ctx!.strokeStyle=pal.c1; ctx!.lineWidth=2; ctx!.stroke(); ctx!.restore()
      }

      // charge
      if(chargeRef.current>0){
        ctx!.save(); ctx!.globalAlpha=chargeRef.current*0.6
        const cg=ctx!.createRadialGradient(cx,cy,blobR*0.5,cx,cy,blobR*1.2)
        cg.addColorStop(0,'transparent'); cg.addColorStop(0.7,pal.glow); cg.addColorStop(1,'transparent')
        ctx!.fillStyle=cg; ctx!.beginPath(); ctx!.arc(cx,cy,blobR*1.3,0,Math.PI*2); ctx!.fill(); ctx!.restore()
      }
    }

    function hexToRgb(hex:string){
      const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16)
      return `${r},${g},${b}`
    }

    function tick(ts:number){
      const dt=Math.min((ts-lastTimeRef.current)/1000,0.05)
      lastTimeRef.current=ts; tRef.current+=dt; stateTimeRef.current+=dt
      framesRef.current++
      if(ts-lastFpsTimeRef.current>1000){
        setFps(Math.round(framesRef.current*1000/(ts-lastFpsTimeRef.current)))
        framesRef.current=0; lastFpsTimeRef.current=ts
        setVol(Math.round(smoothAmpRef.current*100))
      }

      // audio
      if(analyserRef.current&&dataArrRef.current){
        analyserRef.current.getByteFrequencyData(dataArrRef.current)
        let sum=0; for(let i=0;i<dataArrRef.current.length;i++) sum+=dataArrRef.current[i]
        audioAmpRef.current=Math.min(1,(sum/dataArrRef.current.length)/90)
      } else {
        const s=stateRef.current
        if(s==='speaking') audioAmpRef.current=0.3+Math.sin(tRef.current*8)*0.2+Math.sin(tRef.current*13)*0.1+Math.random()*0.05
        else if(s==='listening') audioAmpRef.current=0.1+Math.sin(tRef.current*5)*0.08+Math.random()*0.04
        else audioAmpRef.current=0
      }
      smoothAmpRef.current+=(audioAmpRef.current-smoothAmpRef.current)*0.15

      // state anim
      const sa=smoothAmpRef.current, st=stateTimeRef.current, t=tRef.current
      switch(stateRef.current){
        case 'idle':
          breathRef.current=1+Math.sin(st*0.8)*0.022
          glowRef.current=0.5+Math.sin(st*0.6)*0.1
          morphRef.current=0.4+Math.sin(st*0.5)*0.2; break
        case 'listening':
          breathRef.current=1+Math.sin(st*1.8)*0.04+sa*0.06
          glowRef.current=0.7+sa*0.3; morphRef.current=0.6+sa*0.8; break
        case 'thinking':
          breathRef.current=1+Math.sin(st*1.2)*0.03
          glowRef.current=0.6+Math.sin(st*2)*0.15
          morphRef.current=0.8+Math.sin(st*0.7)*0.3
          rotRef.current+=dt*0.6; break
        case 'speaking':
          breathRef.current=1+sa*0.12+Math.sin(st*3)*0.02
          glowRef.current=0.8+sa*0.4; morphRef.current=0.7+sa*1.2; break
      }

      // spring
      const stiff=0.15,damp=0.75
      springVelXRef.current+=(-orbOffXRef.current)*stiff
      springVelYRef.current+=(-orbOffYRef.current)*stiff
      springVelXRef.current*=damp; springVelYRef.current*=damp
      if(!isDraggingRef.current){
        orbOffXRef.current+=springVelXRef.current
        orbOffYRef.current+=springVelYRef.current
      }

      // ripple decay
      if(rippleOpRef.current>0){ rippleScaleRef.current+=0.08; rippleOpRef.current-=0.04 }
      if(!isChargingRef.current&&chargeRef.current>0) chargeRef.current-=0.03

      drawFrame()
      animRef.current=requestAnimationFrame(tick)
    }
    animRef.current=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(animRef.current)
  },[])

  // Touch handlers
  const getXY = (e:React.MouseEvent|React.TouchEvent)=>{
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const touch = ('touches' in e) ? e.touches[0] : e
    return { x:(touch.clientX-rect.left-rect.width/2), y:(touch.clientY-rect.top-rect.height/2) }
  }

  const onDown = (e:React.MouseEvent|React.TouchEvent)=>{
    isDraggingRef.current=true
    const {x,y}=getXY(e)
    orbOffXRef.current=x*0.3; orbOffYRef.current=y*0.3
    longPressRef.current=setTimeout(()=>{
      isChargingRef.current=true; chargeRef.current=0
      const iv=setInterval(()=>{
        chargeRef.current=Math.min(1,chargeRef.current+0.05)
        if(chargeRef.current>=1){ clearInterval(iv); onChargeRelease() }
      },50)
    },400)
  }

  const onUp = ()=>{
    if(!isDraggingRef.current) return
    isDraggingRef.current=false
    if(longPressRef.current) clearTimeout(longPressRef.current)
    if(isChargingRef.current){ isChargingRef.current=false; if(chargeRef.current<0.8) chargeRef.current=0; else onChargeRelease(); return }
    rippleScaleRef.current=0.8; rippleOpRef.current=0.8
    cycleState()
  }

  const onMove = (e:React.MouseEvent|React.TouchEvent)=>{
    if(!isDraggingRef.current) return
    const {x,y}=getXY(e)
    orbOffXRef.current=x*0.25; orbOffYRef.current=y*0.25
  }

  const onChargeRelease = ()=>{ chargeRef.current=1; setTimeout(()=>chargeRef.current=0,200); rippleScaleRef.current=0.5; rippleOpRef.current=1 }

  const states:OrbState[]=['idle','listening','thinking','speaking']
  const cycleState = ()=>{ const next=states[(states.indexOf(stateRef.current)+1)%states.length]; setStateVal(next) }

  const toggleMic = async()=>{
    if(micActiveRef.current){
      micActiveRef.current=false; setMicOn(false)
      if(audioCtxRef.current){ audioCtxRef.current.close(); audioCtxRef.current=null; analyserRef.current=null }
      setStateVal('idle'); return
    }
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true})
      const ac=new AudioContext()
      const src=ac.createMediaStreamSource(stream)
      const an=ac.createAnalyser(); an.fftSize=256
      src.connect(an)
      audioCtxRef.current=ac; analyserRef.current=an; dataArrRef.current=new Uint8Array(an.frequencyBinCount)
      micActiveRef.current=true; setMicOn(true); setStateVal('listening')
    }catch{ alert('Mic permission denied') }
  }

  const pal=PALETTES[orbState]

  return(
    <div style={{minHeight:'100vh',background:'#020810',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:"'Rajdhani',sans-serif",overflow:'hidden',position:'relative',userSelect:'none'}}>
      {/* bg */}
      <div style={{position:'fixed',inset:0,background:'radial-gradient(ellipse 80% 60% at 50% 50%,#050f1f 0%,#020810 100%)',zIndex:0}}/>

      <div style={{position:'relative',zIndex:10,display:'flex',flexDirection:'column',alignItems:'center',padding:'20px',gap:'0'}}>
        {/* state label */}
        <div style={{fontFamily:'monospace',fontSize:'10px',letterSpacing:'4px',color:pal.c1,opacity:0.7,marginBottom:'8px',height:'16px',textTransform:'uppercase'}}>
          {STATE_LABELS[orbState]}
        </div>

        {/* orb area */}
        <div id="orb-wrap" style={{position:'relative',width:'220px',height:'220px',cursor:'pointer'}}
          onMouseDown={onDown} onMouseUp={onUp} onMouseMove={onMove} onMouseLeave={onUp}
          onTouchStart={onDown} onTouchEnd={onUp} onTouchMove={onMove}>
          {/* energy rings */}
          {[0,1,2].map(i=>(
            <div key={i} style={{position:'absolute',borderRadius:'50%',border:`1px solid ${i===0?'rgba(0,229,255,0.15)':i===1?'rgba(139,92,246,0.1)':'rgba(0,229,255,0.06)'}`,inset:`${i===0?-20:i===1?-35:-52}px`,pointerEvents:'none',animation:`orbRing${i} ${3+i}s ease-in-out infinite`,animationDelay:`${i*0.5}s`}}/>
          ))}
          <canvas ref={canvasRef} width={440} height={440} style={{width:'220px',height:'220px',borderRadius:'50%',position:'relative',zIndex:5}}/>
        </div>

        <div style={{fontFamily:'monospace',fontSize:'22px',fontWeight:700,letterSpacing:'8px',color:'#fff',marginTop:'24px',textShadow:`0 0 20px ${pal.c1}`}}>JARVIS</div>
        <div style={{fontSize:'11px',letterSpacing:'3px',color:`${pal.c1}88`,marginTop:'4px'}}>AI ASSISTANT v10.44</div>

        <div style={{marginTop:'14px',fontSize:'13px',letterSpacing:'1px',color:'rgba(255,255,255,0.5)',minHeight:'18px',textAlign:'center'}}>
          {STATE_STATUS[orbState]}
        </div>

        {/* vol bar */}
        <div style={{display:'flex',gap:'2px',alignItems:'flex-end',height:'20px',marginTop:'14px'}}>
          {Array.from({length:20},(_,i)=>(
            <div key={i} style={{width:'3px',borderRadius:'2px',height:'4px',background:i<Math.round(smoothAmpRef.current*20)?pal.c1:'rgba(0,229,255,0.15)',transition:'background 0.1s'}}/>
          ))}
        </div>

        {/* controls */}
        <div style={{display:'flex',gap:'10px',marginTop:'24px',flexWrap:'wrap',justifyContent:'center'}}>
          {states.map(s=>(
            <button key={s} onClick={()=>setStateVal(s)} style={{fontFamily:'monospace',fontSize:'11px',letterSpacing:'2px',padding:'7px 14px',borderRadius:'20px',border:`1px solid ${orbState===s?pal.c1:'rgba(0,229,255,0.25)'}`,background:orbState===s?`${pal.c1}20`:'rgba(0,229,255,0.05)',color:orbState===s?pal.c1:'rgba(0,229,255,0.6)',cursor:'pointer',transition:'all 0.2s',textTransform:'uppercase'}}>
              {s==='idle'?'● Idle':s==='listening'?'👂 Listen':s==='thinking'?'🧠 Think':'🔊 Speak'}
            </button>
          ))}
          <button onClick={toggleMic} style={{fontFamily:'monospace',fontSize:'11px',letterSpacing:'2px',padding:'7px 14px',borderRadius:'20px',border:`1px solid ${micOn?'#ff5252':'rgba(0,229,255,0.25)'}`,background:micOn?'rgba(255,82,82,0.15)':'rgba(0,229,255,0.05)',color:micOn?'#ff5252':'rgba(0,229,255,0.6)',cursor:'pointer',textTransform:'uppercase'}}>
            {micOn?'🎤 MIC OFF':'🎤 MIC'}
          </button>
        </div>

        {/* info */}
        <div style={{display:'flex',gap:'24px',marginTop:'16px'}}>
          {[['FPS',fps],['VOL',vol],['STATE',orbState.toUpperCase()]].map(([l,v])=>(
            <div key={l as string} style={{textAlign:'center'}}>
              <div style={{fontSize:'14px',fontWeight:600,color:`${pal.c1}cc`,fontFamily:'monospace'}}>{v}</div>
              <div style={{fontSize:'10px',letterSpacing:'1.5px',color:'rgba(255,255,255,0.3)'}}>{l}</div>
            </div>
          ))}
        </div>

        {/* back */}
        <Link href="/" style={{marginTop:'24px',fontSize:'11px',letterSpacing:'2px',color:'rgba(0,229,255,0.4)',textDecoration:'none',border:'1px solid rgba(0,229,255,0.15)',padding:'6px 16px',borderRadius:'16px'}}>← JARVIS HOME</Link>
      </div>

      <style>{`
        @keyframes orbRing0{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(1.04);opacity:1}}
        @keyframes orbRing1{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.05);opacity:0.9}}
        @keyframes orbRing2{0%,100%{transform:scale(1);opacity:0.4}50%{transform:scale(1.06);opacity:0.8}}
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;600&display=swap');
      `}</style>
    </div>
  )
}
