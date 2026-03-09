'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface ChatEntry {
  id: string;
  preview: string;
  msgCount: number;
  ts: number;
}

const NAV = [
  { id:'chat',     href:'/',         icon:'💬', label:'Chat' },
  { id:'study',    href:'/study',    icon:'📚', label:'Study' },
  { id:'tools',    href:'/tools',    icon:'🔧', label:'Tools' },
  { id:'target',   href:'/target',   icon:'🎯', label:'Target' },
  { id:'voice',    href:'/voice',    icon:'🎤', label:'Voice' },
  { id:'india',    href:'/india',    icon:'🇮🇳', label:'India' },
  { id:'settings', href:'/settings', icon:'⚙️', label:'Settings' },
]

// Load chats — records stored as {id, data, updatedAt}
async function loadChatsFromIDB(): Promise<ChatEntry[]> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('jarvis_v10', 1);
      req.onerror = () => resolve([]);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('chats'))
          req.result.createObjectStore('chats', { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('chats')) { resolve([]); return; }
        const tx = db.transaction('chats', 'readonly');
        const all = tx.objectStore('chats').getAll();
        all.onsuccess = () => {
          const records: any[] = all.result || [];
          const entries: ChatEntry[] = records
            .filter(r => r.id?.startsWith('chat_'))
            .map(r => {
              const msgs: any[] = Array.isArray(r.data) ? r.data : [];
              const userMsgs = msgs.filter((m: any) => m.role === 'user');
              const last = userMsgs[userMsgs.length - 1];
              const preview = last?.content?.slice(0, 48) || 'Chat...';
              const ts = r.updatedAt || msgs[msgs.length-1]?.timestamp || Date.now();
              return { id: r.id, preview, msgCount: msgs.length, ts };
            })
            .filter(e => e.msgCount > 0)
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 30);
          resolve(entries);
        };
        all.onerror = () => resolve([]);
      };
    } catch { resolve([]); }
  });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Abhi';
  if (mins < 60)  return `${mins}m pehle`;
  if (hrs < 24)   return `${hrs}h pehle`;
  if (days < 7)   return `${days}d pehle`;
  return new Date(ts).toLocaleDateString('hi-IN');
}

export default function Sidebar({
  onNewChat,
  onLoadChat,
  currentChatId,
}: {
  onNewChat?: () => void;
  onLoadChat?: (id: string) => void;
  currentChatId?: string;
}) {
  const [open, setOpen]       = useState(false);
  const [chats, setChats]     = useState<ChatEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const router   = useRouter();
  const pathname = usePathname();
  const active   = NAV.find(n => n.href === pathname)?.id || 'chat';

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadChatsFromIDB().then(c => { setChats(c); setLoading(false); });
  }, [open]);

  const go = (href: string) => { setOpen(false); router.push(href); };

  const handleLoadChat = (id: string) => {
    setOpen(false);
    if (onLoadChat) onLoadChat(id);
    else router.push('/');
  };

  const userName = typeof window !== 'undefined' ? localStorage.getItem('jarvis_profile_name') || '' : '';

  return (
    <>
      {/* Hamburger */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position:'fixed', top:8, left:10, zIndex:100,
          width:38, height:38, borderRadius:10,
          background:'rgba(0,229,255,.08)', border:'1px solid rgba(0,229,255,.18)',
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          flexDirection:'column', gap:4,
        }}
      >
        {[0,1,2].map(i => (
          <span key={i} style={{ width:16, height:1.5, background:'#00e5ff', borderRadius:1, display:'block' }}/>
        ))}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position:'fixed', inset:0, zIndex:149, background:'rgba(0,0,0,.55)', backdropFilter:'blur(2px)' }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position:'fixed', top:0, left:0, bottom:0, zIndex:150,
        width:270, background:'rgba(5,12,26,.98)',
        borderRight:'1px solid rgba(0,229,255,.12)',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform .25s cubic-bezier(.4,0,.2,1)',
        display:'flex', flexDirection:'column',
        boxShadow: open ? '4px 0 40px rgba(0,0,0,.7)' : 'none',
      }}>

        {/* Header */}
        <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid rgba(0,229,255,.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:'#00e5ff', letterSpacing:3 }}>JARVIS</div>
            <div style={{ fontSize:10, color:'#2a5070', marginTop:1 }}>v10.3{userName ? ` · ${userName}` : ''}</div>
          </div>
          <button onClick={() => setOpen(false)}
            style={{ width:28, height:28, borderRadius:7, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', cursor:'pointer', color:'#546e7a', fontSize:14 }}>
            ✕
          </button>
        </div>

        {/* New Chat */}
        <div style={{ padding:'10px 12px 6px' }}>
          <button
            onClick={() => { setOpen(false); onNewChat?.(); }}
            style={{
              width:'100%', padding:'10px 14px', borderRadius:10,
              background:'rgba(0,229,255,.09)', border:'1px solid rgba(0,229,255,.25)',
              color:'#00e5ff', fontSize:13, fontWeight:600, cursor:'pointer',
              display:'flex', alignItems:'center', gap:8, textAlign:'left' as const,
            }}
          >
            <span>✏️</span> Naya Chat
          </button>
        </div>

        {/* Chat History */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 12px' }}>
          <div style={{ fontSize:9, color:'#1e3a50', letterSpacing:2, fontWeight:700, marginBottom:6, paddingLeft:4 }}>CHAT HISTORY</div>
          {loading ? (
            <div style={{ color:'#2a5070', fontSize:11, padding:'8px 4px', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⟳</span> Loading...
            </div>
          ) : chats.length === 0 ? (
            <div style={{ color:'#1a3040', fontSize:11, padding:'8px 4px' }}>Koi purani chat nahi mili</div>
          ) : (
            chats.map(c => (
              <button key={c.id} onClick={() => handleLoadChat(c.id)}
                style={{
                  width:'100%', padding:'8px 10px', borderRadius:9, marginBottom:4,
                  background: currentChatId === c.id ? 'rgba(0,229,255,.1)' : 'rgba(255,255,255,.02)',
                  border: `1px solid ${currentChatId === c.id ? 'rgba(0,229,255,.2)' : 'rgba(255,255,255,.04)'}`,
                  cursor:'pointer', textAlign:'left' as const,
                }}
              >
                <div style={{ fontSize:12, color: currentChatId === c.id ? '#00e5ff' : '#5a8aaa', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {c.preview}
                </div>
                <div style={{ fontSize:10, color:'#2a4060' }}>
                  {c.msgCount} msgs · {timeAgo(c.ts)}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'10px 16px', borderTop:'1px solid rgba(0,229,255,.06)', fontSize:10, color:'#1a3040', textAlign:'center' as const }}>
          JARVIS · ₹0 Forever 🔒
        </div>
      </div>
    </>
  );
}
