'use client'
// app/study/page.tsx — JARVIS Study Mode
// MCQ, Flashcards, Notes, Quiz, Revision Plan — sab ek jagah

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/shared/Sidebar'
import { buildMemoryPrompt } from '../../lib/storage'

type StudyTool = 'chat' | 'mcq' | 'flashcard' | 'notes' | 'plan'
type Message = { role: 'user' | 'ai'; text: string; ts: number }

const TOOLS: { id: StudyTool; icon: string; label: string; prompt: string }[] = [
  { id: 'chat',      icon: '💬', label: 'Explain',   prompt: 'Yeh concept simple language mein samjhao, examples ke saath: ' },
  { id: 'mcq',       icon: '❓', label: 'MCQ',        prompt: '5 MCQ banao is topic pe, options aur answers ke saath: ' },
  { id: 'flashcard', icon: '🗂️', label: 'Flashcard', prompt: '8 flashcards banao (Q: ... A: ... format) topic: ' },
  { id: 'notes',     icon: '📝', label: 'Notes',      prompt: 'Short revision notes banao bullet points mein, topic: ' },
  { id: 'plan',      icon: '📅', label: 'Plan',       prompt: 'Study plan banao is topic ke liye — agar exam ' },
]

const SUBJECTS = ['Biology', 'Chemistry', 'Physics', 'Math', 'History', 'Geography', 'Economics', 'English', 'Hindi', 'Computer', 'Custom']

export default function StudyPage() {
  const router = useRouter()
  const [tool, setTool]       = useState<StudyTool>('chat')
  const [topic, setTopic]     = useState('')
  const [subject, setSubject] = useState('Biology')
  const [msgs, setMsgs]       = useState<Message[]>([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode]       = useState<'auto'|'flash'|'think'|'deep'>('auto')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  // systemPrompt uses profile from unified storage
  const systemPrompt = `Tum JARVIS ho — ek expert study assistant.
Aaj study session: ${subject} — Topic: ${topic || 'user batayega'}
Language: Hinglish (Hindi + English mix). Simple aur clear explanation do.
MCQ ke liye: numbered options, bold answer.
Flashcard ke liye: "Q: ... \\nA: ..." format.
Notes ke liye: bullet points, important terms bold karo.
Formulas ko backtick mein likho.
Examples real life se do.`

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', text, ts: Date.now() }
    setMsgs(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = msgs.slice(-8).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userId: (typeof window!=='undefined' ? localStorage.getItem('jarvis_uid')||'user' : 'user'),
          chatMode: mode,
          memoryPrompt: systemPrompt,
          history,
        })
      })
      const d = await res.json()
      setMsgs(prev => [...prev, { role: 'ai', text: d.reply || 'Kuch problem aayi', ts: Date.now() }])
    } catch {
      setMsgs(prev => [...prev, { role: 'ai', text: '❌ Error — dobara try karo', ts: Date.now() }])
    }
    setLoading(false)
  }

  const quickSend = (t: { id: StudyTool; prompt: string }) => {
    if (!topic.trim()) {
      setTool(t.id)
      setInput(t.prompt)
      return
    }
    setTool(t.id)
    send(t.prompt + topic)
  }

  const C = {
    bg:      '#030a14',
    surface: '#0a1628',
    border:  'rgba(0,229,255,.07)',
    accent:  '#00e5ff',
    purple:  '#a78bfa',
    green:   '#00e676',
    text:    '#c8dff0',
    dim:     '#2a4060',
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, fontFamily: "'Inter','Noto Sans Devanagari',sans-serif", paddingTop: 48, paddingBottom: 80, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 48, background: 'rgba(3,10,20,.95)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 14px 0 58px', gap: 10, backdropFilter: 'blur(10px)' }}>
        <span style={{ fontSize: 13, color: C.purple, letterSpacing: 1, fontWeight: 700 }}>📚 STUDY MODE</span>
        {/* Mode selector */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {(['auto','flash','think'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 9, cursor: 'pointer', background: mode === m ? 'rgba(167,139,250,.15)' : 'transparent', border: `1px solid ${mode === m ? 'rgba(167,139,250,.4)' : C.border}`, color: mode === m ? C.purple : C.dim }}>
              {m === 'auto' ? '🤖' : m === 'flash' ? '⚡' : '🧠'} {m}
            </button>
          ))}
        </div>
      </header>

      <div style={{ flex: 1, padding: '12px 14px', maxWidth: 600, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Subject + Topic */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 9, color: C.dim, letterSpacing: 1, marginBottom: 8 }}>SUBJECT + TOPIC</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {SUBJECTS.map(s => (
              <button key={s} onClick={() => setSubject(s)} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, cursor: 'pointer', background: subject === s ? 'rgba(167,139,250,.12)' : 'transparent', border: `1px solid ${subject === s ? 'rgba(167,139,250,.35)' : C.border}`, color: subject === s ? C.purple : C.dim }}>
                {s}
              </button>
            ))}
          </div>
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Topic likho — jaise: Photosynthesis, Quadratic Equations, WW2..."
            style={{ width: '100%', padding: '9px 12px', borderRadius: 9, background: '#060c18', border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Quick tools */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => quickSend(t)}
              style={{ flexShrink: 0, padding: '7px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', background: tool === t.id ? 'rgba(167,139,250,.1)' : C.surface, border: `1px solid ${tool === t.id ? 'rgba(167,139,250,.3)' : C.border}`, color: tool === t.id ? C.purple : C.text, display: 'flex', alignItems: 'center', gap: 5 }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        {msgs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: C.dim }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📚</div>
            <div style={{ fontSize: 12 }}>Topic likho upar, phir tool choose karo</div>
            <div style={{ fontSize: 10, marginTop: 6, opacity: .5 }}>Ya directly kuch pucho neeche</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '88%', padding: '10px 13px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.role === 'user' ? 'rgba(167,139,250,.12)' : C.surface, border: `1px solid ${m.role === 'user' ? 'rgba(167,139,250,.2)' : C.border}`, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: C.text }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex' }}>
                <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: C.surface, border: `1px solid ${C.border}` }}>
                  <span style={{ color: C.purple, fontSize: 13 }}>📚 Soch raha hoon...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '10px 14px', background: 'rgba(3,10,20,.97)', borderTop: `1px solid ${C.border}`, backdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder="Kuch bhi pucho — ya upar wale tools use karo..."
            rows={1}
            style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: '#0a1628', border: `1px solid rgba(167,139,250,.15)`, color: C.text, fontSize: 14, resize: 'none', outline: 'none', lineHeight: 1.5, maxHeight: 100, overflowY: 'auto' }}
          />
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            style={{ width: 40, height: 40, borderRadius: 10, background: input.trim() ? 'rgba(167,139,250,.15)' : 'transparent', border: `1px solid ${input.trim() ? 'rgba(167,139,250,.35)' : C.border}`, color: input.trim() ? C.purple : C.dim, fontSize: 16, cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            ➤
          </button>
        </div>
      </div>

      <Sidebar />
    </div>
  )
}
