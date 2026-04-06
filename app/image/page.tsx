'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type ImgItem = { id: string; prompt: string; url: string; model: string; ts: number; liked: boolean }

const MODELS = [
  { id: 'flux',           name: 'FLUX',        desc: 'Best quality' },
  { id: 'flux-realism',   name: 'Realism',     desc: 'Photorealistic' },
  { id: 'flux-anime',     name: 'Anime',       desc: 'Anime style' },
  { id: 'flux-3d',        name: '3D',          desc: '3D render' },
  { id: 'turbo',          name: 'Turbo',       desc: 'Fast' },
]

const STYLES = ['', 'photorealistic, 8k, ultra detailed', 'anime style, vibrant colors', 'oil painting, artistic', 'digital art, concept art', 'watercolor, soft', 'cyberpunk, neon', 'minimalist, clean']
const STYLE_LABELS = ['None', 'Realistic', 'Anime', 'Oil Paint', 'Digital', 'Watercolor', 'Cyberpunk', 'Minimal']

const PRESETS = [
  'Rewa MP ki beautiful landscape, golden hour, misty mountains',
  'Futuristic Indian city 2050, flying vehicles, neon lights',
  'Pranshu as an astronaut exploring Mars',
  'Ancient Indian temple at sunset, dramatic sky',
  'Cute robot reading books in a library',
  'Epic battlefield scene from Mahabharat',
  'Modern minimal home office setup, plants',
  'Street food vendor in Varanasi at night',
]

const KEY = 'jarvis_images_v1'
function load(): ImgItem[] { try { return JSON.parse(localStorage.getItem(KEY)||'[]') } catch { return [] } }
function save(i: ImgItem[]) { try { localStorage.setItem(KEY, JSON.stringify(i.slice(-30))) } catch {} }

export default function ImagePage() {
  const [gallery, setGallery] = useState<ImgItem[]>([])
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('flux')
  const [style, setStyle] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [selected, setSelected] = useState<ImgItem|null>(null)
  const [tab, setTab] = useState<'generate'|'gallery'>('generate')

  useEffect(() => { setGallery(load()) }, [])

  function generate(customPrompt?: string) {
    const p = (customPrompt || prompt).trim()
    if (!p || generating) return
    setGenerating(true)

    const fullPrompt = p + (STYLES[style] ? ', ' + STYLES[style] : '')
    const seed = Math.floor(Math.random() * 999999)
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?model=${model}&width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`

    const item: ImgItem = { id: seed.toString(), prompt: p, url, model, ts: Date.now(), liked: false }
    const updated = [item, ...gallery]
    setGallery(updated); save(updated)
    setGenerating(false)
    setPrompt('')
    setTab('gallery')
  }

  function toggleLike(id: string) {
    const updated = gallery.map(i => i.id === id ? { ...i, liked: !i.liked } : i)
    setGallery(updated); save(updated)
  }

  function deleteImg(id: string) {
    const updated = gallery.filter(i => i.id !== id); setGallery(updated); save(updated)
    if (selected?.id === id) setSelected(null)
  }

  const liked = gallery.filter(i => i.liked)

  return (
    <div style={{ minHeight: '100vh', background: '#070d1a', color: '#ddeeff', fontFamily: "'Inter', sans-serif", padding: '0 0 80px' }}>
      <style>{`
        * { box-sizing: border-box }
        @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        .img-card:hover .img-overlay { opacity: 1 !important; }
        .img-overlay { opacity: 0; transition: opacity 0.2s; }
      `}</style>

      <div style={{ background: 'rgba(7,13,26,0.97)', borderBottom: '1px solid rgba(244,114,182,0.1)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)' }}>
        <Link href="/" style={{ color: '#2a5070', fontSize: '18px', textDecoration: 'none' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#f472b6' }}>🎨 AI Image</div>
          <div style={{ fontSize: '11px', color: '#2a5070' }}>{gallery.length} images · {liked.length} liked</div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['generate','gallery'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: tab===t ? 'rgba(244,114,182,0.12)' : 'none', border:`1px solid ${tab===t ? 'rgba(244,114,182,0.3)':'transparent'}`, borderRadius:'7px', color: tab===t ? '#f472b6' : '#2a5070', cursor:'pointer', padding:'5px 10px', fontSize:'11px', fontWeight: tab===t?700:400, fontFamily:'inherit' }}>
              {t === 'generate' ? '✨ Create' : '🖼️ Gallery'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '14px' }}>
        {tab === 'generate' && (
          <div style={{ animation: 'fadeUp 0.2s ease' }}>
            {/* Prompt */}
            <div style={{ background: 'rgba(12,20,34,0.9)', border: '1px solid rgba(244,114,182,0.12)', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generate() }}
                placeholder="Kya banana hai? Describe karo..."
                rows={3}
                style={{ width:'100%', background:'rgba(244,114,182,0.04)', border:'1px solid rgba(244,114,182,0.1)', borderRadius:'10px', color:'#fce7f3', padding:'10px 12px', fontSize:'14px', outline:'none', resize:'none', fontFamily:'inherit', marginBottom:'12px' }} />

              {/* Model selector */}
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'10px', color:'#2a5070', marginBottom:'6px', fontWeight:600, letterSpacing:'0.5px' }}>MODEL</div>
                <div style={{ display:'flex', gap:'5px', overflowX:'auto' }}>
                  {MODELS.map(m => (
                    <button key={m.id} onClick={() => setModel(m.id)} style={{ background: model===m.id ? 'rgba(244,114,182,0.15)':'rgba(244,114,182,0.04)', border:`1px solid ${model===m.id?'rgba(244,114,182,0.35)':'rgba(244,114,182,0.1)'}`, borderRadius:'20px', color: model===m.id?'#f472b6':'rgba(244,114,182,0.5)', cursor:'pointer', padding:'4px 10px', fontSize:'11px', whiteSpace:'nowrap', fontFamily:'inherit', transition:'all 0.12s' }}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'10px', color:'#2a5070', marginBottom:'6px', fontWeight:600, letterSpacing:'0.5px' }}>STYLE</div>
                <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                  {STYLE_LABELS.map((l,i) => (
                    <button key={l} onClick={() => setStyle(i)} style={{ background: style===i ? 'rgba(244,114,182,0.12)':'rgba(244,114,182,0.03)', border:`1px solid ${style===i?'rgba(244,114,182,0.3)':'rgba(244,114,182,0.08)'}`, borderRadius:'20px', color: style===i?'#f472b6':'rgba(244,114,182,0.4)', cursor:'pointer', padding:'3px 9px', fontSize:'10px', fontFamily:'inherit', transition:'all 0.12s' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'14px' }}>
                {[
                  { l:'Portrait', w:768, h:1024 },
                  { l:'Square', w:1024, h:1024 },
                  { l:'Landscape', w:1024, h:768 },
                  { l:'Wide', w:1280, h:720 },
                ].map(s => (
                  <button key={s.l} onClick={() => { setWidth(s.w); setHeight(s.h) }} style={{ background: width===s.w&&height===s.h ? 'rgba(244,114,182,0.1)':'rgba(0,229,255,0.03)', border:`1px solid ${width===s.w&&height===s.h?'rgba(244,114,182,0.25)':'rgba(0,229,255,0.06)'}`, borderRadius:'8px', color: width===s.w&&height===s.h?'#f472b6':'#4a7090', cursor:'pointer', padding:'6px', fontSize:'11px', fontFamily:'inherit', transition:'all 0.12s' }}>
                    {s.l} <span style={{ opacity:0.5, fontSize:'9px' }}>{s.w}×{s.h}</span>
                  </button>
                ))}
              </div>

              <button onClick={() => generate()} disabled={!prompt.trim() || generating}
                style={{ width:'100%', background: prompt.trim()&&!generating ? 'linear-gradient(135deg,#be185d,#f472b6)' : 'rgba(244,114,182,0.05)', border:'none', borderRadius:'11px', color: prompt.trim()&&!generating?'#fff':'#2a5070', cursor: prompt.trim()&&!generating?'pointer':'not-allowed', padding:'13px', fontSize:'14px', fontWeight:700, fontFamily:'inherit', transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                {generating ? <><div style={{ width:'16px',height:'16px',border:'2px solid rgba(255,255,255,0.3)',borderTop:'2px solid white',borderRadius:'50%',animation:'spin 1s linear infinite' }} /> Generating...</> : '✨ Generate Image'}
              </button>
            </div>

            {/* Presets */}
            <div style={{ background:'rgba(12,20,34,0.7)', border:'1px solid rgba(244,114,182,0.07)', borderRadius:'12px', padding:'14px' }}>
              <div style={{ fontSize:'10px', color:'#2a5070', marginBottom:'10px', fontWeight:600, letterSpacing:'0.5px' }}>✨ QUICK PROMPTS</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                {PRESETS.map((p,i) => (
                  <button key={i} onClick={() => generate(p)} style={{ background:'rgba(244,114,182,0.04)', border:'1px solid rgba(244,114,182,0.08)', borderRadius:'8px', color:'rgba(244,114,182,0.7)', cursor:'pointer', padding:'8px', fontSize:'10px', textAlign:'left', fontFamily:'inherit', transition:'all 0.12s', lineHeight:'1.4' }}>
                    {p.slice(0,40)}...
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'gallery' && (
          <div style={{ animation:'fadeUp 0.2s ease' }}>
            {gallery.length === 0 ? (
              <div style={{ textAlign:'center', padding:'50px 20px', color:'#1e3248' }}>
                <div style={{ fontSize:'50px', marginBottom:'12px', opacity:0.3 }}>🎨</div>
                <div style={{ fontSize:'14px', marginBottom:'6px', color:'#4a7090' }}>Gallery empty hai</div>
                <button onClick={() => setTab('generate')} style={{ background:'rgba(244,114,182,0.1)', border:'1px solid rgba(244,114,182,0.2)', borderRadius:'9px', color:'#f472b6', cursor:'pointer', padding:'8px 18px', fontSize:'12px', fontFamily:'inherit', marginTop:'8px' }}>Create First Image</button>
              </div>
            ) : (
              <div style={{ columns:2, gap:'8px' }}>
                {gallery.map(item => (
                  <div key={item.id} className="img-card" style={{ position:'relative', marginBottom:'8px', breakInside:'avoid', borderRadius:'10px', overflow:'hidden', cursor:'pointer' }} onClick={() => setSelected(item)}>
                    <img src={item.url} alt={item.prompt} loading="lazy"
                      style={{ width:'100%', display:'block', borderRadius:'10px', border:'1px solid rgba(244,114,182,0.1)' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} />
                    <div className="img-overlay" style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', borderRadius:'10px', padding:'8px', display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                      <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.7)', marginBottom:'6px', lineHeight:'1.3' }}>{item.prompt.slice(0,50)}</div>
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button onClick={(e) => { e.stopPropagation(); toggleLike(item.id) }} style={{ background:'none', border:'none', fontSize:'16px', cursor:'pointer', opacity: item.liked?1:0.5 }}>
                          {item.liked ? '❤️' : '🤍'}
                        </button>
                        <a href={item.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'5px', color:'white', padding:'3px 8px', fontSize:'10px', textDecoration:'none', display:'flex', alignItems:'center' }}>↓</a>
                        <button onClick={(e) => { e.stopPropagation(); deleteImg(item.id) }} style={{ background:'rgba(248,113,113,0.2)', border:'none', borderRadius:'5px', color:'#f87171', cursor:'pointer', padding:'3px 7px', fontSize:'10px', fontFamily:'inherit' }}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lightbox */}
        {selected && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'16px' }} onClick={() => setSelected(null)}>
            <img src={selected.url} alt={selected.prompt} style={{ maxWidth:'100%', maxHeight:'75vh', borderRadius:'12px', boxShadow:'0 20px 60px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()} />
            <div style={{ marginTop:'14px', textAlign:'center', maxWidth:'400px' }}>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.7)', marginBottom:'10px' }}>{selected.prompt}</div>
              <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
                <a href={selected.url} download="jarvis-ai.jpg" style={{ background:'rgba(244,114,182,0.15)', border:'1px solid rgba(244,114,182,0.3)', borderRadius:'9px', color:'#f472b6', padding:'8px 18px', fontSize:'12px', textDecoration:'none', fontWeight:600 }}>↓ Download</a>
                <button onClick={() => toggleLike(selected.id)} style={{ background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', color:'white', cursor:'pointer', padding:'8px 18px', fontSize:'14px', fontFamily:'inherit' }}>
                  {selected.liked ? '❤️' : '🤍'}
                </button>
                <button onClick={() => setSelected(null)} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'9px', color:'rgba(255,255,255,0.5)', cursor:'pointer', padding:'8px 14px', fontFamily:'inherit', fontSize:'12px' }}>✕ Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
