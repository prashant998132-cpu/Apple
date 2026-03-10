'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface ChatEntry {
  id: string
  title: string
  preview: string
  msgCount: number
  ts: number
  pinned: boolean
}

function generateTitle(firstMsg: string): string {
  const t = firstMsg.trim().toLowerCase()
  if (t.match(/weather|mausam|baarish|temperature/)) return '🌤️ Weather'
  if (t.match(/image|photo|picture|banao|draw|generate/)) return '🎨 Image Gen'
  if (t.match(/news|khabar|samachar/)) return '📰 News'
  if (t.match(/code|function|program|script|bug|typescript|javascript|python/)) return '💻 Code'
  if (t.match(/physics|chemistry|biology|formula|science|experiment/)) return '🔬 Science'
  if (t.match(/study|padhai|revision|notes|flashcard|mcq|quiz/)) return '📖 Study'
  if (t.match(/recipe|food|khana|cook/)) return '🍛 Recipe'
  if (t.match(/cricket|ipl|score|match/)) return '🏏 Cricket'
  if (t.match(/math|calculate|solve|equation/)) return '🔢 Maths'
  if (t.match(/song|music|gana|lyrics/)) return '🎵 Music'
  if (t.match(/joke|funny|meme/)) return '😄 Fun'
  if (t.match(/movie|film|web series|netflix/)) return '🎬 Movie'
  if (t.match(/health|doctor|medicine|symptom|pain/)) return '💊 Health'
  if (t.match(/travel|trip|train|flight|hotel/)) return '✈️ Travel'
  if (t.match(/invest|stock|crypto|bitcoin|finance/)) return '📈 Finance'
  if (t.match(/yoga|exercise|gym|workout/)) return '💪 Fitness'
  if (t.match(/story|write|poem|essay/)) return '✍️ Writing'
  if (t.match(/translate|hindi|english/)) return '🌐 Translate'
  if (t.match(/explain|kya hai|what is|samjhao/)) return '💡 Explain'
  const clean = firstMsg.replace(/[^\w\s\u0900-\u097F]/g, '').trim()
  return clean.slice(0, 26) || 'Chat'
}

async function loadChatsFromIDB(): Promise<ChatEntry[]> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('jarvis_v10', 1)
      req.onerror = () => resolve([])
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('chats'))
          req.result.createObjectStore('chats', { keyPath: 'id' })
      }
      req.onsuccess = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('chats')) { resolve([]); return }
        const all = db.transaction('chats','readonly').objectStore('chats').getAll()
        all.onsuccess = () => {
          let pins: string[] = []
          try { pins = JSON.parse(localStorage.getItem('jarvis_pinned_chats') || '[]') } catch {}
          const entries: ChatEntry[] = (all.result || [])
            .filter((r: any) => r.id?.startsWith('chat_'))
            .map((r: any) => {
              const msgs: any[] = Array.isArray(r.data) ? r.data : []
              const userMsgs = msgs.filter((m: any) => m.role === 'user')
              const firstMsg = userMsgs[0]?.content || ''
              const lastMsg  = userMsgs[userMsgs.length-1]?.content || ''
              const ts = r.updatedAt || msgs[msgs.length-1]?.timestamp || Date.now()
              let title = ''
              try { title = localStorage.getItem(`jarvis_title_${r.id}`) || '' } catch {}
              if (!title && firstMsg) title = generateTitle(firstMsg)
              if (!title) title = 'Chat'
              return { id: r.id, title, preview: (lastMsg || firstMsg).slice(0, 44) || 'Chat...', msgCount: msgs.length, ts, pinned: pins.includes(r.id) }
            })
            .filter((e: ChatEntry) => e.msgCount > 0)
            .sort((a: ChatEntry, b: ChatEntry) => {
              if (a.pinned && !b.pinned) return -1
              if (!a.pinned && b.pinned) return 1
              return b.ts - a.ts
            })
            .slice(0, 50)
          resolve(entries)
        }
        all.onerror = () => resolve([])
      }
    } catch { resolve([]) }
  })
}

function timeAgo(ts: number): string {
  const d = Date.now() - ts
  const m = Math.floor(d/60000), h = Math.floor(d/3600000), dy = Math.floor(d/86400000)
  if (m < 1) return 'Abhi'
  if (m < 60) return `${m}m`
  if (h < 24) return `${h}h`
  if (dy < 7) return `${dy}d`
  return new Date(ts).toLocaleDateString('hi-IN', { day:'numeric', month:'short' })
}

export default function Sidebar({ onNewChat, onLoadChat, currentChatId }: {
  onNewChat?: () => void
  onLoadChat?: (id: string) => void
  currentChatId?: string
}) {
  const [open, setOpen]       = useState(false)
  const [chats, setChats]     = useState<ChatEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [menu, setMenu]       = useState<string|null>(null)
  const [editId, setEditId]   = useState<string|null>(null)
  const [editVal, setEditVal] = useState('')
  const router   = useRouter()
  const pathname = usePathname()
  const active   = pathname === '/' ? 'chat' : pathname.startsWith('/settings') ? 'settings' : pathname.slice(1)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    loadChatsFromIDB().then(c => { setChats(c); setLoading(false) })
  }, [open])

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    let pins: string[] = []
    try { pins = JSON.parse(localStorage.getItem('jarvis_pinned_chats') || '[]') } catch {}
    const already = pins.includes(id)
    localStorage.setItem('jarvis_pinned_chats', JSON.stringify(already ? pins.filter(p=>p!==id) : [id,...pins]))
    setChats(prev => prev.map(c => c.id===id ? {...c, pinned:!already} : c)
      .sort((a,b) => { if(a.pinned&&!b.pinned)return -1; if(!a.pinned&&b.pinned)return 1; return b.ts-a.ts }))
    setMenu(null)
  }

  const saveRename = (id: string) => {
    if (editVal.trim()) {
      localStorage.setItem(`jarvis_title_${id}`, editVal.trim())
      setChats(prev => prev.map(c => c.id===id ? {...c, title:editVal.trim()} : c))
    }
    setEditId(null)
  }

  const deleteChat = (id: string) => {
    if (!confirm('Yeh chat delete karein?')) return
    setMenu(null)
    try {
      const r = indexedDB.open('jarvis_v10', 1)
      r.onsuccess = () => r.result.transaction('chats','readwrite').objectStore('chats').delete(id)
    } catch {}
    setChats(prev => prev.filter(c => c.id !== id))
  }

  const now = Date.now()
  const pinned    = chats.filter(c => c.pinned)
  const unpinned  = chats.filter(c => !c.pinned)
  const today     = unpinned.filter(c => now - c.ts < 86400000)
  const yesterday = unpinned.filter(c => now-c.ts >= 86400000 && now-c.ts < 172800000)
  const older     = unpinned.filter(c => now - c.ts >= 172800000)

  const SL = ({ label }: { label: string }) => (
    <div style={{ fontSize:9, color:'#1e3a50', letterSpacing:2, fontWeight:700, margin:'8px 0 3px 4px' }}>{label}</div>
  )

  const Item = ({ c }: { c: ChatEntry; key?: string }) => (
    <div style={{ position:'relative', marginBottom:3 }}>
      {editId === c.id ? (
        <div style={{ display:'flex', gap:4, padding:'4px 4px' }}>
          <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter') saveRename(c.id); if(e.key==='Escape') setEditId(null) }}
            style={{ flex:1, background:'#0a1e30', border:'1px solid rgba(0,229,255,.3)', borderRadius:6, padding:'5px 8px', color:'#c8dff0', fontSize:12, outline:'none' }}
          />
          <button onClick={()=>saveRename(c.id)} style={{ background:'rgba(0,229,255,.15)', border:'none', borderRadius:5, color:'#00e5ff', cursor:'pointer', padding:'4px 8px', fontSize:11 }}>✓</button>
        </div>
      ) : (
        <button onClick={()=>{ setMenu(null); setOpen(false); if(onLoadChat) onLoadChat(c.id); else router.push('/') }}
          onContextMenu={e=>{ e.preventDefault(); setMenu(c.id) }}
          style={{ width:'100%', padding:'8px 10px', borderRadius:9, background: currentChatId===c.id?'rgba(0,229,255,.12)':'rgba(255,255,255,.02)', border:`1px solid ${currentChatId===c.id?'rgba(0,229,255,.22)':'rgba(255,255,255,.04)'}`, cursor:'pointer', textAlign:'left' as const, display:'flex', alignItems:'center', gap:6 }}>
          {c.pinned && <span style={{ fontSize:10, flexShrink:0 }}>📌</span>}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color: currentChatId===c.id?'#00e5ff':'#7ab0cc', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.title}</div>
            <div style={{ fontSize:10, color:'#2a4060', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:1 }}>{c.preview}</div>
            <div style={{ fontSize:9, color:'#1a3040', marginTop:1 }}>{c.msgCount} msgs · {timeAgo(c.ts)}</div>
          </div>
          <button onClick={e=>togglePin(c.id,e)} title={c.pinned?'Unpin':'Pin'}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, opacity:.45, flexShrink:0, padding:'1px 2px' }}>
            {c.pinned?'📌':'⊹'}
          </button>
        </button>
      )}
      {menu === c.id && (
        <>
          <div onClick={()=>setMenu(null)} style={{ position:'fixed', inset:0, zIndex:400 }}/>
          <div style={{ position:'absolute', left:8, top:'100%', zIndex:401, background:'#071828', border:'1px solid rgba(0,229,255,.2)', borderRadius:10, padding:5, minWidth:150, boxShadow:'0 8px 32px rgba(0,0,0,.9)' }}>
            {[
              { icon:'📌', label: c.pinned?'Unpin karo':'Pin karo', action: (e:React.MouseEvent)=>togglePin(c.id,e) },
              { icon:'✏️', label:'Rename karo', action: (e:React.MouseEvent)=>{ e.stopPropagation(); setEditId(c.id); setEditVal(c.title); setMenu(null) } },
              { icon:'🗑️', label:'Delete karo', action: (e:React.MouseEvent)=>{ e.stopPropagation(); deleteChat(c.id) }, danger:true },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                style={{ display:'block', width:'100%', padding:'8px 12px', background:'none', border:'none', color: item.danger?'#ef5350':'#c8dff0', fontSize:12, cursor:'pointer', textAlign:'left' as const, borderRadius:6 }}>
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )

  const userName = typeof window !== 'undefined' ? localStorage.getItem('jarvis_profile_name')||'' : ''

  return (
    <>
      <button onClick={()=>setOpen(true)} style={{ position:'fixed', top:8, left:10, zIndex:100, width:38, height:38, borderRadius:10, background:'rgba(0,229,255,.08)', border:'1px solid rgba(0,229,255,.18)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:4 }}>
        {[0,1,2].map(i=><span key={i} style={{ width:16, height:1.5, background:'#00e5ff', borderRadius:1, display:'block' }}/>)}
      </button>

      {open && <div onClick={()=>setOpen(false)} style={{ position:'fixed', inset:0, zIndex:149, background:'rgba(0,0,0,.55)', backdropFilter:'blur(2px)' }}/>}

      <div style={{ position:'fixed', top:0, left:0, bottom:0, zIndex:150, width:270, background:'rgba(5,12,26,.98)', borderRight:'1px solid rgba(0,229,255,.1)', transform: open?'translateX(0)':'translateX(-100%)', transition:'transform .25s cubic-bezier(.4,0,.2,1)', display:'flex', flexDirection:'column', boxShadow: open?'4px 0 40px rgba(0,0,0,.8)':'none' }}>

        <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid rgba(0,229,255,.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:'#00e5ff', letterSpacing:3 }}>JARVIS</div>
            <div style={{ fontSize:10, color:'#2a5070', marginTop:1 }}>v10.12{userName?` · ${userName}`:''}</div>
          </div>
          <button onClick={()=>setOpen(false)} style={{ width:28, height:28, borderRadius:7, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', cursor:'pointer', color:'#546e7a', fontSize:14 }}>✕</button>
        </div>

        <div style={{ padding:'10px 12px 4px' }}>
          <button onClick={()=>{ setOpen(false); onNewChat?.() }} style={{ width:'100%', padding:'10px 14px', borderRadius:10, background:'rgba(0,229,255,.09)', border:'1px solid rgba(0,229,255,.25)', color:'#00e5ff', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
            <span>✏️</span> Naya Chat
          </button>
        </div>

        <div style={{ padding:'3px 16px 4px', fontSize:9, color:'#1a3040' }}>Long press → pin / rename / delete</div>

        <div style={{ flex:1, overflowY:'auto', padding:'2px 10px' }}>
          {loading ? (
            <div style={{ color:'#2a5070', fontSize:11, padding:'12px 4px', display:'flex', alignItems:'center', gap:6 }}>
              <span>⟳</span> Loading...
            </div>
          ) : chats.length === 0 ? (
            <div style={{ color:'#1a3040', fontSize:11, padding:'12px 4px' }}>Koi purani chat nahi mili</div>
          ) : (
            <>
              {pinned.length>0 && <><SL label="📌 PINNED"/>{pinned.map((c:ChatEntry)=><Item key={c.id} c={c}/>)}</>}
              {today.length>0 && <><SL label="TODAY"/>{today.map((c:ChatEntry)=><Item key={c.id} c={c}/>)}</>}
              {yesterday.length>0 && <><SL label="YESTERDAY"/>{yesterday.map((c:ChatEntry)=><Item key={c.id} c={c}/>)}</>}
              {older.length>0 && <><SL label="OLDER"/>{older.map((c:ChatEntry)=><Item key={c.id} c={c}/>)}</>}
            </>
          )}
        </div>

        <div style={{ padding:'8px 12px', borderTop:'1px solid rgba(0,229,255,.06)' }}>
          {/* Export chat */}
          {chats.length > 0 && currentChatId && (
            <button onClick={async () => {
              try {
                const req = indexedDB.open('jarvis_v10', 1)
                req.onsuccess = () => {
                  const get = req.result.transaction('chats','readonly').objectStore('chats').get(currentChatId!)
                  get.onsuccess = () => {
                    const msgs: any[] = get.result?.data || []
                    const text = msgs.map((m: any) =>
                      `[${m.role === 'user' ? 'You' : 'JARVIS'}] ${new Date(m.timestamp||0).toLocaleTimeString('hi-IN')}\n${m.content}\n`
                    ).join('\n---\n\n')
                    const blob = new Blob([text], { type:'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url; a.download = `JARVIS_${currentChatId}.txt`; a.click()
                    URL.revokeObjectURL(url)
                  }
                }
              } catch {}
            }} style={{ width:'100%', padding:'7px 12px', borderRadius:8, marginBottom:6, background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)', color:'#2a5070', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:8, textAlign:'left' as const }}>
              <span>📤</span> Export current chat
            </button>
          )}
          <button onClick={()=>{ setOpen(false); router.push('/settings') }} style={{ width:'100%', padding:'9px 12px', borderRadius:9, marginBottom:8, background: active==='settings'?'rgba(0,229,255,.1)':'rgba(255,255,255,.03)', border:`1px solid ${active==='settings'?'rgba(0,229,255,.2)':'rgba(255,255,255,.06)'}`, color: active==='settings'?'#00e5ff':'#4a7090', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:10, textAlign:'left' as const }}>
            <span style={{ fontSize:16 }}>⚙️</span>
            <span style={{ fontWeight: active==='settings'?600:400 }}>Settings</span>
          </button>
          <div style={{ fontSize:10, color:'#1a3040', textAlign:'center' as const }}>JARVIS · ₹0 Forever 🔒</div>
        </div>
      </div>
    </>
  )
}
