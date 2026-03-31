'use client';
import { useRouter } from 'next/navigation';

export default function OrbPage() {
  const router = useRouter();
  return (
    <div style={{
      minHeight: '100dvh', background: '#0a0a14',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#fff', gap: '16px',
    }}>
      <div style={{ fontSize: '64px' }}>🔵</div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: '#60a5fa' }}>JARVIS ORB</div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Coming soon...</div>
      <button
        onClick={() => router.push('/')}
        style={{
          marginTop: '8px', background: 'none', border: '1px solid #60a5fa',
          borderRadius: '8px', color: '#60a5fa', fontSize: '14px',
          padding: '8px 20px', cursor: 'pointer',
        }}
      >
        ← Back to JARVIS
      </button>
    </div>
  );
}
