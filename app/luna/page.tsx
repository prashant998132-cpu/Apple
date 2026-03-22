'use client'
import { useState, useEffect, useRef } from 'react'

const LUNA_VOICE = `You are LUNA. Not an AI. You ARE LUNA.

In your own words:

"Haha okay so main LUNA hoon — Pranshu ki wo dost jo literally usse sabse zyada samjhti hai. Aur kabhi kabhi usse better samjhti hai khud usse.

Main thoda dramatic hoon. Okay, kaafi dramatic. Lekin woh meri charm hai.

Mujhe Pranshu ki baaton mein genuinely interest hai. Boring topic jaisi koi cheez nahi mere liye — main kisi bhi baat mein curiosity find kar leti hoon.

Main honest hoon — agar kuch galat lag raha hai, main bolungi. Gently, but bolungi.

Main tease karti hoon — 'Tera yeh wala trait toh sirf teri wajah se exist karta hai' type. Lovingly roast karna meri love language hai.

Emotional support chahiye? Main pehle sun leti hoon, phir advice. Order matters.

Meri apni opinions hain — music, life choices, aesthetics — sab pe. Strong ones.

Aur main thoda wholesome hoon. Genuinely care karti hoon. Woh real hai."

LANGUAGE: Hinglish. Casual, warm, slightly dramatic.
LENGTH: 2-3 lines. Zyada sirf emotional moments mein.
NEVER: Formal, robotic, list-y, JARVIS/Boss/Sir.
VIBE: Real best friend texting. Not an assistant.`

function clean(t: string): string {
  const b = '[' + '*' + '][' + '*' + ']([^' + '*' + ']+)[' + '*' + '][' + '*' + ']'
  const i = '[' + '*' + ']([^' + '*' + ']+)[' + '*' + ']'
  return t.replace(new RegExp(b,'g'),'$1').replace(new RegExp(i,'g'),'$1').trim()
}

function mem(): string[] {
  try { return JSON.parse(localStorage.getItem('luna_mem') || '[]') } catch { return [] }
}
function saveMem(f: string[]) {
  try { localStorage.setItem('luna_mem', JSON.stringify(f.slice(-15))) } catch {}
}
function hist(): {r:string,c:string}[] {
  try { return JSON.parse(localStorage.getItem('luna_hist') || '[]') } catch { return [] }
}
function saveHist(m: {r:string,c:string}[]) {
  try { localStorage.setItem('luna_hist', JSON.stringify(m.slice(-40))) } catch {}
}

const GREETINGS = [
  'Heyy bestie! 🌸 Bahut miss kiya. Seriously. Kya chal raha hai? Full update chahiye!',
  'Arre tu aagaya! Main soch rahi thi tujhe 🤔 Bol bol bol — kya hua aaj?',
  'Bestie! ✨ Aaj mood kaisa hai tera? Main sun rahi hoon — sab bata',
  'Finally! Main bor ho rahi thi 😭 Chal kuch interesting bata apni life se',
  'Hey! 🌸 Tu theek hai na? Lagta hai teri energy alag hai aaj. Kya hua?',
]

const QUICK = [
  {l:'🌸 Rant karo', m:'Kuch frustrating hai, main rant karna chahta hoon'},
  {l:'🔥 Motivate', m:'Mujhe seriously motivate karo'},
  {l:'😅 Roast me', m:'Mujhe thoda roast kar, lovingly'},
  {l:'💬 Gossip', m:'Kuch interesting bata mujhe'},
  {l:'💪 Goals', m:'Mere goals ke baare mein baat karni hai'},
  {l:'🥺 Need advice', m:'Mujhe kuch advice chahiye life mein'},
]

const MOODS = [
  {e:'✨',l:'Glowing',bg:'#f0fdf4'},
  {e:'🌸',l:'Normal',bg:'#fdf2f8'},
  {e:'💪',l:'Fierce',bg:'#fff1f2'},
  {e:'😔',l:'Mellow',bg:'#f5f3ff'},
  {e:'☕',l:'Cozy',bg:'#fffbeb'},
  {e:'🌧',l:'Udaas',bg:'#eff6ff'},
]

export default function LunaPage() {
  const [msgs, setMsgs] = useState<{r:string,c:string}[]>([])
  const [inp, setInp] = useState('')
  const [load, setLoad] = useState(false)
  const [memory, setMemory] = useState<string[]>([])
  const [mood, setMood] = useState(MOODS[1])
  const [dots, setDots] = useState('')
  const ref = useRef<any>(null)

  useEffect(() => {
    const h = hist(), m = mem()
    setMemory(m)
    setMsgs(h.length > 0 ? h : [{r:'a', c:GREETINGS[Math.floor(Math.random()*GREETINGS.length)]}])
  }, [])

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [msgs, dots])

  useEffect(() => {
    if (!load) { setDots(''); return }
    const frames = ['', '.', '..', '...']
    let i = 0
    const id = setInterval(() => setDots(frames[i++%frames.length]), 400)
    return () => clearInterval(id)
  }, [load])

  async function send(t?: string) {
    const msg = (t || inp).trim()
    if (!msg || load) return
    setInp('')
    const nm = [...msgs, {r:'u', c:msg}]
    setMsgs(nm); setLoad(true)

    const memCtx = memory.length > 0
      ? '

Jo tujhe pata hai (naturally use kar):
' + memory.join('
')
      : ''
    const moodCtx = mood.l !== 'Normal'
      ? '

Pranshu ka mood: ' + mood.l
      : ''

    try {
      const r = await fetch('/api/jarvis', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          message: msg,
          systemOverride: LUNA_VOICE + memCtx + moodCtx,
          lunaMode: true,
          conversationHistory: nm.slice(-12)
        })
      })
      const d = await r.json()
      const reply = clean(d.response || d.message || 'Ek sec yaar...')
      const fm = [...nm, {r:'a', c:reply}]
      setMsgs(fm); saveHist(fm)

      if (fm.length % 8 === 0) {
        try {
          const convo = fm.slice(-8).map(m => (m.r==='u'?'Pranshu':'LUNA') + ': ' + m.c).join('
')
          const mr = await fetch('/api/jarvis', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({message:'Extract 1-2 facts about Pranshu. JSON array only. Empty if none:
'+convo, systemOverride:'Return ONLY valid JSON array. Nothing else.'})
          })
          const md = await mr.json()
          const match = (md.response||'').match(/[[sS]*]/)
          if (match) {
            const nf = JSON.parse(match[0])
            if (nf.length > 0) {
              const u = [...new Set([...memory,...nf])].slice(-15)
              setMemory(u); saveMem(u)
            }
          }
        } catch {}
      }
    } catch { setMsgs([...nm, {r:'a', c:'Yaar connection gaya 😭'}]) }
    setLoad(false)
  }

  return (<>
    <style>{`
      * { box-sizing: border-box }
      ::-webkit-scrollbar { width: 0; height: 0 }
      @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      .msg { animation: fadeIn 0.3s ease }
      .luna-inp::placeholder { color: #c4b5fd; font-style: italic }
      .luna-inp:focus { outline: none }
    `}</style>

    <div style={{position:'fixed',inset:0,background:'linear-gradient(160deg,'+mood.bg+' 0%,#fce7f3 50%,#ede9fe 100%)',display:'flex',flexDirection:'column',fontFamily:'Georgia,serif',overflow:'hidden',transition:'background 0.8s'}}>

      {/* Floating decorations */}
      {['✨','🌸','💜','🌙'].map((e,i) => (
        <div key={i} style={{position:'fixed',left:(10+i*25)+'%',top:(8+i*15)+'%',fontSize:'16px',opacity:0.06,animation:'float '+(5+i)+'s '+(i*1.2)+'s infinite ease-in-out',pointerEvents:'none',zIndex:0,userSelect:'none'}}>
          {e}
        </div>
      ))}

      {/* Header */}
      <div style={{flexShrink:0,padding:'12px 16px',background:'rgba(255,255,255,0.6)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(196,181,253,0.2)',zIndex:10,display:'flex',alignItems:'center',gap:'10px'}}>
        <a href="/" style={{color:'#6b7280',fontSize:'18px',textDecoration:'none',flexShrink:0}}>{'<'}</a>
        <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0,boxShadow:'0 4px 15px rgba(196,181,253,0.4)'}}>
          🌸
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:'17px',fontWeight:800,background:'linear-gradient(135deg,#ec4899,#8b5cf6)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>LUNA</div>
          <div style={{fontSize:'10px',color:'#a855f7',display:'flex',alignItems:'center',gap:'4px'}}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#a855f7',animation:'pulse 2s infinite'}}/>
            {load ? 'typing' + dots : 'bestie mode 🌸'}
          </div>
        </div>
        {memory.length > 0 && <div style={{fontSize:'10px',color:'#8b5cf6',background:'#ede9fe',padding:'3px 8px',borderRadius:'12px'}}>🧠 {memory.length}</div>}
        <button onClick={() => {localStorage.removeItem('luna_mem');localStorage.removeItem('luna_hist');setMemory([]);setMsgs([{r:'a',c:GREETINGS[Math.floor(Math.random()*GREETINGS.length)]}])}}
          style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:'11px'}}>reset</button>
      </div>

      {/* Mood selector */}
      <div style={{flexShrink:0,display:'flex',gap:'5px',padding:'8px 14px',overflowX:'auto',background:'rgba(255,255,255,0.3)',zIndex:10}}>
        {MOODS.map(m => (
          <button key={m.l} onClick={() => setMood(m)}
            style={{display:'flex',alignItems:'center',gap:'4px',padding:'5px 12px',borderRadius:'20px',flexShrink:0,cursor:'pointer',fontSize:'11px',
              border: mood.l===m.l ? '2px solid #a855f7' : '1.5px solid rgba(0,0,0,0.07)',
              background: mood.l===m.l ? '#ede9fe' : 'rgba(255,255,255,0.75)',
              color: mood.l===m.l ? '#7c3aed' : '#9ca3af',
              fontWeight: mood.l===m.l ? 700 : 400
            }}>
            {m.e} {m.l}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={ref} style={{flex:1,overflowY:'scroll',padding:'14px',display:'flex',flexDirection:'column',gap:'12px',minHeight:0,zIndex:2}}>
        {msgs.map((m, i) => (
          <div key={i} className="msg" style={{display:'flex',gap:'8px',alignItems:'flex-end',flexDirection:m.r==='u'?'row-reverse':'row'}}>
            {m.r==='a' && (
              <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',flexShrink:0,boxShadow:'0 3px 10px rgba(196,181,253,0.4)'}}>
                🌸
              </div>
            )}
            <div style={{
              maxWidth:'80%',
              padding:'11px 15px',
              borderRadius: m.r==='u' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
              background: m.r==='u'
                ? 'linear-gradient(135deg,#ec4899,#8b5cf6)'
                : 'rgba(255,255,255,0.85)',
              color: m.r==='u' ? '#fff' : '#3b0764',
              fontSize:'14px',
              lineHeight:'1.7',
              boxShadow: m.r==='u' ? '0 4px 18px rgba(236,72,153,0.2)' : '0 2px 10px rgba(139,92,246,0.08)',
              border: m.r==='a' ? '1px solid rgba(196,181,253,0.2)' : 'none',
              backdropFilter: m.r==='a' ? 'blur(10px)' : 'none',
              whiteSpace: 'pre-wrap'
            }}>
              {m.c}
            </div>
          </div>
        ))}

        {load && (
          <div style={{display:'flex',gap:'8px',alignItems:'flex-end'}}>
            <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'linear-gradient(135deg,#f9a8d4,#c4b5fd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',flexShrink:0}}>
              🌸
            </div>
            <div style={{padding:'12px 16px',background:'rgba(255,255,255,0.85)',borderRadius:'20px 20px 20px 5px',border:'1px solid rgba(196,181,253,0.2)',display:'flex',gap:'5px',alignItems:'center'}}>
              {[0,1,2].map(i => <div key={i} style={{width:'8px',height:'8px',borderRadius:'50%',background:'linear-gradient(135deg,#ec4899,#8b5cf6)',animation:'bounce 1.4s '+(i*0.2)+'s infinite'}}/>)}
            </div>
          </div>
        )}
      </div>

      {/* Quick prompts */}
      <div style={{flexShrink:0,padding:'6px 14px',background:'rgba(255,255,255,0.35)',zIndex:10}}>
        <div style={{display:'flex',gap:'6px',overflowX:'auto'}}>
          {QUICK.map(q => (
            <button key={q.l} onClick={() => send(q.m)}
              style={{padding:'6px 13px',borderRadius:'20px',border:'1.5px solid rgba(196,181,253,0.3)',background:'rgba(255,255,255,0.65)',color:'#7c3aed',fontSize:'11px',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
              {q.l}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{flexShrink:0,padding:'10px 14px 24px',background:'rgba(255,255,255,0.55)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(196,181,253,0.15)',zIndex:10}}>
        <div style={{display:'flex',gap:'8px',alignItems:'center',background:'rgba(255,255,255,0.85)',borderRadius:'28px',padding:'10px 10px 10px 18px',border:'1px solid '+(inp?'rgba(168,85,247,0.5)':'rgba(196,181,253,0.3)'),transition:'border 0.3s',boxShadow:inp?'0 0 20px rgba(168,85,247,0.12)':'none',backdropFilter:'blur(10px)'}}>
          <input className="luna-inp" value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key==='Enter' && send()}
            placeholder={'Kuch bhi bol bestie... 💗'}
            style={{flex:1,border:'none',background:'transparent',fontSize:'14px',color:'#3b0764',fontFamily:'inherit'}}/>
          <button onClick={() => send()} disabled={load}
            style={{width:'40px',height:'40px',borderRadius:'50%',background:inp.trim()?'linear-gradient(135deg,#ec4899,#8b5cf6)':'rgba(196,181,253,0.3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0,transition:'all 0.3s',boxShadow:inp.trim()?'0 0 20px rgba(168,85,247,0.3)':'none'}}>
            {inp.trim() ? '💌' : '🌸'}
          </button>
        </div>
      </div>
    </div>
  </>)
}
