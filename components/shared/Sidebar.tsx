'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const ITEMS = [
  // Core AI
  { href: '/',          icon: '⚡', label: 'JARVIS',     color: '#00e5ff',  cat: 'core' },
  { href: '/luna',      icon: '🌸', label: 'LUNA',       color: '#f9a8d4',  cat: 'core' },
  { href: '/era',       icon: '💗', label: 'Era',        color: '#fb7185',  cat: 'core' },
  // Life OS
  { href: '/dashboard', icon: '📊', label: 'Dashboard',  color: '#60a5fa',  cat: 'life' },
  { href: '/brief',     icon: '📰', label: 'Daily Brief', color: '#ffd600', cat: 'life' },
  { href: '/mood',      icon: '😊', label: 'Mood',        color: '#a78bfa',  cat: 'life' },
  { href: '/habits',    icon: '💪', label: 'Habits',      color: '#34d399',  cat: 'life' },
  { href: '/target',    icon: '🎯', label: 'Goals',       color: '#fbbf24',  cat: 'life' },
  { href: '/health',    icon: '🏥', label: 'Health',      color: '#00e676',  cat: 'life' },
  { href: '/finance',   icon: '💰', label: 'Finance',     color: '#ffd600',  cat: 'life' },
  { href: '/xp',        icon: '🎮', label: 'XP',          color: '#ff9800',  cat: 'life' },
  // Tools
  { href: '/todo',      icon: '✅', label: 'Todo',        color: '#34d399',  cat: 'tools' },
  { href: '/notes',     icon: '📝', label: 'Notes',       color: '#60a5fa',  cat: 'tools' },
  { href: '/timer',     icon: '⏱️', label: 'Pomodoro',   color: '#f87171',  cat: 'tools' },
  { href: '/focus',     icon: '🎯', label: 'Focus',       color: '#a78bfa',  cat: 'tools' },
  { href: '/calculator',icon: '🔢', label: 'Calculator',  color: '#00e5ff',  cat: 'tools' },
  { href: '/qr',        icon: '📱', label: 'QR Code',     color: '#34d399',  cat: 'tools' },
  { href: '/write',     icon: '✍️', label: 'Write',       color: '#40c4ff',  cat: 'tools' },
  { href: '/study',     icon: '📚', label: 'Study',       color: '#34d399',  cat: 'tools' },
  { href: '/india',     icon: '🇮🇳', label: 'India',     color: '#f97316',  cat: 'tools' },
  // Create
  { href: '/image',     icon: '🎨', label: 'Image AI',    color: '#f472b6',  cat: 'create' },
  { href: '/voice',     icon: '🎙️', label: 'Voice',      color: '#60a5fa',  cat: 'create' },
  { href: '/orb',       icon: '🌐', label: 'Orb',         color: '#7c3aed',  cat: 'create' },
  // System
  { href: '/settings',  icon: '⚙️', label: 'Settings',   color: '#94a3b8',  cat: 'system' },
];

const CATS: Record<string, string> = {
  core: '✦ CORE AI',
  life: '◈ LIFE OS',
  tools: '▣ TOOLS',
  create: '◎ CREATE',
  system: '◉ SYSTEM',
};

interface SidebarProps { isOpen: boolean; onClose: () => void; }

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [q, setQ] = useState('');

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (!isOpen) setQ('');
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = q.trim()
    ? ITEMS.filter(i => i.label.toLowerCase().includes(q.toLowerCase()) || i.href.includes(q.toLowerCase()))
    : null;

  const grouped: Record<string, typeof ITEMS> = {};
  if (!filtered) {
    for (const item of ITEMS) {
      if (!grouped[item.cat]) grouped[item.cat] = [];
      grouped[item.cat].push(item);
    }
  }

  function NavBtn({ item }: { item: typeof ITEMS[0] }) {
    const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
    return (
      <button onClick={() => { router.push(item.href); onClose(); }}
        style={{
          width: '100%', padding: '8px 11px', marginBottom: '1px',
          background: active ? 'rgba(0,229,255,0.07)' : 'transparent',
          border: active ? '1px solid rgba(0,229,255,0.12)' : '1px solid transparent',
          borderRadius: '8px', color: active ? '#fff' : 'rgba(255,255,255,0.5)',
          fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '9px',
          textAlign: 'left', transition: 'all .12s', fontFamily: 'inherit',
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        <span style={{ fontSize: '15px', width: '18px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
        <span style={{ fontWeight: active ? 700 : 400, color: active ? item.color : 'inherit', flex: 1, letterSpacing: active ? '0.2px' : 0 }}>{item.label}</span>
        {active && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />}
      </button>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9990, backdropFilter: 'blur(8px)' }} />
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '256px',
        background: 'rgba(3,6,14,0.99)', zIndex: 9991,
        borderRight: '1px solid rgba(0,229,255,0.06)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '8px 0 40px rgba(0,0,0,0.7)',
        animation: 'slideIn 0.18s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(-100%) } to { transform: translateX(0) } }`}</style>

        {/* Header */}
        <div style={{ padding: '15px 13px 11px', borderBottom: '1px solid rgba(0,229,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 900, color: '#00e5ff', letterSpacing: '2px' }}>⚡ JARVIS</div>
            <div style={{ fontSize: '9px', color: '#0e2030', letterSpacing: '3px', marginTop: '2px' }}>LIFE OS v11</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '7px', color: 'rgba(255,255,255,0.3)', fontSize: '13px', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', flexShrink: 0 }}>✕</button>
        </div>

        {/* Search */}
        <div style={{ padding: '9px 10px 5px', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#1e3248', pointerEvents: 'none' }}>🔍</span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search pages..."
              style={{ width: '100%', background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.07)', borderRadius: '7px', color: '#ddeeff', padding: '6px 8px 6px 26px', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }} />
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 7px 8px' }}>
          {filtered ? (
            filtered.length > 0 ? filtered.map(item => <NavBtn key={item.href} item={item} />) :
              <div style={{ fontSize: '12px', color: '#1e3248', padding: '14px', textAlign: 'center' }}>Koi page nahi mila</div>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '8px', color: '#0e2030', letterSpacing: '2.5px', padding: '7px 11px 3px', fontWeight: 700 }}>{CATS[cat]}</div>
                {items.map(item => <NavBtn key={item.href} item={item} />)}
              </div>
            ))
          )}
        </nav>

        {/* Footer */}
        <div style={{ padding: '8px 13px 12px', borderTop: '1px solid rgba(0,229,255,0.04)', fontSize: '9px', color: '#0a1828', textAlign: 'center', letterSpacing: '1px', flexShrink: 0 }}>
          JARVIS · {ITEMS.length} pages · ₹0 Forever
        </div>
      </div>
    </>
  );
}
