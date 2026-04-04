'use client'
import { useState, useRef, useEffect } from 'react'
import Sidebar from '../../components/shared/Sidebar'

const C = {
  bg: '#030a14', surface: '#070e1c', border: 'rgba(255,255,255,0.07)',
  text: '#c8dff0', dim: '#3a5a7a', blue: '#40c4ff', green: '#00e676',
  gold: '#ffd600', purple: '#b388ff', red: '#ff5252',
}

const TOOLS = [
  {
    id: 'email', icon: '📧', label: 'Email', color: C.blue,
    fields: [
      { key: 'to', label: 'Kisko likhna hai?', ph: 'Boss / Client / College Dean' },
      { key: 'subject', label: 'Kya kaam hai?', ph: 'Leave request, complaint, enquiry...' },
      { key: 'tone', label: 'Tone', type: 'select', options: ['Formal', 'Polite', 'Urgent', 'Friendly', 'Apologetic'] },
      { key: 'points', label: 'Main points (optional)', ph: '3 din ki chutti, urgent kaam, etc.' },
    ],
    prompt: (f: Record<string,string>) => `Ek professional email likho in details ke saath:\n- Recipient: ${f.to}\n- Subject/Purpose: ${f.subject}\n- Tone: ${f.tone || 'Formal'}\n- Key points: ${f.points || 'N/A'}\n\nEmail format mein likho — Subject, Salutation, Body, Closing. Clear aur concise raho. Hindi ya English jo appropriate ho.`,
  },
  {
    id: 'blog', icon: '✍️', label: 'Blog', color: '#f472b6',
    fields: [
      { key: 'topic', label: 'Topic kya hai?', ph: 'AI ka future, Healthy eating, Travel tips...' },
      { key: 'audience', label: 'Readers kaun hain?', ph: 'Students, professionals, general public' },
      { key: 'length', label: 'Length', type: 'select', options: ['Short (300 words)', 'Medium (600 words)', 'Long (1000+ words)'] },
      { key: 'style', label: 'Writing Style', type: 'select', options: ['Informative', 'Storytelling', 'Listicle', 'Opinion', 'How-to'] },
    ],
    prompt: (f: Record<string,string>) => `Ek engaging blog post likho:\n- Topic: ${f.topic}\n- Target audience: ${f.audience || 'general readers'}\n- Length: ${f.length || 'Medium'}\n- Style: ${f.style || 'Informative'}\n\nHeadings, subheadings use karo. Engaging opener se shuru karo. Call-to-action ke saath khatam karo.`,
  },
  {
    id: 'linkedin', icon: '💼', label: 'LinkedIn', color: '#0ea5e9',
    fields: [
      { key: 'topic', label: 'Kya share karna hai?', ph: 'New job, achievement, lesson learned, opinion...' },
      { key: 'angle', label: 'Angle / Insight', ph: 'Kya unique perspective hai tera?' },
      { key: 'cta', label: 'Call to action', ph: 'Comment karo, share karo, discuss karo' },
    ],
    prompt: (f: Record<string,string>) => `Ek viral LinkedIn post likho:\n- Topic: ${f.topic}\n- Unique angle: ${f.angle || 'personal experience'}\n- CTA: ${f.cta || 'share your thoughts'}\n\nHook line se shuru karo jo scroll rokde. Short paragraphs. Authentic tone. Emojis sparingly. 3-5 relevant hashtags end mein.`,
  },
  {
    id: 'instagram', icon: '📸', label: 'Instagram', color: '#f97316',
    fields: [
      { key: 'photo', label: 'Photo/reel kiska hai?', ph: 'Food, travel, selfie, workout, nature...' },
      { key: 'mood', label: 'Vibe / Mood', ph: 'Chill, motivated, happy, aesthetic, funny...' },
      { key: 'lang', label: 'Language', type: 'select', options: ['Hinglish', 'English', 'Hindi', 'Mix'] },
    ],
    prompt: (f: Record<string,string>) => `Ek catchy Instagram caption likho with hashtags:\n- Content: ${f.photo}\n- Mood/Vibe: ${f.mood || 'positive'}\n- Language: ${f.lang || 'Hinglish'}\n\n2-3 caption options do — ek witty, ek aesthetic, ek relatable. Har option ke saath 15-20 relevant hashtags.`,
  },
  {
    id: 'whatsapp', icon: '💬', label: 'WhatsApp', color: '#22c55e',
    fields: [
      { key: 'context', label: 'Kya bolna hai?', ph: 'Birthday wish, apology, breakup, proposal, excuse...' },
      { key: 'relation', label: 'Rishta', ph: 'Friend, crush, boss, mom, teacher...' },
      { key: 'tone', label: 'Tone', type: 'select', options: ['Casual', 'Sweet', 'Funny', 'Serious', 'Flirty', 'Formal'] },
    ],
    prompt: (f: Record<string,string>) => `Ek perfect WhatsApp message likho:\n- Situation: ${f.context}\n- Relation: ${f.relation || 'friend'}\n- Tone: ${f.tone || 'Casual'}\n\n3 options do — short, medium, long. Emojis natural lage, forced nahi. Hinglish mein likho jab tak formal na ho.`,
  },
  {
    id: 'letter', icon: '📜', label: 'Letter', color: C.gold,
    fields: [
      { key: 'type', label: 'Letter type', type: 'select', options: ['Bank application', 'School/College application', 'Govt complaint', 'Leave application', 'NOC request', 'Reference letter', 'Resignation'] },
      { key: 'to', label: 'Kisko (designation)', ph: 'Branch Manager, Principal, Collector...' },
      { key: 'subject', label: 'Subject / Purpose', ph: 'Account opening, TC request, road repair complaint...' },
      { key: 'details', label: 'Important details', ph: 'Name, account no, dates, specific demands...' },
    ],
    prompt: (f: Record<string,string>) => `Ek formal ${f.type || 'application'} letter likho:\n- To: ${f.to}\n- Subject: ${f.subject}\n- Details: ${f.details}\n\nProper format mein — Date, Address, Subject line, Salutation, Body (3-4 paragraphs), Complimentary close, Signature placeholder. Formal English mein, clear demands ke saath.`,
  },
  {
    id: 'grammar', icon: '✅', label: 'Fix Grammar', color: C.green,
    fields: [
      { key: 'text', label: 'Text paste karo', ph: 'Apna text yahan paste karo jisko fix karwana hai...', multiline: true },
      { key: 'lang', label: 'Language', type: 'select', options: ['English', 'Hindi', 'Hinglish'] },
    ],
    prompt: (f: Record<string,string>) => `Yeh text fix karo:\n\n"${f.text}"\n\nLanguage: ${f.lang || 'English'}\n\nPehle corrected version do, phir changes explain karo (kya galat tha, kyun fix kiya). Tone preserve karo.`,
  },
  {
    id: 'translate', icon: '🔄', label: 'Translate', color: C.purple,
    fields: [
      { key: 'text', label: 'Text likho', ph: 'Koi bhi text...', multiline: true },
      { key: 'from', label: 'From', type: 'select', options: ['Hinglish', 'Hindi', 'English', 'Auto detect'] },
      { key: 'to', label: 'To', type: 'select', options: ['Formal English', 'Formal Hindi', 'Simple English', 'Simple Hindi', 'Professional Hinglish'] },
    ],
    prompt: (f: Record<string,string>) => `Translate/convert yeh text:\n\n"${f.text}"\n\nFrom: ${f.from || 'Auto detect'}\nTo: ${f.to || 'Formal English'}\n\nTranslated version do, phir ek line mein explain karo kya changes kiye.`,
  },
]

export default function WritePage() {
  const [sidebar, setSidebar] = useState(false)
  const [activeTool, setActiveTool] = useState(TOOLS[0])
  const [fields, setFields] = useState<Record<string,string>>({})
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setFields({})
    setOutput('')
  }, [activeTool.id])

  async function generate() {
    const missingRequired = activeTool.fields.filter(f => !f.type && !f.multiline && !fields[f.key]?.trim())
    if (missingRequired.length > 0) return

    setLoading(true)
    setOutput('')

    try {
      const prompt = activeTool.prompt(fields)
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          systemPrompt: `Tum JARVIS ho — ek expert writing assistant. ${activeTool.label} ke liye best quality content generate karo. Direct content do, meta-commentary mat karo.`,
          mode: 'auto',
        })
      })

      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let result = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const j = JSON.parse(data)
              const tok = j.choices?.[0]?.delta?.content || j.token || j.text || ''
              result += tok
              setOutput(result)
            } catch {}
          }
        }
      }
    } catch (e) {
      setOutput('Error: ' + String(e))
    }
    setLoading(false)
  }

  function copyOutput() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const S = {
    card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 12 } as React.CSSProperties,
    label: { fontSize: 9, color: C.dim, letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase' as const },
    input: { width: '100%', padding: '9px 12px', borderRadius: 9, background: '#050b16', border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
    select: { width: '100%', padding: '9px 12px', borderRadius: 9, background: '#050b16', border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: 'none', cursor: 'pointer', colorScheme: 'dark' } as React.CSSProperties,
    textarea: { width: '100%', padding: '9px 12px', borderRadius: 9, background: '#050b16', border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: 'none', resize: 'vertical' as const, minHeight: 80, boxSizing: 'border-box' as const, fontFamily: 'inherit', lineHeight: 1.5 },
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, fontFamily: "'Inter','Noto Sans Devanagari',sans-serif", paddingTop: 48, paddingBottom: 80 }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 48, background: 'rgba(3,10,20,.96)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 14px 0 58px', backdropFilter: 'blur(10px)', gap: 10 }}>
        <span style={{ fontSize: 13, color: C.blue, letterSpacing: 1, fontWeight: 700 }}>✍️ WRITING TOOLS</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: activeTool.color }}>{activeTool.icon} {activeTool.label}</span>
      </header>

      <button onClick={() => setSidebar(true)} style={{ position: 'fixed', top: 10, left: 14, zIndex: 51, background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: 6, borderRadius: 6, fontSize: 18 }}>☰</button>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '12px 14px' }}>

        {/* Tool selector */}
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 4, marginBottom: 14, scrollbarWidth: 'none' }}>
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setActiveTool(t)} style={{ flexShrink: 0, padding: '7px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', background: activeTool.id === t.id ? `${t.color}18` : C.surface, border: `1px solid ${activeTool.id === t.id ? t.color + '44' : C.border}`, color: activeTool.id === t.id ? t.color : C.dim, fontWeight: activeTool.id === t.id ? 700 : 400 }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Input fields */}
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>{activeTool.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: activeTool.color }}>{activeTool.label}</div>
            </div>
          </div>

          {activeTool.fields.map(f => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <div style={S.label}>{f.label}</div>
              {f.type === 'select' ? (
                <select value={fields[f.key] || ''} onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))} style={S.select}>
                  <option value="">-- Chunlo --</option>
                  {(f as any).options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (f as any).multiline ? (
                <textarea value={fields[f.key] || ''} onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={(f as any).ph} style={S.textarea} />
              ) : (
                <input value={fields[f.key] || ''} onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={(f as any).ph} style={S.input} onKeyDown={e => e.key === 'Enter' && !loading && generate()} />
              )}
            </div>
          ))}

          <button onClick={generate} disabled={loading} style={{ width: '100%', padding: '12px 0', borderRadius: 10, background: !loading ? `${activeTool.color}18` : 'transparent', border: `1px solid ${!loading ? activeTool.color + '44' : C.border}`, color: !loading ? activeTool.color : C.dim, fontSize: 14, fontWeight: 700, cursor: !loading ? 'pointer' : 'default', marginTop: 4 }}>
            {loading ? '⟳ Likh raha hoon...' : `✦ Generate ${activeTool.label}`}
          </button>
        </div>

        {/* Output */}
        {(output || loading) && (
          <div style={S.card} ref={outputRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ ...S.label, marginBottom: 0 }}>GENERATED OUTPUT</div>
              {output && (
                <button onClick={copyOutput} style={{ padding: '4px 10px', borderRadius: 6, background: copied ? 'rgba(0,230,118,.1)' : 'transparent', border: `1px solid ${copied ? C.green + '44' : C.border}`, color: copied ? C.green : C.dim, fontSize: 11, cursor: 'pointer' }}>
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              )}
            </div>
            {loading && !output && (
              <div style={{ color: activeTool.color, fontSize: 13 }}>✦ Likh raha hoon...</div>
            )}
            {output && (
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {output}
              </div>
            )}
          </div>
        )}

      </div>

      <Sidebar isOpen={sidebar} onClose={() => setSidebar(false)} />
    </div>
  )
}
