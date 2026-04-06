'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

type Flashcard = { id: string; q: string; a: string; subject: string; difficulty: 'easy'|'medium'|'hard'; reviewed: boolean }
type Mode = 'home'|'flashcards'|'quiz'|'tutor'

const SUBJECTS = ['Physics','Chemistry','Biology','Maths','English','GK','Other']
const SUB_COLORS: Record<string,string> = { Physics:'#60a5fa', Chemistry:'#f87171', Biology:'#34d399', Maths:'#fbbf24', English:'#a78bfa', GK:'#f9a8d4', Other:'#94a3b8' }
const KEY = 'jarvis_cards_v1'
function uid() { return Date.now().toString(36) }
function load(): Flashcard[] { try { return JSON.parse(localStorage.getItem(KEY)||'[]') } catch { return [] } }
function save(c: Flashcard[]) { try { localStorage.setItem(KEY, JSON.stringify(c)) } catch {} }

export default function StudyPage() {
  const [cards, setCards] = useState<Flashcard[]>([])
  const [mode, setMode] = useState<Mode>('home')
  const [subFilter, setSubFilter] = useState('All')
  const [adding, setAdding] = useState(false)
  const [newQ, setNewQ] = useState(''); const [newA, setNewA] = useState(''); const [newSub, setNewSub] = useState('Physics')
  // Flashcard state
  const [cardIdx, setCardIdx] = useState(0); const [flipped, setFlipped] = useState(false)
  // Quiz state
  const [quizCards, setQuizCards] = useState<Flashcard[]>([])
  const [quizIdx, setQuizIdx] = useState(0); const [quizAns, setQuizAns] = useState(''); const [quizResult, setQuizResult] = useState<boolean|null>(null); const [score, setScore] = useState({ right:0, wrong:0 })
  // Tutor state
  const [tutorQ, setTutorQ] = useState(''); const [tutorA, setTutorA] = useState(''); const [tutorLoad, setTutorLoad] = useState(false)
  const tutorRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setCards(load()) }, [])

  function addCard() {
    if (!newQ.trim() || !newA.trim()) return
    const c: Flashcard = { id: uid(), q: newQ.trim(), a: newA.trim(), subject: newSub, difficulty: 'medium', reviewed: false }
    const u = [c, ...cards]; setCards(u); save(u)
    setNewQ(''); setNewA(''); setAdding(false)
  }

  function deleteCard(id: string) { const u = cards.filter(c => c.id !== id); setCards(u); save(u) }
  function toggleReviewed(id: string) { const u = cards.map(c => c.id===id?{...c,reviewed:!c.reviewed}:c); setCards(u); save(u) }

  function startFlashcards() {
    const filtered = subFilter==='All' ? cards : cards.filter(c => c.subject===subFilter)
    if (filtered.length === 0) return
    setCardIdx(0); setFlipped(false); setMode('flashcards')
  }

  function startQuiz() {
    const filtered = (subFilter==='All' ? cards : cards.filter(c => c.subject===subFilter)).sort(() => Math.random()-0.5).slice(0,10)
    if (filtered.length === 0) return
    setQuizCards(filtered); setQuizIdx(0); setQuizAns(''); setQuizResult(null); setScore({right:0,wrong:0}); setMode('quiz')
  }

  async function askTutor() {
    if (!tutorQ.trim()) return
    setTutorLoad(true); setTutorA('')
    try {
      const r = await fetch('/api/jarvis', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message: tutorQ, systemOverride: 'Tu ek expert study tutor hai. Clear, step-by-step explanations do. Hinglish use karo. Examples aur mnemonics do.' }) })
      const d = await r.json(); setTutorA(d.response || d.message || 'Kuch gaya galat')
    } catch { setTutorA('Error. Retry karo.') }
    setTutorLoad(false)
  }

  const filteredCards = subFilter==='All' ? cards : cards.filter(c => c.subject===subFilter)
  const fcCard = filteredCards[cardIdx]
  const quizCard = quizCards[quizIdx]

  return (
    <div style={{ minHeight:'100vh', background:'#070d1a', color:'#ddeeff', fontFamily:"'Inter', sans-serif", padding:'0 0 80px' }}>
      <style>{`
        * { box-sizing: border-box }
        @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes flip { from{transform:rotateY(0)} to{transform:rotateY(180deg)} }
        .card-front { backface-visibility: hidden; }
        .card-back { backface-visibility: hidden; transform: rotateY(180deg); }
      `}</style>

      <div style={{ background:'rgba(7,13,26,0.97)', borderBottom:'1px solid rgba(52,211,153,0.08)', padding:'13px 16px', display:'flex', alignItems:'center', gap:'12px', position:'sticky', top:0, zIndex:10, backdropFilter:'blur(12px)' }}>
        {mode !== 'home' ? (
          <button onClick={() => setMode('home')} style={{ background:'none',border:'none',color:'#2a5070',cursor:'pointer',fontSize:'18px',padding:0,fontFamily:'inherit' }}>←</button>
        ) : (
          <Link href="/" style={{ color:'#2a5070',fontSize:'18px',textDecoration:'none' }}>←</Link>
        )}
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'16px', fontWeight:700, color:'#34d399' }}>📚 Study</div>
          <div style={{ fontSize:'11px', color:'#2a5070' }}>{cards.length} cards · {cards.filter(c=>c.reviewed).length} reviewed</div>
        </div>
        {mode === 'home' && (
          <button onClick={() => setAdding(true)} style={{ background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:'8px', color:'#34d399', cursor:'pointer', padding:'5px 11px', fontSize:'12px', fontWeight:600, fontFamily:'inherit' }}>+ Card</button>
        )}
      </div>

      <div style={{ maxWidth:'480px', margin:'0 auto', padding:'14px' }}>
        {mode === 'home' && (
          <div style={{ animation:'fadeUp 0.2s ease' }}>
            {/* Mode cards */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'18px' }}>
              {[
                { l:'Flashcards', i:'🃏', c:'#60a5fa', fn: startFlashcards },
                { l:'Quiz', i:'🧠', c:'#f87171', fn: startQuiz },
                { l:'AI Tutor', i:'🤖', c:'#34d399', fn: () => setMode('tutor') },
              ].map(m => (
                <button key={m.l} onClick={m.fn}
                  style={{ background:`${m.c}0e`, border:`1px solid ${m.c}22`, borderRadius:'14px', cursor:'pointer', padding:'18px 8px', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', transition:'all 0.15s', fontFamily:'inherit' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background=`${m.c}1a` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background=`${m.c}0e` }}>
                  <span style={{ fontSize:'28px' }}>{m.i}</span>
                  <span style={{ fontSize:'12px', fontWeight:700, color:m.c }}>{m.l}</span>
                </button>
              ))}
            </div>

            {/* Subject filter */}
            <div style={{ display:'flex', gap:'5px', overflowX:'auto', marginBottom:'12px', paddingBottom:'2px' }}>
              {['All', ...SUBJECTS].map(s => (
                <button key={s} onClick={() => setSubFilter(s)}
                  style={{ background: subFilter===s ? `${SUB_COLORS[s]||'#00e5ff'}12` : 'rgba(0,229,255,0.03)', border:`1px solid ${subFilter===s?(SUB_COLORS[s]||'#00e5ff')+'33':'rgba(0,229,255,0.07)'}`, borderRadius:'20px', color: subFilter===s ? (SUB_COLORS[s]||'#00e5ff') : '#2a5070', cursor:'pointer', padding:'4px 10px', fontSize:'11px', whiteSpace:'nowrap', fontFamily:'inherit', fontWeight: subFilter===s?700:400 }}>
                  {s}
                </button>
              ))}
            </div>

            {/* Add card form */}
            {adding && (
              <div style={{ background:'rgba(12,20,34,0.9)', border:'1px solid rgba(52,211,153,0.12)', borderRadius:'13px', padding:'14px', marginBottom:'12px', animation:'fadeUp 0.15s ease' }}>
                <input value={newQ} onChange={e => setNewQ(e.target.value)} placeholder="Question..."
                  style={{ width:'100%',background:'rgba(0,229,255,0.04)',border:'1px solid rgba(0,229,255,0.1)',borderRadius:'8px',color:'#ddeeff',padding:'9px 12px',fontSize:'13px',outline:'none',fontFamily:'inherit',marginBottom:'8px' }} />
                <textarea value={newA} onChange={e => setNewA(e.target.value)} placeholder="Answer..." rows={2}
                  style={{ width:'100%',background:'rgba(0,229,255,0.04)',border:'1px solid rgba(0,229,255,0.1)',borderRadius:'8px',color:'#ddeeff',padding:'9px 12px',fontSize:'13px',outline:'none',fontFamily:'inherit',marginBottom:'8px',resize:'none' }} />
                <div style={{ display:'flex', gap:'6px', marginBottom:'12px', flexWrap:'wrap' }}>
                  {SUBJECTS.map(s => <button key={s} onClick={() => setNewSub(s)} style={{ background: newSub===s?`${SUB_COLORS[s]}18`:'none', border:`1px solid ${newSub===s?SUB_COLORS[s]+'44':'rgba(0,229,255,0.07)'}`, borderRadius:'20px', color: newSub===s?SUB_COLORS[s]:'#2a5070', cursor:'pointer', padding:'3px 9px', fontSize:'10px', fontFamily:'inherit' }}>{s}</button>)}
                </div>
                <div style={{ display:'flex',gap:'8px' }}>
                  <button onClick={() => setAdding(false)} style={{ flex:1,background:'none',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'8px',color:'#4a7090',cursor:'pointer',padding:'8px',fontFamily:'inherit' }}>Cancel</button>
                  <button onClick={addCard} disabled={!newQ.trim()||!newA.trim()} style={{ flex:2,background:newQ.trim()&&newA.trim()?'linear-gradient(135deg,#065f46,#34d399)':'rgba(52,211,153,0.05)',border:'none',borderRadius:'8px',color:newQ.trim()&&newA.trim()?'#fff':'#2a5070',cursor:newQ.trim()&&newA.trim()?'pointer':'not-allowed',padding:'8px',fontWeight:700,fontFamily:'inherit' }}>Add Card</button>
                </div>
              </div>
            )}

            {/* Cards list */}
            {filteredCards.length === 0 ? (
              <div style={{ textAlign:'center',padding:'40px 20px',color:'#1e3248' }}>
                <div style={{ fontSize:'40px',opacity:0.3,marginBottom:'12px' }}>📚</div>
                <div style={{ fontSize:'14px',color:'#4a7090',marginBottom:'6px' }}>Koi flashcard nahi</div>
              </div>
            ) : filteredCards.map(c => {
              const col = SUB_COLORS[c.subject] || '#94a3b8'
              return (
                <div key={c.id} style={{ background:'rgba(12,20,34,0.8)', border:`1px solid ${col}18`, borderRadius:'11px', padding:'12px 14px', marginBottom:'7px', display:'flex', alignItems:'flex-start', gap:'10px' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px' }}>
                      <span style={{ fontSize:'9px', background:col+'18', color:col, padding:'2px 7px', borderRadius:'10px', fontWeight:600 }}>{c.subject}</span>
                      {c.reviewed && <span style={{ fontSize:'9px', color:'#34d399' }}>✓ reviewed</span>}
                    </div>
                    <div style={{ fontSize:'13px', fontWeight:600, color:'#c8dff0', marginBottom:'3px' }}>{c.q}</div>
                    <div style={{ fontSize:'12px', color:'#2a5070' }}>{c.a.slice(0,80)}{c.a.length>80?'...':''}</div>
                  </div>
                  <div style={{ display:'flex', gap:'4px', flexShrink:0 }}>
                    <button onClick={() => toggleReviewed(c.id)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:'13px',opacity:c.reviewed?1:0.3 }}>✓</button>
                    <button onClick={() => deleteCard(c.id)} style={{ background:'none',border:'none',color:'#2a5070',cursor:'pointer',fontSize:'12px' }}>🗑️</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Flashcard mode */}
        {mode === 'flashcards' && fcCard && (
          <div style={{ animation:'fadeUp 0.2s ease' }}>
            <div style={{ fontSize:'12px', color:'#2a5070', textAlign:'center', marginBottom:'16px' }}>{cardIdx+1} / {filteredCards.length}</div>
            <div onClick={() => setFlipped(v=>!v)} style={{ background: flipped?'rgba(96,165,250,0.08)':'rgba(12,20,34,0.9)', border:`1px solid ${flipped?'rgba(96,165,250,0.2)':'rgba(0,229,255,0.1)'}`, borderRadius:'18px', padding:'40px 24px', minHeight:'200px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.3s', textAlign:'center', marginBottom:'14px' }}>
              <div style={{ fontSize:'11px', color: flipped?'#60a5fa':'#00e5ff', marginBottom:'12px', fontWeight:600, letterSpacing:'1px' }}>{flipped?'ANSWER':'QUESTION'}</div>
              <div style={{ fontSize:'18px', fontWeight:700, color:'#ddeeff', lineHeight:'1.5' }}>{flipped ? fcCard.a : fcCard.q}</div>
              {!flipped && <div style={{ fontSize:'11px', color:'#1e3248', marginTop:'14px' }}>Tap to reveal answer</div>}
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => { setCardIdx(i=>(i-1+filteredCards.length)%filteredCards.length); setFlipped(false) }} style={{ flex:1,background:'rgba(0,229,255,0.05)',border:'1px solid rgba(0,229,255,0.1)',borderRadius:'10px',color:'#4a7090',cursor:'pointer',padding:'10px',fontFamily:'inherit' }}>← Prev</button>
              <button onClick={() => toggleReviewed(fcCard.id)} style={{ flex:1,background:fcCard.reviewed?'rgba(52,211,153,0.12)':'rgba(52,211,153,0.05)',border:`1px solid ${fcCard.reviewed?'rgba(52,211,153,0.3)':'rgba(52,211,153,0.1)'}`,borderRadius:'10px',color:'#34d399',cursor:'pointer',padding:'10px',fontFamily:'inherit',fontWeight:fcCard.reviewed?700:400 }}>{fcCard.reviewed?'✓ Done':'Mark Done'}</button>
              <button onClick={() => { setCardIdx(i=>(i+1)%filteredCards.length); setFlipped(false) }} style={{ flex:1,background:'rgba(0,229,255,0.05)',border:'1px solid rgba(0,229,255,0.1)',borderRadius:'10px',color:'#4a7090',cursor:'pointer',padding:'10px',fontFamily:'inherit' }}>Next →</button>
            </div>
          </div>
        )}

        {/* Quiz mode */}
        {mode === 'quiz' && (
          <div style={{ animation:'fadeUp 0.2s ease' }}>
            {quizIdx < quizCards.length && quizCard ? (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
                  <div style={{ fontSize:'12px', color:'#2a5070' }}>Q {quizIdx+1}/{quizCards.length}</div>
                  <div style={{ fontSize:'12px' }}><span style={{ color:'#34d399' }}>✓{score.right}</span> <span style={{ color:'#f87171' }}>✗{score.wrong}</span></div>
                </div>
                <div style={{ background:'rgba(12,20,34,0.9)',border:'1px solid rgba(0,229,255,0.1)',borderRadius:'14px',padding:'20px',marginBottom:'14px' }}>
                  <div style={{ fontSize:'11px', color: SUB_COLORS[quizCard.subject]||'#60a5fa', marginBottom:'10px', fontWeight:600 }}>{quizCard.subject}</div>
                  <div style={{ fontSize:'17px', fontWeight:700, color:'#ddeeff', lineHeight:'1.5' }}>{quizCard.q}</div>
                </div>
                <textarea value={quizAns} onChange={e => { setQuizAns(e.target.value); setQuizResult(null) }}
                  placeholder="Your answer..." rows={3}
                  style={{ width:'100%',background:'rgba(0,229,255,0.04)',border:`1px solid ${quizResult===null?'rgba(0,229,255,0.1)':quizResult?'rgba(52,211,153,0.4)':'rgba(248,113,113,0.4)'}`,borderRadius:'10px',color:'#ddeeff',padding:'10px 12px',fontSize:'13px',outline:'none',resize:'none',fontFamily:'inherit',marginBottom:'10px',transition:'border-color 0.2s' }} />
                {quizResult !== null && (
                  <div style={{ background: quizResult?'rgba(52,211,153,0.08)':'rgba(248,113,113,0.08)', border:`1px solid ${quizResult?'rgba(52,211,153,0.2)':'rgba(248,113,113,0.2)'}`, borderRadius:'10px', padding:'12px', marginBottom:'10px' }}>
                    <div style={{ fontSize:'13px', fontWeight:700, color: quizResult?'#34d399':'#f87171', marginBottom:'4px' }}>{quizResult?'✓ Correct!':'✗ Not quite'}</div>
                    <div style={{ fontSize:'12px', color:'#c8dff0' }}><strong>Answer:</strong> {quizCard.a}</div>
                  </div>
                )}
                <div style={{ display:'flex',gap:'8px' }}>
                  {quizResult === null ? (
                    <>
                      <button onClick={() => { const r=quizAns.trim().toLowerCase().includes(quizCard.a.slice(0,15).toLowerCase()); setQuizResult(r); setScore(s=>r?{...s,right:s.right+1}:{...s,wrong:s.wrong+1}) }} disabled={!quizAns.trim()} style={{ flex:2,background:quizAns.trim()?'linear-gradient(135deg,#0055cc,#00c8ff)':'rgba(0,229,255,0.04)',border:'none',borderRadius:'10px',color:quizAns.trim()?'#000':'#1e3248',cursor:quizAns.trim()?'pointer':'not-allowed',padding:'11px',fontWeight:700,fontFamily:'inherit' }}>Check Answer</button>
                      <button onClick={() => { setQuizResult(false); setScore(s=>({...s,wrong:s.wrong+1})) }} style={{ flex:1,background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:'10px',color:'#f87171',cursor:'pointer',padding:'11px',fontFamily:'inherit' }}>Skip</button>
                    </>
                  ) : (
                    <button onClick={() => { setQuizIdx(i=>i+1); setQuizAns(''); setQuizResult(null) }} style={{ flex:1,background:'linear-gradient(135deg,#0055cc,#00c8ff)',border:'none',borderRadius:'10px',color:'#000',cursor:'pointer',padding:'11px',fontWeight:700,fontFamily:'inherit' }}>Next →</button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'30px 20px' }}>
                <div style={{ fontSize:'50px', marginBottom:'14px' }}>🏆</div>
                <div style={{ fontSize:'22px', fontWeight:800, color:'#fbbf24', marginBottom:'6px' }}>Quiz Done!</div>
                <div style={{ fontSize:'18px', marginBottom:'16px' }}><span style={{ color:'#34d399' }}>{score.right} correct</span> · <span style={{ color:'#f87171' }}>{score.wrong} wrong</span></div>
                <div style={{ fontSize:'14px', color:'#4a7090', marginBottom:'20px' }}>Score: {Math.round(score.right/(score.right+score.wrong)*100)}%</div>
                <button onClick={startQuiz} style={{ background:'linear-gradient(135deg,#0055cc,#00c8ff)',border:'none',borderRadius:'11px',color:'#000',cursor:'pointer',padding:'12px 28px',fontSize:'14px',fontWeight:700,fontFamily:'inherit' }}>Try Again</button>
              </div>
            )}
          </div>
        )}

        {/* AI Tutor mode */}
        {mode === 'tutor' && (
          <div style={{ animation:'fadeUp 0.2s ease' }}>
            <div style={{ background:'rgba(12,20,34,0.8)',border:'1px solid rgba(52,211,153,0.1)',borderRadius:'14px',padding:'16px',marginBottom:'12px',textAlign:'center' }}>
              <div style={{ fontSize:'32px', marginBottom:'8px' }}>🤖</div>
              <div style={{ fontSize:'15px', fontWeight:700, color:'#34d399' }}>AI Study Tutor</div>
              <div style={{ fontSize:'12px', color:'#2a5070', marginTop:'4px' }}>Kuch bhi pucho — Physics, Maths, Biology, History...</div>
            </div>
            <div style={{ marginBottom:'10px' }}>
              <textarea ref={tutorRef} value={tutorQ} onChange={e => setTutorQ(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();askTutor()} }}
                placeholder="Question pucho... e.g. Newton ka 2nd law explain karo" rows={3}
                style={{ width:'100%',background:'rgba(52,211,153,0.04)',border:'1px solid rgba(52,211,153,0.12)',borderRadius:'10px',color:'#ddeeff',padding:'10px 12px',fontSize:'13px',outline:'none',resize:'none',fontFamily:'inherit',marginBottom:'8px' }} />
              <button onClick={askTutor} disabled={!tutorQ.trim()||tutorLoad} style={{ width:'100%',background:tutorQ.trim()&&!tutorLoad?'linear-gradient(135deg,#065f46,#34d399)':'rgba(52,211,153,0.05)',border:'none',borderRadius:'10px',color:tutorQ.trim()&&!tutorLoad?'#fff':'#1e3248',cursor:tutorQ.trim()&&!tutorLoad?'pointer':'not-allowed',padding:'11px',fontSize:'14px',fontWeight:700,fontFamily:'inherit' }}>
                {tutorLoad ? '⏳ Thinking...' : '🤖 Ask Tutor'}
              </button>
            </div>
            {tutorA && (
              <div style={{ background:'rgba(12,20,34,0.9)',border:'1px solid rgba(52,211,153,0.1)',borderRadius:'12px',padding:'16px',whiteSpace:'pre-wrap',fontSize:'14px',color:'#c8dff0',lineHeight:'1.7', animation:'fadeUp 0.2s ease' }}>
                {tutorA}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
