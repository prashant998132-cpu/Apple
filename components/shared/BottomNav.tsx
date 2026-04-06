'use client';
import { useRouter, usePathname } from 'next/navigation';

// Pages with their own full-screen layout — BottomNav hidden here
const HIDDEN_ON = ['/', '/luna', '/era', '/orb', '/voice'];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(3,8,16,0.96)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(0,229,255,0.07)',
      height: 'calc(52px + env(safe-area-inset-bottom, 0px))',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      gap: '8px',
    }}>
      <button
        onClick={() => router.push('/')}
        style={{
          background: 'rgba(0,229,255,0.07)',
          border: '1px solid rgba(0,229,255,0.15)',
          borderRadius: '20px', padding: '7px 22px',
          color: '#00e5ff', fontSize: '13px', fontWeight: 800,
          cursor: 'pointer', letterSpacing: '1px',
          display: 'flex', alignItems: 'center', gap: '6px',
          fontFamily: 'inherit', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,229,255,0.12)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,229,255,0.07)'; }}
      >
        <span style={{ fontSize: '16px' }}>⚡</span> JARVIS
      </button>
    </nav>
  );
}
