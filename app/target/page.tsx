'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type Goal = { id: string; title: string; desc: string; category: string; target: number; current: number; unit: string; deadline: string; color: string; created: string }

const CATS = [
  { name: 'Fitness',  icon: '💪', color: '#34d399' },
  { name: 'Study',    icon: '📚', color: '#60a5fa' },
  { name: 'Finance',  icon: '💰', color: '#fbbf24' },
  { name: 'Habit',    icon: '🔄', color: '#a78bfa' },
  { name: 'Career',   icon: '🚀', color: '#00e5ff' },
  { name: 'Personal', icon: '🌱', color: '#f9a8d4' },
]

const KEY = 'jarvis_goals_v2'
function uid() { return Date.now().toString(36) }
function load(): Goal[] { try { return JSON.parse(localStorage.getItem(KEY)||'[]') } catch { return [] } }
function save(g: Goal[]) { try { localStorage.setItem(KEY, JSON.stringify(g)) } catch {} }

function daysLeft(deadline: string): number {
  if (!deadline) return 999
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
}

export default function TargetPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Goal|null>(null)
  const [form, setForm] = useState({ title: '', desc: '', category: 'Fitness', target: '', current: '', unit: '', deadline: '' })

  useEffect(() => { setGoals(load()) }, [])

  function saveGoal() {
    if (!form.title.trim() || !form.target) return
    const cat = CATS.find(c => c.name === form.category)!
    if (editing) {
      const updated = goals.map(g => g.id === editing.id ? { ...editing, ...form, target: parseFloat(form.target)||0, current: parseFloat(form.current)||0, color: cat.color } : g)
      setGoals(updated); save(updated)
    } else {
      const g: Goal = { id: uid(), title: form.title.trim(), desc: form.desc, category: form.category, target: parseFloat(form.target)||1, current: parseFloat(form.current)||0, unit: form.unit, deadline: form.deadline, color: cat.color, created: new Date().toISOString().slice(0,10) }
      const updated = [g, ...goals]; setGoals(updated); save(updated)
    }
    setAdding(false); setEditing(null); setForm({ title:'',desc:'',category:'Fitness',target:'',current:'',unit:'',deadline:'' })
  }

  function updateProgress(id: string, delta: number) {
    const updated = goals.map(g => g.id === id ? { ...g, current: Math.max(0, Math.min(g.target, g.current + delta)) } : g)
    setGoals(updated); save(updated)
  }

  function deleteGoal(id: string) { const u = goals.filter(g => g.id !== id); setGoals(u); save(u) }

  function startEdit(g: Goal) {
    setEditing(g)
    setForm({ title: g.title, desc: g.desc, category: g.category, target: String(g.target), current: String(g.current), unit: g.unit, deadline: g.deadline })
    setAdding(true)
  }

  const active = goals.filter(g => g.current < g.target)
  const completed = goals.filter(g => g.current >= g.target)

  return (
    <div style={{ minHeight: '100vh', background: '#070d1a', color: '#ddeeff', fontFamily: "'Inter', sans-serif", padding: '0 0 80px' }}>
      <style>{`* { box-sizing: border-box } @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }`}</style>

      <div style={{ background: 'rgba(7,13,26,0.97)', borderBottom: '1px solid rgba(0,229,255,0.07)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)' }}>
        <Link href="/" style={{ color: '#2a5070', fontSize: '18px', textDecoration: 'none' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fbbf24' }}>🎯 Goals</div>
          <div style={{ fontSize: '11px', color: '#2a5070' }}>{active.length} active · {completed.length} done</div>
        </div>
        <button onClick={() => { setAdding(true); setEditing(null) }}
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '8px', color: '#fbbf24', cursor: 'pointer', padding: '6px 12px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit' }}>
          + New
        </button>
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '14px' }}>
        {/* Add/Edit form */}
        {adding && (
          <div style={{ background: 'rgba(12,20,34,0.95)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '16px', padding: '18px', marginBottom: '16px', animation: 'fadeUp 0.15s ease' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', marginBottom: '14px' }}>{editing ? '✏️ Edit Goal' : '🎯 New Goal'}</div>
            <input value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Goal ka title..."
              style={{ width:'100%',background:'rgba(0,229,255,0.04)',border:'1px solid rgba(0,229,255,0.1)',borderRadius:'8px',color:'#ddeeff',padding:'9px 12px',fontSize:'14px',outline:'none',fontFamily:'inherit',marginBottom:'10px' }} />
            <input value={form.desc} onChange={e => setForm({...form,desc:e.target.value})} placeholder="Description (optional)..."
              style={{ width:'100%',background:'rgba(0,229,255,0.04)',border:'1px solid rgba(0,229,255,0.08)',borderRadius:'8px',color:'#ddeeff',padding:'8px 12px',fontSize:'13px',outline:'none',fontFamily:'inherit',marginBottom:'10px' }} />
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'10px' }}>
              <input type="number" value={form.current} onChange={e => setForm({...form,current:e.target.value})} placeholder="Current (0)"
                style={{ background:'rgba(0,229,255,0.04)',border:'1px solid rgba(0,229,255,0.08)',borderRadius:'8px',color:'#ddeeff',padding:'8px 12px',fontSize:'13px',outline:'none',fontFamily:'inherit' }} />
              <input type="number" value={form.target} onChange={e => setForm({...form,target:e.target.value})} placeholder="Target *"
                style={{ background:'rgba(0,229,255,0.04)',border:'1px solid rgba(0,229,255,0.08)',borderRadius:'8px',color:'#ddeeff',padding:'8px 12px',fontSize:'13px',outline:'none',fontFamily:'inherit' }} />
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px' }}>
              <input value={form.unit} onChange={e => setForm({...form,unit:e.target.value})} placeholder="Unit (km, kg, ₹...)"
                style={{ background:'rgba(0,229,255,0.04)',border:'1px solid rgba(0,229,255,0.08)',borderRadius:'8px',color:'#ddeeff',padding:'8px 12px',fontSize:'13px',outline:'none',fontFamily:'inherit' }} />
              <input type="date" value={form.deadline} onChange={e => setForm({...form,deadline:e.target.value})}
                style={{ background:'rgba(0,229,255,0.04)',border:'1px solid rgba(0,229,255,0.08)',borderRadius:'8px',color:'#ddeeff',padding:'8px 12px',fontSize:'13px',outline:'none',fontFamily:'inherit',colorScheme:'dark' }} />
            </div>
            <div style={{ display:'flex',gap:'6px',marginBottom:'14px',flexWrap:'wrap' }}>
              {CATS.map(c => (
                <button key={c.name} onClick={() => setForm({...form,category:c.name})} style={{ background: form.category===c.name ? `${c.color}18` : 'rgba(0,229,255,0.03)', border:`1px solid ${form.category===c.name ? c.color+'44' : 'rgba(0,229,255,0.07)'}`, borderRadius:'20px', color: form.category===c.name ? c.color : '#4a7090', cursor:'pointer', padding:'4px 10px', fontSize:'11px', fontFamily:'inherit', transition:'all 0.12s' }}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
            <div style={{ display:'flex',gap:'8px' }}>
              <button onClick={() => { setAdding(false); setEditing(null) }} style={{ flex:1, background:'none', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'9px', color:'#4a7090', cursor:'pointer', padding:'9px', fontFamily:'inherit' }}>Cancel</button>
              <button onClick={saveGoal} disabled={!form.title.trim()||!form.target} style={{ flex:2, background: form.title.trim()&&form.target ? 'linear-gradient(135deg,#b45309,#fbbf24)' : 'rgba(251,191,36,0.06)', border:'none', borderRadius:'9px', color: form.title.trim()&&form.target ? '#000' : '#2a5070', cursor: form.title.trim()&&form.target ? 'pointer' : 'not-allowed', padding:'9px', fontSize:'13px', fontWeight:700, fontFamily:'inherit' }}>
                {editing ? 'Update' : 'Save Goal'}
              </button>
            </div>
          </div>
        )}

        {goals.length === 0 && !adding && (
          <div style={{ textAlign:'center', color:'#1e3248', padding:'50px 20px' }}>
            <div style={{ fontSize:'50px', marginBottom:'14px', opacity:0.3 }}>🎯</div>
            <div style={{ fontSize:'14px', marginBottom:'6px', color:'#4a7090' }}>Koi goal set nahi</div>
            <div style={{ fontSize:'12px', marginBottom:'20px' }}>Aaj se shuru karo!</div>
          </div>
        )}

        {/* Active goals */}
        {active.map(g => {
          const pct = Math.min((g.current/g.target)*100, 100)
          const dl = daysLeft(g.deadline)
          const cat = CATS.find(c => c.name === g.category)!
          return (
            <div key={g.id} style={{ background:'rgba(12,20,34,0.8)', border:`1px solid ${g.color}18`, borderRadius:'14px', padding:'16px', marginBottom:'10px', animation:'fadeUp 0.15s ease' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:'10px', marginBottom:'12px' }}>
                <div style={{ fontSize:'22px', marginTop:'2px' }}>{cat.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'14px', fontWeight:700, color:'#ddeeff' }}>{g.title}</div>
                  {g.desc && <div style={{ fontSize:'11px', color:'#2a5070', marginTop:'1px' }}>{g.desc}</div>}
                  <div style={{ display:'flex', gap:'6px', marginTop:'4px', flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:'9px', background:g.color+'12', color:g.color, padding:'1px 7px', borderRadius:'10px', fontWeight:600 }}>{g.category}</span>
                    {g.deadline && <span style={{ fontSize:'9px', color: dl < 7 ? '#f87171' : '#1e3248' }}>{dl > 0 ? `${dl} days left` : 'Overdue!'}</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'4px' }}>
                  <button onClick={() => startEdit(g)} style={{ background:'none',border:'none',color:'#2a5070',cursor:'pointer',fontSize:'12px',padding:'3px',fontFamily:'inherit' }}>✏️</button>
                  <button onClick={() => deleteGoal(g.id)} style={{ background:'none',border:'none',color:'#2a5070',cursor:'pointer',fontSize:'12px',padding:'3px',fontFamily:'inherit' }}>🗑️</button>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:'8px', height:'8px', overflow:'hidden', marginBottom:'8px' }}>
                <div style={{ height:'100%', background:`linear-gradient(90deg,${g.color}99,${g.color})`, width:pct+'%', borderRadius:'8px', transition:'width 0.4s ease', boxShadow:`0 0 8px ${g.color}44` }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:'12px', color:g.color, fontWeight:700 }}>{g.current}{g.unit && ` ${g.unit}`} / {g.target}{g.unit && ` ${g.unit}`}</div>
                <div style={{ fontSize:'11px', color:'#2a5070' }}>{Math.round(pct)}%</div>
              </div>

              {/* Progress controls */}
              <div style={{ display:'flex', gap:'6px', marginTop:'10px' }}>
                {[1,5,10].map(n => (
                  <button key={n} onClick={() => updateProgress(g.id, n)}
                    style={{ flex:1, background:`${g.color}10`, border:`1px solid ${g.color}22`, borderRadius:'7px', color:g.color, cursor:'pointer', padding:'6px 4px', fontSize:'12px', fontWeight:600, fontFamily:'inherit', transition:'all 0.12s' }}>
                    +{n}
                  </button>
                ))}
                <button onClick={() => updateProgress(g.id, -1)}
                  style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.15)', borderRadius:'7px', color:'#f87171', cursor:'pointer', padding:'6px 10px', fontSize:'12px', fontFamily:'inherit' }}>
                  -1
                </button>
              </div>
            </div>
          )
        })}

        {/* Completed */}
        {completed.length > 0 && (
          <div style={{ marginTop:'6px' }}>
            <div style={{ fontSize:'11px', color:'#1e3248', marginBottom:'10px', fontWeight:600, letterSpacing:'0.5px' }}>✅ COMPLETED ({completed.length})</div>
            {completed.map(g => (
              <div key={g.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', marginBottom:'6px', background:'rgba(52,211,153,0.05)', border:'1px solid rgba(52,211,153,0.12)', borderRadius:'11px', opacity:0.8 }}>
                <div style={{ fontSize:'18px' }}>{CATS.find(c=>c.name===g.category)?.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', color:'#34d399', textDecoration:'line-through' }}>{g.title}</div>
                  <div style={{ fontSize:'10px', color:'#1e3248' }}>{g.target}{g.unit&&` ${g.unit}`} achieved!</div>
                </div>
                <div style={{ fontSize:'16px' }}>🏆</div>
                <button onClick={() => deleteGoal(g.id)} style={{ background:'none',border:'none',color:'#1e3248',cursor:'pointer',fontSize:'11px',fontFamily:'inherit' }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
