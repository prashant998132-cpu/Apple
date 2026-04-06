'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type Log = { date: string; water: number; sleep: number; steps: number; weight: number; exercise: string }

const KEY = 'jarvis_health_v1'
const today = () => new Date().toISOString().slice(0,10)

function load(): Log[] { try { return JSON.parse(localStorage.getItem(KEY)||'[]') } catch { return [] } }
function save(d: Log[]) { try { localStorage.setItem(KEY, JSON.stringify(d)) } catch {} }

function todayLog(logs: Log[]): Log {
  return logs.find(l => l.date === today()) || { date: today(), water: 0, sleep: 0, steps: 0, weight: 0, exercise: '' }
}

export default function HealthPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [cur, setCur] = useState<Log>({ date: today(), water: 0, sleep: 0, steps: 0, weight: 0, exercise: '' })
  const [bmiH, setBmiH] = useState('')
  const [bmiW, setBmiW] = useState('')
  const [tab, setTab] = useState<'today'|'bmi'|'history'>('today')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const d = load(); setLogs(d); setCur(todayLog(d))
  }, [])

  function updateCur(field: keyof Log, val: any) {
    const n = { ...cur, [field]: val }
    setCur(n)
    const others = logs.filter(l => l.date !== today())
    const updated = [...others, n].sort((a,b) => a.date.localeCompare(b.date))
    setLogs(updated); save(updated)
    setSaved(true); setTimeout(() => setSaved(false), 1000)
  }

  function addWater(ml: number) { updateCur('water', Math.min(cur.water + ml, 5000)) }

  const bmi = bmiH && bmiW ? (parseFloat(bmiW) / Math.pow(parseFloat(bmiH)/100, 2)).toFixed(1) : null
  const bmiCat = bmi ? (parseFloat(bmi) < 18.5 ? ['Underweight','#60a5fa'] : parseFloat(bmi) < 25 ? ['Normal','#34d399'] : parseFloat(bmi) < 30 ? ['Overweight','#fbbf24'] : ['Obese','#f87171']) : null

  const waterPct = Math.min((cur.water / 2500) * 100, 100)
  const sleepScore = cur.sleep >= 7 && cur.sleep <= 9 ? '✅' : cur.sleep > 0 ? (cur.sleep < 6 ? '😴' : '⚠️') : ''
  const last7 = Array.from({length:7},(_,i) => { const d = new Date(); d.setDate(d.getDate()-(6-i)); return d.toISOString().slice(0,10) }).map(d => ({ d, log: logs.find(l => l.date === d) }))

  return (
    <div style={{ minHeight: '100vh', background: '#070d1a', color: '#ddeeff', fontFamily: "'Inter', sans-serif", padding: '0 0 80px' }}>
      <style>{`* { box-sizing: border-box } @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }`}</style>

      <div style={{ background: 'rgba(7,13,26,0.97)', borderBottom: '1px solid rgba(0,229,255,0.07)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)' }}>
        <Link href="/" style={{ color: '#2a5070', fontSize: '18px', textDecoration: 'none' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#34d399' }}>🏥 Health</div>
          <div style={{ fontSize: '11px', color: '#2a5070' }}>Aaj: 💧{cur.water}ml · 😴{cur.sleep}h · 👟{cur.steps}</div>
        </div>
        {saved && <div style={{ fontSize: '11px', color: '#34d399' }}>✓</div>}
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '14px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(12,20,34,0.7)', borderRadius: '10px', padding: '4px', marginBottom: '14px' }}>
          {(['today','bmi','history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 'none', background: tab === t ? 'rgba(52,211,153,0.1)' : 'transparent', color: tab === t ? '#34d399' : '#2a5070', fontSize: '11px', fontWeight: tab === t ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
              {t === 'today' ? '📅 Aaj' : t === 'bmi' ? '⚖️ BMI' : '📈 History'}
            </button>
          ))}
        </div>

        {tab === 'today' && (
          <div style={{ animation: 'fadeUp 0.2s ease' }}>
            {/* Water */}
            <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(96,165,250,0.12)', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa' }}>💧 Water Intake</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#60a5fa' }}>{cur.water}ml</div>
              </div>
              {/* Water fill visualization */}
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', height: '12px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, #0ea5e9, #60a5fa)', width: waterPct+'%', borderRadius: '12px', transition: 'width 0.4s ease', boxShadow: '0 0 8px rgba(96,165,250,0.4)' }} />
              </div>
              <div style={{ fontSize: '10px', color: '#2a5070', marginBottom: '10px' }}>{cur.water} / 2500ml ({Math.round(waterPct)}%)</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[100, 200, 300, 500].map(ml => (
                  <button key={ml} onClick={() => addWater(ml)} style={{ flex: 1, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '8px', color: '#60a5fa', cursor: 'pointer', padding: '7px 4px', fontSize: '11px', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.12s' }}>
                    +{ml}
                  </button>
                ))}
                <button onClick={() => updateCur('water', 0)} style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '8px', color: '#f87171', cursor: 'pointer', padding: '7px 8px', fontSize: '11px', fontFamily: 'inherit' }}>
                  ↺
                </button>
              </div>
            </div>

            {/* Sleep */}
            <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#a78bfa' }}>😴 Sleep {sleepScore}</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#a78bfa' }}>{cur.sleep}h</div>
              </div>
              <input type="range" min={0} max={12} step={0.5} value={cur.sleep} onChange={e => updateCur('sleep', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#a78bfa', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#1e3248', marginTop: '4px' }}>
                <span>0h</span><span style={{ color: '#34d399' }}>7-9h optimal</span><span>12h</span>
              </div>
            </div>

            {/* Steps + Weight + Exercise */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(52,211,153,0.1)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '12px', color: '#34d399', marginBottom: '8px', fontWeight: 600 }}>👟 Steps</div>
                <input type="number" value={cur.steps || ''} onChange={e => updateCur('steps', parseInt(e.target.value)||0)} placeholder="0"
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#ddeeff', fontSize: '22px', fontWeight: 800, fontFamily: 'inherit' }} />
                <div style={{ fontSize: '10px', color: cur.steps >= 10000 ? '#34d399' : '#1e3248', marginTop: '4px' }}>Goal: 10,000</div>
              </div>
              <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(251,191,36,0.1)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '12px', color: '#fbbf24', marginBottom: '8px', fontWeight: 600 }}>⚖️ Weight (kg)</div>
                <input type="number" value={cur.weight || ''} onChange={e => updateCur('weight', parseFloat(e.target.value)||0)} placeholder="—" step="0.1"
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#ddeeff', fontSize: '22px', fontWeight: 800, fontFamily: 'inherit' }} />
                <div style={{ fontSize: '10px', color: '#1e3248', marginTop: '4px' }}>kg</div>
              </div>
            </div>
            <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(248,113,113,0.1)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#f87171', marginBottom: '8px', fontWeight: 600 }}>🏋️ Exercise</div>
              <input value={cur.exercise} onChange={e => updateCur('exercise', e.target.value)} placeholder="Kya kiya aaj? e.g. 30min run, yoga..."
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#ddeeff', fontSize: '13px', fontFamily: 'inherit' }} />
            </div>
          </div>
        )}

        {tab === 'bmi' && (
          <div style={{ animation: 'fadeUp 0.2s ease' }}>
            <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ddeeff', marginBottom: '16px' }}>⚖️ BMI Calculator</div>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: '#2a5070', marginBottom: '6px' }}>HEIGHT (cm)</div>
                <input type="number" value={bmiH} onChange={e => setBmiH(e.target.value)} placeholder="170"
                  style={{ width: '100%', background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '8px', color: '#ddeeff', padding: '10px 12px', fontSize: '16px', outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: '#2a5070', marginBottom: '6px' }}>WEIGHT (kg)</div>
                <input type="number" value={bmiW} onChange={e => setBmiW(e.target.value)} placeholder="65"
                  style={{ width: '100%', background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '8px', color: '#ddeeff', padding: '10px 12px', fontSize: '16px', outline: 'none', fontFamily: 'inherit' }} />
              </div>
              {bmi && bmiCat && (
                <div style={{ textAlign: 'center', background: `rgba(${bmiCat[1]},0.08)`, border: `1px solid ${bmiCat[1]}33`, borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '48px', fontWeight: 900, color: bmiCat[1] }}>{bmi}</div>
                  <div style={{ fontSize: '18px', color: bmiCat[1], fontWeight: 700, marginBottom: '8px' }}>{bmiCat[0]}</div>
                  <div style={{ fontSize: '11px', color: '#2a5070' }}>BMI 18.5–24.9 = Normal range</div>
                </div>
              )}
              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px', fontSize: '10px', textAlign: 'center' }}>
                {[['<18.5','Underweight','#60a5fa'],['18.5-25','Normal','#34d399'],['25-30','Overweight','#fbbf24'],['>30','Obese','#f87171']].map(([range,cat,col]) => (
                  <div key={cat} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '6px 4px', borderTop: `2px solid ${col}` }}>
                    <div style={{ color: col, fontWeight: 700, marginBottom: '2px' }}>{cat}</div>
                    <div style={{ color: '#1e3248' }}>{range}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div style={{ animation: 'fadeUp 0.2s ease' }}>
            <div style={{ fontSize: '11px', color: '#2a5070', marginBottom: '12px', fontWeight: 600 }}>LAST 7 DAYS</div>
            {last7.reverse().map(({ d, log }) => (
              <div key={d} style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.05)', borderRadius: '11px', padding: '12px 14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'center', minWidth: '40px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: d === today() ? '#00e5ff' : '#4a7090' }}>{new Date(d).toLocaleDateString('en', { weekday: 'short' })}</div>
                  <div style={{ fontSize: '10px', color: '#1e3248' }}>{new Date(d).getDate()}</div>
                </div>
                {log ? (
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', textAlign: 'center', fontSize: '11px' }}>
                    <div><div style={{ color: '#60a5fa', fontWeight: 700 }}>{log.water}</div><div style={{ color: '#1e3248', fontSize: '9px' }}>💧ml</div></div>
                    <div><div style={{ color: '#a78bfa', fontWeight: 700 }}>{log.sleep}h</div><div style={{ color: '#1e3248', fontSize: '9px' }}>😴</div></div>
                    <div><div style={{ color: '#34d399', fontWeight: 700 }}>{log.steps}</div><div style={{ color: '#1e3248', fontSize: '9px' }}>👟</div></div>
                    <div><div style={{ color: '#fbbf24', fontWeight: 700 }}>{log.weight||'—'}</div><div style={{ color: '#1e3248', fontSize: '9px' }}>⚖️kg</div></div>
                  </div>
                ) : (
                  <div style={{ flex: 1, fontSize: '12px', color: '#1e3248', textAlign: 'center' }}>No data</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
