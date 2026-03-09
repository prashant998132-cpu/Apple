'use client'
import { useState, useEffect } from 'react'

// ── AI PROVIDERS ──────────────────────────────────────────
const AI_PROVIDERS = [
  // FREE — no key
  { id:'pollinations', name:'Pollinations AI',   emoji:'🌸', free:true,  keyName:'',                    limit:'Unlimited ∞',   quality:3, note:'Always works, no key' },
  { id:'openrouter0',  name:'OpenRouter Free',    emoji:'🔀', free:true,  keyName:'',                    limit:'200 req/day',   quality:3, note:'Free models' },
  // KEY NEEDED
  { id:'groq',         name:'Groq (Llama 3.3)',   emoji:'⚡', free:false, keyName:'jarvis_key_groq',     limit:'6000 req/day',  quality:5, note:'Fastest — Primary' },
  { id:'gemini',       name:'Gemini 2.0 Flash',   emoji:'💎', free:false, keyName:'jarvis_key_gemini',   limit:'1500 req/day',  quality:5, note:'Best quality free' },
  { id:'together',     name:'Together AI',         emoji:'🤝', free:false, keyName:'jarvis_key_together', limit:'$25 credit',    quality:4, note:'Many models' },
  { id:'cerebras',     name:'Cerebras',            emoji:'🧠', free:false, keyName:'jarvis_key_cerebras', limit:'1000 req/day',  quality:4, note:'Ultra fast' },
  { id:'mistral',      name:'Mistral Small',       emoji:'🌊', free:false, keyName:'jarvis_key_mistral',  limit:'500 req/day',   quality:4, note:'European AI' },
  { id:'cohere',       name:'Cohere Command-R',    emoji:'🔮', free:false, keyName:'jarvis_key_cohere',   limit:'1000 req/day',  quality:4, note:'Good for RAG' },
  { id:'fireworks',    name:'Fireworks AI',        emoji:'🎆', free:false, keyName:'jarvis_key_fireworks',limit:'600 req/day',   quality:4, note:'Fast inference' },
  { id:'deepinfra',    name:'DeepInfra',           emoji:'🏗️', free:false, keyName:'jarvis_key_deepinfra',limit:'500 req/day',   quality:3, note:'Many open models' },
  { id:'huggingface',  name:'HuggingFace',         emoji:'🤗', free:false, keyName:'jarvis_key_hf',       limit:'1000 req/day',  quality:3, note:'Open source models' },
  { id:'openai',       name:'OpenAI GPT-4o',       emoji:'🟢', free:false, keyName:'jarvis_key_openai',   limit:'Paid',          quality:5, note:'Best overall' },
  { id:'anthropic',    name:'Claude (Anthropic)',  emoji:'🔶', free:false, keyName:'jarvis_key_anthropic',limit:'Paid',          quality:5, note:'Best reasoning' },
  { id:'deepseek',     name:'DeepSeek R1',         emoji:'🐋', free:false, keyName:'jarvis_key_deepseek', limit:'Free credits',  quality:5, note:'Best free reasoning' },
  { id:'aimlapi',      name:'AIML API',            emoji:'🧬', free:false, keyName:'jarvis_key_aimlapi',  limit:'Free credits',  quality:4, note:'100+ models' },
  { id:'perplexity',   name:'Perplexity',          emoji:'🔍', free:false, keyName:'jarvis_key_perplexity',limit:'$5 credit',    quality:4, note:'Web search AI' },
]

// ── PRODUCTIVITY & CREATIVE APPS ──────────────────────────
const CONNECTED_APPS = [
  // DEV TOOLS
  { id:'github',    name:'GitHub',          emoji:'🐙', cat:'Dev Tools',    free:false, keyName:'jarvis_key_github_pat',    ph:'ghp_...',    link:'https://github.com/settings/tokens',    desc:'Repos, commits, issues, PRs' },
  { id:'vercel',    name:'Vercel',          emoji:'▲',  cat:'Dev Tools',    free:false, keyName:'jarvis_key_vercel_token',  ph:'vercel_...', link:'https://vercel.com/account/tokens',      desc:'Deployments, logs, projects' },
  { id:'supabase',  name:'Supabase',        emoji:'⚡', cat:'Dev Tools',    free:false, keyName:'jarvis_key_supabase',      ph:'sbp_...',    link:'https://supabase.com/dashboard',         desc:'Database, auth, storage' },
  // PRODUCTIVITY
  { id:'notion',    name:'Notion',          emoji:'📝', cat:'Productivity', free:false, keyName:'jarvis_key_notion',        ph:'secret_...', link:'https://www.notion.so/my-integrations',  desc:'Notes, databases, pages' },
  { id:'todoist',   name:'Todoist',         emoji:'✅', cat:'Productivity', free:false, keyName:'jarvis_key_todoist',       ph:'API token',  link:'https://todoist.com/prefs/integrations', desc:'Tasks, projects, reminders' },
  { id:'airtable',  name:'Airtable',        emoji:'📊', cat:'Productivity', free:false, keyName:'jarvis_key_airtable',      ph:'pat...',     link:'https://airtable.com/account',           desc:'Spreadsheet database' },
  // CREATIVE
  { id:'canva',     name:'Canva',           emoji:'🎨', cat:'Creative',     free:false, keyName:'jarvis_key_canva',         ph:'API key',    link:'https://www.canva.com/developers/',      desc:'Design generation, templates' },
  { id:'stability', name:'Stability AI',   emoji:'🖼️', cat:'Creative',     free:false, keyName:'jarvis_key_stability',     ph:'sk-...',     link:'https://platform.stability.ai/',         desc:'Image generation (SDXL)' },
  { id:'replicate', name:'Replicate',       emoji:'🔁', cat:'Creative',     free:false, keyName:'jarvis_key_replicate',     ph:'r8_...',     link:'https://replicate.com/account',          desc:'AI models — image/video/audio' },
  { id:'elevenlabs',name:'ElevenLabs',      emoji:'🎙️', cat:'Creative',     free:false, keyName:'jarvis_key_elevenlabs',    ph:'xi-api-...', link:'https://elevenlabs.io/settings',         desc:'Ultra-realistic TTS voice' },
  // SEARCH & DATA
  { id:'serper',    name:'Serper (Google)', emoji:'🔎', cat:'Search',       free:false, keyName:'jarvis_key_serper',        ph:'...',        link:'https://serper.dev',                     desc:'Google search API — 2500/mo free' },
  { id:'gnews',     name:'GNews',           emoji:'📰', cat:'Search',       free:false, keyName:'jarvis_key_gnews',         ph:'...',        link:'https://gnews.io',                       desc:'News API — 100/day free' },
  { id:'newsapi',   name:'NewsAPI',         emoji:'📡', cat:'Search',       free:false, keyName:'jarvis_key_newsapi',       ph:'...',        link:'https://newsapi.org',                    desc:'News from 80,000+ sources' },
  { id:'omdb',      name:'OMDB (Movies)',   emoji:'🎬', cat:'Search',       free:false, keyName:'jarvis_key_omdb',          ph:'...',        link:'http://www.omdbapi.com/apikey.aspx',     desc:'1000 movies/day free' },
  // COMMUNICATION
  { id:'telegram',  name:'Telegram Bot',   emoji:'✈️', cat:'Communication',free:false, keyName:'jarvis_key_telegram',      ph:'bot_token',  link:'https://t.me/BotFather',                 desc:'Send messages via Telegram' },
  { id:'whatsapp',  name:'WhatsApp Cloud', emoji:'💬', cat:'Communication',free:false, keyName:'jarvis_key_whatsapp',      ph:'token',      link:'https://developers.facebook.com',        desc:'WhatsApp Business API' },
  // FINANCE
  { id:'alphavatange',name:'AlphaVantage', emoji:'📈', cat:'Finance',      free:false, keyName:'jarvis_key_alphavantage',  ph:'...',        link:'https://www.alphavantage.co/support/#api-key', desc:'Stocks, forex, crypto — 25/day free' },
  { id:'coinmarketcap',name:'CoinMarketCap',emoji:'💰',cat:'Finance',      free:false, keyName:'jarvis_key_cmc',           ph:'...',        link:'https://pro.coinmarketcap.com/signup',   desc:'Crypto prices — 10k/mo free' },
]

// ── FREE SERVICES (no key needed) ─────────────────────────
const FREE_SERVICES = [
  { id:'weather',    name:'Weather',         emoji:'🌤️', desc:'wttr.in — always free' },
  { id:'wikipedia',  name:'Wikipedia',       emoji:'📖', desc:'Knowledge base' },
  { id:'nasa',       name:'NASA APOD',       emoji:'🚀', desc:'Space photo daily' },
  { id:'crypto_f',   name:'Crypto Prices',   emoji:'💰', desc:'CoinGecko — free' },
  { id:'cricket',    name:'Cricket Scores',  emoji:'🏏', desc:'Live IPL/Test scores' },
  { id:'stock_f',    name:'Stocks NSE/BSE',  emoji:'📈', desc:'Yahoo Finance — free' },
  { id:'qr',         name:'QR Generator',    emoji:'📱', desc:'qrserver.com — free' },
  { id:'uuid',       name:'UUID Generator',  emoji:'🆔', desc:'Local generation' },
  { id:'hash',       name:'SHA-256 Hash',    emoji:'🔐', desc:'Crypto.subtle — local' },
  { id:'translate',  name:'Translation',     emoji:'🌐', desc:'LibreTranslate — free' },
  { id:'hackernews', name:'HackerNews',      emoji:'💻', desc:'Tech news — free' },
  { id:'gutenberg',  name:'Free Books',      emoji:'📚', desc:'10k+ classic books' },
  { id:'iss',        name:'ISS Location',    emoji:'🛸', desc:'Real-time ISS tracker' },
  { id:'earthquake', name:'Earthquake Data', emoji:'🌍', desc:'USGS seismic data' },
  { id:'bmi_f',      name:'BMI Calculator',  emoji:'⚖️', desc:'Local calculation' },
  { id:'emi_f',      name:'Loan EMI Calc',   emoji:'💰', desc:'Local calculation' },
  { id:'sip_f',      name:'SIP Calculator',  emoji:'📊', desc:'Local calculation' },
  { id:'aiimage_f',  name:'AI Image',        emoji:'🎨', desc:'Pollinations — unlimited' },
  { id:'anime',      name:'Anime Info',      emoji:'🎌', desc:'Jikan API — free' },
  { id:'pokemon',    name:'PokéAPI',          emoji:'⚡', desc:'All pokemon data' },
]

export default function ConnectedApps() {
  const [keys, setKeys]         = useState<Record<string,string>>({})
  const [starred, setStarred]   = useState<string[]>([])
  const [disabled, setDisabled] = useState<string[]>([])
  const [editKey, setEditKey]   = useState<string|null>(null)
  const [tempKey, setTempKey]   = useState('')
  const [section, setSection]   = useState<'ai'|'apps'|'free'>('ai')

  useEffect(() => {
    const s = JSON.parse(localStorage.getItem('jarvis_starred_apps') || '[]')
    const d = JSON.parse(localStorage.getItem('jarvis_disabled_apps') || '[]')
    setStarred(s); setDisabled(d)
    const k: Record<string,string> = {}
    ;[...AI_PROVIDERS, ...CONNECTED_APPS].forEach(p => {
      if (p.keyName) { const v = localStorage.getItem(p.keyName); if(v) k[p.id] = v }
    })
    setKeys(k)
  }, [])

  const toggleStar = (id: string) => {
    const n = starred.includes(id) ? starred.filter(x=>x!==id) : [...starred, id]
    setStarred(n); localStorage.setItem('jarvis_starred_apps', JSON.stringify(n))
  }
  const toggleEnable = (id: string) => {
    const n = disabled.includes(id) ? disabled.filter(x=>x!==id) : [...disabled, id]
    setDisabled(n); localStorage.setItem('jarvis_disabled_apps', JSON.stringify(n))
  }
  const saveKey = (keyName: string, id: string) => {
    if (!keyName || !tempKey.trim()) return
    localStorage.setItem(keyName, tempKey.trim())
    setKeys(p => ({...p, [id]: tempKey.trim()}))
    setEditKey(null); setTempKey('')
  }

  const C = {
    wrap: { padding:'0 0 80px' },
    tabs: { display:'flex', gap:6, marginBottom:12 },
    tab: (a:boolean) => ({ flex:1, padding:'8px 4px', borderRadius:8, border:`1px solid ${a?'#00e5ff':'rgba(0,229,255,.1)'}`, background:a?'rgba(0,229,255,.1)':'transparent', color:a?'#00e5ff':'#2a5070', fontSize:11, cursor:'pointer', fontWeight:a?700:400 }),
    stats: { display:'flex', gap:6, marginBottom:12 },
    stat: { flex:1, padding:'8px 6px', background:'rgba(0,229,255,.04)', border:'1px solid rgba(0,229,255,.06)', borderRadius:8, textAlign:'center' as const },
    statN: { fontSize:16, fontWeight:700, color:'#00e5ff' },
    statL: { fontSize:9, color:'#2a5070' },
    card: (on:boolean) => ({ background:on?'#071828':'rgba(5,10,20,.5)', border:`1px solid rgba(0,229,255,${on?.07:.03})`, borderRadius:10, padding:'10px 12px', marginBottom:6, opacity:on?1:.5 }),
    row: { display:'flex', alignItems:'flex-start', gap:10 },
    em: { fontSize:22, flexShrink:0, marginTop:2 },
    info: { flex:1, minWidth:0 },
    name: { fontSize:13, color:'#c8e0f0', fontWeight:600 },
    sub: { fontSize:10, color:'#2a5070', marginTop:1 },
    note: { fontSize:9, color:'#1a3050', marginTop:1, fontStyle:'italic' as const },
    actions: { display:'flex', gap:5, alignItems:'center', flexShrink:0 },
    star: (a:boolean) => ({ background:'transparent', border:'none', fontSize:15, cursor:'pointer', opacity:a?1:.25, padding:'2px 3px' }),
    tog: (on:boolean) => ({ width:36, height:20, borderRadius:10, background:on?'rgba(0,229,255,.25)':'rgba(255,255,255,.06)', border:`1px solid ${on?'#00e5ff':'rgba(255,255,255,.1)'}`, cursor:'pointer', position:'relative' as const, flexShrink:0 }),
    togDot: (on:boolean) => ({ position:'absolute' as const, top:2, left:on?16:2, width:14, height:14, borderRadius:'50%', background:on?'#00e5ff':'#2a4060', transition:'left .18s' }),
    keyBox: { marginTop:8, padding:'8px 10px', background:'rgba(255,152,0,.04)', border:'1px solid rgba(255,152,0,.1)', borderRadius:7 },
    keyStatus: (has:boolean) => ({ fontSize:10, color:has?'#00e676':'#ff9944', marginBottom:6 }),
    keyRow: { display:'flex', gap:6 },
    keyIn: { flex:1, padding:'6px 8px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,152,0,.2)', borderRadius:6, color:'#e0f4ff', fontSize:11, fontFamily:'monospace' },
    keySave: { padding:'6px 10px', background:'rgba(255,152,0,.15)', border:'1px solid rgba(255,152,0,.3)', borderRadius:6, color:'#ff9944', fontSize:11, cursor:'pointer', whiteSpace:'nowrap' as const },
    keyCancel: { padding:'6px 8px', background:'transparent', border:'1px solid rgba(239,83,80,.2)', borderRadius:6, color:'#ef5350', fontSize:11, cursor:'pointer' },
    keyBtn: { width:'100%', padding:'7px', background:'rgba(255,152,0,.08)', border:'1px solid rgba(255,152,0,.2)', borderRadius:6, color:'#ff9944', fontSize:11, cursor:'pointer', marginTop:2 },
    freeBadge: { fontSize:8, padding:'1px 6px', borderRadius:10, background:'rgba(0,230,118,.1)', color:'#00e676', border:'1px solid rgba(0,230,118,.2)', marginLeft:5 },
    keyBadge: { fontSize:8, padding:'1px 6px', borderRadius:10, background:'rgba(255,152,0,.1)', color:'#ffa000', border:'1px solid rgba(255,152,0,.2)', marginLeft:5 },
    connBadge: { fontSize:8, padding:'1px 6px', borderRadius:10, background:'rgba(0,230,118,.12)', color:'#00e676', border:'1px solid rgba(0,230,118,.25)', marginLeft:5 },
    catHeader: { fontSize:9, color:'#1e3a50', letterSpacing:2, fontWeight:700, marginTop:10, marginBottom:5, paddingLeft:2 },
    qualBar: (q:number) => ({ display:'flex', gap:2, marginTop:3 }),
    dot: (filled:boolean) => ({ width:6, height:6, borderRadius:'50%', background:filled?'#00e5ff':'rgba(0,229,255,.15)' }),
  }

  const connectedAI = AI_PROVIDERS.filter(p => !p.free && keys[p.id]).length
  const connectedApps = CONNECTED_APPS.filter(p => keys[p.id]).length
  const starredCount = starred.length

  // Sort: starred first
  const sortedAI = [...AI_PROVIDERS].sort((a,b) => {
    const as = starred.includes(a.id) ? 0 : 1
    const bs = starred.includes(b.id) ? 0 : 1
    return as - bs
  })

  return (
    <div style={C.wrap}>
      {/* Stats */}
      <div style={C.stats}>
        <div style={C.stat}><div style={C.statN}>{AI_PROVIDERS.length}</div><div style={C.statL}>AI Models</div></div>
        <div style={C.stat}><div style={C.statN}>{connectedAI + 2}</div><div style={C.statL}>Connected</div></div>
        <div style={C.stat}><div style={{...C.statN, color:'#ffd700'}}>{starredCount}</div><div style={C.statL}>⭐ Starred</div></div>
        <div style={C.stat}><div style={{...C.statN, color:'#00e676'}}>{FREE_SERVICES.length}</div><div style={C.statL}>Free APIs</div></div>
      </div>

      {/* Section tabs */}
      <div style={C.tabs}>
        <button style={C.tab(section==='ai')} onClick={()=>setSection('ai')}>🤖 AI Models</button>
        <button style={C.tab(section==='apps')} onClick={()=>setSection('apps')}>🔌 Apps</button>
        <button style={C.tab(section==='free')} onClick={()=>setSection('free')}>✅ Free APIs</button>
      </div>

      {/* ── AI PROVIDERS ── */}
      {section === 'ai' && (
        <div>
          <div style={{ fontSize:10, color:'#4a7090', marginBottom:10, lineHeight:1.6, padding:'8px 10px', background:'rgba(0,229,255,.03)', borderRadius:8 }}>
            💡 <b>Smart Router:</b> JARVIS automatically uses starred providers first, then falls back in order. Limit 85% pe reach karte hi next provider pe switch ho jaata hai.
          </div>
          {sortedAI.map(p => {
            const on = !disabled.includes(p.id)
            const hasKey = p.free || !!keys[p.id]
            const isEditing = editKey === p.id
            const isStarred = starred.includes(p.id)
            return (
              <div key={p.id} style={C.card(on)}>
                <div style={C.row}>
                  <div style={C.em}>{p.emoji}</div>
                  <div style={C.info}>
                    <div style={C.name}>
                      {p.name}
                      {p.free ? <span style={C.freeBadge}>FREE ∞</span> : hasKey ? <span style={C.connBadge}>CONNECTED</span> : <span style={C.keyBadge}>KEY NEEDED</span>}
                    </div>
                    <div style={C.sub}>{p.limit}</div>
                    <div style={C.note}>{p.note}</div>
                    {/* Quality dots */}
                    <div style={C.qualBar(p.quality)}>
                      {[1,2,3,4,5].map(i => <div key={i} style={C.dot(i<=p.quality)}/>)}
                    </div>
                  </div>
                  <div style={C.actions}>
                    <button style={C.star(isStarred)} onClick={()=>toggleStar(p.id)} title="Star as priority">⭐</button>
                    <div style={C.tog(on)} onClick={()=>toggleEnable(p.id)}>
                      <div style={C.togDot(on)}/>
                    </div>
                  </div>
                </div>
                {!p.free && (
                  <div style={C.keyBox}>
                    <div style={C.keyStatus(!!keys[p.id])}>{keys[p.id] ? '✅ Connected' : '⚠️ API Key nahi hai'}</div>
                    {isEditing ? (
                      <div>
                        <div style={C.keyRow}>
                          <input style={C.keyIn} type="password" placeholder="API Key paste karo..." value={tempKey} onChange={e=>setTempKey(e.target.value)} autoFocus/>
                          <button style={C.keySave} onClick={()=>saveKey(p.keyName,p.id)}>Save</button>
                          <button style={C.keyCancel} onClick={()=>{setEditKey(null);setTempKey('')}}>✕</button>
                        </div>
                      </div>
                    ) : (
                      <button style={C.keyBtn} onClick={()=>{setEditKey(p.id);setTempKey(keys[p.id]||'')}}>
                        {keys[p.id] ? '✏️ Key update karo' : '+ Key add karo'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── CONNECTED APPS ── */}
      {section === 'apps' && (
        <div>
          <div style={{ fontSize:10, color:'#4a7090', marginBottom:10, lineHeight:1.6, padding:'8px 10px', background:'rgba(0,229,255,.03)', borderRadius:8 }}>
            🔌 <b>Third-party apps:</b> Key add karo → JARVIS in apps ke saath kaam karega. Star karo jo sabse zyada use karte ho.
          </div>
          {['Dev Tools','Productivity','Creative','Search','Communication','Finance'].map(cat => {
            const items = CONNECTED_APPS.filter(a => a.cat === cat)
            return (
              <div key={cat}>
                <div style={C.catHeader}>{cat.toUpperCase()}</div>
                {items.map(app => {
                  const on = !disabled.includes(app.id)
                  const hasKey = !!keys[app.id]
                  const isEditing = editKey === app.id
                  const isStarred = starred.includes(app.id)
                  return (
                    <div key={app.id} style={C.card(on)}>
                      <div style={C.row}>
                        <div style={C.em}>{app.emoji}</div>
                        <div style={C.info}>
                          <div style={C.name}>
                            {app.name}
                            {hasKey ? <span style={C.connBadge}>CONNECTED</span> : <span style={C.keyBadge}>KEY NEEDED</span>}
                          </div>
                          <div style={C.sub}>{app.desc}</div>
                        </div>
                        <div style={C.actions}>
                          <button style={C.star(isStarred)} onClick={()=>toggleStar(app.id)}>⭐</button>
                          <div style={C.tog(on)} onClick={()=>toggleEnable(app.id)}>
                            <div style={C.togDot(on)}/>
                          </div>
                        </div>
                      </div>
                      <div style={C.keyBox}>
                        <div style={C.keyStatus(hasKey)}>{hasKey ? '✅ Connected' : '⚠️ API Key chahiye'}</div>
                        {isEditing ? (
                          <div>
                            <div style={C.keyRow}>
                              <input style={C.keyIn} type="password" placeholder={app.ph} value={tempKey} onChange={e=>setTempKey(e.target.value)} autoFocus/>
                              <button style={C.keySave} onClick={()=>saveKey(app.keyName,app.id)}>Save</button>
                              <button style={C.keyCancel} onClick={()=>{setEditKey(null);setTempKey('')}}>✕</button>
                            </div>
                            <div style={{ fontSize:9, color:'#1a3050', marginTop:4 }}>
                              Key yahan se lo: <a href={app.link} target="_blank" rel="noreferrer" style={{color:'#1e4060'}}>{app.link}</a>
                            </div>
                          </div>
                        ) : (
                          <button style={C.keyBtn} onClick={()=>{setEditKey(app.id);setTempKey(keys[app.id]||'')}}>
                            {hasKey ? '✏️ Key update karo' : '+ Key add karo'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* ── FREE APIS ── */}
      {section === 'free' && (
        <div>
          <div style={{ fontSize:10, color:'#00e676', marginBottom:10, lineHeight:1.6, padding:'8px 10px', background:'rgba(0,230,118,.03)', borderRadius:8, border:'1px solid rgba(0,230,118,.1)' }}>
            ✅ Yeh sab <b>FREE hain — koi key nahi chahiye.</b> Bas baat karo, JARVIS automatically use karega.
          </div>
          {FREE_SERVICES.map(s => (
            <div key={s.id} style={{ ...C.card(true), display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20 }}>{s.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:'#c8e0f0', fontWeight:600 }}>{s.name} <span style={C.freeBadge}>FREE</span></div>
                <div style={{ fontSize:10, color:'#2a5070' }}>{s.desc}</div>
              </div>
              <span style={{ fontSize:10, color:'#00e676' }}>✓ Active</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
