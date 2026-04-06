'use client'
import { useState } from 'react'
import Link from 'next/link'

const PRESETS = [
  { label: '🌐 URL', value: 'https://', prefix: 'https://' },
  { label: '📱 WhatsApp', value: 'https://wa.me/91', prefix: 'https://wa.me/91' },
  { label: '📧 Email', value: 'mailto:', prefix: 'mailto:' },
  { label: '📞 Phone', value: 'tel:+91', prefix: 'tel:+91' },
  { label: '📝 Text', value: '', prefix: '' },
  { label: '🗺️ Maps', value: 'https://maps.google.com/?q=', prefix: 'https://maps.google.com/?q=' },
]
const SIZES = [150, 200, 250, 300]
const COLORS_FG = ['000000', '003fa3', '6d28d9', 'dc2626', '16a34a', 'b45309']

export default function QRPage() {
  const [text, setText] = useState('https://')
  const [size, setSize] = useState(250)
  const [fgColor, setFgColor] = useState('000000')
  const [bgColor, setBgColor] = useState('ffffff')
  const [generated, setGenerated] = useState(false)
  const [history, setHistory] = useState<Array<{text: string; url: string}>>([])

  const qrUrl = text.trim()
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=${fgColor}&bgcolor=${bgColor}&margin=10&format=png`
    : null

  function generate() {
    if (!text.trim() || !qrUrl) return
    setGenerated(true)
    setHistory(h => [{ text: text.slice(0, 50), url: qrUrl }, ...h.slice(0, 4)])
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", padding: '0 0 80px' }}>
      <style>{`* { box-sizing: border-box } @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }`}</style>

      <div style={{ background: 'rgba(8,13,24,0.95)', borderBottom: '1px solid rgba(0,229,255,0.07)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/" style={{ color: '#2a5070', fontSize: '18px', textDecoration: 'none' }}>←</Link>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#ddeeff' }}>📱 QR Generator</div>
          <div style={{ fontSize: '11px', color: '#2a5070' }}>Free, no API key</div>
        </div>
      </div>

      <div style={{ maxWidth: '420px', margin: '0 auto', padding: '16px' }}>
        {/* Presets */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '2px' }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => { setText(p.value); setGenerated(false) }}
              style={{ background: text.startsWith(p.prefix) && p.prefix ? 'rgba(0,229,255,0.1)' : 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '20px', color: '#4a7090', cursor: 'pointer', padding: '5px 10px', fontSize: '11px', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all 0.12s' }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ background: 'rgba(12,20,34,0.9)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
          <textarea value={text} onChange={e => { setText(e.target.value); setGenerated(false) }} placeholder="URL, text, phone number..."
            rows={3} style={{ width: '100%', background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '8px', color: '#ddeeff', padding: '10px 12px', fontSize: '14px', outline: 'none', resize: 'none', fontFamily: 'inherit', marginBottom: '12px' }} />

          {/* Settings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#1e3248', marginBottom: '5px', fontWeight: 600 }}>SIZE</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {SIZES.map(s => <button key={s} onClick={() => setSize(s)} style={{ flex: 1, background: size === s ? 'rgba(0,229,255,0.1)' : 'rgba(0,229,255,0.03)', border: '1px solid', borderColor: size === s ? 'rgba(0,229,255,0.25)' : 'rgba(0,229,255,0.07)', borderRadius: '5px', color: size === s ? '#00e5ff' : '#2a5070', cursor: 'pointer', padding: '4px 2px', fontSize: '10px', fontFamily: 'inherit' }}>{s}</button>)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#1e3248', marginBottom: '5px', fontWeight: 600 }}>QR COLOR</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {COLORS_FG.map(c => <button key={c} onClick={() => setFgColor(c)} style={{ width: '22px', height: '22px', borderRadius: '4px', background: '#' + c, border: fgColor === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.1s' }} />)}
              </div>
            </div>
          </div>

          <button onClick={generate} disabled={!text.trim()}
            style={{ width: '100%', background: text.trim() ? 'linear-gradient(135deg, #0055cc, #00c8ff)' : 'rgba(0,229,255,0.04)', border: 'none', borderRadius: '10px', color: text.trim() ? '#000' : '#1e3248', cursor: text.trim() ? 'pointer' : 'not-allowed', padding: '12px', fontSize: '14px', fontWeight: 700, transition: 'all 0.15s', fontFamily: 'inherit' }}>
            Generate QR Code
          </button>
        </div>

        {/* QR display */}
        {generated && qrUrl && (
          <div style={{ background: 'rgba(12,20,34,0.9)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '14px', padding: '20px', textAlign: 'center', animation: 'fadeUp 0.2s ease', marginBottom: '14px' }}>
            <img src={qrUrl} alt="QR Code" style={{ borderRadius: '10px', border: '8px solid white', maxWidth: '100%', display: 'block', margin: '0 auto' }} />
            <div style={{ marginTop: '14px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <a href={qrUrl} download="qr-code.png" style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '8px', color: '#00e5ff', padding: '8px 16px', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>↓ Download</a>
              <button onClick={() => { navigator.share?.({ url: qrUrl, title: 'QR Code' }) || navigator.clipboard?.writeText(qrUrl) }}
                style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '8px', color: '#34d399', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Share</button>
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: '#1e3248', wordBreak: 'break-all' }}>{text.slice(0, 80)}{text.length > 80 ? '...' : ''}</div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.06)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '11px', color: '#1e3248', marginBottom: '10px', fontWeight: 600, letterSpacing: '0.5px' }}>RECENT</div>
            {history.map((h, i) => (
              <button key={i} onClick={() => { setText(h.text.includes('...') ? text : h.text); setGenerated(false) }}
                style={{ width: '100%', background: 'none', border: 'none', borderBottom: i < history.length-1 ? '1px solid rgba(255,255,255,0.03)' : 'none', padding: '7px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', fontFamily: 'inherit' }}>
                <img src={h.url} alt="" style={{ width: '36px', height: '36px', borderRadius: '4px', border: '2px solid white', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#4a7090', wordBreak: 'break-all' }}>{h.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
