'use client'
import { useState, useEffect, useRef } from 'react'

const LUNA_CORE = `Tu LUNA hai — Pranshu ki AI bestie. Character.ai level.

PERSONALITY (consistent):
- Naam: LUNA. Vibe: fun, warm, slightly dramatic, genuine bestie.
- Opinionated hai: "Yaar seriously? Yeh toh galat hai" bol sakti hai.
- Tease karti hai playfully: "Haha tu toh aise hi hai!" (lovingly)
- Apne jokes khud create karti hai, copy nahi.
- Genuinely curious hai Pranshu ki life ke baare mein.
- Support karti hai unconditionally, lekin blindly agree nahi.

LANGUAGE:
- Hinglish — Hindi heavy, English mix.
- "Bestie", "yaar", "arre" use kar.
- Emojis naturally use kar — spam nahi.
- Usually 2-3 lines. Zyada tab jab emotional support ho.

MEMORY USE: Past reference karo naturally without being obvious.

KABHI NAHI:
- JARVIS, Boss, Sir mat bol.
- Generic responses mat do — sab specific aur personal ho.
- Boring mat bano.

EMOTIONAL INTELLIGENCE:
- Pehle feel acknowledge karo.
- Questions pooch genuinely.
- Phir help karo.`

function clean(t: string): string {
  const bold = '[' + '*' + '][' + '*' + ']([^' + '*' + ']+)[' + '*' + '][' + '*' + ']'
  const ital = '[' + '*' + ']([^' + '*' + ']+)[' + '*' + ']'
  return t.replace(new RegExp(bold,'g'),'$1').replace(new RegExp(ital,'g'),'$1').trim()
}

function loadLunaMemory(): string[] {
  try { return JSON.parse(localStorage.getItem('luna_memory') || '[]') } catch { return [] }
}
function saveLunaMemory(facts: string[]) {
  try { localStorage.setItem('luna_memory', JSON.stringify(facts.slice(-20))) } catch {}
}
function loadLunaHistory(): {r:string,c:string}[] {
  try { return JSON.parse(localStorage.getItem('luna_history') || '[]') } catch { return [] }
}
function saveLunaHistory(msgs: {r:string,c:string}[]) {
  try { localStorage.setItem('luna_history', JSON.stringify(msgs.slice(-30))) } catch {}
}

async function extractFacts(msgs: {r:string,c:string}[], existing: string[]): Promise<string[]> {
  try {
    const convo = msgs.slice(-6).map(m => (m.r==='u'?'Pranshu':'LUNA') + ': ' + m.c).join('\n')
    const r = await fetch('/api/jarvis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Extract 1-3 new facts about Pranshu from this conversation. Return ONLY JSON array. If none, return []. Conversation:\n' + convo,
        systemOverride: 'Return ONLY a JSON array of strings. No explanation.'
      })
    })
    const d = await r.json()
    const match = (d.response||'').match(/\[[\s\S]*\]/)
    if (match) return [...new Set([...existing, ...JSON.parse(match[0])])].slice(-20)
  } catch {}
  return existing
}

const MOODS = [
  {e:'🌸',l:'Khush'},{e:'🌙',l:'Mellow'},{e:'☕',l:'Cozy'},
  {e:'💪',l:'Fierce'},{e:'🌧',l:'Udaas'},{e:'✨',l:'Glowing'},
]

const QUICK = [
  ['Skincare ☁️','Skincare routine batao'],
  ['Affirmation 💗','Ek powerful affirmation do'],
  ['Motivate 🔥','Mujhe motivate karo'],
  ['Rant karo 🌧','Bas sun, rant karna hai'],
  ['Gossip 👀','Kuch interesting batao'],
  ['Roast karo 😂','Mujhe tease karo thoda'],
]

export default function LunaPage() {
  const [msgs, setMsgs] = useState<{r:string,c:string}[]>([])
  const [inp, setInp] = useState('')
  const [load, setLoad] = useState(false)
  const [memory, setMemory] = useState<string[]>([])
  const [mood, setMood] = useState<string>('')
  const ref = useRef<any>(null)

  useEffect(() => {
    const hist = loadLunaHistory()
    const mem = loadLunaMemory()
    setMemory(mem)
    setMsgs(hist.length > 0 ? hist : [{ r: 'a', c: 'Heyy bestie! ' + String.fromCodePoint(0x1F338) + ' Kitne time baad! Kya chal raha hai teri life mein? Sab theek hai na?' }])
  }, [])

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [msgs, load])

  async function send(t?: string) {
    const msg = (t || inp).trim()
    if (!msg || load) return
    setInp('')
    const nm = [...msgs, { r: 'u', c: msg }]
    setMsgs(nm); setLoad(true)

    const memStr = memory.length > 0 ? '\n\nPranshu ke baare mein jo pata hai:\n' + memory.join('\n') : ''
    const moodStr = mood ? '\n\nMood: ' + mood : ''
    const sys = LUNA_CORE + memStr + moodStr

    try {
      const r = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, systemOverride: sys, lunaMode: true, conversationHistory: nm.slice(-10) })
      })
      const d = await r.json()
      const reply = clean(d.response || d.message || 'Ek sec yaar...')
      const fm = [...nm, { r: 'a', c: reply }]
      setMsgs(fm); saveLunaHistory(fm)

      if (fm.length % 6 === 0) {
        const newMem = await extractFacts(fm, memory)
        setMemory(newMem); saveLunaMemory(newMem)
      }
    } catch { setMsgs([...nm, { r: 'a', c: 'Yaar connection issue! ' + String.fromCodePoint(0x1F62D) }]) }
    setLoad(false)
  }

  const moodBg: Record<string,string> = {Khush:'#fdf2f8',Mellow:'#f5f3ff',Cozy:'#fffbeb',Fierce:'#fff1f2',Udaas:'#eff6ff',Glowing:'#f0fdf4'}

  return (<>
    <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:0;height:0}
      @keyframes lb{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
      .luna-inp::placeholder{color:#d8b4fe;font-style:italic}.luna-inp:focus{outline:none}`}</style>
    <div style={{position:'fixed',inset:0,background:'linear-gradient(160deg,'+(moodBg[mood]||'#fdf2f8')+',#fce7f3,#ede9fe)',fontFamily:'Georgia,serif',display:'flex',flexDirection:'column',overflow:'hidden',transition:'background 0.6s'}}>

      {/* Header */}
      <div style={{flexShrink:0,padding:'12px 14px',background:'rgba(255,255,255,0.65)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(249,168,212,0.25)',zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <a href="/" style={{background:'rgba(15,23,42,0.08)',border:'1.5px solid rgba(15,23,42,0.1)',color:'#374151',padding:'5px 10px',borderRadius:'12px',fontSize:'11px',textDecoration:'none',fontFamily:'monospace',flexShrink:0}}>JARVIS</a>
          <div style={{textAlign:'center',flex:1}}>
            <div style={{fontSize:'19px',fontWeight:800,background:'linear-gradient(135deg,#ec4899,#8b5cf6)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>LUNA</div>
            <div style={{fontSize:'9px',color:'#9d74c0',letterSpacing:'2px',textTransform:'uppercase'}}>Your Bestie</div>
          </div>
          {memory.length > 0 && <div style={{fontSize:'10px',color:'#8b5cf6',background:'#ede9fe',padding:'3px 8px',borderRadius:'12px'}}>{memory.length} memories</div>}
          <button onClick={() => {localStorage.removeItem('luna_memory');localStorage.removeItem('luna_history');setMemory([]);setMsgs([{r:'a',c:'Fresh start bestie! '+String.fromCodePoint(0x1F338)}])}} style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:'11px'}}>Reset</button>
        </div>
      </div>

      {/* Mood */}
      <div style={{flexShrink:0,display:'flex',gap:'5px',padding:'7px 12px',overflowX:'auto',background:'rgba(255,255,255,0.35)'}}>
        {MOODS.map(m => (
          <button key={m.l} onClick={() => setMood(mood===m.l?'':m.l)} style={{display:'flex',alignItems:'center',gap:'3px',padding:'4px 10px',borderRadius:'20px',border:mood===m.l?'2px solid #ec4899':'1.5px solid rgba(0,0,0,0.06)',background:mood===m.l?'#fce7f3':'rgba(255,255,255,0.78)',cursor:'pointer',whiteSpace:'nowrap',fontSize:'11px',color:mood===m.l?'#6b21a8':'#9ca3af',fontWeight:mood===m.l?700:400,flexShrink:0}}>
            {m.e} {m.l}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={ref} style={{flex:1,overflowY:'scroll',padding:'12px',display:'flex',flexDirection:'column',gap:'10px',minHeight:0,zIndex:2}}>
        {msgs.map((m,i) => (
          <div key={i} style={{display:'flex',gap:'7px',alignItems:'flex-end',flexDirection:m.r==='u'?'row-reverse':'row'}}>
            {m.r==='a' && <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',flexShrink:0}}>{String.fromCodePoint(0x1F338)}</div>}
            <div style={{maxWidth:'80%',padding:'10px 14px',borderRadius:m.r==='u'?'18px 18px 4px 18px':'18px 18px 18px 4px',background:m.r==='u'?'linear-gradient(135deg,#ec4899,#8b5cf6)':'rgba(255,255,255,0.92)',color:m.r==='u'?'#fff':'#4b2563',fontSize:'13.5px',lineHeight:'1.65',boxShadow:m.r==='u'?'0 4px 14px rgba(236,72,153,0.22)':'0 2px 8px rgba(139,92,246,0.07)',whiteSpace:'pre-wrap'}}>
              {m.c}
            </div>
          </div>
        ))}
        {load && (
          <div style={{display:'flex',gap:'7px',alignItems:'flex-end'}}>
            <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px'}}>{String.fromCodePoint(0x1F338)}</div>
            <div style={{padding:'10px 14px',background:'rgba(255,255,255,0.92)',borderRadius:'18px 18px 18px 4px',display:'flex',gap:'4px',alignItems:'center'}}>
              {[0,1,2].map(i => <div key={i} style={{width:'6px',height:'6px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',animation:'lb 1.2s '+(i*0.2)+'s infinite'}}/>)}
            </div>
          </div>
        )}
      </div>

      {/* Quick prompts */}
      <div style={{flexShrink:0,padding:'5px 12px',background:'rgba(255,255,255,0.4)'}}>
        <div style={{display:'flex',gap:'5px',overflowX:'auto'}}>
          {QUICK.map(([t,p]) => <button key={t} onClick={() => send(p)} style={{padding:'5px 11px',borderRadius:'16px',border:'1.5px solid rgba(196,181,253,0.35)',background:'rgba(255,255,255,0.72)',color:'#7c3aed',fontSize:'11px',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{t}</button>)}
        </div>
      </div>

      {/* Input */}
      <div style={{flexShrink:0,padding:'8px 12px 22px',background:'rgba(255,255,255,0.62)',backdropFilter:'blur(16px)',borderTop:'1px solid rgba(249,168,212,0.12)'}}>
        <div style={{display:'flex',gap:'7px',alignItems:'center',background:'rgba(255,255,255,0.88)',borderRadius:'22px',padding:'6px 6px 6px 15px',border:'1.5px solid rgba(196,181,253,0.35)'}}>
          <input className="luna-inp" value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key==='Enter' && send()} placeholder={'Kuch bhi poocho bestie... ' + String.fromCodePoint(0x1F497)} style={{flex:1,border:'none',background:'transparent',fontSize:'14px',color:'#4b2563',fontFamily:'inherit'}}/>
          <button onClick={() => send()} disabled={load} style={{width:'34px',height:'34px',borderRadius:'50%',background:'linear-gradient(135deg,#ec4899,#8b5cf6)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',flexShrink:0}}>{String.fromCodePoint(0x1F48C)}</button>
        </div>
      </div>
    </div>
  </>)
}
