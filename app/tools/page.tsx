'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type Tool = 'calculator' | 'qr' | 'password' | 'pomodoro' | 'color' | 'json' | 'unit'

export default function ToolsPage() {
  const [active, setActive] = useState<Tool>('calculator')
  const [calcVal, setCalcVal] = useState('0')
  const [calcExpr, setCalcExpr] = useState('')
  const [qrText, setQrText] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [pass, setPass] = useState('')
  const [passLen, setPassLen] = useState(16)
  const [passOpts, setPassOpts] = useState({upper:true,lower:true,num:true,sym:true})
  const [pomTime, setPomTime] = useState(25*60)
  const [pomRunning, setPomRunning] = useState(false)
  const [pomMode, setPomMode] = useState<'work'|'break'>('work')
  const [color, setColor] = useState('#ec4899')
  const [jsonIn, setJsonIn] = useState('')
  const [jsonOut, setJsonOut] = useState('')
  const [unitVal, setUnitVal] = useState('')
  const [unitFrom, setUnitFrom] = useState('km')
  const [unitTo, setUnitTo] = useState('miles')
  const [unitResult, setUnitResult] = useState('')

  // Pomodoro timer
  useEffect(() => {
    if (!pomRunning) return
    const id = setInterval(() => {
      setPomTime(t => {
        if (t <= 1) {
          setPomRunning(false)
          setPomMode(m => m === 'work' ? 'break' : 'work')
          return t === 1 ? (pomMode === 'work' ? 5*60 : 25*60) : 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [pomRunning, pomMode])

  function calcBtn(v: string) {
    if (v === 'C') { setCalcVal('0'); setCalcExpr(''); return }
    if (v === '=') {
      try {
        const res = Function('"use strict"; return (' + calcExpr + ')')()
        setCalcVal(String(res))
        setCalcExpr(String(res))
      } catch { setCalcVal('Error') }
      return
    }
    if (v === '⌫') {
      const e = calcExpr.slice(0,-1) || '0'
      setCalcExpr(e); setCalcVal(e)
      return
    }
    const next = (calcExpr === '0' && !isNaN(Number(v))) ? v : calcExpr + v
    setCalcExpr(next); setCalcVal(next)
  }

  function genQR() {
    if (!qrText) return
    setQrUrl('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(qrText))
  }

  function genPass() {
    const chars = (passOpts.upper?'ABCDEFGHIJKLMNOPQRSTUVWXYZ':'') +
      (passOpts.lower?'abcdefghijklmnopqrstuvwxyz':'') +
      (passOpts.num?'0123456789':'') +
      (passOpts.sym?'!@#$%^&*()_+-=[]{}':'')
    if (!chars) return
    let p = ''
    for (let i=0;i<passLen;i++) p += chars[Math.floor(Math.random()*chars.length)]
    setPass(p)
  }

  function fmtJSON() {
    try { setJsonOut(JSON.stringify(JSON.parse(jsonIn), null, 2)) }
    catch(e) { setJsonOut('Error: ' + String(e)) }
  }

  function convertUnit() {
    const v = parseFloat(unitVal)
    if (isNaN(v)) return
    const conversions: Record<string,Record<string,number>> = {
      km: {miles:0.621371, m:1000, feet:3280.84},
      miles: {km:1.60934, m:1609.34, feet:5280},
      kg: {lbs:2.20462, g:1000, oz:35.274},
      lbs: {kg:0.453592, g:453.592, oz:16},
      celsius: {fahrenheit:0,kelvin:0},
      fahrenheit: {celsius:0,kelvin:0},
      celsius_special: {},
    }
    if (unitFrom === 'celsius' && unitTo === 'fahrenheit') { setUnitResult(((v*9/5)+32).toFixed(4) + ' °F'); return }
    if (unitFrom === 'fahrenheit' && unitTo === 'celsius') { setUnitResult(((v-32)*5/9).toFixed(4) + ' °C'); return }
    if (unitFrom === 'celsius' && unitTo === 'kelvin') { setUnitResult((v+273.15).toFixed(4) + ' K'); return }
    const rate = conversions[unitFrom]?.[unitTo]
    if (rate) setUnitResult((v * rate).toFixed(4) + ' ' + unitTo)
    else setUnitResult('Conversion not supported')
  }

  const pomMin = String(Math.floor(pomTime/60)).padStart(2,'0')
  const pomSec = String(pomTime%60).padStart(2,'0')

  const hexToRgb = (h: string) => {
    const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16)
    return 'rgb(' + r + ', ' + g + ', ' + b + ')'
  }
  const hexToHsl = (h: string) => {
    let r=parseInt(h.slice(1,3),16)/255, g=parseInt(h.slice(3,5),16)/255, b=parseInt(h.slice(5,7),16)/255
    const max=Math.max(r,g,b), min=Math.min(r,g,b)
    let hl=0, s=0, l=(max+min)/2
    if(max!==min){const d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);switch(max){case r:hl=((g-b)/d+(g<b?6:0))/6;break;case g:hl=((b-r)/d+2)/6;break;case b:hl=((r-g)/d+4)/6}}
    return 'hsl(' + Math.round(hl*360) + ', ' + Math.round(s*100) + '%, ' + Math.round(l*100) + '%)'
  }

  const tools: {id:Tool,label:string,emoji:string}[] = [
    {id:'calculator',label:'Calc',emoji:'🔢'},
    {id:'qr',label:'QR',emoji:'📱'},
    {id:'password',label:'Pass',emoji:'🔐'},
    {id:'pomodoro',label:'Timer',emoji:'⏱️'},
    {id:'color',label:'Color',emoji:'🎨'},
    {id:'json',label:'JSON',emoji:'📝'},
    {id:'unit',label:'Units',emoji:'📐'},
  ]

  const inp = {border:'1px solid #334',background:'#0a1628',color:'#e0f0ff',padding:'8px 12px',borderRadius:'8px',fontSize:'14px',width:'100%',outline:'none'}
  const btn = {border:'none',cursor:'pointer',borderRadius:'8px',padding:'8px 14px',fontSize:'13px',fontWeight:600 as const}

  return (
    <div style={{minHeight:'100vh',background:'#040e1a',color:'#e0f0ff',fontFamily:'monospace',display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{padding:'12px 16px',background:'#0a1628',borderBottom:'1px solid #1a3a5a',display:'flex',alignItems:'center',gap:'12px'}}>
        <Link href="/" style={{color:'#00e5ff',textDecoration:'none',fontSize:'12px',border:'1px solid #00e5ff33',padding:'4px 10px',borderRadius:'8px'}}>⚡ JARVIS</Link>
        <span style={{fontSize:'16px',fontWeight:700,color:'#00e5ff'}}>🛠️ Tools</span>
      </div>

      {/* Tool tabs */}
      <div style={{display:'flex',gap:'6px',padding:'10px 12px',overflowX:'auto',background:'#030a14',borderBottom:'1px solid #1a3a5a'}}>
        {tools.map(t => (
          <button key={t.id} onClick={()=>setActive(t.id)} style={{...btn,padding:'6px 12px',background:active===t.id?'#00e5ff22':'#0a1628',color:active===t.id?'#00e5ff':'#888',border:'1px solid '+(active===t.id?'#00e5ff':'#1a3a5a'),whiteSpace:'nowrap'}}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div style={{flex:1,padding:'16px',maxWidth:'480px',margin:'0 auto',width:'100%'}}>

        {/* CALCULATOR */}
        {active==='calculator'&&<div>
          <div style={{background:'#0a1628',borderRadius:'12px',padding:'14px',marginBottom:'12px',textAlign:'right',fontSize:'24px',fontWeight:700,letterSpacing:'1px',minHeight:'60px',overflowX:'auto',border:'1px solid #1a3a5a'}}>{calcVal}</div>
          {[['7','8','9','÷'],['4','5','6','×'],['1','2','3','-'],['0','.','⌫','+'],['C','(',')',  '=']].map((row,ri)=>(
            <div key={ri} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'8px',marginBottom:'8px'}}>
              {row.map(k=>(
                <button key={k} onClick={()=>calcBtn(k==='÷'?'/':k==='×'?'*':k)} style={{...btn,padding:'14px',fontSize:'16px',background:k==='='?'#00e5ff':k==='C'?'#ff5252':['+','-','×','÷'].includes(k)?'#1a3a6a':'#0a1628',color:k==='='?'#000':'#e0f0ff',border:'1px solid #1a3a5a',borderRadius:'10px'}}>{k}</button>
              ))}
            </div>
          ))}
        </div>}

        {/* QR GENERATOR */}
        {active==='qr'&&<div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          <input style={inp} placeholder="Text ya URL daalo..." value={qrText} onChange={e=>setQrText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&genQR()}/>
          <button onClick={genQR} style={{...btn,background:'#00e5ff',color:'#000',padding:'12px'}}>📱 QR Banao</button>
          {qrUrl&&<div style={{textAlign:'center'}}>
            <img src={qrUrl} alt="QR" style={{borderRadius:'12px',border:'4px solid #00e5ff33',maxWidth:'200px'}}/>
            <a href={qrUrl} download="qr.png" style={{display:'block',marginTop:'8px',color:'#00e5ff',fontSize:'12px'}}>⬇️ Download</a>
          </div>}
        </div>}

        {/* PASSWORD GENERATOR */}
        {active==='password'&&<div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <span style={{fontSize:'13px'}}>Length: {passLen}</span>
            <input type="range" min={8} max={64} value={passLen} onChange={e=>setPassLen(Number(e.target.value))} style={{flex:1}}/>
          </div>
          {(['upper','lower','num','sym'] as const).map(o=>(
            <label key={o} style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'}}>
              <input type="checkbox" checked={passOpts[o]} onChange={()=>setPassOpts(p=>({...p,[o]:!p[o]}))}/>
              <span style={{fontSize:'13px'}}>{o==='upper'?'A-Z':o==='lower'?'a-z':o==='num'?'0-9':'Symbols !@#$'}</span>
            </label>
          ))}
          <button onClick={genPass} style={{...btn,background:'#8b5cf6',color:'#fff',padding:'12px'}}>🔐 Generate</button>
          {pass&&<div style={{background:'#0a1628',border:'1px solid #8b5cf6',borderRadius:'8px',padding:'12px',wordBreak:'break-all',fontSize:'14px',letterSpacing:'1px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'8px'}}>
            <span>{pass}</span>
            <button onClick={()=>navigator.clipboard.writeText(pass)} style={{...btn,background:'#8b5cf622',color:'#8b5cf6',padding:'6px 10px',fontSize:'11px',border:'1px solid #8b5cf6'}}>Copy</button>
          </div>}
        </div>}

        {/* POMODORO */}
        {active==='pomodoro'&&<div style={{textAlign:'center',display:'flex',flexDirection:'column',gap:'16px'}}>
          <div style={{fontSize:'12px',color:pomMode==='work'?'#00e5ff':'#00e676',textTransform:'uppercase',letterSpacing:'2px'}}>{pomMode==='work'?'🔥 Work Time':'☕ Break Time'}</div>
          <div style={{fontSize:'72px',fontWeight:900,letterSpacing:'4px',color:pomMode==='work'?'#00e5ff':'#00e676',fontFamily:'monospace'}}>{pomMin}:{pomSec}</div>
          <div style={{display:'flex',gap:'12px',justifyContent:'center'}}>
            <button onClick={()=>setPomRunning(r=>!r)} style={{...btn,background:pomRunning?'#ff5252':'#00e5ff',color:'#000',padding:'12px 24px',fontSize:'16px'}}>{pomRunning?'⏸ Pause':'▶ Start'}</button>
            <button onClick={()=>{setPomRunning(false);setPomTime(pomMode==='work'?25*60:5*60)}} style={{...btn,background:'#1a3a6a',color:'#e0f0ff',padding:'12px 24px',fontSize:'16px'}}>↺ Reset</button>
          </div>
          <div style={{display:'flex',gap:'8px',justifyContent:'center'}}>
            {[[25,'Work'],[5,'Short'],[15,'Long']].map(([m,l])=>(
              <button key={l} onClick={()=>{setPomRunning(false);setPomTime(Number(m)*60)}} style={{...btn,background:'#0a1628',color:'#888',border:'1px solid #1a3a5a',padding:'8px 14px'}}>{l} {m}m</button>
            ))}
          </div>
        </div>}

        {/* COLOR PICKER */}
        {active==='color'&&<div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          <div style={{width:'100%',height:'120px',borderRadius:'16px',background:color,border:'2px solid #1a3a5a'}}/>
          <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{width:'100%',height:'48px',border:'none',borderRadius:'8px',cursor:'pointer',background:'none'}}/>
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {[['HEX',color],['RGB',hexToRgb(color)],['HSL',hexToHsl(color)]].map(([label,val])=>(
              <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#0a1628',border:'1px solid #1a3a5a',borderRadius:'8px',padding:'10px 14px'}}>
                <span style={{fontSize:'11px',color:'#888'}}>{label}</span>
                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  <span style={{fontSize:'13px'}}>{val}</span>
                  <button onClick={()=>navigator.clipboard.writeText(val)} style={{...btn,background:'#1a3a6a',color:'#00e5ff',padding:'4px 8px',fontSize:'10px'}}>Copy</button>
                </div>
              </div>
            ))}
          </div>
        </div>}

        {/* JSON FORMATTER */}
        {active==='json'&&<div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <textarea value={jsonIn} onChange={e=>setJsonIn(e.target.value)} placeholder='{"key":"value"}' style={{...inp,height:'140px',resize:'vertical',fontFamily:'monospace'}}/>
          <button onClick={fmtJSON} style={{...btn,background:'#00e5ff',color:'#000',padding:'10px'}}>📝 Format / Validate</button>
          {jsonOut&&<pre style={{background:'#0a1628',border:'1px solid #1a3a5a',borderRadius:'8px',padding:'12px',fontSize:'11px',overflowX:'auto',maxHeight:'200px',overflowY:'auto',whiteSpace:'pre-wrap',wordBreak:'break-all'}}>{jsonOut}</pre>}
        </div>}

        {/* UNIT CONVERTER */}
        {active==='unit'&&<div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          <input style={inp} type="number" placeholder="Value daalo..." value={unitVal} onChange={e=>setUnitVal(e.target.value)}/>
          <div style={{display:'flex',gap:'8px'}}>
            {[
              ['km','miles','m','feet','kg','lbs','g','oz','celsius','fahrenheit','kelvin'].map(u=>(
                <option key={u} value={u}>{u}</option>
              ))
            ]}
            <select value={unitFrom} onChange={e=>setUnitFrom(e.target.value)} style={{...inp,flex:1}}>
              {['km','miles','m','feet','kg','lbs','g','oz','celsius','fahrenheit'].map(u=><option key={u}>{u}</option>)}
            </select>
            <span style={{display:'flex',alignItems:'center',color:'#888'}}>→</span>
            <select value={unitTo} onChange={e=>setUnitTo(e.target.value)} style={{...inp,flex:1}}>
              {['miles','km','feet','m','lbs','kg','oz','g','fahrenheit','celsius','kelvin'].map(u=><option key={u}>{u}</option>)}
            </select>
          </div>
          <button onClick={convertUnit} style={{...btn,background:'#ec4899',color:'#fff',padding:'12px'}}>📐 Convert</button>
          {unitResult&&<div style={{background:'#0a1628',border:'1px solid #ec4899',borderRadius:'8px',padding:'14px',textAlign:'center',fontSize:'20px',fontWeight:700}}>{unitResult}</div>}
        </div>}

      </div>
    </div>
  )
}
