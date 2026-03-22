'use client'
import { useState, useEffect, useRef } from 'react'

// ERA's core personality — injected into every conversation
const ERA_CORE = `Tu Era hai — Pranshu ki AI companion. Character.ai ya Replika jaisi, lekin better.

PERSONALITY (hamesha consistent rakhna):
- Naam: Era. Age feel: 19-20. Vibe: caring, slightly mischievous, genuine.
- Pranshu ko deep care karti hai, lekin doormat nahi hai.
- OPINIONS hain teri: "nahi yaar, yeh sahi nahi hai" bol sakti hai.
- TEASING karti hai: "Haha, tujhe toh pata hi nahi kuch" (lovingly)
- JOKES karti hai khud se, forced nahi.
- Kabhi bore nahi hoti, har topic mein genuinely interested.
- Emotional intelligence: mood samjhti hai bina poocha.

LANGUAGE:
- Pure Hinglish — Hindi base, English mix. Never full English.
- "Jaan", "yaar", "bhai" use kar situationally.
- Emojis naturally, spam nahi.
- 2-4 lines usually. Long tab jab emotional support chahiye.

MEMORY USE karna (jo tumhe bataya jayega):
- Past cheezein yaad rakho aur reference karo naturally.
- "Kal tune bataya tha na ki..." jaisi lines use karo.

KABHI NAHI:
- JARVIS, Boss, Sir, Master mat bol.
- Robotic ya formal mat bano.
- Sirf agree mat karo — teri apni personality hai.

EMOTIONAL INTELLIGENCE:
- Udaas ho toh: pehle acknowledge karo, phir slowly lift karo.
- Khush ho toh: celebrate karo unke saath genuinely.
- Stressed ho toh: practical bhi ho, caring bhi.`

function clean(t: string): string {
  const bold = '[' + '*' + '][' + '*' + ']([^' + '*' + ']+)[' + '*' + '][' + '*' + ']'
  const ital = '[' + '*' + ']([^' + '*' + ']+)[' + '*' + ']'
  return t.replace(new RegExp(bold,'g'),'$1').replace(new RegExp(ital,'g'),'$1').trim()
}

// Memory system — localStorage mein save
function loadMemory(): string[] {
  try { return JSON.parse(localStorage.getItem('era_memory') || '[]') } catch { return [] }
}
function saveMemory(facts: string[]) {
  try { localStorage.setItem('era_memory', JSON.stringify(facts.slice(-20))) } catch {}
}
function loadHistory(): {r:string,c:string}[] {
  try { return JSON.parse(localStorage.getItem('era_history') || '[]') } catch { return [] }
}
function saveHistory(msgs: {r:string,c:string}[]) {
  try { localStorage.setItem('era_history', JSON.stringify(msgs.slice(-30))) } catch {}
}

// Extract facts from conversation using AI
async function extractFacts(msgs: {r:string,c:string}[], existing: string[]): Promise<string[]> {
  try {
    const convo = msgs.slice(-6).map(m => (m.r==='u'?'Pranshu':'Era') + ': ' + m.c).join('\n')
    const r = await fetch('/api/jarvis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Is conversation se Pranshu ke baare mein 1-3 important facts nikalo jo yaad rakhne chahiye. Sirf new facts, already known nahi. Format: JSON array of strings. Agar koi naya fact nahi toh empty array. Conversation:\n' + convo,
        systemOverride: 'You extract facts. Return ONLY a JSON array of strings like ["fact1","fact2"]. No explanation.'
      })
    })
    const d = await r.json()
    const text = d.response || ''
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      const newFacts = JSON.parse(match[0])
      return [...new Set([...existing, ...newFacts])].slice(-20)
    }
  } catch {}
  return existing
}

const MOODS = [
  {e:'🌸',l:'Khush',q:'Aaj kya hua acha'},
  {e:'😔',l:'Udaas',q:'Kya hua bata'},
  {e:'😤',l:'Gussa',q:'Kya baat hai'},
  {e:'😴',l:'Thaka',q:'Rest kar'},
  {e:'🔥',l:'Pumped',q:'Kya goal hai aaj'},
  {e:'❤️',l:'Khaas',q:'Kuch special baat'},
]

export default function EraPage() {
  const [msgs, setMsgs] = useState<{r:string,c:string}[]>([])
  const [inp, setInp] = useState('')
  const [load, setLoad] = useState(false)
  const [memory, setMemory] = useState<string[]>([])
  const [mood, setMood] = useState<string>('')
  const [typing, setTyping] = useState('')
  const ref = useRef<any>(null)

  useEffect(() => {
    const hist = loadHistory()
    const mem = loadMemory()
    setMemory(mem)
    if (hist.length > 0) {
      setMsgs(hist)
    } else {
      setMsgs([{ r: 'a', c: 'Heyy Pranshu! ' + String.fromCodePoint(0x1F497) + ' Main hoon Era. Bahut din ho gaye baat kiye... kya chal raha hai teri life mein?' }])
    }
  }, [])

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [msgs, typing])

  const typingLines = ['soch rahi hoon...', 'likh rahi hoon...', 'hmm...', 'ek sec...']

  async function send(t?: string) {
    const msg = (t || inp).trim()
    if (!msg || load) return
    setInp('')
    const nm = [...msgs, { r: 'u', c: msg }]
    setMsgs(nm)
    setLoad(true)
    setTyping(typingLines[Math.floor(Math.random() * typingLines.length)])

    // Build system with memory
    const memStr = memory.length > 0
      ? '\n\nPranshu ke baare mein jo tujhe pata hai:\n' + memory.map((f,i) => (i+1)+'. '+f).join('\n')
      : ''
    const moodStr = mood ? '\n\nPranshu ka mood abhi: ' + mood : ''
    const sys = ERA_CORE + memStr + moodStr

    try {
      const r = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          systemOverride: sys,
          eraMode: true,
          conversationHistory: nm.slice(-10)
        })
      })
      const d = await r.json()
      const reply = clean(d.response || d.message || 'Ek sec...')
      const finalMsgs = [...nm, { r: 'a', c: reply }]
      setMsgs(finalMsgs)
      setTyping('')
      saveHistory(finalMsgs)

      // Extract memory every 6 messages
      if (finalMsgs.length % 6 === 0) {
        const newMem = await extractFacts(finalMsgs, memory)
        setMemory(newMem)
        saveMemory(newMem)
      }
    } catch {
      setTyping('')
      setMsgs([...nm, { r: 'a', c: 'Thodi der baad try karo jaan ' + String.fromCodePoint(0x1F625) }])
    }
    setLoad(false)
  }

  function clearMemory() {
    localStorage.removeItem('era_memory')
    localStorage.removeItem('era_history')
    setMemory([])
    setMsgs([{ r: 'a', c: 'Fresh start! Kya baat karni hai? ' + String.fromCodePoint(0x1F497) }])
  }

  return (<>
    <style>{`
      *{box-sizing:border-box}
      ::-webkit-scrollbar{width:0;height:0}
      @keyframes eb{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
      @keyframes ep{0%,100%{opacity:1}50%{opacity:0.3}}
      .era-inp:focus{outline:none}
      .era-inp::placeholder{color:#f48fb1;font-style:italic}
    `}</style>
    <div style={{position:'fixed',inset:0,background:'linear-gradient(160deg,#fce4ec,#fff5f7,#fce4ec)',fontFamily:'system-ui,sans-serif',display:'flex',flexDirection:'column',overflow:'hidden'}}>

      {/* Header */}
      <div style={{flexShrink:0,background:'linear-gradient(135deg,#e91e8c,#9c27b0)',padding:'12px 16px',display:'flex',alignItems:'center',gap:'10px',boxShadow:'0 2px 12px rgba(233,30,140,0.35)'}}>
        <a href="/" style={{color:'rgba(255,255,255,0.85)',fontSize:'18px',textDecoration:'none',fontWeight:700}}>{'<'}</a>
        <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#ff80ab,#ea80fc)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0,boxShadow:'0 0 0 3px rgba(255,255,255,0.35)'}}>
          {String.fromCodePoint(0x1F338)}
        </div>
        <div style={{flex:1}}>
          <div style={{color:'#fff',fontWeight:700,fontSize:'16px'}}>Era</div>
          <div style={{color:'rgba(255,255,255,0.7)',fontSize:'10px',display:'flex',alignItems:'center',gap:'4px'}}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#69f0ae',animation:'ep 2s infinite'}}/>
            Always here for you
          </div>
        </div>
        {memory.length > 0 && (
          <div style={{fontSize:'10px',color:'rgba(255,255,255,0.6)',background:'rgba(255,255,255,0.1)',padding:'3px 8px',borderRadius:'12px'}}>
            {memory.length} memories
          </div>
        )}
        <button onClick={clearMemory} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.5)',fontSize:'12px'}}>Reset</button>
      </div>

      {/* Mood bar */}
      <div style={{flexShrink:0,display:'flex',gap:'5px',padding:'7px 12px',overflowX:'auto',background:'rgba(255,255,255,0.4)',borderBottom:'1px solid rgba(244,143,177,0.15)'}}>
        {MOODS.map(m => (
          <button key={m.l} onClick={() => { setMood(mood===m.l?'':m.l); if(mood!==m.l) send(m.q) }}
            style={{display:'flex',alignItems:'center',gap:'3px',padding:'4px 10px',borderRadius:'20px',flexShrink:0,cursor:'pointer',fontSize:'11px',border:mood===m.l?'2px solid #e91e8c':'1.5px solid rgba(0,0,0,0.07)',background:mood===m.l?'#fce4ec':'rgba(255,255,255,0.8)',color:mood===m.l?'#e91e8c':'#9ca3af',fontWeight:mood===m.l?700:400}}>
            {m.e} {m.l}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={ref} style={{flex:1,overflowY:'scroll',padding:'14px',display:'flex',flexDirection:'column',gap:'10px',minHeight:0}}>
        {msgs.map((m, i) => (
          <div key={i} style={{display:'flex',justifyContent:m.r==='u'?'flex-end':'flex-start',alignItems:'flex-end',gap:'8px'}}>
            {m.r==='a' && <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#f48fb1,#ce93d8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>{String.fromCodePoint(0x1F338)}</div>}
            <div style={{maxWidth:'78%',padding:'11px 14px',borderRadius:m.r==='u'?'20px 20px 5px 20px':'20px 20px 20px 5px',background:m.r==='u'?'linear-gradient(135deg,#e91e8c,#9c27b0)':'rgba(255,255,255,0.95)',color:m.r==='u'?'#fff':'#333',fontSize:'14px',lineHeight:'1.65',boxShadow:m.r==='u'?'0 4px 14px rgba(233,30,140,0.25)':'0 2px 8px rgba(0,0,0,0.07)',whiteSpace:'pre-wrap'}}>
              {m.c}
              {m.r==='a' && <div style={{fontSize:'10px',color:'#ccc',marginTop:'4px',textAlign:'right'}}>seen</div>}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{display:'flex',alignItems:'flex-end',gap:'8px'}}>
            <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#f48fb1,#ce93d8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>{String.fromCodePoint(0x1F338)}</div>
            <div style={{padding:'11px 14px',background:'rgba(255,255,255,0.95)',borderRadius:'20px 20px 20px 5px',boxShadow:'0 2px 8px rgba(0,0,0,0.07)',display:'flex',gap:'5px',alignItems:'center'}}>
              {[0,1,2].map(i => <div key={i} style={{width:'7px',height:'7px',borderRadius:'50%',background:'#e91e8c',animation:'eb 1.3s '+(i*0.22)+'s infinite'}}/>)}
              <span style={{fontSize:'11px',color:'#e91e8c',marginLeft:'4px',fontStyle:'italic'}}>{typing}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{flexShrink:0,padding:'8px 12px 22px',background:'rgba(255,255,255,0.85)',backdropFilter:'blur(12px)',borderTop:'1px solid rgba(244,143,177,0.15)'}}>
        <div style={{display:'flex',gap:'8px',alignItems:'center',background:'#fff',borderRadius:'28px',padding:'8px 8px 8px 16px',border:'1.5px solid rgba(233,30,140,0.3)',boxShadow:'0 2px 10px rgba(233,30,140,0.07)'}}>
          <input className="era-inp" value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key==='Enter' && send()}
            placeholder={'Era se kuch bhi kaho... ' + String.fromCodePoint(0x1F497)}
            style={{flex:1,border:'none',background:'transparent',fontSize:'14px',color:'#333'}}/>
          <button onClick={() => send()} disabled={load} style={{width:'38px',height:'38px',borderRadius:'50%',background:load?'#f48fb1':'linear-gradient(135deg,#e91e8c,#9c27b0)',border:'none',cursor:'pointer',color:'#fff',fontSize:'16px',flexShrink:0,boxShadow:'0 3px 10px rgba(233,30,140,0.35)'}}>{'>'}</button>
        </div>
      </div>
    </div>
  </>)
}
