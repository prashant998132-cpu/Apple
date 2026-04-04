'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/shared/Sidebar'

const C = {
  bg: '#030a14', surface: '#070e1c', border: 'rgba(255,255,255,0.07)',
  text: '#c8dff0', dim: '#3a5a7a', green: '#00e676', yellow: '#ffd600',
  red: '#ff5252', blue: '#40c4ff', purple: '#b388ff',
}

type Tab = 'water' | 'mood' | 'sleep' | 'bmi' | 'meds' | 'steps'
type MoodEntry = { emoji: string; label: string; note: string; ts: number }
type SleepEntry = { bed: string; wake: string; hrs: number; ts: number }
type MedEntry = { name: string; time: string; dose: string; id: string }
type StepEntry = { steps: number; goal: number; ts: number }

const MOODS = [
  { emoji: '😄', label: 'Great', color: C.green },
  { emoji: '🙂', label: 'Good',  color: '#80ff80' },
  { emoji: '😐', label: 'Okay',  color: C.yellow },
  { emoji: '😔', label: 'Low',   color: '#ff9800' },
  { emoji: '😰', label: 'Stress', color: C.red },
]

function today() { return new Date().toDateString() }
function fmt(ts: number) { return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) }
function fmtDate(ts: number) { return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }

export default function HealthPage() {
  const router = useRouter()
  const [sidebar, setSidebar] = useState(false)
  const [tab, setTab] = useState<Tab>('water')

  // Water
  const [glasses, setGlasses] = useState(0)
  const [waterGoal, setWaterGoal] = useState(8)
  const [waterHistory, setWaterHistory] = useState<{date:string; count:number}[]>([])

  // Mood
  const [moods, setMoods] = useState<MoodEntry[]>([])
  const [moodNote, setMoodNote] = useState('')
  const [todayMood, setTodayMood] = useState<MoodEntry|null>(null)

  // Sleep
  const [sleepLog, setSleepLog] = useState<SleepEntry[]>([])
  const [bedTime, setBedTime] = useState('23:00')
  const [wakeTime, setWakeTime] = useState('07:00')

  // BMI
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [bmi, setBmi] = useState<number|null>(null)

  // Meds
  const [meds, setMeds] = useState<MedEntry[]>([])
  const [medName, setMedName] = useState('')
  const [medTime, setMedTime] = useState('08:00')
  const [medDose, setMedDose] = useState('')
  const [takenToday, setTakenToday] = useState<string[]>([])

  // Steps
  const [stepsToday, setStepsToday] = useState(0)
  const [stepsGoal, setStepsGoal] = useState(8000)
  const [stepsInput, setStepsInput] = useState('')
  const [stepsHistory, setStepsHistory] = useState<StepEntry[]>([])

  // Load from localStorage
  useEffect(() => {
    try {
      const d = today()
      const wData = JSON.parse(localStorage.getItem('j_water') || '{}')
      setGlasses(wData[d] || 0)
      setWaterGoal(Number(localStorage.getItem('j_water_goal') || 8))
      setWaterHistory(JSON.parse(localStorage.getItem('j_water_hist') || '[]'))

      setMoods(JSON.parse(localStorage.getItem('j_moods') || '[]'))
      const tm = JSON.parse(localStorage.getItem('j_mood_today') || 'null')
      if (tm && new Date(tm.ts).toDateString() === d) setTodayMood(tm)

      setSleepLog(JSON.parse(localStorage.getItem('j_sleep') || '[]'))
      setMeds(JSON.parse(localStorage.getItem('j_meds') || '[]'))
      const tt = JSON.parse(localStorage.getItem('j_meds_taken') || '{}')
      setTakenToday(tt[d] || [])

      const st = JSON.parse(localStorage.getItem('j_steps') || '{}')
      setStepsToday(st[d] || 0)
      setStepsGoal(Number(localStorage.getItem('j_steps_goal') || 8000))
      setStepsHistory(JSON.parse(localStorage.getItem('j_steps_hist') || '[]'))
    } catch {}
  }, [])

  // Water actions
  function addGlass() {
    if (glasses >= waterGoal + 4) return
    const newCount = glasses + 1
    setGlasses(newCount)
    const d = today()
    const wData = JSON.parse(localStorage.getItem('j_water') || '{}')
    wData[d] = newCount
    localStorage.setItem('j_water', JSON.stringify(wData))
    const hist = JSON.parse(localStorage.getItem('j_water_hist') || '[]')
    const existing = hist.findIndex((h: any) => h.date === d)
    if (existing >= 0) hist[existing].count = newCount
    else hist.unshift({ date: d, count: newCount })
    localStorage.setItem('j_water_hist', JSON.stringify(hist.slice(0, 14)))
    setWaterHistory(hist.slice(0, 14))
  }
  function removeGlass() {
    if (glasses <= 0) return
    const newCount = glasses - 1
    setGlasses(newCount)
    const d = today()
    const wData = JSON.parse(localStorage.getItem('j_water') || '{}')
    wData[d] = newCount
    localStorage.setItem('j_water', JSON.stringify(wData))
  }

  // Mood
  function logMood(m: typeof MOODS[0]) {
    const entry: MoodEntry = { emoji: m.emoji, label: m.label, note: moodNote, ts: Date.now() }
    const all = [entry, ...moods].slice(0, 30)
    setMoods(all)
    setTodayMood(entry)
    setMoodNote('')
    localStorage.setItem('j_moods', JSON.stringify(all))
    localStorage.setItem('j_mood_today', JSON.stringify(entry))
  }

  // Sleep
  function logSleep() {
    const [bh, bm] = bedTime.split(':').map(Number)
    const [wh, wm] = wakeTime.split(':').map(Number)
    let hrs = (wh * 60 + wm - bh * 60 - bm) / 60
    if (hrs < 0) hrs += 24
    const entry: SleepEntry = { bed: bedTime, wake: wakeTime, hrs: Math.round(hrs * 10) / 10, ts: Date.now() }
    const all = [entry, ...sleepLog].slice(0, 14)
    setSleepLog(all)
    localStorage.setItem('j_sleep', JSON.stringify(all))
  }
  const avgSleep = sleepLog.length ? (sleepLog.slice(0,7).reduce((a,b) => a + b.hrs, 0) / Math.min(sleepLog.length, 7)).toFixed(1) : null

  // BMI
  function calcBMI() {
    const h = parseFloat(height) / 100
    const w = parseFloat(weight)
    if (!h || !w || h <= 0) return
    setBmi(Math.round((w / (h * h)) * 10) / 10)
  }
  function bmiLabel(b: number) {
    if (b < 18.5) return { label: 'Underweight', color: C.blue }
    if (b < 25)   return { label: 'Normal ✓', color: C.green }
    if (b < 30)   return { label: 'Overweight', color: C.yellow }
    return { label: 'Obese', color: C.red }
  }

  // Meds
  function addMed() {
    if (!medName.trim()) return
    const entry: MedEntry = { name: medName, time: medTime, dose: medDose, id: Date.now().toString() }
    const all = [...meds, entry]
    setMeds(all)
    localStorage.setItem('j_meds', JSON.stringify(all))
    setMedName(''); setMedDose('')
  }
  function removeMed(id: string) {
    const all = meds.filter(m => m.id !== id)
    setMeds(all)
    localStorage.setItem('j_meds', JSON.stringify(all))
  }
  function toggleTaken(id: string) {
    const d = today()
    const was = takenToday.includes(id)
    const updated = was ? takenToday.filter(x => x !== id) : [...takenToday, id]
    setTakenToday(updated)
    const tt = JSON.parse(localStorage.getItem('j_meds_taken') || '{}')
    tt[d] = updated
    localStorage.setItem('j_meds_taken', JSON.stringify(tt))
  }

  // Steps
  function addSteps() {
    const n = parseInt(stepsInput)
    if (!n || n <= 0) return
    const newTotal = stepsToday + n
    setStepsToday(newTotal)
    setStepsInput('')
    const d = today()
    const st = JSON.parse(localStorage.getItem('j_steps') || '{}')
    st[d] = newTotal
    localStorage.setItem('j_steps', JSON.stringify(st))
    const hist = JSON.parse(localStorage.getItem('j_steps_hist') || '[]')
    const ex = hist.findIndex((h: any) => h.ts && new Date(h.ts).toDateString() === d)
    const entry = { steps: newTotal, goal: stepsGoal, ts: Date.now() }
    if (ex >= 0) hist[ex] = entry; else hist.unshift(entry)
    localStorage.setItem('j_steps_hist', JSON.stringify(hist.slice(0,14)))
    setStepsHistory(hist.slice(0,14))
  }

  const TABS: { id: Tab; icon: string; label: string; color: string }[] = [
    { id: 'water', icon: '💧', label: 'Water',  color: C.blue   },
    { id: 'mood',  icon: '🧠', label: 'Mood',   color: C.purple },
    { id: 'sleep', icon: '😴', label: 'Sleep',  color: '#7c4dff' },
    { id: 'bmi',   icon: '⚖️', label: 'BMI',    color: C.green  },
    { id: 'meds',  icon: '💊', label: 'Meds',   color: C.yellow },
    { id: 'steps', icon: '👟', label: 'Steps',  color: C.red    },
  ]

  const S = {
    card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 12 } as React.CSSProperties,
    label: { fontSize: 9, color: C.dim, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' as const },
    input: { width: '100%', padding: '9px 12px', borderRadius: 9, background: '#050b16', border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
    btn: { padding: '9px 16px', borderRadius: 9, background: 'rgba(0,230,118,.12)', border: `1px solid rgba(0,230,118,.25)`, color: C.green, fontSize: 12, cursor: 'pointer', fontWeight: 700 },
    row: { display: 'flex', gap: 8, alignItems: 'center' } as React.CSSProperties,
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, fontFamily: "'Inter','Noto Sans Devanagari',sans-serif", paddingTop: 48, paddingBottom: 80 }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 48, background: 'rgba(3,10,20,.96)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 14px 0 58px', backdropFilter: 'blur(10px)' }}>
        <span style={{ fontSize: 13, color: C.green, letterSpacing: 1, fontWeight: 700 }}>🏥 HEALTH HUB</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: C.dim }}>Aaj, {new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
      </header>

      {/* Hamburger */}
      <button onClick={() => setSidebar(true)} style={{ position: 'fixed', top: 10, left: 14, zIndex: 51, background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: 6, borderRadius: 6, fontSize: 18 }}>☰</button>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '12px 14px' }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flexShrink: 0, padding: '7px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', background: tab === t.id ? `${t.color}18` : C.surface, border: `1px solid ${tab === t.id ? t.color + '44' : C.border}`, color: tab === t.id ? t.color : C.dim, fontWeight: tab === t.id ? 700 : 400 }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── WATER ── */}
        {tab === 'water' && (
          <>
            <div style={S.card}>
              <div style={S.label}>AAJE KITNA PEEYA 💧</div>
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: 52, fontWeight: 800, color: C.blue, lineHeight: 1 }}>{glasses}</div>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>/ {waterGoal} glasses</div>
              </div>
              {/* Glasses grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginBottom: 14 }}>
                {Array.from({ length: waterGoal }).map((_, i) => (
                  <div key={i} onClick={addGlass} style={{ height: 36, borderRadius: 8, cursor: 'pointer', background: i < glasses ? `${C.blue}cc` : 'rgba(64,196,255,0.08)', border: `1px solid ${i < glasses ? C.blue : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    {i < glasses ? '💧' : ''}
                  </div>
                ))}
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(64,196,255,0.1)', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${Math.min(100, (glasses/waterGoal)*100)}%`, background: C.blue, borderRadius: 3, transition: 'width .3s' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addGlass} style={{ flex: 1, ...S.btn, background: 'rgba(64,196,255,.1)', border: `1px solid rgba(64,196,255,.3)`, color: C.blue }}>+ Glass Add</button>
                <button onClick={removeGlass} style={{ padding: '9px 14px', borderRadius: 9, background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, fontSize: 12, cursor: 'pointer' }}>- Hatao</button>
              </div>
            </div>
            {/* Goal setter */}
            <div style={S.card}>
              <div style={S.label}>DAILY GOAL</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {[6,8,10,12].map(g => (
                  <button key={g} onClick={() => { setWaterGoal(g); localStorage.setItem('j_water_goal', String(g)) }} style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: waterGoal === g ? 'rgba(64,196,255,.12)' : 'transparent', border: `1px solid ${waterGoal === g ? C.blue + '44' : C.border}`, color: waterGoal === g ? C.blue : C.dim }}>
                    {g} 💧
                  </button>
                ))}
              </div>
            </div>
            {/* History */}
            {waterHistory.length > 0 && (
              <div style={S.card}>
                <div style={S.label}>LAST 7 DAYS</div>
                {waterHistory.slice(0,7).map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 70, fontSize: 10, color: C.dim, flexShrink: 0 }}>{h.date.split(' ').slice(1,3).join(' ')}</div>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(64,196,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100,(h.count/waterGoal)*100)}%`, background: h.count >= waterGoal ? C.green : C.blue, borderRadius: 3 }} />
                    </div>
                    <div style={{ width: 24, fontSize: 11, color: h.count >= waterGoal ? C.green : C.text, textAlign: 'right', flexShrink: 0 }}>{h.count}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── MOOD ── */}
        {tab === 'mood' && (
          <>
            <div style={S.card}>
              <div style={S.label}>ABHI KAISA FEEL HO RAHA HAI?</div>
              {todayMood && (
                <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(179,136,255,0.06)', border: `1px solid rgba(179,136,255,0.15)`, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 28 }}>{todayMood.emoji}</span>
                  <div>
                    <div style={{ fontSize: 12, color: C.purple, fontWeight: 700 }}>Aaj: {todayMood.label}</div>
                    {todayMood.note && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{todayMood.note}</div>}
                    <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>{fmt(todayMood.ts)}</div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {MOODS.map(m => (
                  <button key={m.label} onClick={() => logMood(m)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 22, cursor: 'pointer', background: 'transparent', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    {m.emoji}
                    <span style={{ fontSize: 9, color: C.dim }}>{m.label}</span>
                  </button>
                ))}
              </div>
              <input value={moodNote} onChange={e => setMoodNote(e.target.value)} placeholder="Optional note — kuch aaj hua? (optional)" style={{ ...S.input, marginBottom: 0 }} />
            </div>
            {/* Mood history */}
            {moods.length > 0 && (
              <div style={S.card}>
                <div style={S.label}>PICHLE CHECK-INS</div>
                {moods.slice(0, 10).map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', borderBottom: i < moods.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <span style={{ fontSize: 20 }}>{m.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: C.text }}>{m.label}</div>
                      {m.note && <div style={{ fontSize: 10, color: C.dim }}>{m.note}</div>}
                    </div>
                    <div style={{ fontSize: 9, color: C.dim }}>{fmtDate(m.ts)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── SLEEP ── */}
        {tab === 'sleep' && (
          <>
            <div style={S.card}>
              <div style={S.label}>KAL KI NEEND LOG KARO</div>
              {avgSleep && (
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 40, fontWeight: 800, color: Number(avgSleep) >= 7 ? C.green : Number(avgSleep) >= 6 ? C.yellow : C.red }}>{avgSleep}h</div>
                  <div style={{ fontSize: 11, color: C.dim }}>7 din ka average</div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.dim, marginBottom: 5 }}>😴 Sone gaye</div>
                  <input type="time" value={bedTime} onChange={e => setBedTime(e.target.value)} style={{ ...S.input, colorScheme: 'dark' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.dim, marginBottom: 5 }}>☀️ Uthe</div>
                  <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)} style={{ ...S.input, colorScheme: 'dark' }} />
                </div>
              </div>
              <button onClick={logSleep} style={{ ...S.btn, width: '100%', textAlign: 'center', background: 'rgba(124,77,255,.1)', border: `1px solid rgba(124,77,255,.3)`, color: '#b388ff' }}>
                ✓ Log Sleep
              </button>
            </div>
            {sleepLog.length > 0 && (
              <div style={S.card}>
                <div style={S.label}>SLEEP HISTORY</div>
                {sleepLog.slice(0, 7).map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', borderBottom: i < 6 && i < sleepLog.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <span style={{ fontSize: 16 }}>{s.hrs >= 7 ? '✅' : s.hrs >= 6 ? '⚠️' : '❌'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: s.hrs >= 7 ? C.green : s.hrs >= 6 ? C.yellow : C.red, fontWeight: 700 }}>{s.hrs}h</div>
                      <div style={{ fontSize: 10, color: C.dim }}>{s.bed} → {s.wake}</div>
                    </div>
                    <div style={{ fontSize: 9, color: C.dim }}>{fmtDate(s.ts)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── BMI ── */}
        {tab === 'bmi' && (
          <div style={S.card}>
            <div style={S.label}>BMI CALCULATOR ⚖️</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: C.dim, marginBottom: 5 }}>📏 Height (cm)</div>
                <input value={height} onChange={e => setHeight(e.target.value)} placeholder="170" type="number" style={S.input} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.dim, marginBottom: 5 }}>⚖️ Weight (kg)</div>
                <input value={weight} onChange={e => setWeight(e.target.value)} placeholder="65" type="number" style={S.input} />
              </div>
            </div>
            <button onClick={calcBMI} style={{ ...S.btn, width: '100%', textAlign: 'center' }}>Calculate BMI</button>
            {bmi !== null && (
              <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: `${bmiLabel(bmi).color}10`, border: `1px solid ${bmiLabel(bmi).color}30`, textAlign: 'center' }}>
                <div style={{ fontSize: 48, fontWeight: 800, color: bmiLabel(bmi).color }}>{bmi}</div>
                <div style={{ fontSize: 16, color: bmiLabel(bmi).color, marginTop: 4 }}>{bmiLabel(bmi).label}</div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-around', fontSize: 10, color: C.dim }}>
                  {[['<18.5','Under'],['18.5-24.9','Normal'],['25-29.9','Over'],['≥30','Obese']].map(([r,l]) => (
                    <div key={l} style={{ textAlign: 'center' }}><div style={{ color: C.text, fontWeight: 600 }}>{r}</div><div>{l}</div></div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', fontSize: 11, color: C.dim, lineHeight: 1.7 }}>
              💡 BMI ek rough estimate hai. Muscle mass, age, gender consider nahi karta. Doctor se consult karo health decisions ke liye.
            </div>
          </div>
        )}

        {/* ── MEDS ── */}
        {tab === 'meds' && (
          <>
            <div style={S.card}>
              <div style={S.label}>MEDICINE ADD KARO 💊</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <input value={medName} onChange={e => setMedName(e.target.value)} placeholder="Medicine naam" style={S.input} />
                <input type="time" value={medTime} onChange={e => setMedTime(e.target.value)} style={{ ...S.input, colorScheme: 'dark' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 0 }}>
                <input value={medDose} onChange={e => setMedDose(e.target.value)} placeholder="Dose — jaise: 500mg, 1 tablet" style={{ ...S.input, flex: 1 }} />
                <button onClick={addMed} style={{ ...S.btn, flexShrink: 0, background: 'rgba(255,214,0,.1)', border: `1px solid rgba(255,214,0,.3)`, color: C.yellow }}>+ Add</button>
              </div>
            </div>
            {meds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: C.dim, fontSize: 12 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>💊</div>
                Koi medicine set nahi hai
              </div>
            ) : (
              <div style={S.card}>
                <div style={S.label}>AAJ KI MEDICINES — {takenToday.length}/{meds.length} Li</div>
                {meds.map(m => (
                  <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                    <button onClick={() => toggleTaken(m.id)} style={{ width: 28, height: 28, borderRadius: 8, background: takenToday.includes(m.id) ? 'rgba(0,230,118,.15)' : 'transparent', border: `1px solid ${takenToday.includes(m.id) ? C.green : C.border}`, color: takenToday.includes(m.id) ? C.green : C.dim, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>
                      {takenToday.includes(m.id) ? '✓' : '○'}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: takenToday.includes(m.id) ? C.dim : C.text, textDecoration: takenToday.includes(m.id) ? 'line-through' : 'none' }}>{m.name}</div>
                      <div style={{ fontSize: 10, color: C.dim }}>{m.dose} · {m.time}</div>
                    </div>
                    <button onClick={() => removeMed(m.id)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 14, padding: 4 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── STEPS ── */}
        {tab === 'steps' && (
          <>
            <div style={S.card}>
              <div style={S.label}>AAJ KE STEPS 👟</div>
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: 52, fontWeight: 800, color: stepsToday >= stepsGoal ? C.green : C.blue, lineHeight: 1 }}>{stepsToday.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>/ {stepsGoal.toLocaleString('en-IN')} goal</div>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'rgba(64,196,255,0.1)', overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ height: '100%', width: `${Math.min(100,(stepsToday/stepsGoal)*100)}%`, background: stepsToday >= stepsGoal ? C.green : C.blue, borderRadius: 4, transition: 'width .3s' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={stepsInput} onChange={e => setStepsInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSteps()} placeholder="Steps add karo" type="number" style={{ ...S.input, flex: 1 }} />
                <button onClick={addSteps} style={{ ...S.btn, flexShrink: 0, background: 'rgba(64,196,255,.1)', border: `1px solid rgba(64,196,255,.3)`, color: C.blue }}>+ Add</button>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                {[500,1000,2000,5000].map(n => (
                  <button key={n} onClick={() => { setStepsInput(String(n)); }} style={{ flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 10, cursor: 'pointer', background: 'transparent', border: `1px solid ${C.border}`, color: C.dim }}>+{n >= 1000 ? n/1000+'k' : n}</button>
                ))}
              </div>
            </div>
            {/* Goal setter */}
            <div style={S.card}>
              <div style={S.label}>DAILY GOAL</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[5000,8000,10000,15000].map(g => (
                  <button key={g} onClick={() => { setStepsGoal(g); localStorage.setItem('j_steps_goal', String(g)) }} style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 10, cursor: 'pointer', background: stepsGoal === g ? 'rgba(64,196,255,.1)' : 'transparent', border: `1px solid ${stepsGoal === g ? C.blue + '44' : C.border}`, color: stepsGoal === g ? C.blue : C.dim }}>
                    {g >= 1000 ? g/1000+'k' : g}
                  </button>
                ))}
              </div>
            </div>
            {stepsHistory.length > 0 && (
              <div style={S.card}>
                <div style={S.label}>HISTORY</div>
                {stepsHistory.slice(0,7).map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, fontSize: 10, color: C.dim, flexShrink: 0 }}>{fmtDate(h.ts)}</div>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(64,196,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100,(h.steps/h.goal)*100)}%`, background: h.steps >= h.goal ? C.green : C.blue, borderRadius: 3 }} />
                    </div>
                    <div style={{ width: 40, fontSize: 10, color: h.steps >= h.goal ? C.green : C.text, textAlign: 'right', flexShrink: 0 }}>{h.steps >= 1000 ? (h.steps/1000).toFixed(1)+'k' : h.steps}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>

      <Sidebar isOpen={sidebar} onClose={() => setSidebar(false)} />
    </div>
  )
}
