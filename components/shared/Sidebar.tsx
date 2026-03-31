'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ITEMS = [
  { href: '/',         icon: '⚡', label: 'JARVIS',   color: '#00e5ff' },
  { href: '/luna',     icon: '🌸', label: 'LUNA',     color: '#f9a8d4' },
  { href: '/era',      icon: '💗', label: 'Era',      color: '#fb7185' },
  { href: '/india',    icon: '🇮🇳', label: 'India',   color: '#f97316' },
  { href: '/tools',    icon: '🧮', label: 'Tools',    color: '#a78bfa' },
  { href: '/study',    icon: '📚', label: 'Study',    color: '#34d399' },
  { href: '/target',   icon: '🎯', label: 'Goals',    color: '#fbbf24' },
  { href: '/voice',    icon: '🎙️', label: 'Voice',   color: '#60a5fa' },
  { href: '/settings', icon: '⚙️', label: 'Settings', color: '#94a3b8' },
];

interface SidebarProps { isOpen: boolean; onClose: () => void; }

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        zIndex: 9990, backdropFilter: 'blur(4px)',
      }} />
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px',
        background: 'rgba(4,8,20,0.98)', zIndex: 9991,
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 30px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          padding: '18px 16px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#00e5ff', letterSpacing: '1px' }}>⚡ JARVIS</div>
            <div style={{ fontSize: '9px', color: '#4fc3f7', letterSpacing: '2px', marginTop: '2px' }}>AI ASSISTANT</div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px',
            color: 'rgba(255,255,255,0.5)', fontSize: '16px', cursor: 'pointer',
            width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          {ITEMS.map(({ href, icon, label, color }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <button key={href} onClick={() => { router.push(href); onClose(); }} style={{
                width: '100%', padding: '10px 14px', marginBottom: '3px',
                background: active ? 'rgba(0,229,255,0.08)' : 'transparent',
                border: active ? '1px solid rgba(0,229,255,0.2)' : '1px solid transparent',
                borderRadius: '10px', color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                textAlign: 'left', transition: 'all .15s',
              }}>
                <span style={{ fontSize: '18px', width: '22px', textAlign: 'center' }}>{icon}</span>
                <span style={{ fontWeight: active ? 700 : 400, color: active ? color : 'inherit' }}>{label}</span>
                {active && <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: color }} />}
              </button>
            );
          })}
        </nav>

        <div style={{
          padding: '10px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.07)',
          fontSize: '10px', color: 'rgba(255,255,255,0.18)', textAlign: 'center',
        }}>
          JARVIS · ₹0 Forever 🤖
        </div>
      </div>
    </>
  );
}
