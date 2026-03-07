'use client';
// components/chat/TypingIndicator.tsx
export default function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'flex-start' }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(0,229,255,.08)', border: '1px solid rgba(0,229,255,.25)', color: '#00e5ff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, letterSpacing: 1, fontFamily: 'monospace' }}>JV</div>
      <div style={{ padding: '12px 16px', borderRadius: '13px 13px 13px 3px', background: 'linear-gradient(135deg,#060f22,#0a1a35)', border: '1px solid rgba(0,229,255,.1)', display: 'flex', gap: 5, alignItems: 'center' }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#00e5ff', animation: `bounce 1.2s ${delay}s ease-in-out infinite` }} />
        ))}
      </div>
    </div>
  );
}
