'use client';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/',         icon: '⚡', label: 'JARVIS'    },
  { href: '/india',    icon: '🇮🇳', label: 'India'    },
  { href: '/tools',    icon: '🧮', label: 'Tools'     },
  { href: '/settings', icon: '⚙️', label: 'Settings'  },
  { href: '/voice',    icon: '🎙️', label: 'Voice'    },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      display: 'flex', alignItems: 'stretch',
      background: 'rgba(8,8,20,0.95)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
    }}>
      {NAV.map(({ href, icon, label }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href));
        return (
          <button key={href} onClick={() => router.push(href)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '3px', background: 'transparent', border: 'none',
            cursor: 'pointer', padding: '6px 2px', position: 'relative',
            transition: 'transform 0.15s',
            transform: active ? 'scale(1.08)' : 'scale(1)',
          }}>
            {active && <span style={{
              position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px',
              background: '#60a5fa', borderRadius: '0 0 4px 4px',
            }} />}
            <span style={{ fontSize: active ? '22px' : '20px', lineHeight: 1 }}>{icon}</span>
            <span style={{
              fontSize: '9px', fontWeight: active ? 700 : 400,
              color: active ? '#60a5fa' : 'rgba(255,255,255,0.4)',
              letterSpacing: '0.03em', whiteSpace: 'nowrap',
            }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
