'use client';
// components/shared/Toast.tsx
export default function Toast({ message, type = 'info' }: { message: string; type?: 'info' | 'success' | 'error' }) {
  const colors = { info: '#00e5ff', success: '#00e676', error: '#ff4444' };
  return (
    <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#0a1628', border: `1px solid ${colors[type]}`, color: colors[type], padding: '10px 18px', borderRadius: 20, fontSize: 13, zIndex: 100, whiteSpace: 'nowrap', boxShadow: `0 0 20px ${colors[type]}40`, animation: 'fadeIn .2s ease' }}>
      {message}
    </div>
  );
}
