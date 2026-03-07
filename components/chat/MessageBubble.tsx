'use client';
import type { JarvisMessage } from '../../types/jarvis.types';

const TOOL_LABELS: Record<string, string> = {
  get_weather: '🌤️ मौसम', get_datetime: '🕐 समय', search_wikipedia: '📖 Wiki',
  get_india_news: '📰 खबर', search_youtube: '▶️ YouTube', generate_image_fast: '🎨 Image',
  generate_image_quality: '🎨 Image HD', search_movies: '🎬 Film', get_crypto_price: '💰 Crypto',
  get_nasa_content: '🚀 NASA', get_photos: '📸 Photo', get_stock_video: '🎥 Video',
  get_exchange_rate: '💱 Rate', get_recipe: '🍛 Recipe', get_air_quality: '🌫️ AQI',
  get_public_holidays: '🎉 Holiday', get_joke: '😄 Joke', get_iss_location: '🛸 ISS',
  translate_text: '🌐 Translate', calculate: '🔢 Math', save_memory: '🧠 Memory',
  get_rewa_info: '📍 Rewa', lookup_pincode: '📮 Pincode', get_hackernews: '💻 Tech',
  get_reddit_posts: '📱 Reddit', search_books: '📚 Books', get_sunrise_sunset: '🌅 Sun',
};

function renderMarkdown(text: string) {
  return text
    .replace(/\[LEARN:[^\]]*\]/g, '')
    .replace(/```[\s\S]*?```/g, (m) => `<pre style="background:rgba(0,229,255,.06);border:1px solid rgba(0,229,255,.15);border-radius:8px;padding:10px;margin:6px 0;overflow-x:auto;font-size:12px;color:#a8ffec;font-family:monospace">${m.replace(/```\w*\n?/g,'').replace(/```/g,'')}</pre>`)
    .replace(/`(.+?)`/g, '<code style="background:rgba(0,229,255,.1);color:#a8ffec;padding:2px 5px;border-radius:4px;font-size:12px">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8f4ff;font-weight:700">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:#c8e6f5">$1</em>')
    .replace(/^#{1,3} (.+)$/gm, '<div style="color:#00e5ff;font-weight:700;font-size:15px;margin:8px 0 4px">$1</div>')
    .replace(/^- (.+)$/gm, '<div style="padding-left:12px;color:#c8e6f5">• $1</div>')
    .replace(/\n/g, '<br/>');
}

function WeatherCard({ data }: { data: any }) {
  if (!data?.current) return null;
  const c = data.current;
  return (
    <div style={RC.card}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
        <span style={{ fontSize:40 }}>{c.icon||'🌡️'}</span>
        <div>
          <div style={{ color:'#00e5ff', fontSize:26, fontWeight:700 }}>{c.temperature}</div>
          <div style={{ color:'#90caf9', fontSize:13 }}>{c.condition_hindi}</div>
          <div style={{ color:'#78909c', fontSize:12 }}>{data.location}</div>
        </div>
        <div style={{ marginLeft:'auto', textAlign:'right' }}>
          <div style={{ color:'#90caf9', fontSize:12 }}>💧 {c.humidity}</div>
          <div style={{ color:'#90caf9', fontSize:12 }}>💨 {c.wind}</div>
          <div style={{ color:'#90caf9', fontSize:12 }}>🌡️ {c.feels_like}</div>
        </div>
      </div>
      {data.forecast && (
        <div style={{ display:'flex', gap:6, overflowX:'auto' }}>
          {data.forecast.slice(0,5).map((f:any,i:number)=>(
            <div key={i} style={{ textAlign:'center', minWidth:56, padding:'7px 5px', background:'rgba(0,229,255,.07)', borderRadius:10, fontSize:12 }}>
              <div style={{ color:'#78909c' }}>{new Date(f.date).toLocaleDateString('hi-IN',{weekday:'short'})}</div>
              <div style={{ fontSize:18, margin:'3px 0' }}>{f.condition.split(' ').pop()}</div>
              <div style={{ color:'#e8f4ff', fontWeight:600 }}>{f.max}</div>
              <div style={{ color:'#78909c' }}>{f.min}</div>
              <div style={{ color:'#64b5f6', fontSize:11 }}>{f.rain_chance}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageCard({ data }: { data: any }) {
  const url = data?.image_url || data?.image_data_url;
  if (!url) return null;
  return (
    <div style={RC.card}>
      <img src={url} alt={data.prompt||'Generated'} style={{ width:'100%', borderRadius:10, maxHeight:320, objectFit:'cover' }}
        onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}} />
      {data.prompt && <div style={{ fontSize:12, color:'#78909c', marginTop:7 }}>"{data.prompt.slice(0,80)}"</div>}
      {data.image_url && <a href={data.image_url} target="_blank" rel="noreferrer" style={{ display:'inline-block', marginTop:7, fontSize:12, color:'#00e5ff', textDecoration:'none' }}>⬇️ Download</a>}
    </div>
  );
}

function NewsCard({ data }: { data: any }) {
  if (!data?.articles) return null;
  return (
    <div style={RC.card}>
      {data.articles.slice(0,4).map((a:any,i:number)=>(
        <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ display:'block', padding:'9px 0', borderBottom:'1px solid rgba(0,229,255,.1)', textDecoration:'none' }}>
          <div style={{ color:'#e8f4ff', fontSize:13, lineHeight:1.5 }}>{a.title}</div>
          <div style={{ color:'#78909c', fontSize:11, marginTop:3 }}>{a.source} • {a.published?.split(' ')[0]}</div>
        </a>
      ))}
    </div>
  );
}

function YouTubeCard({ data }: { data: any }) {
  if (!data?.videos) return null;
  return (
    <div style={RC.card}>
      {data.videos.slice(0,3).map((v:any)=>(
        <a key={v.id} href={v.url} target="_blank" rel="noreferrer" style={{ display:'flex', gap:10, padding:'9px 0', borderBottom:'1px solid rgba(0,229,255,.1)', textDecoration:'none' }}>
          <img src={v.thumbnail} alt="" style={{ width:88, height:58, borderRadius:7, objectFit:'cover', flexShrink:0 }}
            onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}} />
          <div>
            <div style={{ color:'#e8f4ff', fontSize:13, lineHeight:1.4 }}>{v.title.slice(0,60)}</div>
            <div style={{ color:'#78909c', fontSize:11, marginTop:3 }}>{v.channel}</div>
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

const RC: Record<string, React.CSSProperties> = {
  card: { marginTop:10, padding:12, borderRadius:12, background:'rgba(0,15,35,.6)', border:'1px solid rgba(0,229,255,.12)' },
};

export default function MessageBubble({ msg }: { msg: JarvisMessage }) {
  const isUser = msg.role === 'user';
  const time = new Date(msg.timestamp).toLocaleTimeString('hi-IN', { hour:'2-digit', minute:'2-digit' });
  const isStreaming = (msg as any).streaming;

  return (
    <div style={{ display:'flex', gap:10, marginBottom:16, justifyContent:isUser?'flex-end':'flex-start', alignItems:'flex-start', padding:'0 4px' }}>
      {!isUser && (
        <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, marginTop:2,
          background:'linear-gradient(135deg,rgba(0,229,255,.15),rgba(0,229,255,.05))',
          border:'1px solid rgba(0,229,255,.35)', color:'#00e5ff', fontSize:10,
          fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center',
          letterSpacing:1, fontFamily:'monospace', boxShadow:'0 0 10px rgba(0,229,255,.1)' }}>JV</div>
      )}
      <div style={{ maxWidth:'80%', minWidth:60 }}>
        {!isUser && msg.toolsUsed && msg.toolsUsed.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:6 }}>
            {msg.toolsUsed.map(t=>(
              <span key={t} style={{ padding:'3px 8px', borderRadius:20, fontSize:11,
                border:'1px solid rgba(0,229,255,.3)', color:'#00e5ff',
                background:'rgba(0,229,255,.08)', whiteSpace:'nowrap' }}>{TOOL_LABELS[t]||t}</span>
            ))}
          </div>
        )}
        <div style={isUser ? {
          padding:'11px 15px', borderRadius:'16px 16px 4px 16px',
          background:'linear-gradient(135deg,#0d3060,#0a2040)',
          border:'1px solid rgba(100,181,246,.25)',
          fontSize:14, lineHeight:1.65, color:'#e8f4ff', wordBreak:'break-word',
          boxShadow:'0 2px 12px rgba(13,48,96,.4)'
        } : {
          padding:'11px 15px', borderRadius:'4px 16px 16px 16px',
          background:'linear-gradient(135deg,#071828,#0a1e32)',
          border:'1px solid rgba(0,229,255,.12)',
          fontSize:14, lineHeight:1.65, color:'#d0e8f8', wordBreak:'break-word',
          boxShadow:'0 2px 12px rgba(0,0,0,.3)'
        }}
          className="chat-content"
          dangerouslySetInnerHTML={{ __html: isStreaming && !(msg as any).content
            ? '<span style="color:#00e5ff;opacity:0.7">⏳ Soch raha hoon...</span>'
            : renderMarkdown((msg as any).content||'') }}
        />
        <RichContent richData={(msg as any).richData} />
        <div style={{ fontSize:11, color:'#546e7a', marginTop:5,
          textAlign:isUser?'right':'left', fontFamily:'monospace' }}>
          {isStreaming ? '⟳ typing...' : time}
          {!(msg as any).streaming && (msg as any).processingMs > 0 && (
            <span style={{ marginLeft:6, color:'#37474f' }}>{(msg as any).processingMs}ms</span>
          )}
        </div>
      </div>
      {isUser && (
        <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, marginTop:2,
          background:'linear-gradient(135deg,rgba(21,101,192,.25),rgba(21,101,192,.1))',
          border:'1px solid rgba(100,181,246,.3)', color:'#90caf9', fontSize:11,
          display:'flex', alignItems:'center', justifyContent:'center' }}>आप</div>
      )}
    </div>
  );
}
