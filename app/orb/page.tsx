'use client';
import { useRouter } from 'next/navigation';

export default function OrbPage() {
  const router = useRouter();
  return (
    <div style={{
      minHeight: '100dvh', background: '#040e1a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#e0f0ff', gap: '16px',
    }}>
      <div style={{ fontSize: '64px' }}>🔵</div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: '#00e5ff' }}>JARVIS ORB</div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Coming soon...</div>
      <button
        onClick={() => router.push('/')}
        style={{
          marginTop: '8px', background: 'none',
          border: '1px solid #00e5ff', borderRadius: '8px',
          color: '#00e5ff', fontSize: '14px',
          padding: '8px 20px', cursor: 'pointer',
        }}
      >
        ← Back to JARVIS
      </button>
    </div>
  );
}
