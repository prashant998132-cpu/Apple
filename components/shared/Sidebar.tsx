'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const NAV = [
  { id: 'chat',     href: '/',         label: 'Chat',     icon: '💬' },
  { id: 'study',    href: '/study',    label: 'Study',    icon: '📚' },
  { id: 'target',   href: '/target',   label: 'Target',   icon: '🎯' },
  { id: 'voice',    href: '/voice',    label: 'Voice',    icon: '🎤' },
  { id: 'india',    href: '/india',    label: 'India',    icon: '🇮🇳' },
  { id: 'settings', href: '/settings', label: 'Settings', icon: '⚙️' },
];

interface ChatEntry {
  id: string;
  preview: string;
  msgCount: number;
  ts: number;
}

// Load chats from IndexedDB (same as storage/index.ts)
async function loadChatsFromIDB(): Promise<ChatEntry[]> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('jarvis_v10', 1);
      req.onerror = () => resolve([]);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('chats')) { resolve([]); return; }
        const tx = db.transaction('chats', 'readonly');
        const store = tx.objectStore('chats');
        const all = store.getAll();
        const allKeys = store.getAllKeys();
        const results: { key: string; msgs: any[] }[] = [];
        allKeys.onsuccess = (e1) => {
          all.onsuccess = (e2) => {
            const keys = (e1.target as any).result as string[];
            const vals = (e2.target as any).result as any[][];
            keys.forEach((k, i) => {
              if (k.startsWith('chat_') && Array.isArray(vals[i]) && vals[i].length > 0) {
                results.push({ key: k, msgs: vals[i] });
              }
            });
            const entries: ChatEntry[] = results.map(({ key, msgs }) => {
              // Get last user message as preview
              const userMsgs = msgs.filter((m: any) => m.role === 'user');
              const last = userMsgs[userMsgs.length - 1];
              const preview = last?.content?.slice(0, 50) || 'Chat...';
              // Extract timestamp from key or last message
              const ts = msgs[msgs.length - 1]?.timestamp || Date.now();
              return { id: key, preview, msgCount: msgs.length, ts };
            });
            // Sort newest first
            entries.sort((a, b) => b.ts - a.ts);
            resolve(entries.slice(0, 30)); // max 30 chats
          };
        };
        tx.onerror = () => resolve([]);
      };
    } catch {
      resolve([]);
    }
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
  const [open, setOpen]   = useState(false);
  const [chats, setChats] = useState<ChatEntry[]>([]);
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

  return (
    <>
      {/* Hamburger */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: 10, left: 12, zIndex: 100,
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(0,229,255,.06)', border: '1px solid rgba(0,229,255,.12)',
          color: '#4a90b8', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}
      >
        {[14, 14, 10].map((w, i) => (
          <span key={i} style={{ width: w, height: 1.5, background: 'currentColor', borderRadius: 2, display: 'block', alignSelf: i===2?'flex-start':'center', marginLeft: i===2?2:0 }}/>
        ))}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 200, backdropFilter: 'blur(3px)' }}
        />
      )}

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 280,
        background: 'linear-gradient(180deg,#070f1e,#050c18)',
        borderRight: '1px solid rgba(0,229,255,.1)',
        zIndex: 300, display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .22s cubic-bezier(.4,0,.2,1)',
        boxShadow: open ? '6px 0 40px rgba(0,0,0,.8)' : 'none',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,rgba(0,229,255,.2),rgba(109,40,217,.15))', border: '1px solid rgba(0,229,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#00e5ff' }}>J</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f4ff', letterSpacing: 3 }}>JARVIS</div>
              <div style={{ fontSize: 9, color: '#2a4060', letterSpacing: 1 }}>v10.3</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: '#4a7090', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
        </div>

        {/* New Chat */}
        <div style={{ padding: '10px 12px 6px' }}>
          <button
            onClick={() => { setOpen(false); onNewChat?.(); }}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              background: 'linear-gradient(135deg,rgba(0,180,216,.15),rgba(0,100,180,.1))',
              border: '1px solid rgba(0,180,216,.3)', color: '#00d4ff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>✏️</span> Naya Chat
          </button>
        </div>

        {/* Nav */}
        <div style={{ padding: '4px 12px 8px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
          <div style={{ fontSize: 9, color: '#2a4060', letterSpacing: 2, padding: '4px 4px 6px', textTransform: 'uppercase' }}>Pages</div>
          {NAV.map(n => {
            const on = n.id === active;
            return (
              <button key={n.id} onClick={() => go(n.href)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 9, marginBottom: 2,
                background: on ? 'rgba(0,229,255,.1)' : 'transparent',
                border: on ? '1px solid rgba(0,229,255,.2)' : '1px solid transparent',
                color: on ? '#00e5ff' : '#5a8aaa',
                cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
              }}>
                <span style={{ fontSize: 15 }}>{n.icon}</span>
                <span style={{ fontSize: 13, fontWeight: on ? 600 : 400 }}>{n.label}</span>
                {on && <span style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: '#00e5ff', boxShadow: '0 0 6px #00e5ff' }}/>}
              </button>
            );
          })}
        </div>

        {/* Chat History */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
          <div style={{ fontSize: 9, color: '#2a4060', letterSpacing: 2, padding: '10px 4px 6px', textTransform: 'uppercase' }}>
            Chat History {chats.length > 0 && <span style={{ color: '#00e5ff', marginLeft: 4 }}>{chats.length}</span>}
          </div>

          {loading && (
            <div style={{ color: '#2a5070', fontSize: 12, padding: '8px 4px' }}>Loading...</div>
          )}

          {!loading && chats.length === 0 && (
            <div style={{ color: '#2a4060', fontSize: 11, padding: '8px 4px', lineHeight: 1.5 }}>
              Koi purani chat nahi mili.<br/>
              <span style={{ color: '#1a3050', fontSize: 10 }}>Pehli chat ke baad yahan dikhegi.</span>
            </div>
          )}

          {!loading && chats.map(c => {
            const isCurrent = c.id === currentChatId;
            return (
              <button
                key={c.id}
                onClick={() => handleLoadChat(c.id)}
                style={{
                  width: '100%', padding: '9px 10px', borderRadius: 9, marginBottom: 3,
                  background: isCurrent ? 'rgba(0,229,255,.08)' : 'rgba(255,255,255,.03)',
                  border: isCurrent ? '1px solid rgba(0,229,255,.2)' : '1px solid rgba(255,255,255,.05)',
                  color: '#8ab4cc', cursor: 'pointer', textAlign: 'left',
                  transition: 'all .15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: '#3a6080' }}>{timeAgo(c.ts)}</span>
                  <span style={{ fontSize: 9, color: '#1e3a50' }}>{c.msgCount} msgs</span>
                </div>
                <div style={{ fontSize: 12, color: isCurrent ? '#00d4ff' : '#7aaabf', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                  {c.preview}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,.04)', fontSize: 9, color: '#0e2030', textAlign: 'center' }}>
          JARVIS · ₹0 Forever 🔒
        </div>
      </div>
    </>
  );
}
