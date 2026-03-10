'use client'
import { useState, useEffect } from 'react'

// ═══════════════════════════════════════════════════════════
// SMART ROUTER — Category-wise AI providers
// Order = priority order for that category
// JARVIS uses starred first, then falls back in order
// At 85% limit → auto switch to next in category
// ═══════════════════════════════════════════════════════════
const ROUTER_CATEGORIES = [
  {
    id: 'chat',
    label: '💬 Chat / General',
    desc: 'Normal conversation, Q&A, Hinglish chat',
    providers: [
      { id:'groq',       name:'Groq Llama 3.3',    emoji:'⚡', limit:'6000/day',   free:false, key:'jarvis_key_groq',       quality:5 },
      { id:'gemini',     name:'Gemini 2.0 Flash',  emoji:'💎', limit:'1500/day',   free:false, key:'jarvis_key_gemini',     quality:5 },
      { id:'cerebras',   name:'Cerebras',           emoji:'🧠', limit:'1000/day',   free:false, key:'jarvis_key_cerebras',   quality:4 },
      { id:'together',   name:'Together AI',        emoji:'🤝', limit:'$25 credit', free:false, key:'jarvis_key_together',   quality:4 },
      { id:'mistral',    name:'Mistral Small',      emoji:'🌊', limit:'500/day',    free:false, key:'jarvis_key_mistral',    quality:4 },
      { id:'cohere',     name:'Cohere Command-R',   emoji:'🔮', limit:'1000/day',   free:false, key:'jarvis_key_cohere',     quality:4 },
      { id:'fireworks',  name:'Fireworks AI',       emoji:'🎆', limit:'600/day',    free:false, key:'jarvis_key_fireworks',  quality:4 },
      { id:'deepinfra',  name:'DeepInfra',          emoji:'🏗️', limit:'500/day',    free:false, key:'jarvis_key_deepinfra',  quality:3 },
      { id:'openrouter', name:'OpenRouter Free',    emoji:'🔀', limit:'200/day',    free:true,  key:'',                      quality:3 },
      { id:'pollination',name:'Pollinations AI',    emoji:'🌸', limit:'Unlimited',  free:true,  key:'',                      quality:3 },
    ]
  },
  {
    id: 'reasoning',
    label: '🧠 Reasoning / Think Mode',
    desc: 'Complex problems, coding, deep analysis, research',
    providers: [
      { id:'deepseek',   name:'DeepSeek R1',        emoji:'🐋', limit:'Free credits', free:false, key:'jarvis_key_deepseek',    quality:5 },
      { id:'gemini_r',   name:'Gemini 2.0 Flash',  emoji:'💎', limit:'1500/day',    free:false, key:'jarvis_key_gemini',      quality:5 },
      { id:'openai',     name:'OpenAI GPT-4o',      emoji:'🟢', limit:'Paid',        free:false, key:'jarvis_key_openai',      quality:5 },
      { id:'anthropic',  name:'Claude Sonnet',      emoji:'🔶', limit:'Paid',        free:false, key:'jarvis_key_anthropic',   quality:5 },
      { id:'together_r', name:'Together AI',        emoji:'🤝', limit:'$25 credit',  free:false, key:'jarvis_key_together',    quality:4 },
      { id:'groq_r',     name:'Groq Llama 3.3',    emoji:'⚡', limit:'6000/day',   free:false, key:'jarvis_key_groq',        quality:4 },
    ]
  },
  {
    id: 'image',
    label: '🎨 Image Generation',
    desc: 'AI image, art, design generation',
    providers: [
      { id:'pollination_img', name:'Pollinations AI',  emoji:'🌸', limit:'Unlimited',   free:true,  key:'',                          quality:4 },
      { id:'stability',       name:'Stability AI SDXL',emoji:'🖼️', limit:'$10 credit',  free:false, key:'jarvis_key_stability',      quality:5 },
      { id:'replicate',       name:'Replicate',         emoji:'🔁', limit:'$5 credit',   free:false, key:'jarvis_key_replicate',      quality:5 },
      { id:'fal',             name:'Fal.ai',            emoji:'⚡', limit:'Free tier',   free:false, key:'jarvis_key_fal',            quality:4 },
      { id:'hf_img',          name:'HuggingFace',       emoji:'🤗', limit:'1000/day',    free:false, key:'jarvis_key_hf',             quality:3 },
    ]
  },
  {
    id: 'voice',
    label: '🎙️ Speech-to-Text / Voice',
    desc: 'Voice note transcription, STT',
    providers: [
      { id:'groq_whisper', name:'Groq Whisper',      emoji:'⚡', limit:'7200 sec/hr', free:false, key:'jarvis_key_groq',          quality:5 },
      { id:'hf_whisper',   name:'HuggingFace Whisper',emoji:'🤗', limit:'1000/day',   free:false, key:'jarvis_key_hf',            quality:4 },
      { id:'web_speech',   name:'Web Speech API',    emoji:'🌐', limit:'Unlimited',   free:true,  key:'',                          quality:3 },
    ]
  },
  {
    id: 'tts',
    label: '🔊 Text-to-Speech',
    desc: 'JARVIS voice output',
    providers: [
      { id:'groq_tts',    name:'Groq PlayAI TTS',   emoji:'⚡', limit:'Included',    free:false, key:'jarvis_key_groq',          quality:5 },
      { id:'elevenlabs',  name:'ElevenLabs',         emoji:'🎙️', limit:'10k char/mo', free:false, key:'jarvis_key_elevenlabs',    quality:5 },
      { id:'pollins_tts', name:'Pollinations TTS',   emoji:'🌸', limit:'Unlimited',   free:true,  key:'',                          quality:3 },
      { id:'web_tts',     name:'Web Speech TTS',     emoji:'🌐', limit:'Unlimited',   free:true,  key:'',                          quality:2 },
    ]
  },
  {
    id: 'search',
    label: '🔍 Web Search & News',
    desc: 'Real-time search, news, data',
    providers: [
      { id:'serper',      name:'Serper (Google)',    emoji:'🔎', limit:'2500/mo free', free:false, key:'jarvis_key_serper',        quality:5 },
      { id:'gnews',       name:'GNews',              emoji:'📰', limit:'100/day',      free:false, key:'jarvis_key_gnews',         quality:4 },
      { id:'newsapi',     name:'NewsAPI',            emoji:'📡', limit:'100/day',      free:false, key:'jarvis_key_newsapi',       quality:4 },
      { id:'jina',        name:'Jina Reader',        emoji:'📖', limit:'1000/day',     free:true,  key:'',                          quality:4 },
      { id:'hackernews',  name:'HackerNews',         emoji:'💻', limit:'Unlimited',    free:true,  key:'',                          quality:3 },
    ]
  },
]

// ─── Third-party Apps ───────────────────────────────────────
const APP_CATEGORIES = [
  {
    cat: '⚙️ Dev Tools',
    apps: [
      { id:'github',    name:'GitHub',         emoji:'🐙', key:'jarvis_key_github_pat',    ph:'ghp_...',       link:'https://github.com/settings/tokens',           desc:'Repos, commits, issues' },
      { id:'vercel',    name:'Vercel',          emoji:'▲',  key:'jarvis_key_vercel_token',  ph:'vercel_...',    link:'https://vercel.com/account/tokens',             desc:'Deploy, logs, projects' },
      { id:'supabase',  name:'Supabase',        emoji:'⚡', key:'jarvis_key_supabase',      ph:'sbp_...',       link:'https://supabase.com/dashboard',                desc:'DB, auth, storage' },
      { id:'firebase',  name:'Firebase',        emoji:'🔥', key:'jarvis_key_firebase',      ph:'AIza...',       link:'https://console.firebase.google.com',           desc:'Firestore, auth' },
    ]
  },
  {
    cat: '📝 Productivity',
    apps: [
      { id:'notion',    name:'Notion',          emoji:'📝', key:'jarvis_key_notion',        ph:'secret_...',    link:'https://www.notion.so/my-integrations',         desc:'Notes, databases' },
      { id:'todoist',   name:'Todoist',         emoji:'✅', key:'jarvis_key_todoist',       ph:'API token',     link:'https://todoist.com/prefs/integrations',        desc:'Tasks, reminders' },
      { id:'airtable',  name:'Airtable',        emoji:'📊', key:'jarvis_key_airtable',      ph:'pat...',        link:'https://airtable.com/account',                  desc:'Spreadsheet DB' },
      { id:'gsheets',   name:'Google Sheets',   emoji:'📋', key:'jarvis_key_gsheets',       ph:'token',         link:'https://console.cloud.google.com',              desc:'Spreadsheets' },
    ]
  },
  {
    cat: '🎨 Creative',
    apps: [
      { id:'canva',     name:'Canva',           emoji:'🎨', key:'jarvis_key_canva',         ph:'API key',       link:'https://www.canva.com/developers/',             desc:'Design, templates' },
      { id:'stability', name:'Stability AI',    emoji:'🖼️', key:'jarvis_key_stability',     ph:'sk-...',        link:'https://platform.stability.ai/',                desc:'Image generation' },
      { id:'replicate', name:'Replicate',       emoji:'🔁', key:'jarvis_key_replicate',     ph:'r8_...',        link:'https://replicate.com/account',                 desc:'AI models' },
      { id:'elevenlabs',name:'ElevenLabs',      emoji:'🎙️', key:'jarvis_key_elevenlabs',    ph:'xi-api-...',    link:'https://elevenlabs.io/settings',                desc:'TTS realistic voice' },
    ]
  },
  {
    cat: '💬 Communication',
    apps: [
      { id:'telegram',  name:'Telegram Bot',   emoji:'✈️', key:'jarvis_key_telegram',      ph:'bot_token',     link:'https://t.me/BotFather',                        desc:'Send via Telegram' },
      { id:'whatsapp',  name:'WhatsApp Cloud', emoji:'💬', key:'jarvis_key_whatsapp',      ph:'token',         link:'https://developers.facebook.com',               desc:'WhatsApp API' },
    ]
  },
  {
    cat: '📈 Finance',
    apps: [
      { id:'alpha',     name:'AlphaVantage',   emoji:'📈', key:'jarvis_key_alphavantage',  ph:'...',           link:'https://www.alphavantage.co/support/#api-key',  desc:'Stocks, forex — 25/day' },
      { id:'cmc',       name:'CoinMarketCap',  emoji:'💰', key:'jarvis_key_cmc',           ph:'...',           link:'https://pro.coinmarketcap.com/signup',          desc:'Crypto prices' },
      { id:'omdb',      name:'OMDB',           emoji:'🎬', key:'jarvis_key_omdb',          ph:'...',           link:'http://www.omdbapi.com/apikey.aspx',            desc:'Movies 1000/day' },
    ]
  },
]

// ─── Free Services ─────────────────────────────────────────
const FREE_SERVICES = [
  { emoji:'🌤️', name:'Weather (wttr.in)',        desc:'Any city — always free' },
  { emoji:'📖', name:'Wikipedia',                 desc:'Knowledge base' },
  { emoji:'🚀', name:'NASA APOD',                 desc:'Space photo daily' },
  { emoji:'💰', name:'Crypto (CoinGecko)',        desc:'Free prices' },
  { emoji:'🏏', name:'Cricket Scores',            desc:'IPL/Test live' },
  { emoji:'📈', name:'NSE/BSE Stocks',            desc:'Yahoo Finance' },
  { emoji:'📱', name:'QR Generator',              desc:'qrserver.com' },
  { emoji:'🌐', name:'Translation',               desc:'LibreTranslate' },
  { emoji:'💻', name:'HackerNews',                desc:'Tech news' },
  { emoji:'📚', name:'Free Books (Gutenberg)',    desc:'10k+ classics' },
  { emoji:'🛸', name:'ISS Location',              desc:'Real-time tracker' },
  { emoji:'🌍', name:'Earthquake Data',           desc:'USGS seismic' },
  { emoji:'⚖️', name:'BMI / EMI / SIP',          desc:'Local calculations' },
  { emoji:'🎨', name:'AI Image (Pollinations)',   desc:'Unlimited free' },
  { emoji:'🎌', name:'Anime Info (Jikan)',        desc:'Free' },
  { emoji:'📖', name:'Jina URL Reader',           desc:'r.jina.ai — free' },
  { emoji:'🗓️', name:'Date Facts',               desc:'numbers API' },
  { emoji:'📮', name:'Pincode Lookup',            desc:'India pin → city' },
  { emoji:'🌅', name:'Sunrise / Sunset',          desc:'sunrise-sunset.org' },
  { emoji:'😄', name:'Jokes',                     desc:'jokeapi.dev — free' },
]

export default function ConnectedApps() {
  const [keys, setKeys]       = useState<Record<string,string>>({})
  const [starred, setStarred] = useState<string[]>([])
  const [disabled, setDis]    = useState<string[]>([])
  const [editKey, setEditKey] = useState<string|null>(null)
  const [tempKey, setTempKey] = useState('')
  const [tab, setTab]         = useState<'router'|'apps'|'free'>('router')
  const [openCat, setOpenCat] = useState<string>('chat')

  useEffect(() => {
    setStarred(JSON.parse(localStorage.getItem('jarvis_starred_apps')||'[]'))
    setDis(JSON.parse(localStorage.getItem('jarvis_disabled_apps')||'[]'))
    const k: Record<string,string> = {}
    ROUTER_CATEGORIES.forEach(cat => cat.providers.forEach(p => {
      if(p.key){ const v=localStorage.getItem(p.key); if(v) k[p.key]=v }
    }))
    APP_CATEGORIES.forEach(cat => cat.apps.forEach(a => {
      const v=localStorage.getItem(a.key); if(v) k[a.key]=v
    }))
    setKeys(k)
  }, [])

  const toggleStar = (id:string) => {
    const n = starred.includes(id) ? starred.filter(x=>x!==id) : [...starred,id]
    setStarred(n); localStorage.setItem('jarvis_starred_apps',JSON.stringify(n))
  }
  const toggleDis = (id:string) => {
    const n = disabled.includes(id) ? disabled.filter(x=>x!==id) : [...disabled,id]
    setDis(n); localStorage.setItem('jarvis_disabled_apps',JSON.stringify(n))
  }
  const saveKey = (key:string, id:string) => {
    if(!key||!tempKey.trim()) return
    localStorage.setItem(key,tempKey.trim())
    setKeys(p=>({...p,[key]:tempKey.trim()}))
    setEditKey(null); setTempKey('')
  }

  // Count connected
  const connectedKeys = Object.keys(keys).length
  const starCount = starred.length

  const tabBtn = (t: typeof tab) => ({
    flex:1, padding:'8px 4px', borderRadius:8, fontSize:11, cursor:'pointer',
    fontWeight: tab===t ? 700 : 400,
    background: tab===t ? 'rgba(0,229,255,.1)' : 'transparent',
    border: `1px solid ${tab===t ? '#00e5ff' : 'rgba(0,229,255,.1)'}`,
    color: tab===t ? '#00e5ff' : '#2a5070',
  } as React.CSSProperties)

  const provCard = (p: any, catId: string) => {
    const on = !disabled.includes(p.id)
    const connected = p.free || !!keys[p.key]
    const isEdit = editKey === p.id
    const isStar = starred.includes(p.id)
    return (
      <div key={p.id} style={{
        background: on ? '#071828' : 'rgba(5,10,20,.4)',
        border: `1px solid rgba(0,229,255,${connected?.1:.04})`,
        borderRadius:9, padding:'9px 11px', marginBottom:5, opacity: on?1:.5,
      }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
          <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{p.emoji}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, color:'#c8e0f0', fontWeight:600, display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
              {p.name}
              {p.free
                ? <span style={{ fontSize:8, padding:'1px 5px', borderRadius:8, background:'rgba(0,230,118,.1)', color:'#00e676', border:'1px solid rgba(0,230,118,.2)' }}>FREE ∞</span>
                : connected
                  ? <span style={{ fontSize:8, padding:'1px 5px', borderRadius:8, background:'rgba(0,230,118,.1)', color:'#00e676', border:'1px solid rgba(0,230,118,.2)' }}>✓ CONNECTED</span>
                  : <span style={{ fontSize:8, padding:'1px 5px', borderRadius:8, background:'rgba(255,152,0,.1)', color:'#ffa000', border:'1px solid rgba(255,152,0,.2)' }}>KEY NEEDED</span>
              }
            </div>
            <div style={{ fontSize:9, color:'#2a5070', marginTop:1 }}>{p.limit}</div>
            {/* Quality bar */}
            <div style={{ display:'flex', gap:2, marginTop:3 }}>
              {[1,2,3,4,5].map(i=>(
                <div key={i} style={{ width:5, height:5, borderRadius:'50%', background: i<=p.quality ? '#00e5ff':'rgba(0,229,255,.12)' }}/>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
            <button onClick={()=>toggleStar(p.id)} style={{ background:'none', border:'none', fontSize:14, cursor:'pointer', opacity: isStar?1:.2, padding:'2px' }}>⭐</button>
            <div onClick={()=>toggleDis(p.id)} style={{
              width:34, height:19, borderRadius:9, cursor:'pointer', position:'relative',
              background: on ? 'rgba(0,229,255,.2)' : 'rgba(255,255,255,.06)',
              border: `1px solid ${on?'#00e5ff':'rgba(255,255,255,.1)'}`,
            }}>
              <div style={{ position:'absolute', top:2, left: on?15:2, width:13, height:13, borderRadius:'50%', background: on?'#00e5ff':'#2a4060', transition:'left .18s' }}/>
            </div>
          </div>
        </div>
        {!p.free && (
          <div style={{ marginTop:7, padding:'7px 9px', background:'rgba(255,152,0,.03)', border:'1px solid rgba(255,152,0,.08)', borderRadius:7 }}>
            <div style={{ fontSize:9, color: connected ? '#00e676':'#ff9944', marginBottom:5 }}>
              {connected ? '✅ Connected' : '⚠️ API Key nahi hai — yahan se lo:'}
            </div>
            {isEdit ? (
              <div style={{ display:'flex', gap:5 }}>
                <input type="password" placeholder="Key paste karo..." value={tempKey} onChange={e=>setTempKey(e.target.value)} autoFocus
                  style={{ flex:1, padding:'5px 8px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,152,0,.2)', borderRadius:5, color:'#e0f4ff', fontSize:11, fontFamily:'monospace' }}/>
                <button onClick={()=>saveKey(p.key,p.id)} style={{ padding:'5px 9px', background:'rgba(255,152,0,.15)', border:'1px solid rgba(255,152,0,.3)', borderRadius:5, color:'#ff9944', fontSize:11, cursor:'pointer' }}>Save</button>
                <button onClick={()=>setEditKey(null)} style={{ padding:'5px 7px', background:'transparent', border:'1px solid rgba(239,83,80,.2)', borderRadius:5, color:'#ef5350', fontSize:11, cursor:'pointer' }}>✕</button>
              </div>
            ) : (
              <button onClick={()=>{setEditKey(p.id);setTempKey(keys[p.key]||'')}} style={{ width:'100%', padding:'6px', background:'rgba(255,152,0,.07)', border:'1px solid rgba(255,152,0,.18)', borderRadius:5, color:'#ffa000', fontSize:11, cursor:'pointer' }}>
                {connected ? '✏️ Update key' : '+ Add key'}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ paddingBottom:80 }}>
      {/* Stats row */}
      <div style={{ display:'flex', gap:5, marginBottom:12 }}>
        {[
          { n: ROUTER_CATEGORIES.reduce((a,c)=>a+c.providers.length,0), l:'AI Providers' },
          { n: connectedKeys,   l:'Connected', c:'#00e676' },
          { n: starCount,       l:'⭐ Starred', c:'#ffd700' },
          { n: FREE_SERVICES.length, l:'Free APIs', c:'#00e5ff' },
        ].map((s,i)=>(
          <div key={i} style={{ flex:1, padding:'8px 4px', background:'rgba(0,229,255,.03)', border:'1px solid rgba(0,229,255,.06)', borderRadius:8, textAlign:'center' }}>
            <div style={{ fontSize:16, fontWeight:700, color: s.c||'#00e5ff' }}>{s.n}</div>
            <div style={{ fontSize:9, color:'#2a5070' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:5, marginBottom:12 }}>
        <button style={tabBtn('router')} onClick={()=>setTab('router')}>🤖 AI Router</button>
        <button style={tabBtn('apps')}   onClick={()=>setTab('apps')}>🔌 Apps</button>
        <button style={tabBtn('free')}   onClick={()=>setTab('free')}>✅ Free APIs</button>
      </div>

      {/* ── AI SMART ROUTER ── */}
      {tab==='router' && (
        <div>
          <div style={{ fontSize:10, color:'#4a7090', marginBottom:10, padding:'8px 10px', background:'rgba(0,229,255,.03)', border:'1px solid rgba(0,229,255,.08)', borderRadius:8, lineHeight:1.7 }}>
            💡 <b>Smart Router:</b> JARVIS task ke type ke hisaab se provider choose karta hai.<br/>
            ⭐ Star = Priority 1 · 85% limit = auto-next · Disabled = skip
          </div>

          {ROUTER_CATEGORIES.map(cat => (
            <div key={cat.id} style={{ marginBottom:4 }}>
              {/* Category header — collapsible */}
              <button onClick={()=>setOpenCat(openCat===cat.id?'':cat.id)} style={{
                width:'100%', padding:'10px 12px', borderRadius:9,
                background: openCat===cat.id ? 'rgba(0,229,255,.07)' : 'rgba(0,229,255,.03)',
                border:`1px solid rgba(0,229,255,${openCat===cat.id?.15:.06})`,
                color: openCat===cat.id ? '#00e5ff':'#4a7090',
                fontSize:12, cursor:'pointer', fontWeight:600,
                display:'flex', alignItems:'center', justifyContent:'space-between',
                marginBottom: openCat===cat.id ? 6 : 0,
              }}>
                <span>{cat.label}</span>
                <span style={{ fontSize:10, color:'#2a5070', marginLeft:8, flex:1, textAlign:'left', paddingLeft:8 }}>{cat.desc}</span>
                <span style={{ fontSize:11 }}>{openCat===cat.id ? '▲':'▼'}</span>
              </button>

              {openCat===cat.id && cat.providers.map(p => provCard(p, cat.id))}
            </div>
          ))}
        </div>
      )}

      {/* ── APPS ── */}
      {tab==='apps' && (
        <div>
          <div style={{ fontSize:10, color:'#4a7090', marginBottom:10, padding:'8px 10px', background:'rgba(0,229,255,.03)', border:'1px solid rgba(0,229,255,.08)', borderRadius:8, lineHeight:1.7 }}>
            🔌 <b>Third-party apps:</b> Key add karo → Chat mein directly use ho jaayega.<br/>
            Jaise: "GitHub pe naya issue banao" → auto GitHub API call
          </div>
          {APP_CATEGORIES.map(catObj => (
            <div key={catObj.cat}>
              <div style={{ fontSize:9, color:'#1e3a50', letterSpacing:2, fontWeight:700, margin:'10px 0 5px 2px' }}>{catObj.cat.toUpperCase()}</div>
              {catObj.apps.map(app => {
                const connected = !!keys[app.key]
                const isEdit = editKey === app.id
                const isStar = starred.includes(app.id)
                const on = !disabled.includes(app.id)
                return (
                  <div key={app.id} style={{ background: on?'#071828':'rgba(5,10,20,.4)', border:`1px solid rgba(0,229,255,${connected?.1:.04})`, borderRadius:9, padding:'9px 11px', marginBottom:5, opacity:on?1:.5 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                      <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{app.emoji}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, color:'#c8e0f0', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
                          {app.name}
                          {connected
                            ? <span style={{ fontSize:8, padding:'1px 5px', borderRadius:8, background:'rgba(0,230,118,.1)', color:'#00e676', border:'1px solid rgba(0,230,118,.2)' }}>✓</span>
                            : <span style={{ fontSize:8, padding:'1px 5px', borderRadius:8, background:'rgba(255,152,0,.1)', color:'#ffa000', border:'1px solid rgba(255,152,0,.2)' }}>KEY</span>
                          }
                        </div>
                        <div style={{ fontSize:9, color:'#2a5070', marginTop:1 }}>{app.desc}</div>
                      </div>
                      <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                        <button onClick={()=>toggleStar(app.id)} style={{ background:'none', border:'none', fontSize:14, cursor:'pointer', opacity:isStar?1:.2 }}>⭐</button>
                        <div onClick={()=>toggleDis(app.id)} style={{ width:34, height:19, borderRadius:9, cursor:'pointer', position:'relative', background:on?'rgba(0,229,255,.2)':'rgba(255,255,255,.06)', border:`1px solid ${on?'#00e5ff':'rgba(255,255,255,.1)'}` }}>
                          <div style={{ position:'absolute', top:2, left:on?15:2, width:13, height:13, borderRadius:'50%', background:on?'#00e5ff':'#2a4060', transition:'left .18s' }}/>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop:7, padding:'7px 9px', background:'rgba(255,152,0,.03)', border:'1px solid rgba(255,152,0,.08)', borderRadius:7 }}>
                      <div style={{ fontSize:9, color: connected?'#00e676':'#ff9944', marginBottom:5 }}>
                        {connected ? '✅ Connected' : `⚠️ Key nahi hai`}
                      </div>
                      {isEdit ? (
                        <div>
                          <div style={{ display:'flex', gap:5 }}>
                            <input type="password" placeholder={app.ph} value={tempKey} onChange={e=>setTempKey(e.target.value)} autoFocus
                              style={{ flex:1, padding:'5px 8px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,152,0,.2)', borderRadius:5, color:'#e0f4ff', fontSize:11, fontFamily:'monospace' }}/>
                            <button onClick={()=>saveKey(app.key,app.id)} style={{ padding:'5px 9px', background:'rgba(255,152,0,.15)', border:'1px solid rgba(255,152,0,.3)', borderRadius:5, color:'#ff9944', fontSize:11, cursor:'pointer' }}>Save</button>
                            <button onClick={()=>setEditKey(null)} style={{ padding:'5px 7px', background:'transparent', border:'1px solid rgba(239,83,80,.2)', borderRadius:5, color:'#ef5350', fontSize:11, cursor:'pointer' }}>✕</button>
                          </div>
                          <div style={{ fontSize:9, color:'#1a3050', marginTop:4 }}>
                            Get key: <a href={app.link} target="_blank" rel="noreferrer" style={{ color:'#1e4060' }}>{app.link}</a>
                          </div>
                        </div>
                      ) : (
                        <button onClick={()=>{setEditKey(app.id);setTempKey(keys[app.key]||'')}} style={{ width:'100%', padding:'6px', background:'rgba(255,152,0,.07)', border:'1px solid rgba(255,152,0,.18)', borderRadius:5, color:'#ffa000', fontSize:11, cursor:'pointer' }}>
                          {connected ? '✏️ Update key' : '+ Add key'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── FREE APIs ── */}
      {tab==='free' && (
        <div>
          <div style={{ fontSize:10, color:'#00e676', marginBottom:10, padding:'8px 10px', background:'rgba(0,230,118,.03)', border:'1px solid rgba(0,230,118,.1)', borderRadius:8 }}>
            ✅ Yeh sab FREE hain — koi key nahi chahiye. Bas baat karo, auto use hoga.
          </div>
          {FREE_SERVICES.map((s,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 11px', background:'rgba(0,229,255,.02)', border:'1px solid rgba(0,229,255,.05)', borderRadius:8, marginBottom:4 }}>
              <span style={{ fontSize:18 }}>{s.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:'#c8e0f0', fontWeight:500 }}>{s.name}</div>
                <div style={{ fontSize:9, color:'#2a5070' }}>{s.desc}</div>
              </div>
              <span style={{ fontSize:10, color:'#00e676' }}>✓</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
