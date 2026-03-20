'use client'
// components/NativeFeatureDemo.tsx
// Quick test panel for all native web APIs
import { useState, useEffect } from 'react'
import {
  getSupportedNativeAPIs, getBatteryStatus, getNetworkInfo,
  requestWakeLock, releaseWakeLock, isWakeLockActive,
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

  const style: any = {
    container: {background:'#040e1a',color:'#c8e0f0',padding:16,borderRadius:12,fontFamily:'monospace',fontSize:12},
    row: {display:'flex',flexWrap:'wrap' as const,gap:8,marginBottom:12},
    btn: {background:'#00e5ff15',border:'1px solid #00e5ff30',color:'#00e5ff',padding:'6px 10px',borderRadius:8,cursor:'pointer',fontSize:11},
    chip: (ok:boolean) => ({background:ok?'#00e67620':'#ff525220',border:'1px solid '+(ok?'#00e676':'#ff5252')+'40',color:ok?'#00e676':'#ff5252',padding:'3px 8px',borderRadius:20,fontSize:10}),
    log: {background:'#030a14',padding:8,borderRadius:8,fontSize:10,maxHeight:120,overflow:'auto'},
  }

  return (
    <div style={style.container}>
      <div style={{color:'#00e5ff',fontWeight:'bold',marginBottom:12}}>🔧 Native Web APIs</div>
      
      {/* API Support */}
      <div style={{marginBottom:12}}>
        <div style={{color:'#4fc3f7',marginBottom:6,fontSize:10}}>SUPPORT STATUS:</div>
        <div style={style.row}>
          {Object.entries(apis).map(([k,v]) => (
            <span key={k} style={style.chip(v)}>{v?'✓':'✗'} {k}</span>
          ))}
        </div>
      </div>

      {/* Device Info */}
      {battery && (
        <div style={{marginBottom:8,fontSize:11}}>
          🔋 Battery: {battery.level}% {battery.charging?'⚡ Charging':''}
          &nbsp;|&nbsp;🌐 {network?.type?.toUpperCase()} {network?.online?'Online':'Offline'}
          {hw && <>&nbsp;|&nbsp;💾 RAM: {hw.ram||'?'}GB CPU: {hw.cores}cores</>}
        </div>
      )}

      {/* Action Buttons */}
      <div style={style.row}>
        <button style={style.btn} onClick={async () => {
          if(wake){releaseWakeLock();setWake(false);addLog('Wake lock released');}
          else{const ok=await requestWakeLock();setWake(ok);addLog(ok?'Wake lock ON':'Wake lock failed');}
        }}>
          {wake?'🔓 Release':'🔒 Wake Lock'}
        </button>
        <button style={style.btn} onClick={async () => {
          const ok = await isBTSupported()
          addLog(ok?'Bluetooth available — click to scan':'Bluetooth not supported')
        }}>📶 Bluetooth</button>
        <button style={style.btn} onClick={() => {
          addLog(isNFCSupported()?'NFC supported!':'NFC not available on this device')
        }}>📡 NFC Check</button>
        <button style={style.btn} onClick={async () => {
          const c = await pickContact()
          addLog(c.length?'Contact: '+c[0].name+' '+c[0].phone:'No contact picked / not supported')
        }}>👤 Pick Contact</button>
        <button style={style.btn} onClick={async () => {
          const text = await readClipboard()
          addLog(text?'Clipboard: '+text.slice(0,30):'Clipboard empty/denied')
        }}>📋 Clipboard</button>
        <button style={style.btn} onClick={async () => {
          const ok = await writeClipboard('JARVIS AI — '+new Date().toLocaleTimeString())
          addLog(ok?'Copied to clipboard!':'Copy failed')
        }}>📝 Copy</button>
        <button style={style.btn} onClick={async () => {
          const f = await openFilePicker()
          addLog(f?'File: '+f.name+' ('+f.content.length+' chars)':'No file selected')
        }}>📂 Open File</button>
        <button style={style.btn} onClick={async () => {
          await enterFullscreen()
          addLog('Fullscreen entered')
        }}>⛶ Fullscreen</button>
        <button style={style.btn} onClick={() => {
          const n = getNetworkInfo()
          setNetwork(n)
          addLog('Network: '+(n?.type||'?')+' '+(n?.downlink||0)+'Mbps RTT:'+(n?.rtt||0)+'ms')
        }}>🌐 Network</button>
        <button style={style.btn} onClick={async () => {
          const b = await getBatteryStatus()
          setBattery(b)
          addLog(b?'Battery: '+b.level+'% '+(b.charging?'charging':'not charging'):'Battery API not supported')
        }}>🔋 Battery</button>
      </div>

      {/* Log */}
      <div style={style.log}>
        {log.length===0?<span style={{color:'#334'}}>Actions will show here...</span>:
          log.map((l,i)=><div key={i} style={{color:i===0?'#00e5ff':'#556',borderBottom:'1px solid #1a3a4a',padding:'2px 0'}}>{l}</div>)
        }
      </div>
    </div>
  )
}
