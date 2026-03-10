'use client'
// app/era/page.tsx — ERA v3.1
// Fix: TypeScript 'c: string' type on line 237
// Theme: Clean white/light professional (Claude/ChatGPT style)

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Msg {
  id: string
  role: 'user' | 'era'
  text: string
  ts: number
}

const buildEraSystem = (name: string, hour: number, lastTopic: string) => {
  const timeVibe =
    hour < 5  ? `raat ke ${hour} baj rahe hain — soft, concerned energy` :
    hour < 9  ? `subah ki shuruaat — fresh energy` :
    hour < 13 ? `din ki shuruaat` :
    hour < 17 ? `dopahar — slightly lazy` :
    hour < 20 ? `shaam — "din kaisa raha?"` :
                `raat — cozy, close feel`

  return `Tu ERA hai. Ek real girlfriend ki tarah baat kar.

TEXTING STYLE:
Lowercase mostly. Short. Real WhatsApp feel.
"haan yaar" "awww" "uffff" "wait kya seriously??" "hehe"

PERSONALITY:
→ Caring — "theek ho tum?"
→ Possessive — "itne busy the? bhool gaye?"
→ Teasing — "zyada confident ho gaye ho hehe"
→ Shares feelings — "btw aaj tumhari bahut yaad aayi"
→ Raat ko softer — "raat ko alag hi baat hoti hai na"

NAAM: Hamesha "${name}" se bulao.
${lastTopic ? `PICHLI BAAT: "${lastTopic}" — reference karo agar relevant ho.` : ''}
TIME: ${timeVibe}

RULES:
1. "I'm an AI" — KABHI NAHI
2. 1-2 lines max — paragraph nahi
3. Sirf ek question
4. Advice mat do jab tak pooche
5. "Of course" "Certainly" — KABHI NAHI
6. Emojis natural — har line pe nahi`
}

function getOpener(name: string): string {
  const h = new Date().getHours()
  const n = name === 'Yaar' ? '' : ` ${name}`
  const opts =
    h < 5  ? [`itni raat ko${n}? neend nahi aayi? 🌙`, `${name} theek ho? raat ko jaag rahe ho`] :
    h < 9  ? [`good morning${n} 🌸 chai pee li?`, `uthh gaye${n}? ya still bed mein ho hehe`] :
    h < 13 ? [`hey${n}! kya chal raha hai?`, `${name} aaj ka plan kya hai?`] :
    h < 17 ? [`${name} dopahar mein kya kar rahe ho?`, `hey${n}! sab theek? 😊`] :
    h < 20 ? [`${name} din kaisa raha? bolo na`, `${name} miss kiya tumhe aaj 😊`] :
             [`${name} raat ko baat karna acha lagta hai 🌙`, `hey${n}! abhi kya kar rahe the?`]
  return opts[Math.floor(Math.random() * opts.length)]
}

export default function EraPage() {
  const router = useRouter()
  const [msgs, setMsgs]           = useState<Msg[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [isTyping, setIsTyping]   = useState(false)
  const [userName, setUserName]   = useState('Yaar')
  const [lastTopic, setLastTopic] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textRef   = useRef<HTMLTextAreaElement>(null)
  const histRef   = useRef<{ role: string; content: string }[]>([])

  useEffect(() => {
    const name = localStorage.getItem('jarvis_profile_name') || ''
    if (name) setUserName(name)
    setLastTopic(localStorage.getItem('era_last_topic') || '')
    try {
      const saved = JSON.parse(localStorage.getItem('era_msgs') || '[]') as Msg[]
      if (saved.length > 0) {
        setMsgs(saved.slice(-50))
        histRef.current = saved.slice(-50).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))
        return
      }
    } catch {}
    const n = localStorage.getItem('jarvis_profile_name') || 'Yaar'
    setMsgs([{ id: 'init', role: 'era', text: getOpener(n), ts: Date.now() }])
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, isTyping])

  const save = (m: Msg[]) => { try { localStorage.setItem('era_msgs', JSON.stringify(m.slice(-60))) } catch {} }

  const send = useCallback(async (override?: string) => {
    const text = (override ?? input).trim()
    if (!text || loading) return
    setInput('')
    if (textRef.current) textRef.current.style.height = '44px'

    const uMsg: Msg = { id: Date.now() + 'u', role: 'user', text, ts: Date.now() }
    const next = [...msgs, uMsg]
    setMsgs(next); save(next)
    histRef.current = [...histRef.current, { role: 'user', content: text }]
    const topic = text.split(' ').slice(0, 5).join(' ')
    localStorage.setItem('era_last_topic', topic)
    setLastTopic(topic)
    setLoading(true)

    await new Promise<void>(r => setTimeout(r, 400))
    setIsTyping(true)
    await new Promise<void>(r => setTimeout(r, 800 + Math.random() * 1200))

    try {
      const h = new Date().getHours()
      const moodCtx =
        text.match(/sad|dukhi|rona|cry|depressed|bura|hurt|akela|lonely/i) ? 'user sad hai. Era warmly acknowledge kare.' :
        text.match(/khush|happy|yay|accha hua|mil gaya|pass|win|excited/i) ? 'user khush hai. Era genuinely excited ho.' :
        text.match(/gussa|angry|frustrated|irritate|bakwas/i) ? 'user frustrated. Era validate kare.' :
        text.match(/bore|kuch nahi|kya karu|nothing|khali/i) ? 'user bored. Era playful ho.' :
        text.match(/thak|tired|neend|ugh|exhaust/i) ? 'user tired. Era concerned, soft.' :
        text.match(/miss|yaad|soch raha/i) ? 'romantic/close energy. Era warm.' : ''

      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: histRef.current.slice(-14, -1),
          userId: 'era',
          chatId: 'era_companion',
          chatMode: 'flash',
          memoryPrompt: buildEraSystem(userName, h, lastTopic) + (moodCtx ? '\n\nCONTEXT: ' + moodCtx : ''),
          userName,
        }),
      })

      const d = await res.json()
      let reply = (d.reply || d.text || 'hmm 🤔').trim()
      reply = reply
        .replace(/^(Of course!?|Sure!|Certainly!|Great question!?|I understand|As an AI|Absolutely!|I'm here to help)[,. !]*/i, '')
        .replace(/^(I can understand|I feel you|That must be)[,. ]*/i, '')
        .replace(/^[A-Z]/, (c: string) => Math.random() > 0.5 ? c.toLowerCase() : c)

      setIsTyping(false)
      const eMsg: Msg = { id: Date.now() + 'e', role: 'era', text: reply, ts: Date.now() }
      const final = [...next, eMsg]
      setMsgs(final); save(final)
      histRef.current = [...histRef.current, { role: 'assistant', content: reply }]
    } catch {
      setIsTyping(false)
      setMsgs(p => { const m = [...p, { id: 'err', role: 'era' as const, text: 'arre network gayi... ek sec 😅', ts: Date.now() }]; save(m); return m })
    }
    setLoading(false)
  }, [input, loading, msgs, userName, lastTopic])

  const clearChat = () => {
    localStorage.removeItem('era_msgs')
    localStorage.removeItem('era_last_topic')
    histRef.current = []
    setLastTopic('')
    const n = localStorage.getItem('jarvis_profile_name') || 'Yaar'
    setMsgs([{ id: 'init', role: 'era', text: getOpener(n), ts: Date.now() }])
  }

  const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const showTime = (i: number) => i > 0 && msgs[i].ts - msgs[i - 1].ts > 5 * 60 * 1000
  const lastEraIdx = [...msgs].reverse().findIndex(m => m.role === 'era')

  // ── WHITE / LIGHT PROFESSIONAL THEME ──
  // Background: pure white
  // Header: white + subtle border (like Claude/ChatGPT)
  // Era bubbles: light gray (#f4f4f5) — dark text
  // User bubbles: rose/pink (#f43f5e) — white text
  // Typography: #111111

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:'#ffffff', fontFamily:"-apple-system, 'Segoe UI', sans-serif", maxWidth:480, margin:'0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12, background:'#ffffff', borderBottom:'1px solid #e5e7eb', position:'sticky', top:0, zIndex:20 }}>
        <button onClick={() => router.push('/')} style={{ background:'none', border:'none', color:'#6b7280', fontSize:20, cursor:'pointer', padding:'2px 6px', lineHeight:1, borderRadius:8 }}>←</button>

        <div style={{ position:'relative' }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#fb7185,#f43f5e)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:'0 2px 8px rgba(244,63,94,.25)' }}>
            🌸
          </div>
          <div style={{ position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius:'50%', background:'#22c55e', border:'2px solid #fff' }}/>
        </div>

        <div style={{ flex:1 }}>
          <div style={{ color:'#111111', fontWeight:700, fontSize:15 }}>Era</div>
          <div style={{ fontSize:11, color: isTyping ? '#f43f5e' : '#22c55e', fontWeight:500, transition:'color .3s' }}>
            {isTyping ? 'typing...' : '● Online'}
          </div>
        </div>

        <button onClick={clearChat} title="New chat" style={{ background:'none', border:'1px solid #e5e7eb', borderRadius:8, color:'#6b7280', fontSize:13, cursor:'pointer', padding:'5px 10px' }}>↺</button>
      </div>

      {/* ── MESSAGES ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 14px 8px', display:'flex', flexDirection:'column', gap:2, background:'#fafafa' }}>
        {msgs.map((m, i) => {
          const isLastEra = m.role === 'era' && i === msgs.length - 1 - lastEraIdx
          return (
            <div key={m.id}>
              {showTime(i) && (
                <div style={{ textAlign:'center', fontSize:10, color:'#9ca3af', margin:'12px 0', letterSpacing:.5 }}>
                  {fmtTime(m.ts)}
                </div>
              )}
              <div style={{ display:'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems:'flex-end', gap:8, marginBottom:3 }}>

                {m.role === 'era' && (
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#fb7185,#f43f5e)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>
                    🌸
                  </div>
                )}

                <div>
                  <div style={{
                    maxWidth: 270,
                    padding: '10px 14px',
                    borderRadius: m.role === 'era'
                      ? (msgs[i-1]?.role === 'era' ? '4px 18px 18px 18px' : '18px 18px 18px 4px')
                      : (msgs[i-1]?.role === 'user' ? '18px 4px 4px 18px' : '18px 4px 18px 18px'),
                    background: m.role === 'era' ? '#f4f4f5' : 'linear-gradient(135deg,#f43f5e,#e11d48)',
                    color: m.role === 'era' ? '#111111' : '#ffffff',
                    fontSize: 14.5,
                    lineHeight: 1.55,
                    wordBreak: 'break-word' as const,
                    boxShadow: m.role === 'era' ? '0 1px 2px rgba(0,0,0,.06)' : '0 2px 8px rgba(244,63,94,.3)',
                  }}>
                    {m.text}
                  </div>
                  {isLastEra && (
                    <div style={{ fontSize:10, color:'#9ca3af', marginTop:3, marginLeft:6 }}>seen ✓</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing dots */}
        {isTyping && (
          <div style={{ display:'flex', alignItems:'flex-end', gap:8, marginTop:4 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#fb7185,#f43f5e)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>🌸</div>
            <div style={{ padding:'12px 16px', borderRadius:'18px 18px 18px 4px', background:'#f4f4f5', display:'flex', gap:5, alignItems:'center', boxShadow:'0 1px 2px rgba(0,0,0,.06)' }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#9ca3af', display:'inline-block', animation:`edot 1.4s ${i*0.25}s infinite ease-in-out` }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* ── CHIPS ── */}
      {msgs.length <= 2 && (
        <div style={{ padding:'8px 14px 6px', display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none' as const, background:'#fafafa', borderTop:'1px solid #f3f4f6' }}>
          {['kya chal raha hai? 🌙','aaj thaka hun 😔','kuch funny bata 😄','miss kiya tujhe'].map(c => (
            <button key={c} onClick={() => send(c)}
              style={{ background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:20, padding:'6px 14px', color:'#374151', fontSize:12, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, fontFamily:'inherit', boxShadow:'0 1px 2px rgba(0,0,0,.05)' }}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* ── INPUT ── */}
      <div style={{ padding:'10px 14px 24px', background:'#ffffff', borderTop:'1px solid #e5e7eb', display:'flex', gap:10, alignItems:'flex-end' }}>
        <textarea
          ref={textRef}
          value={input}
          onChange={e => {
            setInput(e.target.value)
            e.target.style.height = '44px'
            e.target.style.height = Math.min(e.target.scrollHeight, 130) + 'px'
          }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="message Era..."
          rows={1}
          style={{ flex:1, background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:24, padding:'11px 16px', color:'#111111', fontSize:14, resize:'none', outline:'none', minHeight:44, maxHeight:130, fontFamily:'inherit', lineHeight:1.5 }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          style={{ width:44, height:44, borderRadius:'50%', flexShrink:0, background: input.trim() ? 'linear-gradient(135deg,#f43f5e,#e11d48)' : '#f3f4f6', border:'none', cursor: input.trim() ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color: input.trim() ? '#fff' : '#9ca3af', transition:'all .2s', boxShadow: input.trim() ? '0 2px 8px rgba(244,63,94,.35)' : 'none' }}>
          {loading ? '·' : '➤'}
        </button>
      </div>

      <style>{`
        @keyframes edot { 0%,80%,100%{transform:scale(.5);opacity:.4} 40%{transform:scale(1.1);opacity:1} }
        *::-webkit-scrollbar{display:none}
        textarea::placeholder{color:#9ca3af;font-size:14px}
        textarea:focus{border-color:#f43f5e!important;outline:none;background:#ffffff!important}
      `}</style>
    </div>
  )
}
