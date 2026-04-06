'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type Section = { title: string; content: string; icon: string; color: string }

export default function BriefPage() {
  const [brief, setBrief] = useState<Section[]>([])
  const [loading, setLoading] = useState(false)
  const [weather, setWeather] = useState<any>(null)
  const [city, setCity] = useState('Rewa')
  const [lastGen, setLastGen] = useState('')
  const [expanded, setExpanded] = useState<string|null>(null)

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => {
    const saved = localStorage.getItem('brief_cache')
    const savedDate = localStorage.getItem('brief_date')
    const todayStr = new Date().toISOString().slice(0,10)
    if (saved && savedDate === todayStr) {
      setBrief(JSON.parse(saved))
      setLastGen(savedDate)
    }
    fetchWeather()
  }, [])

  async function fetchWeather() {
    try {
      const r = await fetch('/api/weather?city=' + city)
      if (r.ok) setWeather(await r.json())
    } catch {}
  }

  async function generateBrief() {
    setLoading(true); setBrief([])
    const prompt = `Generate a morning brief for Pranshu in Hinglish. Today: ${today}.
Return exactly this JSON:
{
  "sections": [
    {"title":"🌅 Good Morning","content":"Motivational personal message in Hinglish 2-3 lines","icon":"🌅","color":"#fbbf24"},
    {"title":"📰 India News","content":"3-4 latest India news headlines (fictional but realistic for today)","icon":"📰","color":"#60a5fa"},
    {"title":"🌍 World News","content":"2-3 world news items","icon":"🌍","color":"#34d399"},
    {"title":"💡 Today's Tip","content":"One actionable productivity/life tip in Hinglish","icon":"💡","color":"#a78bfa"},
    {"title":"📅 Aaj Ka Din","content":"What to focus on today — tasks, mindset, 2-3 points","icon":"📅","color":"#f87171"},
    {"title":"🔢 Fun Fact","content":"One interesting science/history fact","icon":"🔢","color":"#00e5ff"}
  ]
}
Return ONLY valid JSON. No backticks.`

    try {
      const r = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, systemOverride: 'Return only valid JSON.' })
      })
      const d = await r.json()
      const text = d.response || d.message || ''
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        setBrief(parsed.sections || [])
        const todayStr = new Date().toISOString().slice(0,10)
        localStorage.setItem('brief_cache', JSON.stringify(parsed.sections))
        localStorage.setItem('brief_date', todayStr)
        setLastGen(todayStr)
      }
    } catch {}
    setLoading(false)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Suprabhat' : hour < 17 ? 'Namaste' : hour < 21 ? 'Shubh Sandhya' : 'Shubh Ratri'

  return (
    <div style={{ minHeight: '100vh', background: '#070d1a', color: '#ddeeff', fontFamily: "'Inter', sans-serif", padding: '0 0 80px' }}>
      <style>{`
        * { box-sizing: border-box }
        @keyframes fadeUp { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
      `}</style>

      <div style={{ background: 'rgba(7,13,26,0.97)', borderBottom: '1px solid rgba(0,229,255,0.07)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)' }}>
        <Link href="/" style={{ color: '#2a5070', fontSize: '18px', textDecoration: 'none' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fbbf24' }}>📰 Daily Brief</div>
          <div style={{ fontSize: '11px', color: '#2a5070' }}>{today}</div>
        </div>
        <button onClick={generateBrief} disabled={loading}
          style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.08))', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '8px', color: '#fbbf24', cursor: loading ? 'wait' : 'pointer', padding: '6px 12px', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {loading ? <div style={{ width: '12px', height: '12px', border: '2px solid #fbbf24', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : '✨'}
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '14px' }}>
        {/* Greeting + weather */}
        <div style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.04))', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '16px', padding: '18px', marginBottom: '14px', animation: 'fadeUp 0.2s ease' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#fbbf24', marginBottom: '4px' }}>{greeting}, Pranshu! 👋</div>
          <div style={{ fontSize: '12px', color: '#2a5070', marginBottom: weather ? '12px' : '0' }}>{new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>

          {weather && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,229,255,0.04)', borderRadius: '10px', padding: '10px 12px' }}>
              <div style={{ fontSize: '28px' }}>{weather.condition?.emoji || '🌡️'}</div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#ddeeff' }}>{weather.temperature}°C <span style={{ fontSize: '12px', color: '#2a5070' }}>Feels {weather.feelsLike}°</span></div>
                <div style={{ fontSize: '11px', color: '#4a7090' }}>{weather.condition?.text} · {weather.city} · 💧{weather.humidity}%</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#2a5070' }}>💨 {weather.windSpeed} km/h</div>
                <div style={{ fontSize: '10px', color: '#1e3248', marginTop: '2px' }}>🌧️ {weather.precipitation}mm</div>
              </div>
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ display: 'inline-flex', gap: '6px', marginBottom: '12px' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', animation: `pulse 1.2s infinite ${i*0.2}s` }} />)}
            </div>
            <div style={{ fontSize: '13px', color: '#2a5070' }}>Brief generate ho raha hai...</div>
          </div>
        )}

        {/* Empty state */}
        {!loading && brief.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', animation: 'fadeUp 0.2s ease' }}>
            <div style={{ fontSize: '50px', marginBottom: '14px', opacity: 0.3 }}>📰</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#4a7090', marginBottom: '8px' }}>Aaj ka brief nahi bana abhi</div>
            <div style={{ fontSize: '12px', color: '#1e3248', marginBottom: '20px' }}>Generate karo — news, tips, motivation sab ek jagah</div>
            <button onClick={generateBrief}
              style={{ background: 'linear-gradient(135deg, #b45309, #fbbf24)', border: 'none', borderRadius: '12px', color: '#000', cursor: 'pointer', padding: '12px 28px', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit' }}>
              ✨ Generate Today's Brief
            </button>
          </div>
        )}

        {/* Brief sections */}
        {brief.map((section, i) => (
          <div key={i} style={{ background: 'rgba(12,20,34,0.8)', border: `1px solid ${section.color}18`, borderRadius: '14px', marginBottom: '10px', overflow: 'hidden', animation: `fadeUp ${0.1+i*0.05}s ease`, cursor: 'pointer' }}
            onClick={() => setExpanded(expanded === section.title ? null : section.title)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px' }}>
              <div style={{ fontSize: '20px', flexShrink: 0 }}>{section.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: section.color }}>{section.title}</div>
                {expanded !== section.title && (
                  <div style={{ fontSize: '12px', color: '#4a7090', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {section.content.slice(0, 60)}...
                  </div>
                )}
              </div>
              <div style={{ color: '#2a5070', fontSize: '12px' }}>{expanded === section.title ? '▲' : '▼'}</div>
            </div>
            {expanded === section.title && (
              <div style={{ padding: '0 14px 14px 44px', fontSize: '13px', color: '#c8dff0', lineHeight: '1.7', whiteSpace: 'pre-wrap', borderTop: `1px solid ${section.color}10` }}>
                <div style={{ paddingTop: '10px' }}>{section.content}</div>
              </div>
            )}
          </div>
        ))}

        {lastGen && brief.length > 0 && (
          <div style={{ textAlign: 'center', fontSize: '10px', color: '#1e3248', marginTop: '8px' }}>
            Last generated: {lastGen} · Tap Generate to refresh
          </div>
        )}
      </div>
    </div>
  )
}
