'use client'
import { useState, useEffect } from 'react'
import {
  getSupportedNativeAPIs, getBatteryStatus, getNetworkInfo,
  requestWakeLock, releaseWakeLock,
  isBTSupported, isNFCSupported, isContactPickerSupported,
  getHardwareInfo, pickContact, readClipboard, writeClipboard,
  enterFullscreen, openFilePicker
} from '../lib/client/nativeWebApis'

export default function NativeFeatureDemo() {
  const [apis, setApis] = useState<Record<string,boolean>>({})
  const [battery, setBattery] = useState<any>(null)
  const [network, setNetwork] = useState<any>(null)
  const [hw, setHw] = useState<any>(null)
  const [log, setLog] = useState<string[]>([])
  const [wake, setWake] = useState(false)

  function addLog(msg: string) { setLog(l => [msg, ...l.slice(0,9)]) }

  useEffect(() => {
    setApis(getSupportedNativeAPIs())
    setNetwork(getNetworkInfo())
    setHw(getHardwareInfo())
    getBatteryStatus().then(b => setBattery(b))
  }, [])

  const s: any = {
    wrap: {background:'#040e1a',color:'#c8e0f0',padding:12,borderRadius:12,fontFamily:'monospace',fontSize:11},
    row: {display:'flex',flexWrap:'wrap' as const,gap:6,marginBottom:10},
    btn: {background:'#00e5ff15',border:'1px solid #00e5ff30',color:'#00e5ff',padding:'6px 10px',borderRadius:8,cursor:'pointer',fontSize:11},
    chip: (ok:boolean)=>({background:ok?'#00e67615':'#ff525215',border:'1px solid '+(ok?'#00e676':'#ff5252')+'40',color:ok?'#00e676':'#ff5252',padding:'2px 8px',borderRadius:20,fontSize:10}),
    log: {background:'#030a14',padding:8,borderRadius:8,fontSize:10,maxHeight:100,overflow:'auto'},
  }

  return (
    <div style={s.wrap}>
      <div style={{color:'#00e5ff',fontWeight:'bold',marginBottom:10}}>🔧 Native Web APIs</div>

      <div style={{marginBottom:10}}>
        <div style={{color:'#4fc3f7',marginBottom:4,fontSize:10}}>SUPPORT:</div>
        <div style={s.row}>
          {Object.entries(apis).map(([k,v]) => (
            <span key={k} style={s.chip(v)}>{v?'✓':'✗'} {k}</span>
          ))}
        </div>
      </div>

      {battery && (
        <div style={{marginBottom:8,fontSize:11}}>
          🔋 {battery.level}% {battery.charging?'⚡':''}
          &nbsp;|&nbsp; 🌐 {network?.type||'?'} {network?.online?'Online':'Offline'}
          &nbsp;|&nbsp; ⬇ {network?.downlink||0}Mbps
          {hw && <>&nbsp;|&nbsp; 💾 {hw.ram||'?'}GB {hw.cores}cores</>}
        </div>
      )}

      <div style={s.row}>
        <button style={s.btn} onClick={async()=>{
          if(wake){releaseWakeLock();setWake(false);addLog('Wake lock OFF');}
          else{const ok=await requestWakeLock();setWake(ok);addLog(ok?'Wake lock ON':'Not supported');}
        }}>{wake?'🔓 Release':'🔒 Wake Lock'}</button>

        <button style={s.btn} onClick={async()=>{
          const ok=await isBTSupported();
          addLog(ok?'Bluetooth available':'BT not supported');
        }}>📶 BT</button>

        <button style={s.btn} onClick={()=>{
          addLog(isNFCSupported()?'NFC supported!':'NFC not available');
        }}>📡 NFC</button>

        <button style={s.btn} onClick={async()=>{
          const c=await pickContact();
          addLog(c.length?'Contact: '+c[0].name+' '+c[0].phone:'No contact / not supported');
        }}>👤 Contact</button>

        <button style={s.btn} onClick={async()=>{
          const t=await readClipboard();
          addLog(t?'Clipboard: '+t.slice(0,30):'Empty / denied');
        }}>📋 Read</button>

        <button style={s.btn} onClick={async()=>{
          const ok=await writeClipboard('JARVIS '+new Date().toLocaleTimeString());
          addLog(ok?'Copied!':'Copy failed');
        }}>📝 Copy</button>

        <button style={s.btn} onClick={async()=>{
          const f=await openFilePicker();
          addLog(f?'File: '+f.name:'No file');
        }}>📂 File</button>

        <button style={s.btn} onClick={async()=>{
          await enterFullscreen();
          addLog('Fullscreen');
        }}>⛶ Full</button>

        <button style={s.btn} onClick={()=>{
          const n=getNetworkInfo();setNetwork(n);
          addLog('Net: '+(n?.type||'?')+' '+(n?.downlink||0)+'Mbps '+(n?.online?'Online':'Offline'));
        }}>🌐 Net</button>

        <button style={s.btn} onClick={async()=>{
          const b=await getBatteryStatus();setBattery(b);
          addLog(b?b.level+'% '+(b.charging?'charging':'not charging'):'Not supported');
        }}>🔋 Battery</button>
      </div>

      <div style={s.log}>
        {log.length===0
          ? <span style={{color:'#334'}}>Actions yahan dikhenge...</span>
          : log.map((l,i)=><div key={i} style={{color:i===0?'#00e5ff':'#556',padding:'1px 0'}}>{l}</div>)
        }
      </div>
    </div>
  )
}
