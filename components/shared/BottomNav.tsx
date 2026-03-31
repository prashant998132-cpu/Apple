'use client';
import { usePathname, useRouter } from 'next/navigation';

const TABS = [
  { href: '/',         icon: '⚡', label: 'JARVIS'   },
  { href: '/tools',    icon: '🧮', label: 'Tools'    },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
  { href: '/voice',    icon: '🎙️', label: 'Voice'  },
  { href: '/india',    icon: '🇮🇳', label: 'India'   },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router   = useRouter();
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      display: 'flex', alignItems: 'stretch',
      background: 'rgba(4,8,20,0.96)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {TABS.map(({ href, icon, label }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href));
        return (
          <button key={href} onClick={() => router.push(href)} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '3px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            position: 'relative', transition: 'transform .15s',
            transform: active ? 'scale(1.1)' : 'scale(1)',
          }}>
            {active && (
              <span style={{
                position: 'absolute', top: 0, left: '15%', right: '15%',
                height: '2px', background: '#00e5ff', borderRadius: '0 0 3px 3px',
              }} />
            )}
            <span style={{ fontSize: active ? '22px' : '20px', lineHeight: 1 }}>{icon}</span>
            <span style={{
              fontSize: '9px', fontWeight: active ? 700 : 400,
              color: active ? '#00e5ff' : 'rgba(255,255,255,0.38)',
              letterSpacing: '.03em', whiteSpace: 'nowrap',
            }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
