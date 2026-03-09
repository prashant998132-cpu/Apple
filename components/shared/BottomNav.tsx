'use client';
import { usePathname, useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/',        icon: '🤖', label: 'Chat'    },
  { href: '/study',   icon: '📚', label: 'Study'   },
  { href: '/tools',   icon: '🧮', label: 'Tools'   },
  { href: '/target',  icon: '🎯', label: 'Goals'   },
  { href: '/voice',   icon: '🎙️', label: 'Voice'  },
  { href: '/india',   icon: '🇮🇳', label: 'India'  },
  { href: '/settings',icon: '⚙️', label: 'Settings'},
];

export default function BottomNav() {
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'stretch',
        background: 'rgba(10,10,20,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {NAV_ITEMS.map(({ href, icon, label }) => {
        const active = pathname === href;
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 2px',
              transition: 'transform 0.12s',
              transform: active ? 'scale(1.12)' : 'scale(1)',
            }}
          >
            <span style={{ fontSize: active ? '20px' : '18px', lineHeight: 1 }}>
              {icon}
            </span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: active ? 700 : 400,
                color: active ? '#60a5fa' : 'rgba(255,255,255,0.45)',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
            {active && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0px)',
                  width: '32px',
                  height: '2px',
                  background: '#60a5fa',
                  borderRadius: '2px 2px 0 0',
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
