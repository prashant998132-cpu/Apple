'use client';
import { useState, useEffect } from 'react';
import type { JarvisMessage } from '../../types/jarvis.types';

const TOOL_LABELS: Record<string, string> = {
  get_weather:'🌤️ मौसम', get_datetime:'🕐 समय', search_wikipedia:'📖 Wiki',
  get_india_news:'📰 खबर', search_youtube:'▶️ YouTube', generate_image_fast:'🎨 Image',
  generate_image_quality:'🎨 HD', search_movies:'🎬 Film', get_crypto_price:'💰 Crypto',
  get_nasa_content:'🚀 NASA', get_photos:'📸 Photo', get_exchange_rate:'💱 Rate',
  get_recipe:'🍛 Recipe', get_air_quality:'🌫️ AQI', get_joke:'😄 Joke',
  translate_text:'🌐 Translate', calculate:'🔢 Math', save_memory:'🧠 Memory',
  get_rewa_info:'📍 Rewa', lookup_pincode:'📮 Pin', get_hackernews:'💻 Tech',
  search_books:'📚 Books', get_sunrise_sunset:'🌅 Sun', get_cricket_scores:'🏏 Cricket',
  get_trivia_question:'🧠 Quiz', get_meme:'😂 Meme', get_stock_market:'📈 NSE',
  generate_qr_code:'📲 QR', get_country_info:'🌍 Country', convert_units:'🔄 Convert',
};

function renderMarkdown(text: string): string {
  // Protect KaTeX blocks from markdown processing
  const mathBlocks: string[] = [];
  let protected_text = text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_,m) => { mathBlocks.push(`$$${m}$$`); return `%%MATH${mathBlocks.length-1}%%`; })
    .replace(/\$([^\n$]+?)\$/g, (_,m) => { mathBlocks.push(`$${m}$`); return `%%MATH${mathBlocks.length-1}%%`; })
    .replace(/\\\[([\s\S]+?)\\\]/g, (_,m) => { mathBlocks.push(`\\[${m}\\]`); return `%%MATH${mathBlocks.length-1}%%`; })
    .replace(/\\\(([\s\S]+?)\\\)/g, (_,m) => { mathBlocks.push(`\\(${m}\\)`); return `%%MATH${mathBlocks.length-1}%%`; });

  let codeBlockCounter = 0;

  let html = protected_text
    .replace(/\[LEARN:[^\]]*\]/g, '')
    // Normalize any garbled unicode bullets / arrows → clean bullet
    .replace(/[\u2022\u2023\u25E6\u2043\u2219\u27A2\u27A4\u2794\u00E2\u00A2]/g, '•')
    // Code blocks with copy button
    .replace(/```([\w]*)\n?([\s\S]*?)```/g, (_,lang,c) => {
      const escaped = c.replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const safeCode = JSON.stringify(c);
      const langLabel = lang ? `<span style="font-size:9px;color:#4a7090;padding:1px 6px;border-radius:4px;background:rgba(0,229,255,.06)">${lang}</span>` : '<span/>';
      return `<div style="margin:6px 0"><div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,229,255,.04);border:1px solid rgba(0,229,255,.12);border-bottom:none;border-radius:7px 7px 0 0;padding:4px 9px">${langLabel}<button onclick="(function(b){navigator.clipboard&&navigator.clipboard.writeText(${safeCode}).then(()=>{b.textContent='✓ Copied';setTimeout(()=>{b.textContent='📋 Copy'},1500)})})(this)" style="background:none;border:none;color:#4a7090;font-size:10px;cursor:pointer;padding:2px 6px;border-radius:4px">📋 Copy</button></div><pre style="background:rgba(0,229,255,.04);border:1px solid rgba(0,229,255,.12);border-top:none;border-radius:0 0 7px 7px;padding:8px 10px;margin:0;overflow-x:auto;font-size:11px;color:#a8ffec;font-family:monospace;line-height:1.6">${escaped}</pre></div>`;
    })
    .replace(/`([^`]+?)`/g, '<code style="background:rgba(0,229,255,.1);color:#a8ffec;padding:1px 5px;border-radius:4px;font-size:11px">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8f4ff">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:#c8e6f5">$1</em>')
    // Tables
    .replace(/\|(.+)\|\n\|[-: |]+\|\n((?:\|.+\|\n?)*)/gm, (_:string, header:string, rows:string) => {
      const hc = header.split('|').filter((x:string)=>x.trim()).map((x:string)=>`<th style="padding:5px 10px;border:1px solid rgba(0,229,255,.15);color:#00e5ff;font-size:11px;text-align:left;white-space:nowrap">${x.trim()}</th>`).join('');
      const rb = rows.trim().split('\n').map((row:string)=>{
        const cc = row.split('|').filter((x:string)=>x.trim()).map((x:string)=>`<td style="padding:5px 10px;border:1px solid rgba(0,229,255,.08);color:#c8dff0;font-size:11px">${x.trim()}</td>`).join('');
        return `<tr style="border-bottom:1px solid rgba(0,229,255,.05)">${cc}</tr>`;
      }).join('');
      return `<div style="overflow-x:auto;margin:8px 0;border-radius:8px;border:1px solid rgba(0,229,255,.12)"><table style="border-collapse:collapse;width:100%"><thead style="background:rgba(0,229,255,.06)"><tr>${hc}</tr></thead><tbody>${rb}</tbody></table></div>`;
    })
    .replace(/^### (.+)$/gm, '<div style="color:#00e5ff;font-weight:700;font-size:12px;margin:6px 0 2px;letter-spacing:.3px">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="color:#00e5ff;font-weight:700;font-size:13px;margin:7px 0 2px">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="color:#00e5ff;font-weight:800;font-size:14px;margin:8px 0 3px">$1</div>')
    // Handle ALL bullet styles: -, *, •, ➢, →, ▸
    .replace(/^(?:[-*•▸➢→✦✧◆◇▶►])\s+(.+)$/gm, '<div style="padding-left:12px;color:#c8dff0;margin:2px 0;display:flex;gap:5px"><span style="color:#00e5ff;margin-top:1px">•</span><span>$1</span></div>')
    .replace(/^(\d+)\.\s(.+)$/gm, '<div style="padding-left:12px;color:#c8dff0;margin:2px 0">$1. $2</div>')
    .replace(/\n/g, '<br/>');

  // Restore math blocks — KaTeX auto-render will handle them client-side
  mathBlocks.forEach((m, i) => {
    html = html.replace(`%%MATH${i}%%`, `<span class="math-inline">${m.replace(/</g,'&lt;')}</span>`);
  });
  return html;
}

// ─── Rich Cards ──────────────────────────────────────────
function WeatherCard({ data }: { data: any }) {
  if (!data?.current) return null;
  const c = data.current;
  return (
    <div style={{ marginTop:6, padding:'8px 10px', borderRadius:10, background:'rgba(0,15,35,.6)', border:'1px solid rgba(0,229,255,.12)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <span style={{ fontSize:28 }}>{c.icon||'🌡️'}</span>
        <div>
          <div style={{ color:'#00e5ff', fontSize:20, fontWeight:700, lineHeight:1 }}>{c.temperature}</div>
          <div style={{ color:'#90caf9', fontSize:11 }}>{c.condition_hindi}</div>
          <div style={{ color:'#546e7a', fontSize:10 }}>{data.location}</div>
        </div>
        <div style={{ marginLeft:'auto', textAlign:'right', fontSize:10, color:'#90caf9' }}>
          <div>💧 {c.humidity}</div><div>💨 {c.wind}</div>
        </div>
      </div>
      {data.forecast && (
        <div style={{ display:'flex', gap:4, overflowX:'auto' }}>
          {data.forecast.slice(0,5).map((f:any,i:number)=>(
            <div key={i} style={{ textAlign:'center', minWidth:44, padding:'4px 2px', background:'rgba(0,229,255,.06)', borderRadius:7, fontSize:10 }}>
              <div style={{ color:'#546e7a' }}>{new Date(f.date).toLocaleDateString('hi-IN',{weekday:'short'})}</div>
              <div style={{ fontSize:14, margin:'1px 0' }}>{f.condition.split(' ').pop()}</div>
              <div style={{ color:'#e8f4ff', fontWeight:600 }}>{f.max}</div>
              <div style={{ color:'#546e7a' }}>{f.min}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageCard({ data }: { data: any }) {
  const url = data?.image_url||data?.image_data_url||data?.imageUrl;
  if (!url) return null;
  const [full, setFull] = useState(false);
  const download = () => { const a = document.createElement('a'); a.href=url; a.download=`JARVIS_${Date.now()}.png`; a.click(); };
  return (
    <>
      <div style={{ marginTop:6, borderRadius:10, overflow:'hidden', border:'1px solid rgba(0,229,255,.12)' }}>
        <div style={{ position:'relative' }}>
          <img src={url} alt={data.prompt||''} onClick={()=>setFull(true)}
            style={{ width:'100%', maxHeight:280, objectFit:'cover', display:'block', cursor:'zoom-in' }}
            onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}} />
          <div style={{ position:'absolute', bottom:6, right:6, display:'flex', gap:5 }}>
            <button onClick={download} style={{ background:'rgba(0,0,0,.75)', border:'1px solid rgba(255,255,255,.15)', borderRadius:7, padding:'4px 9px', color:'#e8f4ff', fontSize:11, cursor:'pointer' }}>⬇️ Save</button>
            <button onClick={()=>setFull(true)} style={{ background:'rgba(0,0,0,.75)', border:'1px solid rgba(255,255,255,.15)', borderRadius:7, padding:'4px 9px', color:'#e8f4ff', fontSize:11, cursor:'pointer' }}>⛶ Full</button>
          </div>
        </div>
        {data.prompt && <div style={{ padding:'5px 10px', fontSize:10, color:'#546e7a' }}>"{data.prompt.slice(0,70)}"</div>}
      </div>
      {full && (
        <div onClick={()=>setFull(false)} style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.95)', display:'flex', alignItems:'center', justifyContent:'center', padding:12 }}>
          <img src={url} alt="" style={{ maxWidth:'100%', maxHeight:'90vh', borderRadius:8, objectFit:'contain' }}/>
          <button onClick={download} style={{ position:'absolute', bottom:24, right:24, background:'rgba(0,229,255,.2)', border:'1px solid rgba(0,229,255,.4)', borderRadius:10, padding:'10px 18px', color:'#00e5ff', fontSize:13, cursor:'pointer', fontWeight:600 }}>⬇️ Download</button>
        </div>
      )}
    </>
  );
}

function NewsCard({ data }: { data: any }) {
  if (!data?.articles) return null;
  return (
    <div style={{ marginTop:6, padding:'6px 10px', borderRadius:10, background:'rgba(0,15,35,.6)', border:'1px solid rgba(0,229,255,.1)' }}>
      {data.articles.slice(0,4).map((a:any,i:number)=>(
        <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ display:'block', padding:'5px 0', borderBottom:i<3?'1px solid rgba(0,229,255,.07)':'none', textDecoration:'none' }}>
          <div style={{ color:'#d0e8f8', fontSize:11, lineHeight:1.4 }}>{a.title}</div>
          <div style={{ color:'#37474f', fontSize:10, marginTop:1 }}>{a.source} • {a.published?.split(' ')[0]}</div>
        </a>
      ))}
    </div>
  );
}

function YouTubeCard({ data }: { data: any }) {
  if (!data?.videos) return null;
  return (
    <div style={{ marginTop:6, padding:'6px 10px', borderRadius:10, background:'rgba(0,15,35,.6)', border:'1px solid rgba(0,229,255,.1)' }}>
      {data.videos.slice(0,3).map((v:any)=>(
        <a key={v.id} href={v.url} target="_blank" rel="noreferrer" style={{ display:'flex', gap:8, padding:'5px 0', borderBottom:'1px solid rgba(0,229,255,.07)', textDecoration:'none' }}>
          <img src={v.thumbnail} alt="" style={{ width:68, height:45, borderRadius:5, objectFit:'cover', flexShrink:0 }}
            onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}} />
          <div>
            <div style={{ color:'#d0e8f8', fontSize:11, lineHeight:1.35 }}>{v.title.slice(0,56)}</div>
            <div style={{ color:'#37474f', fontSize:10, marginTop:1 }}>{v.channel}</div>
          </div>
        </a>
      ))}
    </div>
  );
}

function RichContent({ richData }: { richData: any }) {
  if (!richData) return null;
  const { type, data } = richData;
  if (type==='weather') return <WeatherCard data={data} />;
  if (type==='image')   return <ImageCard data={data} />;
  if (type==='news')    return <NewsCard data={data} />;
  if (type==='youtube') return <YouTubeCard data={data} />;
  return null;
}

// ─── Action Bar ──────────────────────────────────────────
function ActionBar({ msg, isUser }: { msg: any; isUser: boolean }) {
  const [liked, setLiked]   = useState<'up'|'down'|null>(null);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(msg.content||'').then(()=>{ setCopied(true); setTimeout(()=>setCopied(false), 1500); });
  };
  const share = () => {
    if (navigator.share) navigator.share({ text: msg.content||'' }).catch(()=>{});
    else copy();
  };
  const speak = () => {
    if (speaking) { window.speechSynthesis?.cancel(); setSpeaking(false); return; }
    const text = (msg.content||'').replace(/<[^>]+>/g,'').replace(/\*\*/g,'').slice(0,500);
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'hi-IN';
    utt.rate = 0.95;
    utt.onstart  = () => setSpeaking(true);
    utt.onend    = () => setSpeaking(false);
    utt.onerror  = () => setSpeaking(false);
    window.speechSynthesis?.speak(utt);
  };

  const btn: React.CSSProperties = { background:'none', border:'none', cursor:'pointer', padding:'3px 6px', fontSize:13, borderRadius:6, color:'#2e4a60' };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:1, marginTop:2, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && (
        <>
          <button style={{ ...btn, color: liked==='up' ? '#00e676' : '#2e4a60' }} onClick={()=>setLiked(liked==='up'?null:'up')}>👍</button>
          <button style={{ ...btn, color: liked==='down' ? '#ff5252' : '#2e4a60' }} onClick={()=>setLiked(liked==='down'?null:'down')}>👎</button>
          <button style={{ ...btn, color: speaking ? '#00e5ff' : '#2e4a60' }} onClick={speak} title="Sunao">
            {speaking ? '⏹' : '🔊'}
          </button>
        </>
      )}
      <button style={{ ...btn, color: copied ? '#00e676' : '#2e4a60' }} onClick={copy}>{copied ? '✓' : '📋'}</button>
      <button style={btn} onClick={share}>↗️</button>
    </div>
  );
}

// ─── Main Bubble ─────────────────────────────────────────
export default function MessageBubble({ msg }: { msg: JarvisMessage }) {
  const isUser     = msg.role === 'user';
  const isStreaming = (msg as any).streaming;
  const time       = new Date(msg.timestamp).toLocaleTimeString('hi-IN', { hour:'2-digit', minute:'2-digit' });
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      style={{
        display:'flex', gap:5, marginBottom:4,
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        alignItems:'flex-start', padding:'0 8px'
      }}
      onClick={()=>setShowActions(p=>!p)}
    >
      {/* JV avatar — small, only AI */}
      {!isUser && (
        <div style={{
          width:20, height:20, borderRadius:5, flexShrink:0, marginTop:2,
          background:'rgba(0,229,255,.12)', border:'1px solid rgba(0,229,255,.25)',
          color:'#00e5ff', fontSize:7, fontWeight:700,
          display:'flex', alignItems:'center', justifyContent:'center',
          letterSpacing:.5, fontFamily:'monospace'
        }}>JV</div>
      )}

      <div style={{ maxWidth:'80%', minWidth:36 }}>

        {/* Tool tags — tap to reveal */}
        {!isUser && msg.toolsUsed && msg.toolsUsed.length > 0 && showActions && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:3 }}>
            {msg.toolsUsed.map(t=>(
              <span key={t} style={{ padding:'1px 6px', borderRadius:20, fontSize:9,
                border:'1px solid rgba(0,229,255,.25)', color:'#00e5ff',
                background:'rgba(0,229,255,.07)' }}>{TOOL_LABELS[t]||t}</span>
            ))}
          </div>
        )}

        {/* Bubble / plain text */}
        {isUser ? (
          <div style={{
            padding:'8px 12px',
            borderRadius:'16px 16px 4px 16px',
            background:'linear-gradient(135deg,#0d3060,#0a2040)',
            border:'1px solid rgba(100,181,246,.18)',
            fontSize:14, lineHeight:1.55, color:'#e8f4ff', wordBreak:'break-word',
          }}
            className="chat-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown((msg as any).content||'') }}
          />
        ) : (
          <div style={{
            fontSize:14, lineHeight:1.65, color:'#c8dff0', wordBreak:'break-word',
            padding:'2px 0',
          }}
            className="chat-content"
            dangerouslySetInnerHTML={{ __html: isStreaming && !(msg as any).content
              ? '<span style="color:#00e5ff;opacity:.5">⏳</span>'
              : renderMarkdown((msg as any).content||'') }}
          />
        )}

        <RichContent richData={(msg as any).richData} />

        {/* Timestamp — tiny, very subtle */}
        <div style={{ display:'flex', alignItems:'center',
          justifyContent: isUser ? 'flex-end' : 'flex-start', marginTop:1 }}>
          <span style={{ fontSize:9, color:'#1e3040', fontFamily:'monospace' }}>
            {isStreaming ? '⟳' : time}
          </span>
        </div>

        {/* Action bar — tap to show */}
        {showActions && !isStreaming && (
          <ActionBar msg={msg} isUser={isUser} />
        )}
      </div>

      {/* आप avatar — small */}
      {isUser && (
        <div style={{
          width:20, height:20, borderRadius:5, flexShrink:0, marginTop:2,
          background:'rgba(21,101,192,.18)', border:'1px solid rgba(100,181,246,.22)',
          color:'#64b5f6', fontSize:8,
          display:'flex', alignItems:'center', justifyContent:'center'
        }}>आप</div>
      )}
    </div>
  );
}
