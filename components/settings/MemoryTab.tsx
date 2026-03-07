'use client'
import { useState, useEffect } from 'react'
import {
  loadProfile, saveProfile, loadMemory, deleteMemoryFact,
  addMemoryFact, gistBackup, gistRestore, setGistToken, getGistToken,
  type JarvisProfile, type MemoryFact
} from '../../lib/storage'

export default function MemoryTab() {
  const [profile, setProfile]  = useState<JarvisProfile>({})
  const [memory,  setMemory]   = useState<MemoryFact[]>([])
  const [token,   setToken]    = useState('')
  const [newFact, setNewFact]  = useState('')
  const [status,  setStatus]   = useState('')
  const [busy,    setBusy]     = useState(false)

  useEffect(() => {
    loadProfile().then(setProfile)
    loadMemory().then(m => setMemory(m.facts))
    setToken(getGistToken())
  }, [])

  const saveP = async () => {
    await saveProfile(profile)
    setStatus('✅ Saved!'); setTimeout(() => setStatus(''), 2000)
  }

  const addFact = async () => {
    if (!newFact.trim()) return
    await addMemoryFact(newFact.trim())
    const m = await loadMemory(); setMemory(m.facts)
    setNewFact('')
  }

  const delFact = async (id: string) => {
    await deleteMemoryFact(id)
    const m = await loadMemory(); setMemory(m.facts)
  }

  const doBackup = async () => {
    setGistToken(token); setBusy(true)
    const ok = await gistBackup()
    setStatus(ok ? '✅ GitHub Gist backup ho gaya!' : '❌ Token check karo')
    setBusy(false); setTimeout(() => setStatus(''), 3000)
  }

  const doRestore = async () => {
    setBusy(true)
    const ok = await gistRestore()
    if (ok) { loadProfile().then(setProfile); loadMemory().then(m => setMemory(m.facts)); setStatus('✅ Restore ho gaya!') }
    else setStatus('❌ Gist ID ya token nahi mila')
    setBusy(false); setTimeout(() => setStatus(''), 3000)
  }

  const CAT: Record<string, string> = { goal:'🎯', preference:'⭐', fact:'💡', habit:'🔥', reminder:'⏰' }

  return (
    <div>
      {status && <div style={{ padding:'8px 12px', borderRadius:8, marginBottom:12, fontSize:12, background: status.startsWith('✅') ? 'rgba(0,230,118,.1)' : 'rgba(255,68,68,.1)', border:`1px solid ${status.startsWith('✅')?'rgba(0,230,118,.25)':'rgba(255,68,68,.25)'}`, color: status.startsWith('✅') ? '#00e676' : '#ff6666' }}>{status}</div>}

      {/* Profile */}
      <div style={{ marginBottom:18 }}>
        <div style={sL}>👤 TUMHARA PROFILE (JARVIS ko yaad rehega)</div>
        {[
          { label:'Naam', key:'name', ph:'Tumhara naam' },
          { label:'Location (optional)', key:'location', ph:'GPS se auto milti hai — ya manually likho' },
          { label:'Kya karte ho', key:'occupation', ph:'Student, job, business...' },
          { label:'Goals (comma se)', key:'goals_str', ph:'Guitar, fitness, coding...' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom:9 }}>
            <div style={sFL}>{f.label}</div>
            <input value={f.key === 'goals_str' ? (profile.goals?.join(', ') || '') : ((profile as any)[f.key] || '')}
              onChange={e => {
                if (f.key === 'goals_str') setProfile(p => ({ ...p, goals: e.target.value.split(',').map(g => g.trim()).filter(Boolean) }))
                else setProfile(p => ({ ...p, [f.key]: e.target.value }))
              }}
              placeholder={f.ph} style={sIn} />
          </div>
        ))}
        <div style={{ marginBottom:9 }}>
          <div style={sFL}>Language</div>
          <div style={{ display:'flex', gap:6 }}>
            {(['hinglish','hindi','english'] as const).map(l => (
              <button key={l} onClick={() => setProfile(p => ({ ...p, language: l }))}
                style={{ flex:1, padding:'7px 4px', borderRadius:8, fontSize:11, cursor:'pointer', background: profile.language===l ? 'rgba(0,229,255,.1)' : 'rgba(255,255,255,.03)', border:`1px solid ${profile.language===l?'rgba(0,229,255,.3)':'rgba(255,255,255,.07)'}`, color: profile.language===l ? '#00e5ff' : '#2a4060' }}>
                {l==='hinglish'?'🇮🇳 Hinglish':l==='hindi'?'हिन्दी':'🇬🇧 English'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:9 }}>
          <div style={sFL}>Extra note (JARVIS ke liye)</div>
          <textarea value={profile.customNote||''} onChange={e => setProfile(p => ({ ...p, customNote: e.target.value }))}
            placeholder="Jaise: Mujhe short answers chahiye" rows={2} style={{ ...sIn, resize:'none' as const }} />
        </div>
        <button onClick={saveP} style={sSave}>💾 Profile Save Karo</button>
      </div>

      {/* Memory facts */}
      <div style={{ marginBottom:18 }}>
        <div style={sL}>🧠 JARVIS KI YAADEIN ({memory.length}/50)</div>
        <div style={{ fontSize:9, color:'#1a3050', marginBottom:9 }}>Chat se auto-save hoti hain. Manually bhi add kar sakte ho.</div>
        <div style={{ display:'flex', gap:7, marginBottom:9 }}>
          <input value={newFact} onChange={e => setNewFact(e.target.value)} onKeyDown={e => e.key==='Enter' && addFact()}
            placeholder="Kuch important..." style={{ ...sIn, flex:1 }} />
          <button onClick={addFact} style={{ padding:'8px 12px', borderRadius:8, background:'rgba(0,229,255,.1)', border:'1px solid rgba(0,229,255,.2)', color:'#00e5ff', fontSize:12, cursor:'pointer', flexShrink:0 }}>+</button>
        </div>
        {memory.length === 0
          ? <div style={{ fontSize:11, color:'#1a3050', textAlign:'center' as const, padding:'12px 0' }}>Chat karo — auto save hongi</div>
          : memory.map(f => (
            <div key={f.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.04)', marginBottom:5 }}>
              <span style={{ fontSize:13 }}>{CAT[f.category]||'💡'}</span>
              <span style={{ fontSize:11, color:'#4a7090', flex:1 }}>{f.text}</span>
              <button onClick={() => delFact(f.id)} style={{ background:'none', border:'none', color:'#1e3050', fontSize:16, cursor:'pointer', padding:0 }}>×</button>
            </div>
          ))
        }
      </div>

      {/* Gist backup */}
      <div>
        <div style={sL}>☁️ GITHUB GIST BACKUP (FREE CLOUD)</div>
        <div style={{ fontSize:9, color:'#1a3050', marginBottom:9, lineHeight:1.7 }}>
          Phone reset ho jaye — Gist se restore kar sako.<br/>
          GitHub → Settings → Developer settings → Personal access tokens → gist scope
        </div>
        <div style={{ marginBottom:9 }}>
          <div style={sFL}>GitHub Token (ghp_...)</div>
          <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" style={sIn} />
        </div>
        <div style={{ display:'flex', gap:7 }}>
          <button onClick={doBackup} disabled={!token||busy}
            style={{ flex:1, padding:'9px', borderRadius:9, background: token?'rgba(0,229,255,.1)':'rgba(255,255,255,.03)', border:`1px solid ${token?'rgba(0,229,255,.2)':'rgba(255,255,255,.06)'}`, color: token?'#00e5ff':'#1a3050', fontSize:12, cursor: token?'pointer':'default', fontWeight:600 }}>
            {busy?'⏳...':'☁️ Backup'}
          </button>
          <button onClick={doRestore} disabled={!token||busy}
            style={{ flex:1, padding:'9px', borderRadius:9, background: token?'rgba(0,230,118,.06)':'rgba(255,255,255,.03)', border:`1px solid ${token?'rgba(0,230,118,.15)':'rgba(255,255,255,.06)'}`, color: token?'#00e676':'#1a3050', fontSize:12, cursor: token?'pointer':'default', fontWeight:600 }}>
            {busy?'⏳...':'📥 Restore'}
          </button>
        </div>
      </div>
    </div>
  )
}

const sL:  React.CSSProperties = { fontSize:8, color:'#1a3050', letterSpacing:1.5, textTransform:'uppercase', marginBottom:9 }
const sFL: React.CSSProperties = { fontSize:9, color:'#1a3050', marginBottom:4 }
const sIn: React.CSSProperties = { width:'100%', padding:'9px 11px', borderRadius:9, background:'#060c18', border:'1px solid rgba(0,229,255,.08)', color:'#ddeeff', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:"'Noto Sans Devanagari','Inter',sans-serif" }
const sSave: React.CSSProperties = { width:'100%', padding:'10px', borderRadius:10, background:'linear-gradient(135deg,rgba(0,229,255,.1),rgba(109,40,217,.1))', border:'1px solid rgba(0,229,255,.2)', color:'#00e5ff', fontSize:13, fontWeight:600, cursor:'pointer', marginTop:4 }
