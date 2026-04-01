/* eslint-disable */
// @ts-nocheck
'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
const LABELS = {idle:'ASK ANYTHING',listening:'LISTENING...',thinking:'THINKING...',speaking:'SPEAKING...'}
export default function OrbPage() {
  const C = useRef(null)
  const stRef = useRef('idle')
  const micR = useRef({ctx:null,an:null,data:null})
  const [st, setSt] = useState('idle')
  const [mic, setMic] = useState(false)
  useEffect(() => {
    const cv = C.current, SZ = 320
    cv.width = cv.height = SZ
    const ctx = cv.getContext('2d'), cx = SZ/2, cy = SZ/2
    const N=420, R0=108, PHI=Math.PI*(3-Math.sqrt(5))
    const dots = []
    for(let i=0;i<N;i++){
      const y=1-(i/(N-1))*2, r=Math.sqrt(Math.max(0,1-y*y)), th=PHI*i
      dots.push({bx:Math.cos(th)*r,by:y,bz:Math.sin(th)*r,
        px:cx+Math.cos(th)*r*R0,py:cy+y*R0,vx:0,vy:0,
        phase:Math.random()*Math.PI*2,sz:1.2+Math.random()*0.8})
    }
    let t=0,ry=0,amp=0,sX=cx,sY=cy,sAmt=0,sOn=false
    function lerp(a,b,f){return a+(b-a)*f}
    function frame(){
      ctx.clearRect(0,0,SZ,SZ)
      t+=0.014; ry+=0.004
      if(micR.current.an&&micR.current.data){
        micR.current.an.getByteFrequencyData(micR.current.data)
        let s=0; for(let i=0;i<micR.current.data.length;i++) s+=micR.current.data[i]
        amp=amp*0.85+Math.min(1,s/micR.current.data.length/75)*0.15
      } else {
        const ss=stRef.current
        const tg=ss==='speaking'?0.38+Math.sin(t*9)*0.22+Math.sin(t*17)*0.08
          :ss==='listening'?0.15+Math.sin(t*5)*0.08
          :ss==='thinking'?0.08+Math.sin(t*2.5)*0.04:0
        amp=amp*0.88+tg*0.12
      }
      if(sOn) sAmt=Math.min(1,sAmt+0.1); else sAmt=Math.max(0,sAmt-0.04)
      if(amp>0.1){
        const g=ctx.createRadialGradient(cx,cy,0,cx,cy,R0*1.3)
        g.addColorStop(0,'rgba(255,255,255,'+amp*0.03+')'); g.addColorStop(1,'transparent')
        ctx.fillStyle=g; ctx.fillRect(0,0,SZ,SZ)
      }
      for(let i=0;i<N;i++){
        const d=dots[i]
        const cr=Math.cos(ry),sr=Math.sin(ry)
        const rx=d.bx*cr-d.bz*sr, rz=d.bx*sr+d.bz*cr
        const pulse=1+amp*0.14+Math.sin(t*0.9+d.phase)*(0.008+amp*0.012)
        const R=R0*pulse
        const tx=cx+rx*R, ty=cy+d.by*R
        if(sAmt>0.005){
          if(sOn){
            const dx=d.px-sX,dy=d.py-sY,dist=Math.sqrt(dx*dx+dy*dy)+0.5
            const force=(180/(dist+40))*sAmt*0.5
            d.vx+=(dx/dist)*force; d.vy+=(dy/dist)*force
          } else {
            d.vx+=(tx-d.px)*0.12; d.vy+=(ty-d.py)*0.12
          }
          d.vx*=0.82; d.vy*=0.82; d.px+=d.vx; d.py+=d.vy
        } else {
          d.px=lerp(d.px,tx,0.13); d.py=lerp(d.py,ty,0.13); d.vx*=0.5; d.vy*=0.5
        }
        const depth=(rz+1)/2
        ctx.globalAlpha=0.12+depth*0.88
        ctx.fillStyle='#ffffff'
        ctx.beginPath()
        ctx.arc(d.px,d.py,Math.max(0.2,d.sz*(0.45+depth*0.65)*(1+amp*0.35)),0,Math.PI*2)
        ctx.fill()
      }
      ctx.globalAlpha=1
      requestAnimationFrame(frame)
    }
    const raf=requestAnimationFrame(frame)
    function gp(e){
      const rect=cv.getBoundingClientRect(),sx=cv.width/rect.width,sy=cv.height/rect.height
      const src=e.touches?e.touches[0]:e
      return[(src.clientX-rect.left)*sx,(src.clientY-rect.top)*sy]
    }
    function onD(e){e.preventDefault();const[x,y]=gp(e);sX=x;sY=y;sOn=true;sAmt=0}
    function onM(e){e.preventDefault();if(!sOn)return;const[x,y]=gp(e);sX=x;sY=y}
    function onU(){sOn=false}
    cv.addEventListener('mousedown',onD); cv.addEventListener('mousemove',onM)
    cv.addEventListener('mouseup',onU); cv.addEventListener('mouseleave',onU)
    cv.addEventListener('touchstart',onD,{passive:false})
    cv.addEventListener('touchmove',onM,{passive:false})
    cv.addEventListener('touchend',onU)
    let di=0
    const demo=setInterval(()=>{di=(di+1)%4;const s=['idle','listening','thinking','speaking'][di];stRef.current=s;setSt(s)},3000)
    return()=>{cancelAnimationFrame(raf);clearInterval(demo);cv.removeEventListener('mousedown',onD);cv.removeEventListener('mousemove',onM);cv.removeEventListener('mouseup',onU);cv.removeEventListener('touchstart',onD);cv.removeEventListener('touchmove',onM);cv.removeEventListener('touchend',onU)}
  },[])
  const setS=useCallback((s)=>{stRef.current=s;setSt(s)},[])
  const toggleMic=async()=>{
    if(mic){micR.current.ctx?.close();micR.current={ctx:null,an:null,data:null};setMic(false);setS('idle');return}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true})
      const ac=new AudioContext(),src=ac.createMediaStreamSource(stream),an=ac.createAnalyser()
      an.fftSize=256;src.connect(an)
      micR.current={ctx:ac,an,data:new Uint8Array(an.frequencyBinCount)};setMic(true);setS('listening')
    }catch{alert('Mic denied')}
  }
  return(
    <div style={{minHeight:'100vh',background:'#0c0c0c',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',userSelect:'none',overflow:'hidden',padding:'20px'}}>
      <p style={{fontFamily:'monospace',fontSize:'11px',letterSpacing:'3px',color:'rgba(255,255,255,0.3)',marginBottom:'24px',textTransform:'uppercase'}}>{LABELS[st]}</p>
      <canvas ref={C} style={{width:'240px',height:'240px',cursor:'pointer',touchAction:'none',display:'block'}}/>
      <button onClick={toggleMic} style={{marginTop:'36px',width:'56px',height:'56px',borderRadius:'50%',border:'1.5px solid '+(mic?'rgba(255,80,80,0.6)':'rgba(255,255,255,0.15)'),background:mic?'rgba(255,60,60,0.1)':'rgba(255,255,255,0.04)',color:mic?'#ff5050':'rgba(255,255,255,0.7)',fontSize:'22px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .3s'}}>{mic?'⏹':'🎤'}</button>
      <div style={{display:'flex',gap:'8px',marginTop:'18px',flexWrap:'wrap',justifyContent:'center'}}>
        {['idle','listening','thinking','speaking'].map(s=>(
          <button key={s} onClick={()=>setS(s)} style={{fontFamily:'monospace',fontSize:'10px',letterSpacing:'2px',padding:'5px 11px',borderRadius:'14px',border:'1px solid '+(st===s?'rgba(255,255,255,0.35)':'rgba(255,255,255,0.08)'),background:st===s?'rgba(255,255,255,0.07)':'transparent',color:st===s?'rgba(255,255,255,0.9)':'rgba(255,255,255,0.25)',cursor:'pointer',textTransform:'uppercase',transition:'all .2s'}}>{s}</button>
        ))}
      </div>
      <p style={{marginTop:'10px',fontFamily:'monospace',fontSize:'9px',color:'rgba(255,255,255,0.18)',letterSpacing:'1.5px'}}>SWIPE TO SCATTER · MIC FOR LIVE VOICE</p>
      <Link href="/" style={{marginTop:'22px',fontFamily:'monospace',fontSize:'10px',letterSpacing:'2px',color:'rgba(255,255,255,0.18)',textDecoration:'none',border:'1px solid rgba(255,255,255,0.08)',padding:'5px 14px',borderRadius:'12px'}}>← BACK</Link>
    </div>
  )
}
