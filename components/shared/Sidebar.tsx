'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const ITEMS = [
  { href: '/',          icon: '⚡', label: 'JARVIS',     color: '#00e5ff',  cat: 'core' },
  { href: '/luna',      icon: '🌸', label: 'LUNA',       color: '#f9a8d4',  cat: 'core' },
  { href: '/era',       icon: '💗', label: 'Era',        color: '#fb7185',  cat: 'core' },
  { href: '/dashboard', icon: '📊', label: 'Dashboard',  color: '#60a5fa',  cat: 'life' },
  { href: '/brief',     icon: '📰', label: 'Brief',      color: '#ffd600',  cat: 'life' },
  { href: '/mood',      icon: '😊', label: 'Mood',       color: '#a78bfa',  cat: 'life' },
  { href: '/health',    icon: '🏥', label: 'Health',     color: '#00e676',  cat: 'life' },
  { href: '/finance',   icon: '💰', label: 'Finance',    color: '#ffd600',  cat: 'life' },
  { href: '/target',    icon: '🎯', label: 'Goals',      color: '#fbbf24',  cat: 'life' },
  { href: '/notes',     icon: '📝', label: 'Notes',      color: '#34d399',  cat: 'tools' },
  { href: '/timer',     icon: '⏱️', label: 'Timer',      color: '#f87171',  cat: 'tools' },
  { href: '/write',     icon: '✍️', label: 'Write',      color: '#40c4ff',  cat: 'tools' },
  { href: '/study',     icon: '📚', label: 'Study',      color: '#34d399',  cat: 'tools' },
  { href: '/tools',     icon: '🧮', label: 'Tools',      color: '#a78bfa',  cat: 'tools' },
  { href: '/india',     icon: '🇮🇳', label: 'India',     color: '#f97316',  cat: 'tools' },
  { href: '/voice',     icon: '🎙️', label: 'Voice',     color: '#60a5fa',  cat: 'tools' },
  { href: '/image',     icon: '🎨', label: 'Image',      color: '#f472b6',  cat: 'tools' },
  { href: '/orb',       icon: '🌐', label: 'Orb',        color: '#7c3aed',  cat: 'tools' },
  { href: '/xp',        icon: '🎮', label: 'XP',         color: '#ff9800',  cat: 'tools' },
  { href: '/settings',  icon: '⚙️', label: 'Settings',  color: '#94a3b8',  cat: 'system' },
];

const CATS: Record<string, string> = { core: 'CORE', life: 'LIFE OS', tools: 'TOOLS', system: 'SYSTEM' };

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
    ? ITEMS.filter(i => i.label.toLowerCase().includes(q.toLowerCase()))
    : null;

  // Group by category when not searching
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
      <button
        onClick={() => { router.push(item.href); onClose(); }}
        style={{
          width: '100%', padding: '9px 12px', marginBottom: '2px',
          background: active ? `rgba(0,229,255,0.07)` : 'transparent',
          border: active ? '1px solid rgba(0,229,255,0.15)' : '1px solid transparent',
          borderRadius: '9px', color: active ? '#fff' : 'rgba(255,255,255,0.6)',
          fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
          textAlign: 'left', transition: 'all .12s', fontFamily: 'inherit',
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        <span style={{ fontSize: '16px', width: '20px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
        <span style={{ fontWeight: active ? 700 : 400, color: active ? item.color : 'inherit', flex: 1 }}>{item.label}</span>
        {active && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />}
      </button>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        zIndex: 9990, backdropFilter: 'blur(6px)',
      }} />
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px',
        background: 'rgba(4,8,18,0.99)', zIndex: 9991,
        borderRight: '1px solid rgba(0,229,255,0.07)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '6px 0 40px rgba(0,0,0,0.6)',
        animation: 'slideIn 0.18s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(-100%) } to { transform: translateX(0) } }`}</style>

        {/* Header */}
        <div style={{
          padding: '16px 14px 12px',
          borderBottom: '1px solid rgba(0,229,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#00e5ff', letterSpacing: '1.5px' }}>⚡ JARVIS</div>
            <div style={{ fontSize: '9px', color: '#1e4060', letterSpacing: '2.5px', marginTop: '2px' }}>LIFE OS v11</div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '14px',
            cursor: 'pointer', width: '30px', height: '30px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
          }}>✕</button>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 12px 6px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#1e4060' }}>🔍</span>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search pages..."
              style={{
                width: '100%', background: 'rgba(0,229,255,0.04)',
                border: '1px solid rgba(0,229,255,0.08)', borderRadius: '8px',
                color: '#ddeeff', padding: '7px 10px 7px 28px', fontSize: '12px',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
          {filtered ? (
            filtered.length > 0
              ? filtered.map(item => <NavBtn key={item.href} item={item} />)
              : <div style={{ fontSize: '12px', color: '#1e4060', padding: '12px', textAlign: 'center' }}>Koi page nahi mila</div>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '9px', color: '#1e4060', letterSpacing: '2px', padding: '6px 12px 4px', fontWeight: 700 }}>
                  {CATS[cat]}
                </div>
                {items.map(item => <NavBtn key={item.href} item={item} />)}
              </div>
            ))
          )}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '10px 14px 14px', borderTop: '1px solid rgba(0,229,255,0.05)',
          fontSize: '9px', color: 'rgba(255,255,255,0.12)', textAlign: 'center', letterSpacing: '1px',
        }}>
          JARVIS Life OS · Ctrl+K to open · ₹0 Forever
        </div>
      </div>
    </>
  );
}
