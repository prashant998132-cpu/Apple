'use client';
import { useState } from 'react';
import type { JarvisMessage } from '../../types/jarvis.types';

const TOOL_LABELS: Record<string, string> = {
  get_weather:'🌤️ मौसम', get_datetime:'🕐 समय', search_wikipedia:'📖 Wiki',
  get_india_news:'📰 खबर', search_youtube:'▶️ YouTube', generate_image_fast:'🎨 Image',
  generate_image_quality:'🎨 HD', search_movies:'🎬 Film', get_crypto_price:'💰 Crypto',
  get_nasa_content:'🚀 NASA', get_photos:'📸 Photo', get_exchange_rate:'💱 Rate',
  get_recipe:'🍛 Recipe', get_air_quality:'🌫️ AQI', get_joke:'😄 Joke',
  translate_text:'🌐 Translate', calculate:'🔢 Math', save_memory:'🧠 Memory',
  get_rewa_info:'📍 Rewa', lookup_pincode:'📮 Pincode', get_hackernews:'💻 Tech',
  search_books:'📚 Books', get_sunrise_sunset:'🌅 Sun',
};

function renderMarkdown(text: string) {
  return text
    .replace(/\[LEARN:[^\]]*\]/g, '')
    .replace(/```([\w]*)\n?([\s\S]*?)```/g, (_,__,c) =>
      `<pre style="background:rgba(0,229,255,.06);border:1px solid rgba(0,229,255,.12);border-radius:8px;padding:8px 10px;margin:4px 0;overflow-x:auto;font-size:11px;color:#a8ffec;font-family:monospace;line-height:1.5">${c.replace(/</g,'&lt;')}</pre>`)
    .replace(/`(.+?)`/g, '<code style="background:rgba(0,229,255,.1);color:#a8ffec;padding:1px 5px;border-radius:4px;font-size:12px">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8f4ff">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:#c8e6f5">$1</em>')
    .replace(/^### (.+)$/gm, '<div style="color:#00e5ff;font-weight:700;font-size:13px;margin:6px 0 2px">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="color:#00e5ff;font-weight:700;font-size:14px;margin:7px 0 3px">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="color:#00e5ff;font-weight:800;font-size:15px;margin:8px 0 3px">$1</div>')
    .replace(/^- (.+)$/gm, '<div style="padding-left:10px;color:#c8dff0;margin:1px 0">• $1</div>')
    .replace(/\n/g, '<br/>');
}

// ─── Rich Cards ────────────────────────────────────────
function WeatherCard({ data }: { data: any }) {
  if (!data?.current) return null;
  const c = data.current;
  return (
    <div style={{ marginTop:8, padding:'10px 12px', borderRadius:12, background:'rgba(0,15,35,.6)', border:'1px solid rgba(0,229,255,.12)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
        <span style={{ fontSize:36 }}>{c.icon||'🌡️'}</span>
        <div>
          <div style={{ color:'#00e5ff', fontSize:24, fontWeight:700, lineHeight:1 }}>{c.temperature}</div>
          <div style={{ color:'#90caf9', fontSize:12 }}>{c.condition_hindi}</div>
          <div style={{ color:'#546e7a', fontSize:11 }}>{data.location}</div>
        </div>
        <div style={{ marginLeft:'auto', textAlign:'right', fontSize:11, color:'#90caf9' }}>
          <div>💧 {c.humidity}</div><div>💨 {c.wind}</div>
        </div>
      </div>
      {data.forecast && (
        <div style={{ display:'flex', gap:5, overflowX:'auto' }}>
          {data.forecast.slice(0,5).map((f:any,i:number)=>(
            <div key={i} style={{ textAlign:'center', minWidth:50, padding:'5px 3px', background:'rgba(0,229,255,.06)', borderRadius:8, fontSize:11 }}>
              <div style={{ color:'#546e7a' }}>{new Date(f.date).toLocaleDateString('hi-IN',{weekday:'short'})}</div>
              <div style={{ fontSize:16, margin:'2px 0' }}>{f.condition.split(' ').pop()}</div>
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
  const url = data?.image_url||data?.image_data_url;
  if (!url) return null;
  return (
    <div style={{ marginTop:8, borderRadius:12, overflow:'hidden', border:'1px solid rgba(0,229,255,.1)' }}>
      <img src={url} alt={data.prompt||''} style={{ width:'100%', maxHeight:280, objectFit:'cover', display:'block' }}
        onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}} />
      {data.prompt && <div style={{ padding:'6px 10px', fontSize:11, color:'#546e7a', background:'rgba(0,15,35,.6)' }}>"{data.prompt.slice(0,80)}"</div>}
    </div>
  );
}

function NewsCard({ data }: { data: any }) {
  if (!data?.articles) return null;
  return (
    <div style={{ marginTop:8, padding:'8px 12px', borderRadius:12, background:'rgba(0,15,35,.6)', border:'1px solid rgba(0,229,255,.1)' }}>
      {data.articles.slice(0,4).map((a:any,i:number)=>(
        <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ display:'block', padding:'7px 0', borderBottom:i<3?'1px solid rgba(0,229,255,.07)':'none', textDecoration:'none' }}>
          <div style={{ color:'#d0e8f8', fontSize:12, lineHeight:1.4 }}>{a.title}</div>
          <div style={{ color:'#37474f', fontSize:10, marginTop:2 }}>{a.source} • {a.published?.split(' ')[0]}</div>
        </a>
      ))}
    </div>
  );
}

function YouTubeCard({ data }: { data: any }) {
  if (!data?.videos) return null;
  return (
    <div style={{ marginTop:8, padding:'8px 12px', borderRadius:12, background:'rgba(0,15,35,.6)', border:'1px solid rgba(0,229,255,.1)' }}>
      {data.videos.slice(0,3).map((v:any)=>(
        <a key={v.id} href={v.url} target="_blank" rel="noreferrer" style={{ display:'flex', gap:9, padding:'7px 0', borderBottom:'1px solid rgba(0,229,255,.07)', textDecoration:'none' }}>
          <img src={v.thumbnail} alt="" style={{ width:80, height:52, borderRadius:6, objectFit:'cover', flexShrink:0 }}
            onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}} />
          <div>
            <div style={{ color:'#d0e8f8', fontSize:12, lineHeight:1.4 }}>{v.title.slice(0,60)}</div>
            <div style={{ color:'#37474f', fontSize:11, marginTop:2 }}>{v.channel}</div>
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

// ─── Action Bar ────────────────────────────────────────
function ActionBar({ msg, isUser }: { msg: any; isUser: boolean }) {
  const [liked, setLiked]   = useState<'up'|'down'|null>(null);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(msg.content||'').then(()=>{
      setCopied(true); setTimeout(()=>setCopied(false), 1500);
    });
  };

  const share = () => {
    if (navigator.share) {
      navigator.share({ text: msg.content||'' }).catch(()=>{});
    } else {
      copy();
    }
  };

  const btn = (onClick: ()=>void, icon: string, active?: boolean, activeColor?: string): React.CSSProperties => ({
    background:'none', border:'none', cursor:'pointer', padding:'4px 7px',
    fontSize:14, borderRadius:7, color: active ? (activeColor||'#00e5ff') : '#2e4a60',
    transition:'all .15s',
  });

  return (
    <div style={{ display:'flex', alignItems:'center', gap:2, marginTop:3,
      justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && (
        <>
          <button style={btn(()=>{}, '👍', liked==='up','#00e676')} onClick={()=>setLiked(liked==='up'?null:'up')}>
            {liked==='up' ? '👍' : '👍'}
          </button>
          <button style={btn(()=>{}, '👎', liked==='down','#ff5252')} onClick={()=>setLiked(liked==='down'?null:'down')}>
            {liked==='down' ? '👎' : '👎'}
          </button>
        </>
      )}
      <button style={btn(copy, copied?'✓':'📋', copied, '#00e676')} onClick={copy}>
        {copied ? '✓' : '📋'}
      </button>
      <button style={btn(share, '↗️')} onClick={share}>↗️</button>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────
export default function MessageBubble({ msg }: { msg: JarvisMessage }) {
  const isUser     = msg.role === 'user';
  const isStreaming = (msg as any).streaming;
  const time       = new Date(msg.timestamp).toLocaleTimeString('hi-IN', { hour:'2-digit', minute:'2-digit' });
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      style={{ display:'flex', gap:7, marginBottom:6, justifyContent:isUser?'flex-end':'flex-start', alignItems:'flex-start', padding:'0 10px' }}
      onClick={()=>setShowActions(p=>!p)}
    >
      {/* JV avatar */}
      {!isUser && (
        <div style={{ width:26, height:26, borderRadius:7, flexShrink:0, marginTop:1,
          background:'linear-gradient(135deg,rgba(0,229,255,.18),rgba(0,229,255,.05))',
          border:'1px solid rgba(0,229,255,.3)', color:'#00e5ff', fontSize:9,
          fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center',
          letterSpacing:1, fontFamily:'monospace' }}>JV</div>
      )}

      <div style={{ maxWidth:'78%', minWidth:40 }}>
        {/* Tool tags — only when visible */}
        {!isUser && msg.toolsUsed && msg.toolsUsed.length > 0 && showActions && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:4 }}>
            {msg.toolsUsed.map(t=>(
              <span key={t} style={{ padding:'2px 7px', borderRadius:20, fontSize:10,
                border:'1px solid rgba(0,229,255,.25)', color:'#00e5ff',
                background:'rgba(0,229,255,.07)' }}>{TOOL_LABELS[t]||t}</span>
            ))}
          </div>
        )}

        {/* Bubble */}
        <div style={isUser ? {
          padding:'8px 12px',
          borderRadius:'14px 14px 3px 14px',
          background:'linear-gradient(135deg,#0d3060,#0a2040)',
          border:'1px solid rgba(100,181,246,.2)',
          fontSize:13, lineHeight:1.6, color:'#e8f4ff', wordBreak:'break-word',
        } : {
          padding:'8px 12px',
          borderRadius:'3px 14px 14px 14px',
          background:'linear-gradient(135deg,#071828,#0a1e32)',
          border:'1px solid rgba(0,229,255,.1)',
          fontSize:13, lineHeight:1.6, color:'#d0e8f8', wordBreak:'break-word',
        }}
          className="chat-content"
          dangerouslySetInnerHTML={{ __html: isStreaming && !(msg as any).content
            ? '<span style="color:#00e5ff;opacity:.6">⏳</span>'
            : renderMarkdown((msg as any).content||'') }}
        />

        <RichContent richData={(msg as any).richData} />

        {/* Time + actions row */}
        <div style={{ display:'flex', alignItems:'center', gap:6,
          justifyContent:isUser?'flex-end':'flex-start', marginTop:2 }}>
          <span style={{ fontSize:10, color:'#263238', fontFamily:'monospace' }}>
            {isStreaming ? '⟳' : time}
            {!(msg as any).streaming && (msg as any).processingMs > 0 && (
              <span style={{ marginLeft:5, color:'#1c2c38' }}>{(msg as any).processingMs}ms</span>
            )}
          </span>
        </div>

        {/* Actions — shown on tap */}
        {showActions && !isStreaming && (
          <ActionBar msg={msg} isUser={isUser} />
        )}
      </div>

      {/* आप avatar */}
      {isUser && (
        <div style={{ width:26, height:26, borderRadius:7, flexShrink:0, marginTop:1,
          background:'rgba(21,101,192,.2)', border:'1px solid rgba(100,181,246,.25)',
          color:'#64b5f6', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center' }}>आप</div>
      )}
    </div>
  );
}
