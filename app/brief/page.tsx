'use client'
// /brief — JARVIS Daily Briefing
// Pulls: weather (Open-Meteo free), health stats (localStorage), goals, medicines
// Then asks AI to write a personal morning briefing — streaming

import { useState, useEffect, useRef } from 'react'
import Sidebar from '../../components/shared/Sidebar'

const C = {
  bg: '#030a14', surface: '#070e1c', border: 'rgba(255,255,255,0.07)',
  text: '#c8dff0', dim: '#3a5a7a', gold: '#ffd600', green: '#00e676',
  blue: '#40c4ff', purple: '#b388ff', red: '#ff5252',
}

interface WeatherData { temp: number; desc: string; humidity: number; city: string; icon: string }
interface HealthSnap { water: number; waterGoal: number; mood: string; sleep: number | null; steps: number; stepsGoal: number }
interface GoalSnap { title: string; progress: number; streak: number; category: string }
interface MedSnap { name: string; time: string; taken: boolean }

function today() { return new Date().toDateString() }

function getGreeting() {
  const h = new Date().getHours()
  if (h < 5)  return { text: 'Raat ko bhi jaag ke kaam?', icon: '🌙' }
  if (h < 12) return { text: 'Good Morning!', icon: '🌅' }
  if (h < 17) return { text: 'Good Afternoon!', icon: '☀️' }
  if (h < 21) return { text: 'Good Evening!', icon: '🌆' }
  return { text: 'Raat ho gayi!', icon: '🌙' }
}

function loadHealth(): HealthSnap {
  try {
    const d = today()
    const wData = JSON.parse(localStorage.getItem('j_water') || '{}')
    const water = wData[d] || 0
    const waterGoal = Number(localStorage.getItem('j_water_goal') || 8)
    const moodEntry = JSON.parse(localStorage.getItem('j_mood_today') || 'null')
    const mood = moodEntry && new Date(moodEntry.ts).toDateString() === d ? moodEntry.emoji + ' ' + moodEntry.label : 'Not logged'
    const sleepLog = JSON.parse(localStorage.getItem('j_sleep') || '[]')
    const sleep = sleepLog[0]?.hrs || null
    const stepsData = JSON.parse(localStorage.getItem('j_steps') || '{}')
    const steps = stepsData[d] || 0
    const stepsGoal = Number(localStorage.getItem('j_steps_goal') || 8000)
    return { water, waterGoal, mood, sleep, steps, stepsGoal }
  } catch { return { water: 0, waterGoal: 8, mood: 'Unknown', sleep: null, steps: 0, stepsGoal: 8000 } }
}

function loadGoals(): GoalSnap[] {
  try {
    const targets = JSON.parse(localStorage.getItem('jarvis_targets') || '[]')
    return targets.slice(0, 4).map((t: any) => ({
      title: t.title, progress: t.progress || 0,
      streak: t.streak || 0, category: t.category
    }))
  } catch { return [] }
}

function loadMeds(): MedSnap[] {
  try {
    const meds = JSON.parse(localStorage.getItem('j_meds') || '[]')
    const d = today()
    const taken: string[] = JSON.parse(localStorage.getItem('j_meds_taken') || '{}')[d] || []
    return meds.map((m: any) => ({ name: m.name, time: m.time, taken: taken.includes(m.id) }))
  } catch { return [] }
}

function loadFinance() {
  try {
    const expenses = JSON.parse(localStorage.getItem('j_expenses') || '[]')
    const budget = Number(localStorage.getItem('j_budget') || 10000)
    const mk = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })()
    const monthTotal = expenses
      .filter((e: any) => { const d = new Date(e.ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === mk })
      .reduce((a: number, e: any) => a + e.amount, 0)
    return { spent: monthTotal, budget, pct: Math.round((monthTotal/budget)*100) }
  } catch { return { spent: 0, budget: 10000, pct: 0 } }
}

async function fetchWeather(): Promise<WeatherData | null> {
  try {
    // Get location
    const loc = await new Promise<GeolocationPosition>((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
    )
    const { latitude: lat, longitude: lon } = loc.coords

    // Reverse geocode (free)
    const geoR = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
    const geoD = await geoR.json()
    const city = geoD.address?.city || geoD.address?.town || geoD.address?.village || 'Aapka shahar'

    // Open-Meteo free weather
    const weatherR = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`
    )
    const w = await weatherR.json()
    const code = w.current?.weather_code || 0
    const temp = Math.round(w.current?.temperature_2m || 0)
    const humidity = w.current?.relative_humidity_2m || 0

    const WMO: Record<number, [string, string]> = {
      0: ['Clear sky ☀️', '☀️'], 1: ['Mostly clear 🌤️', '🌤️'], 2: ['Partly cloudy ⛅', '⛅'],
      3: ['Overcast ☁️', '☁️'], 45: ['Foggy 🌫️', '🌫️'], 51: ['Drizzle 🌦️', '🌦️'],
      61: ['Rain 🌧️', '🌧️'], 71: ['Snow 🌨️', '🌨️'], 80: ['Showers 🌦️', '🌦️'],
      95: ['Thunderstorm ⛈️', '⛈️'],
    }
    const closest = Object.keys(WMO).map(Number).reduce((a, b) => Math.abs(b - code) < Math.abs(a - code) ? b : a)
    const [desc, icon] = WMO[closest] || ['Clear', '☀️']
    return { temp, desc, humidity, city, icon }
  } catch { return null }
}

export default function BriefPage() {
  const [sidebar, setSidebar] = useState(false)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [health] = useState(loadHealth)
  const [goals] = useState(loadGoals)
  const [meds] = useState(loadMeds)
  const [finance] = useState(loadFinance)
  const [brief, setBrief] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const greeting = getGreeting()
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const briefRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setWeatherLoading(true)
    fetchWeather().then(w => { setWeather(w); setWeatherLoading(false) })
  }, [])

  async function generateBrief() {
    setGenerating(true)
    setBrief('')
    setGenerated(false)

    const pendingMeds = meds.filter(m => !m.taken)
    const prompt = `Aaj ka personalized JARVIS briefing likhna hai mere liye.

Data:
- Date: ${dateStr}
- Weather: ${weather ? `${weather.temp}°C, ${weather.desc}, Humidity ${weather.humidity}%` : 'Not available'}
- Health: Paani ${health.water}/${health.waterGoal} glass, Mood: ${health.mood}, Neend: ${health.sleep ? health.sleep + 'h' : 'not logged'}, Steps: ${health.steps}/${health.stepsGoal}
- Finance: Is mahine ₹${health.steps} kharch, budget ${finance.pct}% use
- Active Goals: ${goals.length ? goals.map(g => `${g.title} (${g.progress}%, streak: ${g.streak}d)`).join(', ') : 'Koi goal nahi'}
- Pending Medicines: ${pendingMeds.length ? pendingMeds.map(m => `${m.name} at ${m.time}`).join(', ') : 'Sab le li'}

Ek engaging, personal, Hinglish mein briefing likho. Include:
1. Aaj ke din ke baare mein ek warm opening
2. Weather ke hisaab se practical suggestion (kya pehno, kya karo)
3. Health nudge — water kam hai toh remind karo, mood ke baare mein empathize karo
4. Goals ka quick status — koi streak break hone wali ho toh warn karo
5. Pending medicines ki friendly reminder
6. Finance check — agar overspending ho toh gentle roast karo
7. Ek motivational/funny closing line jo JARVIS-style ho

Tone: JARVIS ki tarah — smart, witty, care karta ho, thoda sarcastic bhi. Max 200 words. Emojis freely use karo.`

    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, mode: 'flash' })
      })
      if (!res.body) throw new Error('no stream')
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = '', result = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6)
          if (d === '[DONE]') continue
          try {
            const j = JSON.parse(d)
            const tok = j.choices?.[0]?.delta?.content || j.token || j.text || ''
            result += tok
            setBrief(result)
            briefRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          } catch {}
        }
      }
      setGenerated(true)
    } catch (e) { setBrief('Brief generate nahi ho payi: ' + String(e)) }
    setGenerating(false)
  }

  const S = {
    card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10 } as React.CSSProperties,
    label: { fontSize: 9, color: C.dim, letterSpacing: 1.5, textTransform: 'uppercase' as const },
    chip: (color: string) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: `${color}12`, border: `1px solid ${color}25`, fontSize: 11, color } as React.CSSProperties),
  }

  const pendingMedsCount = meds.filter(m => !m.taken).length

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, fontFamily: "'Inter','Noto Sans Devanagari',sans-serif", paddingTop: 48, paddingBottom: 80 }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 48, background: 'rgba(3,10,20,.96)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 14px 0 58px', backdropFilter: 'blur(10px)', gap: 10 }}>
        <span style={{ fontSize: 13, color: C.gold, letterSpacing: 1, fontWeight: 700 }}>⚡ DAILY BRIEF</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: C.dim }}>{dateStr}</span>
      </header>
      <button onClick={() => setSidebar(true)} style={{ position: 'fixed', top: 10, left: 14, zIndex: 51, background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: 6, borderRadius: 6, fontSize: 18 }}>☰</button>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 14px' }}>

        {/* Greeting */}
        <div style={{ textAlign: 'center', padding: '16px 0 18px' }}>
          <div style={{ fontSize: 44, marginBottom: 6 }}>{greeting.icon}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{greeting.text}</div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{dateStr}</div>
        </div>

        {/* Weather */}
        <div style={{ ...S.card, background: 'rgba(64,196,255,0.05)', borderColor: 'rgba(64,196,255,0.12)' }}>
          {weatherLoading ? (
            <div style={{ fontSize: 12, color: C.dim, textAlign: 'center', padding: '6px 0' }}>📍 Location fetch ho rahi hai...</div>
          ) : weather ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 42 }}>{weather.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.blue }}>{weather.city}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1 }}>{weather.temp}°C</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{weather.desc} · Humidity {weather.humidity}%</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: C.dim, textAlign: 'center', padding: '6px 0' }}>🌐 Location permission nahi mili — weather unavailable</div>
          )}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          {/* Health */}
          <div style={S.card}>
            <div style={{ ...S.label, marginBottom: 8 }}>🏥 HEALTH</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={S.chip(health.water >= health.waterGoal ? C.green : C.blue)}>💧 {health.water}/{health.waterGoal}</span>
              {health.sleep && <span style={S.chip(health.sleep >= 7 ? C.green : C.gold)}>😴 {health.sleep}h</span>}
              <span style={S.chip(C.purple)}>{health.mood}</span>
            </div>
            {health.steps > 0 && <div style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>👟 {health.steps.toLocaleString()} steps</div>}
          </div>
          {/* Finance */}
          <div style={S.card}>
            <div style={{ ...S.label, marginBottom: 8 }}>💰 FINANCE</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: finance.pct > 80 ? C.red : C.gold }}>₹{finance.spent.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>of ₹{finance.budget.toLocaleString()} budget</div>
            <div style={{ height: 4, borderRadius: 2, background: `${C.gold}18`, overflow: 'hidden', marginTop: 6 }}>
              <div style={{ height: '100%', width: `${finance.pct}%`, background: finance.pct > 80 ? C.red : C.gold, borderRadius: 2 }} />
            </div>
          </div>
        </div>

        {/* Goals */}
        {goals.length > 0 && (
          <div style={S.card}>
            <div style={{ ...S.label, marginBottom: 8 }}>🎯 ACTIVE GOALS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {goals.map((g, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: C.text }}>{g.title}</span>
                    <span style={{ fontSize: 10, color: g.streak > 0 ? C.gold : C.dim }}>🔥 {g.streak}d</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ height: '100%', width: `${g.progress}%`, background: C.green, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medicines */}
        {meds.length > 0 && (
          <div style={{ ...S.card, borderColor: pendingMedsCount > 0 ? 'rgba(255,214,0,0.2)' : C.border }}>
            <div style={{ ...S.label, marginBottom: 8 }}>💊 MEDICINES — {meds.length - pendingMedsCount}/{meds.length} Li</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {meds.map((m, i) => (
                <span key={i} style={S.chip(m.taken ? C.green : C.gold)}>
                  {m.taken ? '✓' : '!'} {m.name} {m.time}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Generate button */}
        {!generated && (
          <button onClick={generateBrief} disabled={generating} style={{ width: '100%', padding: '15px 0', borderRadius: 12, background: generating ? 'transparent' : 'rgba(255,214,0,.12)', border: `1px solid ${generating ? C.border : 'rgba(255,214,0,.35)'}`, color: generating ? C.dim : C.gold, fontSize: 15, fontWeight: 800, cursor: generating ? 'default' : 'pointer', letterSpacing: 1, marginBottom: 12 }}>
            {generating ? '✦ JARVIS soch raha hai...' : '⚡ JARVIS BRIEFING GENERATE KRO'}
          </button>
        )}

        {/* Brief output */}
        {(brief || generating) && (
          <div ref={briefRef} style={{ ...S.card, background: 'rgba(255,214,0,0.04)', borderColor: 'rgba(255,214,0,0.15)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,214,0,.12)', border: '1px solid rgba(255,214,0,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>⚡</div>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.75, whiteSpace: 'pre-wrap', flex: 1 }}>
                {brief || <span style={{ color: C.dim }}>Soch raha hoon...</span>}
                {generating && <span style={{ color: C.gold, animation: 'pulse 1s infinite' }}>▊</span>}
              </div>
            </div>
            {generated && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                <button onClick={() => { setBrief(''); setGenerated(false) }} style={{ padding: '6px 12px', borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, fontSize: 11, cursor: 'pointer' }}>🔄 Regenerate</button>
                <button onClick={() => navigator.clipboard.writeText(brief)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(0,230,118,.08)', border: `1px solid rgba(0,230,118,.25)`, color: C.green, fontSize: 11, cursor: 'pointer' }}>📋 Copy</button>
              </div>
            )}
          </div>
        )}

      </div>
      <Sidebar isOpen={sidebar} onClose={() => setSidebar(false)} />
    </div>
  )
}
