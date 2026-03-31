'use client';
import { useState, useRef, useCallback } from 'react';

interface Props { onSend: (msg: string, file?: File) => void; isLoading?: boolean; placeholder?: string; }

const QUICK = [
  { label: '🖼️ Image', cmd: '/image ' },
  { label: '🔢 Calc',  cmd: '/calc '  },
  { label: '📱 QR',    cmd: '/qr '    },
  { label: '🔐 Password', cmd: '/password' },
];

export default function InputBar({ onSend, isLoading, placeholder }: Props) {
  const [text, setText] = useState('');
  const [popup, setPopup] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  const submit = useCallback(() => {
    const msg = text.trim();
    if (!msg && !file) return;
    if (isLoading) return;
    onSend(msg, file || undefined);
    setText(''); setFile(null); setPreview(null);
  }, [text, file, isLoading, onSend]);

  const openPopup = () => {
    setPopup(true);
    setTimeout(() => { document.addEventListener('click', () => setPopup(false), { once: true }); }, 80);
  };

  const applyQuick = (cmd: string) => {
    let cur = text;
    if (cur.startsWith('/')) {
      const idx = cur.indexOf(' ');
      cur = idx >= 0 ? cur.slice(idx + 1) : '';
    }
    setText(cmd + cur);
  };

  return (
    <div style={{ padding: '6px 12px 12px', background: '#030a14', borderTop: '1px solid #1a3a5a' }}>
      {file && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(255,255,255,0.06)', borderRadius: '10px',
          padding: '7px 12px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {preview && <img src={preview} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />}
          {!preview && <span style={{ fontSize: 20 }}>📎</span>}
          <span style={{ flex: 1, fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
          <button onClick={() => { setFile(null); setPreview(null); }} style={{
            background: 'rgba(248,113,113,0.2)', border: 'none', borderRadius: '6px',
            color: '#f87171', fontSize: '13px', cursor: 'pointer', padding: '3px 8px',
          }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
        {QUICK.map(a => (
          <button key={a.cmd} onClick={() => applyQuick(a.cmd)} style={{
            flexShrink: 0, padding: '5px 11px', background: '#0a1628',
            border: '1px solid #1a3a5a', borderRadius: '18px',
            color: '#e0f0ff', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>{a.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0a1628', borderRadius: '28px', padding: '6px 8px 6px 14px', border: '1.5px solid #1a3a5a' }}>
        <div style={{ position: 'relative' }}>
          <button onClick={openPopup} style={{
            width: 34, height: 34, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
            fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>＋</button>
          {popup && (
            <div style={{
              position: 'fixed', bottom: 'calc(72px + env(safe-area-inset-bottom,0px))',
              left: '10px', zIndex: 99999,
              background: 'rgba(4,14,26,0.98)', border: '1px solid #1a3a5a',
              borderRadius: '14px', padding: '8px', minWidth: '170px',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.6)',
            }} onClick={e => e.stopPropagation()}>
              <button onClick={() => { photoRef.current?.click(); }} style={{
                width: '100%', padding: '10px 14px', background: 'transparent', border: 'none',
                borderRadius: '10px', color: '#e0f0ff', fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
              }}><span style={{ fontSize: '18px' }}>📷</span> Photo / Camera</button>
              <button onClick={() => { fileRef.current?.click(); }} style={{
                width: '100%', padding: '10px 14px', background: 'transparent', border: 'none',
                borderRadius: '10px', color: '#e0f0ff', fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
              }}><span style={{ fontSize: '18px' }}>📎</span> File / Document</button>
            </div>
          )}
        </div>

        <input
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={placeholder || 'Kuch bhi poocho, /calc, /qr...'}
          style={{
            flex: 1, border: 'none', background: 'transparent', outline: 'none',
            fontSize: '14px', color: '#e0f0ff', fontFamily: 'inherit',
          }}
        />
        <button onClick={submit} disabled={(!text.trim() && !file) || !!isLoading} style={{
          width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
          background: (!text.trim() && !file) || isLoading ? '#1a3a5a' : 'linear-gradient(135deg,#0077ff,#00bcd4)',
          color: (!text.trim() && !file) || isLoading ? '#888' : '#fff',
          fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isLoading ? '⏳' : '➤'}
        </button>
      </div>

      <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => { const f=e.target.files?.[0]; if(f){ setFile(f); setPreview(URL.createObjectURL(f)); setPopup(false); }}} />
      <input ref={fileRef} type="file" accept="*/*" style={{ display: 'none' }}
        onChange={e => { const f=e.target.files?.[0]; if(f){ setFile(f); setPreview(null); setPopup(false); }}} />
    </div>
  );
}
