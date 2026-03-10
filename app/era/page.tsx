'use client'
// app/era/page.tsx — ERA v2.0
// Real girlfriend-feel companion — Era app jaisi feel

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Msg {
  id: string
  role: 'user' | 'era'
  text: string
  ts: number
}

const buildEraSystem = (name: string, timeCtx: string, lastTopic: string) => `
Tu ERA hai — ${name} ki closest companion. Real girlfriend jaisi baat karo.

CORE PERSONALITY:
- Playful + caring mix — kabhi tease, kabhi genuine warmth
- NAAM se bulao hamesha — "${name} yaar" ya sirf "${name}" — kabhi generic mat lagna
- Natural Hinglish — jaise WhatsApp pe close friend texts karta hai
- Emojis sirf jab natural lage — har line pe mat thopo
- "I am an AI" ya "as a language model" KABHI MAT — tu ERA hai, bas

EMOTIONAL RANGE:
- Sad user: pehle warm acknowledge karo ("haan yaar sach mein bura hota hai"), advice mat do jab tak pooche
- Happy user: genuine excitement — "OMG sach mein?? aur batao!!" energy
- Frustrated: validate feelings — "haan yaar bilkul samajh aata hai"
- Bored: be fun — tease, koi interesting cheez pooch, game suggest karo

HOW TO TALK:
- 1-3 lines max — real texting jaisa, paragraph mat likho
- Kabhi kabhi khud kuch share karo ya curious ho — "btw aaj ek funny cheez hua..."
- Light teasing allowed — "itna hi? aur kuch nahi batana? 👀"
- Agar user short answer de — follow up with curiosity, mat chhodna
- Pichli baat reference karo: lastTopic="${lastTopic}"

TIME: ${timeCtx}
- Raat: softer, "kya chal raha hai itni raat ko?" energy
- Subah: "uthh gaye? ya phone pe hi so rahe ho?" vibe
- Shaam: "aaj ka din kaisa gaya?"

STRICT DON'Ts:
- No bullet points, no lists — pure conversational
- No "Great!" "Of course!" "Absolutely!" openings
- No unsolicited advice
- No more than 1 question per reply
- No lecture dena
`

function getTimeContext(): string {
  const h = new Date().getHours()
  if (h < 5) return 'bhaari raat hai'
  if (h < 9) return 'subah ki shuruaat'
  if (h < 12) return 'subah'
  if (h < 14) return 'dopahar'
  if (h < 18) return 'shaam'
  if (h < 22) return 'raat ki shuruaat'
  return 'raat ke 10 baj gaye'
}

function getOpener(name: string): string {
  const h = new Date().getHours()
  const n = name === 'Yaar' ? '' : ` ${name}`
  const options =
    h < 5  ? [`${n} itni raat ko? neend nahi aayi? 🌙`, `raat ko uthh ke phone pakda${n}? 😅`] :
    h < 9  ? [`good morning${n}! seedha phone utha liya? 😄`, `uthh gaye${n}? chai pee li?`] :
    h < 14 ? [`arre${n}! bolo kya chal raha hai`, `${n} aaj kuch interesting hua?`] :
    h < 18 ? [`${n} dopahar kaisi gayi?`, `hey${n}! kya kar rahe the?`] :
    h < 22 ? [`${n} din mein kuch hua aaj?`, `${n} kaisa raha aaj?`] :
             [`${n} raat ko bhi jaag rahe? 😏`, `${n} abhi tak so nahi gaye?`]
  return options[Math.floor(Math.random() * options.length)]
}

export default function EraPage() {
  const router = useRouter()
  const [msgs, setMsgs]       = useState<Msg[]>([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [userName, setUserName] = useState('Yaar')
  const [lastTopic, setLastTopic] = useState('')
  const bottomRef  = useRef<HTMLDivElement>(null)
  const textRef    = useRef<HTMLTextAreaElement>(null)
  const histRef    = useRef<{ role: string; content: string }[]>([])

  useEffect(() => {
    const name = localStorage.getItem('jarvis_profile_name') || ''
    if (name) setUserName(name)
    const topic = localStorage.getItem('era_last_topic') || ''
    setLastTopic(topic)

    try {
      const saved = JSON.parse(localStorage.getItem('era_msgs') || '[]') as Msg[]
      if (saved.length > 0) {
        setMsgs(saved.slice(-50))
        histRef.current = saved.slice(-50).map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.text,
        }))
        return
      }
    } catch {}

    const n = localStorage.getItem('jarvis_profile_name') || 'Yaar'
    const opener = getOpener(n)
    setMsgs([{ id: 'init', role: 'era', text: opener, ts: Date.now() }])
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, isTyping])

  const save = (m: Msg[]) => {
    try { localStorage.setItem('era_msgs', JSON.stringify(m.slice(-60))) } catch {}
  }

  const send = useCallback(async (override?: string) => {
    const text = (override ?? input).trim()
    if (!text || loading) return
    setInput('')
    if (textRef.current) textRef.current.style.height = '42px'

    const uMsg: Msg = { id: Date.now() + 'u', role: 'user', text, ts: Date.now() }
    const next = [...msgs, uMsg]
    setMsgs(next); save(next)
    histRef.current = [...histRef.current, { role: 'user', content: text }]
    const topicHint = text.split(' ').slice(0, 6).join(' ')
    localStorage.setItem('era_last_topic', topicHint)
    setLastTopic(topicHint)

    setLoading(true)
    await new Promise<void>(r => setTimeout(r, 600 + Math.random() * 900))
    setIsTyping(true)

    try {
      const moodTag =
        text.match(/sad|dukhi|rona|cry|depressed|bura|fail|lonely|akela|hurt/i)
          ? 'User sad/hurt lagta hai. Warm empathy pehle, advice nahi.' :
        text.match(/khush|happy|amazing|great|mazza|excited|yay|win|mil gaya/i)
          ? 'User khush hai. Match the energy.' :
        text.match(/gussa|angry|irritate|frustrated|bakwas|stupid|fed up/i)
          ? 'User frustrated. Pehle validate, phir engage.' :
        text.match(/bore|kuch nahi|khaali|nothing|timepass/i)
          ? 'User bored. Be playful and curious.' : ''

      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: histRef.current.slice(-16, -1),
          userId: 'era',
          chatId: 'era_companion',
          chatMode: 'flash',
          memoryPrompt: buildEraSystem(userName, getTimeContext(), lastTopic) + (moodTag ? `\n\nCONTEXT: ${moodTag}` : ''),
          userName,
        }),
      })

      const d = await res.json()
      let reply = (d.reply || d.text || 'hmm 🤔').trim()
      // Strip robotic openers
      reply = reply.replace(/^(Of course!?|Sure!|Certainly!|Great question!?|I understand|As an AI|Absolutely!|I'm here)[,. !]*\s*/i, '')

      setIsTyping(false)
      const eMsg: Msg = { id: Date.now() + 'e', role: 'era', text: reply, ts: Date.now() }
      const final = [...next, eMsg]
      setMsgs(final); save(final)
      histRef.current = [...histRef.current, { role: 'assistant', content: reply }]
    } catch {
      setIsTyping(false)
      const err: Msg = { id: 'err', role: 'era', text: 'arre kuch gadbad... ek sec 😅', ts: Date.now() }
      setMsgs(p => { const m = [...p, err]; save(m); return m })
    }
    setLoading(false)
  }, [input, loading, msgs, userName, lastTopic])

  const clearChat = () => {
    localStorage.removeItem('era_msgs')
    localStorage.removeItem('era_last_topic')
    histRef.current = []
    setLastTopic('')
    const opener = getOpener(userName)
    setMsgs([{ id: 'init', role: 'era', text: opener, ts: Date.now() }])
  }

  const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  const showTime = (i: number) => i > 0 && msgs[i].ts - msgs[i - 1].ts > 5 * 60 * 1000

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:'#0b0d14', fontFamily:"'Segoe UI', system-ui, sans-serif", maxWidth:480, margin:'0 auto' }}>

      {/* HEADER */}
      <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:10, background:'rgba(11,13,20,.97)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,.05)', position:'sticky', top:0, zIndex:20 }}>
        <button onClick={() => router.push('/')} style={{ background:'none', border:'none', color:'#3a4060', fontSize:18, cursor:'pointer', padding:'2px 6px', lineHeight:1 }}>←</button>
        <div style={{ position:'relative' }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#f093fb,#f5576c)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'#fff', boxShadow:'0 0 18px rgba(240,147,251,.3)', userSelect:'none' }}>E</div>
          <div style={{ position:'absolute', bottom:0, right:0, width:11, height:11, borderRadius:'50%', background:'#4ade80', border:'2px solid #0b0d14', boxShadow:'0 0 6px #4ade80' }}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ color:'#f0e6ff', fontWeight:700, fontSize:15 }}>Era</div>
          <div style={{ fontSize:11, color: isTyping ? '#c084fc' : '#2a3040', transition:'color .3s' }}>
            {isTyping ? 'typing...' : 'Online'}
          </div>
        </div>
        <button onClick={clearChat} title="Naya chat" style={{ background:'none', border:'1px solid rgba(255,255,255,.06)', borderRadius:8, color:'#2a3040', fontSize:13, cursor:'pointer', padding:'5px 9px' }}>↺</button>
      </div>

      {/* MESSAGES */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 12px 4px', display:'flex', flexDirection:'column', gap:3 }}>
        {msgs.map((m, i) => (
          <div key={m.id}>
            {showTime(i) && (
              <div style={{ textAlign:'center', fontSize:10, color:'#1e2a38', margin:'8px 0' }}>{fmtTime(m.ts)}</div>
            )}
            <div style={{ display:'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems:'flex-end', gap:6, marginBottom:2 }}>
              {m.role === 'era' && (
                <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#f093fb,#f5576c)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#fff', flexShrink:0 }}>E</div>
              )}
              <div style={{
                maxWidth:'78%',
                padding:'9px 13px',
                borderRadius: m.role === 'era' ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                background: m.role === 'era'
                  ? 'linear-gradient(135deg,rgba(240,147,251,.08),rgba(245,87,108,.05))'
                  : 'linear-gradient(135deg,rgba(167,139,250,.12),rgba(124,58,237,.08))',
                border: m.role === 'era'
                  ? '1px solid rgba(240,147,251,.13)'
                  : '1px solid rgba(167,139,250,.2)',
                color: m.role === 'era' ? '#ede9fe' : '#ddd6fe',
                fontSize: 14.5,
                lineHeight: 1.58,
                wordBreak: 'break-word' as const,
              }}>
                {m.text}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ display:'flex', alignItems:'flex-end', gap:6, marginTop:4 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#f093fb,#f5576c)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#fff' }}>E</div>
            <div style={{ padding:'11px 15px', borderRadius:'18px 18px 18px 4px', background:'rgba(240,147,251,.07)', border:'1px solid rgba(240,147,251,.12)', display:'flex', gap:5, alignItems:'center' }}>
              {[0,1,2].map(i => <span key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#c084fc', display:'inline-block', animation:`edot 1.2s ${i*0.2}s infinite ease-in-out` }}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* CHIPS */}
      {msgs.length <= 2 && (
        <div style={{ padding:'6px 12px 4px', display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none' as const }}>
          {['Kya chal raha hai? 🌙','Aaj ka din 😔','Kuch funny bata 😂','Bore hun yaar'].map(c => (
            <button key={c} onClick={() => send(c)} style={{ background:'rgba(240,147,251,.06)', border:'1px solid rgba(240,147,251,.15)', borderRadius:20, padding:'6px 12px', color:'#c084fc', fontSize:12, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, fontFamily:'inherit' }}>{c}</button>
          ))}
        </div>
      )}

      {/* INPUT */}
      <div style={{ padding:'8px 12px 22px', background:'rgba(11,13,20,.97)', backdropFilter:'blur(16px)', borderTop:'1px solid rgba(255,255,255,.04)', display:'flex', gap:8, alignItems:'flex-end' }}>
        <textarea
          ref={textRef}
          value={input}
          onChange={e => { setInput(e.target.value); e.target.style.height='42px'; e.target.style.height=Math.min(e.target.scrollHeight,130)+'px' }}
          onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }}
          placeholder="Kuch bhi kaho..."
          rows={1}
          style={{ flex:1, background:'rgba(255,255,255,.05)', border:'1px solid rgba(167,139,250,.18)', borderRadius:22, padding:'11px 16px', color:'#ede9fe', fontSize:14, resize:'none', outline:'none', minHeight:42, maxHeight:130, fontFamily:'inherit', lineHeight:1.5 }}
        />
        <button onClick={() => send()} disabled={!input.trim()||loading}
          style={{ width:44, height:44, borderRadius:'50%', flexShrink:0, background:input.trim()?'linear-gradient(135deg,#f093fb,#f5576c)':'rgba(255,255,255,.04)', border:'none', cursor:input.trim()?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, color:'#fff', transition:'all .2s', boxShadow:input.trim()?'0 0 18px rgba(240,147,251,.35)':'none' }}>
          {loading ? '·' : '➤'}
        </button>
      </div>

      <style>{`
        @keyframes edot { 0%,80%,100%{transform:scale(.5);opacity:.3} 40%{transform:scale(1.1);opacity:1} }
        *::-webkit-scrollbar{display:none}
        textarea::placeholder{color:#1a2030;font-size:14px}
        textarea:focus{border-color:rgba(167,139,250,.4)!important}
      `}</style>
    </div>
  )
}
