'use client';
import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'error';
  onDismiss?: () => void;
}

export default function Toast({ message, type = 'info', onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);
  const colors = { info: '#00e5ff', success: '#00e676', error: '#ff4444' };

  // Auto dismiss after 4 seconds
  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss?.(), 300); // wait for fade out
    }, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  };

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', bottom: 90, left: '50%',
        transform: 'translateX(-50%)',
        background: '#0a1628',
        border: `1px solid ${colors[type]}`,
        color: colors[type],
        padding: '10px 20px',
        borderRadius: 20, fontSize: 13, zIndex: 10000,
        whiteSpace: 'nowrap',
        boxShadow: `0 0 20px ${colors[type]}40`,
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {message} <span style={{ opacity: 0.5, fontSize: 10, marginLeft: 6 }}>✕</span>
    </div>
  );
}
