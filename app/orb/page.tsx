'use client';
// app/orb/page.tsx — placeholder (full Orb coming later)
export default function OrbPage() {
  return (
    <div style={{
      minHeight: '100dvh', background: '#0a0a14', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontFamily: 'monospace', gap: '16px',
    }}>
      <div style={{ fontSize: '64px' }}>🔵</div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: '#60a5fa' }}>JARVIS ORB</div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Coming soon...</div>
      <a href="/" style={{ marginTop: '8px', color: '#60a5fa', fontSize: '14px' }}>← Back to JARVIS</a>
    </div>
  );
}
