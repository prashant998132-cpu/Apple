'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

interface InputBarProps {
  onSend: (msg: string, file?: File) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const QUICK_ACTIONS = [
  { label: '🖼️ Image', cmd: '/image ' },
  { label: '📊 Calc',  cmd: '/calc '  },
  { label: '🔲 QR',    cmd: '/qr '    },
  { label: '🔑 Password', cmd: '/password' },
];

export default function InputBar({ onSend, isLoading, placeholder }: InputBarProps) {
  const [text, setText] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const textRef  = useRef<HTMLTextAreaElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  const submit = useCallback(() => {
    const msg = text.trim();
    if (!msg && !selectedFile) return;
    if (isLoading) return;
    onSend(msg, selectedFile || undefined);
    setText('');
    setSelectedFile(null);
    setPreview(null);
  }, [text, selectedFile, isLoading, onSend]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const openPopup = () => {
    setShowPopup(true);
    setTimeout(() => {
      document.addEventListener('click', closePopup, { once: true });
    }, 80);
  };

  const closePopup = () => setShowPopup(false);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelectedFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setShowPopup(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelectedFile(f);
    setPreview(null);
    setShowPopup(false);
  };

  const removeFile = () => { setSelectedFile(null); setPreview(null); };

  return (
    <div style={{ padding: '8px 12px 10px', background: 'transparent' }}>
      {/* File preview */}
      {selectedFile && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(255,255,255,0.07)', borderRadius: '10px',
          padding: '8px 12px', marginBottom: '8px',
          border: '1px solid rgba(255,255,255,0.12)',
        }}>
          {preview && <img src={preview} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />}
          {!preview && <span style={{ fontSize: 24 }}>📎</span>}
          <span style={{ flex: 1, fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedFile.name}
          </span>
          <button onClick={removeFile} style={{
            background: 'rgba(248,113,113,0.2)', border: 'none', borderRadius: '6px',
            color: '#f87171', fontSize: '14px', cursor: 'pointer', padding: '4px 8px',
          }}>✕</button>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
        {QUICK_ACTIONS.map(a => (
          <button key={a.cmd} onClick={() => setText(prev => a.cmd + prev.replace(prev.startsWith('/') ? /^/S+s*/ : '', ''))} style={{
            flexShrink: 0, padding: '5px 10px', background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px',
            color: '#cbd5e1', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>{a.label}</button>
        ))}
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', position: 'relative' }}>

        {/* + popup */}
        <div style={{ position: 'relative' }}>
          <button onClick={openPopup} style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.08)', color: '#94a3b8',
            fontSize: '22px', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>＋</button>

          {showPopup && (
            <div style={{
              position: 'fixed', bottom: 'calc(75px + env(safe-area-inset-bottom,0px))',
              left: '12px', zIndex: 99999,
              background: 'rgba(15,15,30,0.98)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '14px', padding: '8px', minWidth: '180px',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
            }} onClick={e => e.stopPropagation()}>
              {/* Photo */}
              <button onClick={() => photoRef.current?.click()} style={{
                width: '100%', padding: '11px 14px', background: 'transparent',
                border: 'none', borderRadius: '10px', color: '#e2e8f0',
                fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                textAlign: 'left',
              }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.08)')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <span style={{ fontSize: '20px' }}>📷</span> Photo / Camera
              </button>

              {/* File */}
              <button onClick={() => fileRef.current?.click()} style={{
                width: '100%', padding: '11px 14px', background: 'transparent',
                border: 'none', borderRadius: '10px', color: '#e2e8f0',
                fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                textAlign: 'left',
              }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.08)')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <span style={{ fontSize: '20px' }}>📎</span> File / Document
              </button>
            </div>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder || 'Kuch bhi poocho, /calc, /qr...'}
          rows={1}
          style={{
            flex: 1, padding: '11px 14px', background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: '22px',
            color: '#fff', fontSize: '15px', outline: 'none', resize: 'none',
            fontFamily: 'inherit', lineHeight: '1.4', maxHeight: '120px',
            overflowY: 'auto',
          }}
          onInput={e => {
            const t = e.currentTarget;
            t.style.height = 'auto';
            t.style.height = Math.min(t.scrollHeight, 120) + 'px';
          }}
        />

        {/* Send */}
        <button onClick={submit} disabled={(!text.trim() && !selectedFile) || isLoading} style={{
          width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
          background: (!text.trim() && !selectedFile) || isLoading
            ? 'rgba(255,255,255,0.1)'
            : 'linear-gradient(135deg,#3b82f6,#2563eb)',
          color: '#fff', fontSize: '18px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}>
          {isLoading ? '⏳' : '▶'}
        </button>
      </div>

      {/* Hidden inputs */}
      <input ref={photoRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={handlePhoto} />
      <input ref={fileRef} type="file" accept="*/*"
        style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}
