'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const NAV = [
  { id: 'chat',   href: '/',        label: 'Chat',   icon: (a:boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.2:1.7}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { id: 'target',   href: '/target',   label: 'Target',  icon: (a:boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.2:1.7}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
  { id: 'voice',    href: '/voice',    label: 'Voice',   icon: (a:boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.2:1.7}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> },
  { id: 'india',    href: '/india',    label: 'India',   icon: (a:boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.2:1.7}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/></svg> },
  { id: 'settings', href: '/settings', label: 'Settings',icon: (a:boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.2:1.7}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
];

interface ChatEntry { id: string; date: string; preview: string; }

function loadChats(): ChatEntry[] {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('jc_'));
    return keys.map(k => {
      const msgs = JSON.parse(localStorage.getItem(k) || '[]');
      const last = msgs.filter((m:any) => m.role === 'user').slice(-1)[0];
      return { id: k, date: k.replace('jc_chat_','').replace(/_/g,' '), preview: last?.content?.slice(0,40) || 'Empty chat' };
    }).reverse();
  } catch { return []; }
}

export default function Sidebar({ onNewChat }: { onNewChat?: () => void }) {
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<ChatEntry[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setChats(loadChats());
  }, [open]);

  const go = (href: string) => { setOpen(false); router.push(href); };

  const active = NAV.find(n => n.href === pathname)?.id || 'chat';

  return (
    <>
      {/* Hamburger button — always visible top-left */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: 10, left: 12, zIndex: 100,
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(0,229,255,.06)', border: '1px solid rgba(0,229,255,.12)',
          color: '#4a7096', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{ width: 14, height: 1.5, background: 'currentColor', borderRadius: 2, display: 'block' }}/>
        <span style={{ width: 14, height: 1.5, background: 'currentColor', borderRadius: 2, display: 'block' }}/>
        <span style={{ width: 10, height: 1.5, background: 'currentColor', borderRadius: 2, display: 'block', alignSelf: 'flex-start', marginLeft: 2 }}/>
      </button>

      {/* Overlay */}
      {open && (
        <div
          ref={overlayRef}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
            zIndex: 200, backdropFilter: 'blur(3px)',
          }}
        />
      )}

      {/* Sidebar panel */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 270,
        background: '#07101f', borderRight: '1px solid rgba(0,229,255,.08)',
        zIndex: 300, display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
        boxShadow: open ? '4px 0 40px rgba(0,0,0,.7)' : 'none',
      }}>
        {/* Top — Logo + close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,rgba(0,229,255,.15),rgba(109,40,217,.15))', border: '1px solid rgba(0,229,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#00e5ff', fontFamily: "'Space Mono',monospace" }}>J</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e8f4ff', letterSpacing: 3, fontFamily: "'Space Mono',monospace" }}>JARVIS</div>
              <div style={{ fontSize: 8, color: '#1a3050', letterSpacing: 1 }}>JARVIS v9.7</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', color: '#2a4060', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* New Chat button */}
        <div style={{ padding: '10px 12px 6px' }}>
          <button
            onClick={() => { setOpen(false); onNewChat?.(); }}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 10,
              background: 'linear-gradient(135deg,rgba(0,229,255,.08),rgba(109,40,217,.08))',
              border: '1px solid rgba(0,229,255,.15)', color: '#00e5ff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Naya Chat
          </button>
        </div>

        {/* Navigation */}
        <div style={{ padding: '6px 12px' }}>
          <div style={{ fontSize: 8, color: '#1a3050', letterSpacing: 1.5, padding: '4px 6px 6px', textTransform: 'uppercase' }}>Menu</div>
          {NAV.map(n => {
            const on = n.id === active;
            return (
              <button
                key={n.id}
                onClick={() => go(n.href)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 10px', borderRadius: 10, marginBottom: 2,
                  background: on ? 'rgba(0,229,255,.08)' : 'transparent',
                  border: on ? '1px solid rgba(0,229,255,.12)' : '1px solid transparent',
                  color: on ? '#00e5ff' : '#2a4060', cursor: 'pointer',
                  transition: 'all .15s', WebkitTapHighlightColor: 'transparent',
                  textAlign: 'left',
                }}
              >
                {n.icon(on)}
                <span style={{ fontSize: 13, fontWeight: on ? 600 : 400 }}>{n.label}</span>
                {on && <span style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: '#00e5ff', display: 'block' }}/>}
              </button>
            );
          })}
        </div>

        {/* Chat History */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
          {chats.length > 0 && (
            <>
              <div style={{ fontSize: 8, color: '#1a3050', letterSpacing: 1.5, padding: '8px 6px 6px', textTransform: 'uppercase' }}>Chat History</div>
              {chats.map(c => (
                <button
                  key={c.id}
                  onClick={() => go('/')}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8, marginBottom: 2,
                    background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.03)',
                    color: '#2a4060', cursor: 'pointer', textAlign: 'left',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{ fontSize: 10, color: '#1a3050', marginBottom: 2 }}>{c.date}</div>
                  <div style={{ fontSize: 11, color: '#2a5070', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.preview}</div>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Bottom — version */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,.04)', fontSize: 9, color: '#0e2030', textAlign: 'center' }}>
          JARVIS · ₹0 Forever
        </div>
      </div>
    </>
  );
}
