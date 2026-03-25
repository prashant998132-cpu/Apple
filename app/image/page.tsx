'use client';
import { useState } from 'react';

const STYLES = [
  { id: 'flux', label: '✨ Best', prompt: 'high quality, detailed, professional' },
  { id: 'flux-realism', label: '📷 Photo', prompt: 'photorealistic, 8k, detailed, natural lighting' },
  { id: 'flux-anime', label: '🎌 Anime', prompt: 'anime style, vibrant, detailed manga art' },
  { id: 'flux-3d', label: '🎮 3D', prompt: '3d render, CGI, blender, cinematic lighting' },
  { id: 'turbo', label: '⚡ Fast', prompt: 'fast, clean, clear' },
  { id: 'flux-realism', label: '🎬 Cinematic', prompt: 'cinematic, dramatic lighting, movie still, 4k' },
];

export default function ImagePage() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('flux');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true); setError('');
    const selectedStyle = STYLES.find(s => s.id === style);
    const fullPrompt = `${prompt.trim()}, ${selectedStyle?.prompt || ''}`;
    try {
      const r = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, width: 768, height: 768, model: style }),
      });
      const d = await r.json();
      if (d.url) setImages(prev => [d.url, ...prev.slice(0, 11)]);
      else setError('Image generate nahi ho payi. Dobara try karo.');
    } catch { setError('Network error. Dobara try karo.'); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080a12', padding: '16px', paddingBottom: 80 }}>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 2 }}>🎨 Image Generator</h1>
      <p style={{ fontSize: 12, color: '#4b5563', marginBottom: 14 }}>AI se koi bhi image banao — bilkul free!</p>

      <div style={{ background: '#0e1120', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16, padding: '12px 14px', marginBottom: 12 }}>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); }}}
          placeholder="Kya banana hai? e.g. Sunset over mountains, a cute robot reading..."
          style={{ width: '100%', minHeight: 72, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 14, resize: 'none', lineHeight: 1.55 }} />
      </div>

      <p style={{ fontSize: 10, color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Style</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginBottom: 14 }}>
        {STYLES.map((s, i) => (
          <button key={i} onClick={() => setStyle(s.id)}
            style={{ padding: '9px 4px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: style === s.id ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)', border: `1px solid ${style === s.id ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.06)'}`, color: style === s.id ? '#a78bfa' : '#6b7280', cursor: 'pointer', transition: 'all 0.15s' }}>
            {s.label}
          </button>
        ))}
      </div>

      <button onClick={generate} disabled={loading || !prompt.trim()}
        style={{ width: '100%', padding: '14px', borderRadius: 16, fontSize: 15, fontWeight: 900, background: loading ? 'rgba(99,102,241,0.25)' : prompt.trim() ? 'linear-gradient(135deg,#6366f1,#22d3ee)' : 'rgba(255,255,255,0.04)', border: 'none', color: prompt.trim() ? '#fff' : '#374151', cursor: prompt.trim() && !loading ? 'pointer' : 'default', marginBottom: 16, letterSpacing: '-0.3px' }}>
        {loading ? '⏳ Ban rahi hai...' : '✨ Image Banao'}
      </button>

      {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</p>}

      {images.length > 0 && (
        <div>
          <p style={{ fontSize: 10, color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Generated Images ({images.length})</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {images.map((url, i) => (
              <div key={i} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', aspectRatio: '1', background: '#0e1120', border: '1px solid rgba(255,255,255,0.06)' }}>
                <img src={url} alt={`img-${i}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(url, '_blank')} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 8px 8px', background: 'linear-gradient(transparent,rgba(0,0,0,0.7))', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <a href={url} download={`jarvis-${i+1}.jpg`} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.15)', color: '#fff', textDecoration: 'none', backdropFilter: 'blur(4px)' }}>⬇ Save</a>
                  <button onClick={() => navigator.clipboard.writeText(url)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', cursor: 'pointer' }}>🔗 Copy</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
