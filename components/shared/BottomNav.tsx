'use client';
import { useRouter } from 'next/navigation';

export default function BottomNav() {
  const router = useRouter();
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(3,10,20,0.96)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(26,58,90,0.8)',
      height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      gap: '8px',
    }}>
      <button
        onClick={() => router.push('/')}
        style={{
          background: 'linear-gradient(135deg,#0077ff22,#00bcd422)',
          border: '1px solid rgba(0,229,255,0.25)',
          borderRadius: '20px', padding: '8px 24px',
          color: '#00e5ff', fontSize: '14px', fontWeight: 800,
          cursor: 'pointer', letterSpacing: '1px',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}
      >
        <span style={{ fontSize: '18px' }}>⚡</span> JARVIS
      </button>
    </nav>
  );
}
