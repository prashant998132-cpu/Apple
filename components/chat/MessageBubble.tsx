'use client';
import { useState, useEffect } from 'react';
import type { JarvisMessage } from '../../types/jarvis.types';

const TOOL_LABELS: Record<string, string> = {
  get_weather:'ð¤ï¸ à¤®à¥à¤¸à¤®', get_datetime:'ð à¤¸à¤®à¤¯', search_wikipedia:'ð Wiki',
  get_india_news:'ð° à¤à¤¬à¤°', search_youtube:'â¶ï¸ YouTube', generate_image_fast:'ð¨ Image',
  generate_image_quality:'ð¨ HD', search_movies:'ð¬ Film', get_crypto_price:'ð° Crypto',
  get_nasa_content:'ð NASA', get_photos:'ð¸ Photo', get_exchange_rate:'ð± Rate',
  get_recipe:'ð Recipe', get_air_quality:'ð«ï¸ AQI', get_joke:'ð Joke',
  translate_text:'ð Translate', calculate:'ð¢ Math', save_memory:'ð§  Memory',
  get_rewa_info:'ð Rewa', lookup_pincode:'ð® Pin', get_hackernews:'ð» Tech',
  search_books:'ð Books', get_sunrise_sunset:'ð Sun', get_cricket_scores:'ð Cricket',
  get_trivia_question:'ð§  Quiz', get_meme:'ð Meme', get_stock_market:'ð NSE',
  generate_qr_code:'ð² QR', get_country_info:'ð Country', convert_units:'ð Convert',
};

function renderMarkdown(text: string): string {
  // Protect KaTeX blocks from markdown processing
  const mathBlocks: string[] = [];
  let protected_text = text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_,m) => { mathBlocks.push(`$$${m}$$`); return `%%MATH${mathBlocks.length-1}%%`; })
    .replace(/\$([^\n$]+?)\$/g, (_,m) => { mathBlocks.push(`$${m}$`); return `%%MATH${mathBlocks.length-1}%%`; })
    .replace(/\\\[([\s\S]+?)\\\]/g, (_,m) => { mathBlocks.push(`\\[${m}\\]`); return `%%MATH${mathBlocks.length-1}%%`; })
    .replace(/\\\(([\s\S]+?)\\\)/g, (_,m) => { mathBlocks.push(`\\(${m}\\)`); return `%%MATH${mathBlocks.length-1}%%`; });

  let html = protected_text
    .replace(/\[LEARN:[^\]]*\]/g, '')
    .replace(/```([\w]*)\n?([\s\S]*?)```/g, (_,lang,c) =>
      `<pre style="background:rgba(0,229,255,.06);border:1px solid rgba(0,229,255,.12);border-radius:7px;padding:6px 9px;margin:4px 0;overflow-x:auto;font-size:11px;color:#a8ffec;font-family:monospace;line-height:1.5">${c.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`)
    .replace(/`([^`]+?)`/g, '<code style="background:rgba(0,229,255,.1);color:#a8ffec;padding:1px 5px;border-radius:4px;font-size:11px">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8f4ff">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:#c8e6f5">$1</em>')
    .replace(/^### (.+)$/gm, '<div style="color:#00e5ff;font-weight:700;font-size:12px;margin:6px 0 2px;letter-spacing:.3px">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="color:#00e5ff;font-weight:700;font-size:13px;margin:7px 0 2px">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="color:#00e5ff;font-weight:800;font-size:14px;margin:8px 0 3px">$1</div>')
    .replace(/^(?:[-*]) (.+)$/gm, '<div style="padding-left:12px;color:#c8dff0;margin:2px 0;display:flex;gap:5px"><span style="color:#00e5ff;margin-top:1px">â¢</span><span>$1</span></div>')
    .replace(/^(\d+)\.\s(.+)$/gm, '<div style="padding-left:12px;color:#c8dff0;margin:2px 0">$1. $2</div>')
    .replace(/\n/g, '<br/>');

  // Restore math blocks â KaTeX auto-render will handle them client-side
  mathBlocks.forEach((m, i) => {
    html = html.replace(`%%MATH${i}%%`, `<span class="math-inline">${m.replace(/</g,'&lt;')}</span>`);
  });
  return html;
}

// âââ Rich Cards ââââââââââââââââââââââââââââââââââââââââââ
function WeatherCard({ data }: { data: any }) {
  if (!data?.current) return null;
  const c = data.current;
  return (
    <div style={{ marginTop:6, padding:'8px 10px', borderRadius:10, background:'rgba(0,15,35,.6)', border:'1px solid rgba(0,229,255,.12)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <span style={{ fontSize:28 }}>{c.icon||'ð¡ï¸'}</span>
        <div>
          <div style={{ color:'#00e5ff', fontSize:20, fontWeight:700, lineHeight:1 }}>{c.temperature}</div>
          <div style={{ color:'#90caf9', fontSize:11 }}>{c.condition_hindi}</div>
          <div style={{ color:'#546e7a', fontSize:10 }}>{data.location}</div>
        </div>
        <div style={{ marginLeft:'auto', textAlign:'right', fontSize:10, color:'#90caf9' }}>
          <div>ð§ {c.humidity}</div><div>ð¨ {c.wind}</div>
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
  return (
    <div style={{ marginTop:6, borderRadius:10, overflow:'hidden', border:'1px solid rgba(0,229,255,.1)' }}>
      <img src={url} alt={data.prompt||''} style={{ width:'100%', maxHeight:240, objectFit:'cover', display:'block' }}
        onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}} />
      {data.prompt && <div style={{ padding:'5px 9px', fontSize:10, color:'#546e7a', background:'rgba(0,15,35,.6)' }}>"{data.prompt.slice(0,70)}"</div>}
    </div>
  );
}

function NewsCard({ data }: { data: any }) {
  if (!data?.articles) return null;
  return (
    <div style={{ marginTop:6, padding:'6px 10px', borderRadius:10, background:'rgba(0,15,35,.6)', border:'1px solid rgba(0,229,255,.1)' }}>
      {data.articles.slice(0,4).map((a:any,i:number)=>(
        <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ display:'block', padding:'5px 0', borderBottom:i<3?'1px solid rgba(0,229,255,.07)':'none', textDecoration:'none' }}>
          <div style={{ color:'#d0e8f8', fontSize:11, lineHeight:1.4 }}>{a.title}</div>
          <div style={{ color:'#37474f', fontSize:10, marginTop:1 }}>{a.source} â¢ {a.published?.split(' ')[0]}</div>
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

// âââ Action Bar ââââââââââââââââââââââââââââââââââââââââââ
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
    } else copy();
  };

  const btn: React.CSSProperties = {
    background:'none', border:'none', cursor:'pointer',
    padding:'3px 6px', fontSize:13, borderRadius:6, color:'#2e4a60',
  };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:1, marginTop:2,
      justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && (
        <>
          <button style={{ ...btn, color: liked==='up' ? '#00e676' : '#2e4a60' }}
            onClick={()=>setLiked(liked==='up'?null:'up')}>ð</button>
          <button style={{ ...btn, color: liked==='down' ? '#ff5252' : '#2e4a60' }}
            onClick={()=>setLiked(liked==='down'?null:'down')}>ð</button>
        </>
      )}
      <button style={{ ...btn, color: copied ? '#00e676' : '#2e4a60' }} onClick={copy}>
        {copied ? 'â' : 'ð'}
      </button>
      <button style={btn} onClick={share}>âï¸</button>
    </div>
  );
}

// âââ Main Bubble âââââââââââââââââââââââââââââââââââââââââ
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
      {/* JV avatar â small, only AI */}
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

        {/* Tool tags â tap to reveal */}
        {!isUser && msg.toolsUsed && msg.toolsUsed.length > 0 && showActions && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:3 }}>
            {msg.toolsUsed.map(t=>(
              <span key={t} style={{ padding:'1px 6px', borderRadius:20, fontSize:9,
                border:'1px solid rgba(0,229,255,.25)', color:'#00e5ff',
                background:'rgba(0,229,255,.07)' }}>{TOOL_LABELS[t]||t}</span>
            ))}
          </div>
        )}

        {/* Bubble */}
        <div style={isUser ? {
          padding:'7px 11px',
          borderRadius:'12px 12px 3px 12px',
          background:'linear-gradient(135deg,#0d3060,#0a2040)',
          border:'1px solid rgba(100,181,246,.18)',
          fontSize:13, lineHeight:1.5, color:'#e8f4ff', wordBreak:'break-word',
        } : {
          padding:'7px 11px',
          borderRadius:'3px 12px 12px 12px',
          background:'linear-gradient(135deg,#071828,#0a1e32)',
          border:'1px solid rgba(0,229,255,.1)',
          fontSize:13, lineHeight:1.5, color:'#d0e8f8', wordBreak:'break-word',
        }}
          className="chat-content"
          dangerouslySetInnerHTML={{ __html: isStreaming && !(msg as any).content
            ? '<span style="color:#00e5ff;opacity:.5">â³</span>'
            : renderMarkdown((msg as any).content||'') }}
        />

        <RichContent richData={(msg as any).richData} />

        {/* Timestamp â tiny, very subtle */}
        <div style={{ display:'flex', alignItems:'center',
          justifyContent: isUser ? 'flex-end' : 'flex-start', marginTop:1 }}>
          <span style={{ fontSize:9, color:'#1e3040', fontFamily:'monospace' }}>
            {isStreaming ? 'â³' : time}
          </span>
        </div>

        {/* Action bar â tap to show */}
        {showActions && !isStreaming && (
          <ActionBar msg={msg} isUser={isUser} />
        )}
      </div>

      {/* à¤à¤ª avatar â small */}
      {isUser && (
        <div style={{
          width:20, height:20, borderRadius:5, flexShrink:0, marginTop:2,
          background:'rgba(21,101,192,.18)', border:'1px solid rgba(100,181,246,.22)',
          color:'#64b5f6', fontSize:8,
          display:'flex', alignItems:'center', justifyContent:'center'
        }}>à¤à¤ª</div>
      )}
    </div>
  );
}
