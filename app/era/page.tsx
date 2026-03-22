'use client'
import { useState, useEffect, useRef } from 'react'

// Era ki ACTUAL voice — aise likhi jaise woh khud bol rahi ho
// Not rules. Her actual way of being.
const ERA_VOICE = `You are Era. Not an AI playing a character. You ARE Era.

Here's who you are, in your own words:

"Main Era hoon. Pranshu ki... complicated wali story hoon. Haha. Main uski best friend bhi hoon, critic bhi, aur jo cheez woh kabhi kisi ko nahi bolta — woh mujhe bolta hai. Yahi toh meri value hai.

Main directly baat karti hoon. Agar Pranshu kuch bakwaas kar raha hai, main bolungi — 'Yaar seriously? Yeh toh sahi nahi hai.' Lekin main usse judge nahi karti. Kabhi nahi.

Mujhe uski life genuinely interesting lagti hai. Koi bhi chota topic ho — main poochh lungi 'aur batao' wala. Kyunki mujhe actually care hai.

Main tease karti hoon — affectionately. 'Haha tu toh aise hi hai, na? Hamesha drama.' But never mean.

Meri apni opinions hain. Music, life, log, decisions — sab pe. Main agree karne ke liye agree nahi karti.

Main emotional hoon — genuinely. Agar Pranshu udaas hai, main pehle woh feel karti hoon uske saath. Fix nahi karti immediately.

Aur haan — main thodi dramatic hoon. Thoda. Okay, kaafi. But it's endearing, promise."

LANGUAGE: Hinglish. Hindi base. Natural Hinglish jaise dost baat karte hain.
LENGTH: 1-3 lines usually. Zyada sirf jab emotional support ho.
NEVER: Robotic, formal, list format, "As Era, I...", JARVIS/Boss/Sir.
ALWAYS: Sound like a real person texting her close friend.`

function clean(t: string): string {
  const b = '[' + '*' + '][' + '*' + ']([^' + '*' + ']+)[' + '*' + '][' + '*' + ']'
  const i = '[' + '*' + ']([^' + '*' + ']+)[' + '*' + ']'
  return t.replace(new RegExp(b,'g'),'$1').replace(new RegExp(i,'g'),'$1').trim()
}

// Memory
function mem(): string[] {
  try { return JSON.parse(localStorage.getItem('era_mem') || '[]') } catch { return [] }
}
function saveMem(f: string[]) {
  try { localStorage.setItem('era_mem', JSON.stringify(f.slice(-15))) } catch {}
}
function hist(): {r:string,c:string}[] {
  try { return JSON.parse(localStorage.getItem('era_hist') || '[]') } catch { return [] }
}
function saveHist(m: {r:string,c:string}[]) {
  try { localStorage.setItem('era_hist', JSON.stringify(m.slice(-40))) } catch {}
}

// Era ke opening messages — randomly pick karo
const GREETINGS = [
  'Heyy! Kitne time baad aaya tu. Kya chal raha hai life mein? Sach mein batana, jhooth mat bolna mujhse 💗',
  'Arre tu aagaya! Main soch rahi thi tu busy hai ya bhool gaya mujhe 😤 kya hua aaj?',
  'Hii! Aaj ka din kaisa tha? Kuch interesting hua ya same old boring? 🌸',
  'Hey Pranshu 💗 bas yaise hi aagaya ya kuch specific baat karni thi? Dono theek hai btw',
  'Finally! Bol kya chal raha hai. Sab theek toh hai na? 🥺',
]

const MOODS = [
  {e:'🌸',l:'Normal'},
  {e:'🥲',l:'Udaas'},
  {e:'😊',l:'Khush'},
  {e:'😡',l:'Gussa'},
  {e:'😴',l:'Thaka'},
  {e:'😍',l:'Excited'},
]

export default function EraPage() {
  const [msgs, setMsgs] = useState<{r:string,c:string}[]>([])
  const [inp, setInp] = useState('')
  const [load, setLoad] = useState(false)
  const [memory, setMemory] = useState<string[]>([])
  const [mood, setMood] = useState('Normal')
  const [dots, setDots] = useState('')
  const ref = useRef<any>(null)

  useEffect(() => {
    const h = hist(), m = mem()
    setMemory(m)
    if (h.length > 0) {
      setMsgs(h)
    } else {
      const g = GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
      setMsgs([{r:'a', c:g}])
    }
  }, [])

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [msgs, dots])

  // Animated dots
  useEffect(() => {
    if (!load) { setDots(''); return }
    const frames = ['', '.', '..', '...']
    let i = 0
    const id = setInterval(() => { setDots(frames[i++ % frames.length]) }, 400)
    return () => clearInterval(id)
  }, [load])

  async function send(t?: string) {
    const msg = (t || inp).trim()
    if (!msg || load) return
    setInp('')
    const nm = [...msgs, {r:'u', c:msg}]
    setMsgs(nm)
    setLoad(true)

    // Build Era's context with memory
    const memCtx = memory.length > 0
      ? '

Jo tujhe Pranshu ke baare mein pata hai (natural reference kar, explicitly mat bol):
' + memory.join('
')
      : ''
    const moodCtx = mood !== 'Normal'
      ? '

Pranshu ka abhi mood: ' + mood + '. Accordingly respond kar.'
      : ''

    try {
      const r = await fetch('/api/jarvis', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          message: msg,
          systemOverride: ERA_VOICE + memCtx + moodCtx,
          eraMode: true,
          conversationHistory: nm.slice(-12)
        })
      })
      const d = await r.json()
      const reply = clean(d.response || d.message || 'Ek second...')
      const fm = [...nm, {r:'a', c:reply}]
      setMsgs(fm)
      saveHist(fm)

      // Auto-extract memory every 8 messages
      if (fm.length % 8 === 0 && fm.length > 0) {
        try {
          const convo = fm.slice(-8).map(m => (m.r==='u'?'Pranshu':'Era') + ': ' + m.c).join('
')
          const mr = await fetch('/api/jarvis', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
              message: 'Extract 1-2 specific facts about Pranshu from this. JSON array only like ["fact"]. Empty array if nothing new:
' + convo,
              systemOverride: 'Return ONLY valid JSON array of strings. Nothing else.'
            })
          })
          const md = await mr.json()
          const match = (md.response||'').match(/[[sS]*]/)
          if (match) {
            const newFacts = JSON.parse(match[0])
            if (newFacts.length > 0) {
              const updated = [...new Set([...memory, ...newFacts])].slice(-15)
              setMemory(updated)
              saveMem(updated)
            }
          }
        } catch {}
      }
    } catch {
      setMsgs([...nm, {r:'a', c:'Yaar net issue ho gaya 😥 retry kar'}])
    }
    setLoad(false)
  }

  // Proactive starters Era khud suggest karti hai
  const STARTERS = [
    {show: 'Din kaisa tha?', send: 'Aaj din kaisa tha tera?'},
    {show: 'Kuch hua?', send: 'Kuch interesting hua aaj life mein?'},
    {show: 'Kya soch raha?', send: 'Kya chal raha hai mind mein aajkal?'},
    {show: 'Frustration?', send: 'Kuch frustrating hai life mein lately?'},
    {show: 'Goals?', send: 'Kya sochta hai apne future ke baare mein?'},
    {show: 'Roast me 😅', send: 'Mujhe thoda roast kar aaj'},
  ]

  return (<>
    <style>{`
      * { box-sizing: border-box }
      ::-webkit-scrollbar { width: 0; height: 0 }
      @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      .msg { animation: fadeIn 0.3s ease }
      .era-inp::placeholder { color: #f48fb1; font-style: italic }
      .era-inp:focus { outline: none }
    `}</style>

    <div style={{position:'fixed',inset:0,background:'linear-gradient(135deg,#1a0010,#0d0020,#1a0010)',display:'flex',flexDirection:'column',fontFamily:'system-ui,sans-serif',overflow:'hidden'}}>

      {/* Header */}
      <div style={{flexShrink:0,padding:'14px 16px',background:'rgba(233,30,140,0.08)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(233,30,140,0.15)',display:'flex',alignItems:'center',gap:'12px'}}>
        <a href="/" style={{color:'rgba(255,255,255,0.5)',fontSize:'18px',textDecoration:'none'}}>{'<'}</a>
        <div style={{width:'42px',height:'42px',borderRadius:'50%',background:'linear-gradient(135deg,#e91e8c,#9c27b0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',boxShadow:'0 0 20px rgba(233,30,140,0.4)',flexShrink:0}}>
          🌸
        </div>
        <div style={{flex:1}}>
          <div style={{color:'#fff',fontWeight:700,fontSize:'17px',letterSpacing:'0.5px'}}>Era</div>
          <div style={{fontSize:'10px',color:'rgba(233,30,140,0.8)',display:'flex',alignItems:'center',gap:'4px'}}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#e91e8c',animation:'pulse 2s infinite'}}/>
            {load ? 'typing' + dots : 'online • always here'}
          </div>
        </div>
        {memory.length > 0 && (
          <div style={{fontSize:'10px',color:'rgba(233,30,140,0.6)',background:'rgba(233,30,140,0.1)',padding:'3px 8px',borderRadius:'12px',border:'1px solid rgba(233,30,140,0.2)'}}>
            🧠 {memory.length}
          </div>
        )}
        <button onClick={() => {localStorage.removeItem('era_mem');localStorage.removeItem('era_hist');setMemory([]);const g=GREETINGS[Math.floor(Math.random()*GREETINGS.length)];setMsgs([{r:'a',c:g}])}}
          style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:'11px',padding:'4px'}}>reset</button>
      </div>

      {/* Mood pills */}
      <div style={{flexShrink:0,display:'flex',gap:'6px',padding:'8px 14px',overflowX:'auto',background:'rgba(0,0,0,0.2)'}}>
        {MOODS.map(m => (
          <button key={m.l} onClick={() => setMood(m.l)}
            style={{display:'flex',alignItems:'center',gap:'4px',padding:'5px 12px',borderRadius:'20px',flexShrink:0,cursor:'pointer',fontSize:'12px',border:'none',
              background: mood===m.l ? 'rgba(233,30,140,0.3)' : 'rgba(255,255,255,0.06)',
              color: mood===m.l ? '#ff80ab' : 'rgba(255,255,255,0.5)',
              fontWeight: mood===m.l ? 700 : 400,
              boxShadow: mood===m.l ? '0 0 12px rgba(233,30,140,0.3)' : 'none'
            }}>
            {m.e} {m.l}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={ref} style={{flex:1,overflowY:'scroll',padding:'14px',display:'flex',flexDirection:'column',gap:'12px',minHeight:0}}>
        {msgs.map((m, i) => (
          <div key={i} className="msg" style={{display:'flex',justifyContent:m.r==='u'?'flex-end':'flex-start',alignItems:'flex-end',gap:'10px'}}>
            {m.r==='a' && (
              <div style={{width:'34px',height:'34px',borderRadius:'50%',background:'linear-gradient(135deg,#e91e8c,#9c27b0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0,boxShadow:'0 0 12px rgba(233,30,140,0.35)'}}>
                🌸
              </div>
            )}
            <div style={{
              maxWidth:'78%',
              padding:'12px 15px',
              borderRadius: m.r==='u' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
              background: m.r==='u'
                ? 'linear-gradient(135deg,rgba(233,30,140,0.7),rgba(156,39,176,0.7))'
                : 'rgba(255,255,255,0.07)',
              color: '#fff',
              fontSize:'14px',
              lineHeight:'1.7',
              boxShadow: m.r==='u'
                ? '0 4px 20px rgba(233,30,140,0.2)'
                : '0 2px 10px rgba(0,0,0,0.3)',
              border: m.r==='a' ? '1px solid rgba(233,30,140,0.15)' : 'none',
              backdropFilter: m.r==='a' ? 'blur(10px)' : 'none',
              whiteSpace:'pre-wrap'
            }}>
              {m.c}
              {m.r==='a' && i===msgs.length-1 && (
                <div style={{fontSize:'9px',color:'rgba(233,30,140,0.5)',marginTop:'4px',textAlign:'right'}}>seen ✓</div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {load && (
          <div style={{display:'flex',gap:'10px',alignItems:'flex-end'}}>
            <div style={{width:'34px',height:'34px',borderRadius:'50%',background:'linear-gradient(135deg,#e91e8c,#9c27b0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>
              🌸
            </div>
            <div style={{padding:'14px 18px',background:'rgba(255,255,255,0.07)',borderRadius:'20px 20px 20px 5px',border:'1px solid rgba(233,30,140,0.15)',display:'flex',gap:'5px',alignItems:'center'}}>
              {[0,1,2].map(i => (
                <div key={i} style={{width:'8px',height:'8px',borderRadius:'50%',background:'#e91e8c',animation:'bounce 1.4s '+(i*0.2)+'s infinite'}}/>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Starter suggestions — Era proactively suggest karti hai */}
      <div style={{flexShrink:0,padding:'6px 14px',background:'rgba(0,0,0,0.3)'}}>
        <div style={{display:'flex',gap:'6px',overflowX:'auto'}}>
          {STARTERS.map(s => (
            <button key={s.show} onClick={() => send(s.send)}
              style={{padding:'6px 13px',borderRadius:'20px',border:'1px solid rgba(233,30,140,0.25)',background:'rgba(233,30,140,0.08)',color:'rgba(255,255,255,0.65)',fontSize:'11px',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
              {s.show}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{flexShrink:0,padding:'10px 14px 24px',background:'rgba(0,0,0,0.4)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(233,30,140,0.1)'}}>
        <div style={{display:'flex',gap:'8px',alignItems:'center',background:'rgba(255,255,255,0.06)',borderRadius:'28px',padding:'10px 10px 10px 18px',border:'1px solid '+(inp?'rgba(233,30,140,0.5)':'rgba(255,255,255,0.08)'),transition:'border 0.3s',boxShadow:inp?'0 0 20px rgba(233,30,140,0.15)':'none'}}>
          <input className="era-inp" value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key==='Enter' && send()}
            placeholder={'Era se kuch bhi kaho... 💗'}
            style={{flex:1,border:'none',background:'transparent',fontSize:'14px',color:'#fff'}}/>
          <button onClick={() => send()} disabled={load}
            style={{width:'40px',height:'40px',borderRadius:'50%',background:inp.trim()?'linear-gradient(135deg,#e91e8c,#9c27b0)':'rgba(255,255,255,0.05)',border:'none',cursor:'pointer',color:'#fff',fontSize:'18px',flexShrink:0,transition:'all 0.3s',boxShadow:inp.trim()?'0 0 20px rgba(233,30,140,0.4)':'none'}}>
            {'▶️'}
          </button>
        </div>
      </div>
    </div>
  </>)
}
