'use client';
import { useState, useRef, useCallback } from 'react';

interface InputBarProps {
  onSend: (msg: string, file?: File) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const QUICK = [
  { label: '🖼️ Image',    cmd: '/image '    },
  { label: '📊 Calc',     cmd: '/calc '     },
  { label: '🔲 QR',       cmd: '/qr '       },
  { label: '🔑 Password', cmd: '/password'  },
];

export default function InputBar({ onSend, isLoading, placeholder }: InputBarProps) {
  const [text, setText] = useState('');
  const [showPopup, setShowPopup] = useState(false);
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

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const openPopup = () => {
    setShowPopup(true);
    setTimeout(() => { document.addEventListener('click', () => setShowPopup(false), { once: true }); }, 80);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setFile(f); setPreview(URL.createObjectURL(f)); setShowPopup(false);
  };
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setFile(f); setPreview(null); setShowPopup(false);
  };

  // Safe quick action handler — no inline regex
  const applyQuick = (cmd: string) => {
    let current = text;
    if (current.startsWith('/')) {
      const spaceIdx = current.indexOf(' ');
      current = spaceIdx >= 0 ? current.slice(spaceIdx + 1) : '';
    }
    setText(cmd + current);
  };

  return (
    <div style={{ padding: '8px 12px 10px' }}>
      {file && (
        <div style={{ display:'flex', alignItems:'center', gap:'10px', background:'rgba(255,255,255,0.07)',
          borderRadius:'10px', padding:'8px 12px', marginBottom:'8px', border:'1px solid rgba(255,255,255,0.12)' }}>
          {preview && <img src={preview} alt="" style={{ width:40, height:40, borderRadius:6, objectFit:'cover' }} />}
          {!preview && <span style={{ fontSize:24 }}>📎</span>}
          <span style={{ flex:1, fontSize:12, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {file.name}
          </span>
          <button onClick={() => { setFile(null); setPreview(null); }} style={{
            background:'rgba(248,113,113,0.2)', border:'none', borderRadius:'6px',
            color:'#f87171', fontSize:'14px', cursor:'pointer', padding:'4px 8px',
          }}>✕</button>
        </div>
      )}

      <div style={{ display:'flex', gap:'6px', marginBottom:'8px', overflowX:'auto', paddingBottom:'2px' }}>
        {QUICK.map(a => (
          <button key={a.cmd} onClick={() => applyQuick(a.cmd)} style={{
            flexShrink:0, padding:'5px 10px', background:'rgba(255,255,255,0.07)',
            border:'1px solid rgba(255,255,255,0.12)', borderRadius:'20px',
            color:'#cbd5e1', fontSize:'12px', cursor:'pointer', whiteSpace:'nowrap',
          }}>{a.label}</button>
        ))}
      </div>

      <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', position:'relative' }}>
        <div style={{ position:'relative' }}>
          <button onClick={openPopup} style={{
            width:42, height:42, borderRadius:'50%', border:'none',
            background:'rgba(255,255,255,0.08)', color:'#94a3b8',
            fontSize:'22px', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>＋</button>

          {showPopup && (
            <div style={{
              position:'fixed', bottom:'calc(75px + env(safe-area-inset-bottom,0px))',
              left:'12px', zIndex:99999,
              background:'rgba(15,15,30,0.98)', border:'1px solid rgba(255,255,255,0.15)',
              borderRadius:'14px', padding:'8px', minWidth:'180px',
              boxShadow:'0 -8px 32px rgba(0,0,0,0.5)',
            }} onClick={e => e.stopPropagation()}>
              <button onClick={() => photoRef.current?.click()} style={{
                width:'100%', padding:'11px 14px', background:'transparent',
                border:'none', borderRadius:'10px', color:'#e2e8f0', fontSize:'14px',
                cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', textAlign:'left',
              }}>
                <span style={{ fontSize:'20px' }}>📷</span> Photo / Camera
              </button>
              <button onClick={() => fileRef.current?.click()} style={{
                width:'100%', padding:'11px 14px', background:'transparent',
                border:'none', borderRadius:'10px', color:'#e2e8f0', fontSize:'14px',
                cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', textAlign:'left',
              }}>
                <span style={{ fontSize:'20px' }}>📎</span> File / Document
              </button>
            </div>
          )}
        </div>

        <textarea
          value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey}
          placeholder={placeholder || 'Kuch bhi poocho, /calc, /qr...'}
          rows={1}
          style={{
            flex:1, padding:'11px 14px', background:'rgba(255,255,255,0.07)',
            border:'1px solid rgba(255,255,255,0.12)', borderRadius:'22px',
            color:'#fff', fontSize:'15px', outline:'none', resize:'none',
            fontFamily:'inherit', lineHeight:'1.4', maxHeight:'120px', overflowY:'auto',
          }}
          onInput={e => {
            const t = e.currentTarget;
            t.style.height = 'auto';
            t.style.height = Math.min(t.scrollHeight, 120) + 'px';
          }}
        />

        <button onClick={submit} disabled={(!text.trim() && !file) || !!isLoading} style={{
          width:42, height:42, borderRadius:'50%', border:'none', flexShrink:0,
          background: (!text.trim() && !file) || isLoading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#3b82f6,#2563eb)',
          color:'#fff', fontSize:'18px', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {isLoading ? '⏳' : '▶'}
        </button>
      </div>

      <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handlePhoto} />
      <input ref={fileRef} type="file" accept="*/*" style={{ display:'none' }} onChange={handleFile} />
    </div>
  );
}
