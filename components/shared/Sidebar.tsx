'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const NAV_ITEMS = [
  { href: '/',         icon: '⚡', label: 'JARVIS',   color: '#60a5fa' },
  { href: '/luna',     icon: '🌸', label: 'LUNA',     color: '#f9a8d4' },
  { href: '/era',      icon: '💗', label: 'Era',      color: '#fb7185' },
  { href: '/india',    icon: '🇮🇳', label: 'India',   color: '#f97316' },
  { href: '/tools',    icon: '🧮', label: 'Tools',    color: '#a78bfa' },
  { href: '/study',    icon: '📚', label: 'Study',    color: '#34d399' },
  { href: '/target',   icon: '🎯', label: 'Goals',    color: '#fbbf24' },
  { href: '/voice',    icon: '🎙️', label: 'Voice',   color: '#60a5fa' },
  { href: '/settings', icon: '⚙️', label: 'Settings', color: '#94a3b8' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 9990, backdropFilter: 'blur(4px)',
      }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px',
        background: 'rgba(8,8,22,0.98)', zIndex: 9991,
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', padding: '0',
        boxShadow: '4px 0 30px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 18px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#60a5fa' }}>⚡ JARVIS Menu</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>AI ASSISTANT</div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px',
            color: 'rgba(255,255,255,0.6)', fontSize: '16px', cursor: 'pointer',
            width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          {NAV_ITEMS.map(({ href, icon, label, color }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <button key={href} onClick={() => { router.push(href); onClose(); }} style={{
                width: '100%', padding: '11px 14px', marginBottom: '4px',
                background: active ? 'rgba(96,165,250,0.12)' : 'transparent',
                border: active ? '1px solid rgba(96,165,250,0.25)' : '1px solid transparent',
                borderRadius: '10px', color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                textAlign: 'left', transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: '18px', width: '22px', textAlign: 'center' }}>{icon}</span>
                <span style={{ fontWeight: active ? 600 : 400, color: active ? color : 'inherit' }}>{label}</span>
                {active && <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: color }} />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.07)',
          fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
          JARVIS · ₹0 Forever · "Bahar se iPhone, andar se Iron Man" 🤖
        </div>
      </div>
    </>
  );
}
