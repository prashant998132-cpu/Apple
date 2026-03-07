'use client';
// components/chat/MessageBubble.tsx — All rich card types
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
    .replace(/\[LEARN:[^\]]*\]/g, '')   // strip [LEARN:key=value]
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}

// ─── Rich Cards ───────────────────────────────────────────
function WeatherCard({ data }: { data: any }) {
  if (!data?.current) return null;
  const c = data.current;
  return (
    <div style={RC.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 36 }}>{c.icon || '🌡️'}</span>
        <div>
          <div style={{ color: '#00e5ff', fontSize: 24, fontWeight: 700 }}>{c.temperature}</div>
          <div style={{ color: '#4a7096', fontSize: 12 }}>{c.condition_hindi}</div>
          <div style={{ color: '#4a7096', fontSize: 11 }}>{data.location}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ color: '#4a7096', fontSize: 11 }}>💧 {c.humidity}</div>
          <div style={{ color: '#4a7096', fontSize: 11 }}>💨 {c.wind}</div>
          <div style={{ color: '#4a7096', fontSize: 11 }}>🌧️ Feels {c.feels_like}</div>
        </div>
      </div>
      {data.forecast && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {data.forecast.slice(0, 5).map((f: any, i: number) => (
            <div key={i} style={{ textAlign: 'center', minWidth: 52, padding: '6px 4px', background: 'rgba(0,229,255,.05)', borderRadius: 8, fontSize: 11 }}>
              <div style={{ color: '#4a7096' }}>{new Date(f.date).toLocaleDateString('hi-IN', { weekday: 'short' })}</div>
              <div style={{ fontSize: 16, margin: '3px 0' }}>{f.condition.split(' ').pop()}</div>
              <div style={{ color: '#e8f4ff' }}>{f.max}</div>
              <div style={{ color: '#4a7096' }}>{f.min}</div>
              <div style={{ color: '#64b5f6', fontSize: 10 }}>{f.rain_chance}</div>
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
      <img src={url} alt={data.prompt || 'Generated'} style={{ width: '100%', borderRadius: 8, maxHeight: 300, objectFit: 'cover' }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      {data.prompt && <div style={{ fontSize: 11, color: '#4a7096', marginTop: 6 }}>"{data.prompt.slice(0, 80)}"</div>}
      {data.image_url && (
        <a href={data.image_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 6, fontSize: 11, color: '#00e5ff' }}>⬇️ Download</a>
      )}
    </div>
  );
}

function NewsCard({ data }: { data: any }) {
  if (!data?.articles) return null;
  return (
    <div style={RC.card}>
      {data.articles.slice(0, 4).map((a: any, i: number) => (
        <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '8px 0', borderBottom: '1px solid rgba(0,229,255,.08)', textDecoration: 'none' }}>
          <div style={{ color: '#e8f4ff', fontSize: 13, lineHeight: 1.4 }}>{a.title}</div>
          <div style={{ color: '#4a7096', fontSize: 11, marginTop: 3 }}>{a.source} • {a.published?.split(' ')[0]}</div>
        </a>
      ))}
    </div>
  );
}

function YouTubeCard({ data }: { data: any }) {
  if (!data?.videos) return null;
  return (
    <div style={RC.card}>
      {data.videos.slice(0, 3).map((v: any) => (
        <a key={v.id} href={v.url} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(0,229,255,.08)', textDecoration: 'none' }}>
          <img src={v.thumbnail} alt="" style={{ width: 80, height: 54, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div>
            <div style={{ color: '#e8f4ff', fontSize: 12, lineHeight: 1.4 }}>{v.title.slice(0, 60)}</div>
            <div style={{ color: '#4a7096', fontSize: 11, marginTop: 3 }}>{v.channel}</div>
          </div>
        </a>
      ))}
    </div>
  );
}

function MovieCard({ data }: { data: any }) {
  if (!data?.results) return null;
  return (
    <div style={RC.card}>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
        {data.results.slice(0, 4).map((m: any, i: number) => (
          <div key={i} style={{ minWidth: 100, flexShrink: 0 }}>
            {m.poster && <img src={m.poster} alt="" style={{ width: 100, height: 150, borderRadius: 8, objectFit: 'cover' }} />}
            <div style={{ fontSize: 11, color: '#e8f4ff', marginTop: 4 }}>{m.title}</div>
            <div style={{ fontSize: 11, color: '#ffab00' }}>⭐ {m.rating}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CryptoCard({ data }: { data: any }) {
  if (!data?.name) return null;
  const up = data.change_24h?.startsWith('-') === false;
  return (
    <div style={{ ...RC.card, display: 'flex', alignItems: 'center', gap: 12 }}>
      {data.image && <img src={data.image} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />}
      <div>
        <div style={{ color: '#e8f4ff', fontWeight: 600 }}>{data.name} ({data.symbol})</div>
        <div style={{ color: '#00e5ff', fontSize: 20, fontWeight: 700 }}>{data.price_inr}</div>
        <div style={{ fontSize: 12, color: '#4a7096' }}>{data.price_usd}</div>
      </div>
      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
        <div style={{ color: up ? '#00e676' : '#ff4444', fontSize: 14, fontWeight: 600 }}>{data.change_24h}</div>
        <div style={{ fontSize: 11, color: '#4a7096' }}>24h</div>
        <div style={{ fontSize: 11, color: '#4a7096' }}>Rank #{data.rank}</div>
      </div>
    </div>
  );
}

function NASACard({ data }: { data: any }) {
  if (!data?.url) return null;
  return (
    <div style={RC.card}>
      {data.media_type !== 'video' && (
        <img src={data.url} alt={data.title} style={{ width: '100%', borderRadius: 8, maxHeight: 250, objectFit: 'cover' }} />
      )}
      <div style={{ marginTop: 8 }}>
        <div style={{ color: '#00e5ff', fontWeight: 600, fontSize: 13 }}>🚀 {data.title}</div>
        <div style={{ color: '#4a7096', fontSize: 11, marginTop: 4 }}>{data.date}</div>
        {data.explanation && <div style={{ color: '#a8d8f0', fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>{data.explanation.slice(0, 200)}...</div>}
      </div>
    </div>
  );
}

function PhotoCard({ data }: { data: any }) {
  if (!data?.photos?.length) return null;
  return (
    <div style={RC.card}>
      <div style={{ display: 'flex', gap: 6 }}>
        {data.photos.slice(0, 3).map((p: any, i: number) => (
          <a key={i} href={p.url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
            <img src={p.thumb || p.url} alt={p.description || ''} style={{ width: '100%', height: 80, borderRadius: 6, objectFit: 'cover' }} />
          </a>
        ))}
      </div>
    </div>
  );
}

function RecipeCard({ data }: { data: any }) {
  const meal = data?.meals?.[0];
  if (!meal) return null;
  return (
    <div style={RC.card}>
      {meal.image && <img src={meal.image} alt={meal.name} style={{ width: '100%', height: 160, borderRadius: 8, objectFit: 'cover' }} />}
      <div style={{ marginTop: 8 }}>
        <div style={{ color: '#e8f4ff', fontWeight: 600 }}>{meal.name}</div>
        <div style={{ color: '#4a7096', fontSize: 12 }}>{meal.area} • {meal.category}</div>
        {meal.youtube && (
          <a href={meal.youtube} target="_blank" rel="noreferrer" style={{ color: '#ff4444', fontSize: 12, display: 'block', marginTop: 4 }}>▶️ Video Recipe देखो</a>
        )}
      </div>
    </div>
  );
}

function AQICard({ data }: { data: any }) {
  if (!data?.aqi) return null;
  const colors: Record<string, string> = { green: '#00e676', yellow: '#ffab00', orange: '#ff9800', red: '#ff4444', maroon: '#b71c1c' };
  const color = colors[data.color] || '#4a7096';
  return (
    <div style={{ ...RC.card, borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color }}>{data.aqi}</div>
        <div>
          <div style={{ color: '#e8f4ff', fontWeight: 600 }}>AQI — {data.level}</div>
          <div style={{ color: '#4a7096', fontSize: 12 }}>{data.city}</div>
          <div style={{ color, fontSize: 12, marginTop: 4 }}>{data.health_advice}</div>
        </div>
      </div>
    </div>
  );
}

function ExchangeCard({ data }: { data: any }) {
  if (!data?.rate) return null;
  return (
    <div style={{ ...RC.card, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 28 }}>💱</span>
      <div>
        <div style={{ color: '#e8f4ff', fontSize: 13 }}>{data.from} → {data.to}</div>
        <div style={{ color: '#00e5ff', fontSize: 22, fontWeight: 700 }}>
          {data.amount} {data.from} = {parseFloat(data.converted || data.rate).toFixed(2)} {data.to}
        </div>
        <div style={{ color: '#4a7096', fontSize: 11 }}>Rate: {data.rate}</div>
      </div>
    </div>
  );
}

function RichContent({ richData }: { richData: any }) {
  if (!richData) return null;
  const { type, data } = richData;
  if (type === 'weather') return <WeatherCard data={data} />;
  if (type === 'image') return <ImageCard data={data} />;
  if (type === 'news') return <NewsCard data={data} />;
  if (type === 'youtube') return <YouTubeCard data={data} />;
  if (type === 'movie') return <MovieCard data={data} />;
  if (type === 'crypto') return <CryptoCard data={data} />;
  if (type === 'nasa') return <NASACard data={data} />;
  if (type === 'photo') return <PhotoCard data={data} />;
  if (type === 'recipe') return <RecipeCard data={data} />;
  if (type === 'airquality') return <AQICard data={data} />;
  if (type === 'exchange') return <ExchangeCard data={data} />;
  return null;
}

const RC: Record<string, React.CSSProperties> = {
  card: { marginTop: 8, padding: 10, borderRadius: 10, background: 'rgba(0,0,0,.3)', border: '1px solid rgba(0,229,255,.1)' },
};

// ─── Main MessageBubble ───────────────────────────────────
export default function MessageBubble({ msg }: { msg: JarvisMessage }) {
  const isUser = msg.role === 'user';
  const time = new Date(msg.timestamp).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="msg-enter" style={{ display: 'flex', gap: 8, marginBottom: 14, justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
      {!isUser && <div style={A.ai}>JV</div>}
      <div style={{ maxWidth: '78%' }}>
        {/* Tool tags */}
        {!isUser && msg.toolsUsed && msg.toolsUsed.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 }}>
            {msg.toolsUsed.map(t => (
              <span key={t} style={A.tag}>{TOOL_LABELS[t] || t}</span>
            ))}
            {msg.processingMs && <span style={{ ...A.tag, color: '#2a5070', borderColor: '#1e3a5f' }}>{msg.processingMs}ms</span>}
          </div>
        )}
        {/* Bubble */}
        <div style={isUser ? A.user : A.ai_bubble} className="chat-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
        {/* Rich content */}
        <RichContent richData={msg.richData} />
        {/* Time */}
        <div style={{ fontSize: 10, color: '#4a7096', marginTop: 4, textAlign: isUser ? 'right' : 'left', fontFamily: 'monospace' }}>{time}</div>
      </div>
      {isUser && <div style={A.user_av}>आप</div>}
    </div>
  );
}

const A: Record<string, React.CSSProperties> = {
  ai: { width: 28, height: 28, borderRadius: 7, flexShrink: 0, marginTop: 2, background: 'rgba(0,229,255,.08)', border: '1px solid rgba(0,229,255,.25)', color: '#00e5ff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: 1, fontFamily: 'monospace' },
  user_av: { width: 28, height: 28, borderRadius: 7, flexShrink: 0, marginTop: 2, background: 'rgba(21,101,192,.2)', border: '1px solid rgba(21,101,192,.4)', color: '#64b5f6', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  ai_bubble: { padding: '10px 13px', borderRadius: '13px 13px 13px 3px', background: 'linear-gradient(135deg,#060f22,#0a1a35)', border: '1px solid rgba(0,229,255,.1)', fontSize: 14, lineHeight: 1.6, wordBreak: 'break-word' },
  user: { padding: '10px 13px', borderRadius: '13px 13px 3px 13px', background: 'linear-gradient(135deg,#0a2540,#0d3060)', border: '1px solid rgba(21,101,192,.3)', fontSize: 14, lineHeight: 1.6, wordBreak: 'break-word' },
  tag: { padding: '2px 7px', borderRadius: 20, fontSize: 10, border: '1px solid rgba(0,229,255,.3)', color: '#00e5ff', background: 'rgba(0,229,255,.08)', whiteSpace: 'nowrap' },
};
