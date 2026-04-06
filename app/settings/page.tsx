'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type Setting = { id: string; label: string; desc: string; type: 'toggle'|'select'|'text'|'range'; options?: string[]; default: any }

const SETTINGS: Setting[] = [
  { id: 'tts_auto',    label: 'Auto TTS',           desc: 'Responses automatically padh ke sunao', type: 'toggle', default: false },
  { id: 'dark_mode',   label: 'Dark Mode',           desc: 'Dark theme (always on recommended)',   type: 'toggle', default: true },
  { id: 'notif',       label: 'Notifications',       desc: 'Push notifications enable karo',       type: 'toggle', default: false },
  { id: 'memory',      label: 'LUNA Memory',         desc: 'Luna tumhe yaad rakhein',              type: 'toggle', default: true },
  { id: 'animations',  label: 'Animations',          desc: 'UI animations aur transitions',        type: 'toggle', default: true },
  { id: 'sound_fx',    label: 'Sound FX',            desc: 'Button click sounds',                  type: 'toggle', default: false },
  { id: 'chat_mode',   label: 'Default Mode',        desc: 'JARVIS ka default chat mode',          type: 'select', options: ['Auto','Flash','Think','Deep'], default: 'Auto' },
  { id: 'font_size',   label: 'Font Size',           desc: 'Chat text size',                       type: 'select', options: ['Small','Medium','Large'], default: 'Medium' },
  { id: 'city',        label: 'My City',             desc: 'Weather aur local info ke liye',       type: 'text', default: 'Rewa' },
  { id: 'name',        label: 'My Name',             desc: 'JARVIS tumhe is naam se pukarega',     type: 'text', default: 'Pranshu' },
  { id: 'msg_limit',   label: 'History Limit',       desc: 'Kitne messages yaad rahe',             type: 'range', default: 80 },
]

const SECTIONS = [
  { title: '🤖 AI & Chat',   ids: ['chat_mode','tts_auto','memory','msg_limit'] },
  { title: '🎨 Appearance',  ids: ['dark_mode','animations','font_size','sound_fx'] },
  { title: '👤 Personal',    ids: ['name','city','notif'] },
]

function loadSettings() {
  try { return JSON.parse(localStorage.getItem('jarvis_settings')||'{}') } catch { return {} }
}
function saveSettings(s: Record<string,any>) {
  try { localStorage.setItem('jarvis_settings', JSON.stringify(s)) } catch {}
}

export default function SettingsPage() {
  const [vals, setVals] = useState<Record<string,any>>({})
  const [saved, setSaved] = useState(false)
  const [stats, setStats] = useState({ msgs: 0, notes: 0, habits: 0, todos: 0, xp: 0 })

  useEffect(() => {
    const stored = loadSettings()
    const defaults: Record<string,any> = {}
    SETTINGS.forEach(s => { defaults[s.id] = stored[s.id] ?? s.default })
    setVals(defaults)

    // Load stats
    try {
      const msgs = JSON.parse(localStorage.getItem('j_msgs_v5')||'[]').length
      const notes = JSON.parse(localStorage.getItem('jarvis_notes_v1')||'[]').length
      const habits = JSON.parse(localStorage.getItem('jarvis_habits_v1')||'[]').length
      const todos = JSON.parse(localStorage.getItem('jarvis_todos_v1')||'[]').length
      const xp = parseInt(localStorage.getItem('jarvis_xp')||'0')
      setStats({ msgs, notes, habits, todos, xp })
    } catch {}
  }, [])

  function set(id: string, val: any) {
    const nv = { ...vals, [id]: val }
    setVals(nv); saveSettings(nv)
    setSaved(true); setTimeout(() => setSaved(false), 1500)
  }

  function clearData(key: string) {
    if (confirm('Ye data delete ho jayega. Sure?')) {
      try { localStorage.removeItem(key) } catch {}
      window.location.reload()
    }
  }

  function clearAll() {
    if (confirm('SAB kuch delete hoga — messages, notes, habits, mood sab. Sure?')) {
      ['j_msgs_v5','jarvis_notes_v1','jarvis_habits_v1','jarvis_todos_v1','jarvis_mood_v1','jarvis_xp','jarvis_badges','luna_h','luna_m','era_h','jarvis_settings'].forEach(k => {
        try { localStorage.removeItem(k) } catch {}
      })
      window.location.reload()
    }
  }

  const getSetting = (id: string) => SETTINGS.find(s => s.id === id)!

  return (
    <div style={{ minHeight: '100vh', background: '#070d1a', color: '#ddeeff', fontFamily: "'Inter', sans-serif", padding: '0 0 80px' }}>
      <style>{`* { box-sizing: border-box } @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }`}</style>

      <div style={{ background: 'rgba(7,13,26,0.97)', borderBottom: '1px solid rgba(0,229,255,0.07)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)' }}>
        <Link href="/" style={{ color: '#2a5070', fontSize: '18px', textDecoration: 'none' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#ddeeff' }}>⚙️ Settings</div>
          <div style={{ fontSize: '11px', color: '#2a5070' }}>JARVIS config</div>
        </div>
        {saved && <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 600, animation: 'fadeUp 0.2s ease' }}>✓ Saved</div>}
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '14px' }}>
        {/* Stats overview */}
        <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '14px', padding: '14px', marginBottom: '18px' }}>
          <div style={{ fontSize: '11px', color: '#2a5070', marginBottom: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>📊 YOUR DATA</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '6px' }}>
            {[
              { l: 'Messages', v: stats.msgs, c: '#00e5ff' },
              { l: 'Notes', v: stats.notes, c: '#34d399' },
              { l: 'Habits', v: stats.habits, c: '#a78bfa' },
              { l: 'Todos', v: stats.todos, c: '#fbbf24' },
              { l: 'XP', v: stats.xp, c: '#ff9800' },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center', background: 'rgba(0,229,255,0.03)', borderRadius: '8px', padding: '8px 4px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: '9px', color: '#1e3248', marginTop: '2px' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings sections */}
        {SECTIONS.map(section => (
          <div key={section.title} style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#2a5070', marginBottom: '10px', fontWeight: 600, letterSpacing: '0.8px', padding: '0 2px' }}>{section.title}</div>
            <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
              {section.ids.map((id, idx) => {
                const s = getSetting(id)
                const val = vals[id]
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 14px', borderBottom: idx < section.ids.length-1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#c8dff0' }}>{s.label}</div>
                      <div style={{ fontSize: '11px', color: '#2a5070', marginTop: '1px' }}>{s.desc}</div>
                    </div>
                    {s.type === 'toggle' && (
                      <button onClick={() => set(id, !val)}
                        style={{ width: '44px', height: '24px', borderRadius: '12px', background: val ? 'linear-gradient(90deg, #0055cc, #00e5ff)' : 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s', boxShadow: val ? '0 0 10px rgba(0,229,255,0.3)' : 'none' }}>
                        <div style={{ position: 'absolute', top: '3px', left: val ? '22px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                      </button>
                    )}
                    {s.type === 'select' && (
                      <select value={val} onChange={e => set(id, e.target.value)}
                        style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '7px', color: '#00e5ff', padding: '5px 8px', fontSize: '12px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, colorScheme: 'dark' }}>
                        {s.options!.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                    {s.type === 'text' && (
                      <input value={val||''} onChange={e => set(id, e.target.value)}
                        style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '7px', color: '#ddeeff', padding: '5px 10px', fontSize: '12px', outline: 'none', width: '110px', fontFamily: 'inherit', flexShrink: 0 }} />
                    )}
                    {s.type === 'range' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <input type="range" min={10} max={200} value={val||80} onChange={e => set(id, parseInt(e.target.value))}
                          style={{ width: '80px', accentColor: '#00e5ff', cursor: 'pointer' }} />
                        <span style={{ fontSize: '12px', color: '#00e5ff', width: '30px', textAlign: 'right' }}>{val||80}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Data management */}
        <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(248,113,113,0.1)', borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#2a5070', marginBottom: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>🗑️ DATA MANAGEMENT</div>
          {[
            { label: 'Chat History Clear', key: 'j_msgs_v5', color: '#f87171' },
            { label: 'LUNA Memory Clear', key: 'luna_m', color: '#f9a8d4' },
            { label: 'Notes Clear', key: 'jarvis_notes_v1', color: '#34d399' },
            { label: 'Habits Clear', key: 'jarvis_habits_v1', color: '#a78bfa' },
          ].map(item => (
            <button key={item.key} onClick={() => clearData(item.key)}
              style={{ display: 'block', width: '100%', background: 'none', border: '1px solid rgba(248,113,113,0.1)', borderRadius: '8px', color: item.color + '99', cursor: 'pointer', padding: '8px 12px', fontSize: '12px', textAlign: 'left', marginBottom: '6px', fontFamily: 'inherit', transition: 'all 0.12s' }}>
              Delete {item.label}
            </button>
          ))}
          <button onClick={clearAll}
            style={{ display: 'block', width: '100%', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '9px', color: '#f87171', cursor: 'pointer', padding: '10px', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', marginTop: '4px' }}>
            ⚠️ Reset Everything
          </button>
        </div>

        {/* App info */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#0e2030', padding: '10px' }}>
          JARVIS Life OS v11 · Next.js 15 · Made with ❤️ · ₹0 Forever
        </div>
      </div>
    </div>
  )
}
