'use client'
// ConnectedApps.tsx — Settings mein sabhi 67 services, pin/favorite, toggle, key input
import { useState, useEffect } from 'react'

interface Service {
  id: string
  name: string
  emoji: string
  category: string
  free: boolean
  keyName?: string       // localStorage key for API key
  keyPlaceholder?: string
  keyLink?: string
  description: string
  triggers: string       // example queries
}

const ALL_SERVICES: Service[] = [
  // ── UNLIMITED FREE (no key) ──────────────────────────────
  { id:'weather',    name:'Weather',            emoji:'🌤️', category:'India & World', free:true,  description:'Live mausam — wttr.in',         triggers:'"aaj ka mausam?"' },
  { id:'forecast',   name:'3-Day Forecast',     emoji:'📅', category:'India & World', free:true,  description:'3 din ka forecast',             triggers:'"kal ka mausam?"' },
  { id:'airquality', name:'Air Quality / AQI',  emoji:'🌫️', category:'India & World', free:true,  description:'PM2.5, AQI data',               triggers:'"delhi ka AQI?"' },
  { id:'country',    name:'Country Info',        emoji:'🌍', category:'India & World', free:true,  description:'Capital, population, currency', triggers:'"India ki info?"' },
  { id:'holiday',    name:'India Holidays',      emoji:'🎉', category:'India & World', free:true,  description:'Upcoming public holidays',      triggers:'"next chutti kab?"' },
  { id:'cricket',    name:'Cricket Scores',      emoji:'🏏', category:'India & World', free:true,  description:'IPL, Test match latest',        triggers:'"IPL score?"' },
  { id:'time',       name:'Time & Date',         emoji:'🕐', category:'India & World', free:true,  description:'Live time, any timezone',       triggers:'"abhi kya time hai?"' },
  { id:'timezone',   name:'World Clocks',        emoji:'🌍', category:'India & World', free:true,  description:'Sab countries ka time ek saath',triggers:'"world clock dikhao"' },
  { id:'earthquake', name:'Earthquake News',     emoji:'🌍', category:'India & World', free:true,  description:'Latest seismic activity',       triggers:'"aaj koi bhookamp?"' },
  { id:'sunrise',    name:'Sunrise / Sunset',    emoji:'☀️', category:'India & World', free:true,  description:'GPS se aaj ka suraj time',      triggers:'"aaj suraj kab uggega?"' },
  { id:'ipinfo',     name:'Network / IP Info',   emoji:'🌐', category:'India & World', free:true,  description:'Mera IP, ISP, location',        triggers:'"mera IP kya hai?"' },
  { id:'geoip',      name:'IP Geolocation',      emoji:'📍', category:'India & World', free:true,  description:'Kisi bhi IP ki location dhundho',triggers:'"8.8.8.8 kahan se hai?"' },

  // ── CALCULATORS ─────────────────────────────────────────
  { id:'bmi',     name:'BMI Calculator',   emoji:'⚖️', category:'Calculators', free:true, description:'Body mass index check karo', triggers:'"170cm 65kg ka BMI?"' },
  { id:'emi',     name:'Loan EMI',         emoji:'💰', category:'Calculators', free:true, description:'Home/Car loan EMI calculate', triggers:'"10 lakh 8.5% 20 saal EMI?"' },
  { id:'sip',     name:'SIP Calculator',   emoji:'📊', category:'Calculators', free:true, description:'Mutual fund return calculate', triggers:'"5000 SIP 12% 10yr?"' },
  { id:'agecalc', name:'Age Calculator',   emoji:'🎂', category:'Calculators', free:true, description:'DOB se exact age nikalo',     triggers:'"15/08/2000 ki age?"' },

  // ── FINANCE ─────────────────────────────────────────────
  { id:'crypto',    name:'Crypto Prices',     emoji:'💰', category:'Finance', free:true,  description:'Bitcoin, Ethereum, sab coins', triggers:'"bitcoin ka price?"' },
  { id:'currency',  name:'Currency Exchange',  emoji:'💱', category:'Finance', free:true,  description:'Live exchange rates',          triggers:'"1 dollar mein kitne rupee?"' },
  { id:'stock',     name:'NSE/BSE Stocks',     emoji:'📈', category:'Finance', free:true,  description:'Indian stock quotes live',     triggers:'"Reliance ka share price?"' },

  // ── KNOWLEDGE ────────────────────────────────────────────
  { id:'wikipedia',   name:'Wikipedia',         emoji:'📖', category:'Knowledge', free:true, description:'Kisi bhi topic ki info',         triggers:'"Einstein kya hai?"' },
  { id:'dictionary',  name:'Dictionary',         emoji:'📚', category:'Knowledge', free:true, description:'English word ka meaning',        triggers:'"ephemeral ka matlab?"' },
  { id:'wordofday',   name:'Word of the Day',    emoji:'📝', category:'Knowledge', free:true, description:'Naya vocabulary word daily',     triggers:'"aaj ka naya word?"' },
  { id:'numberfact',  name:'Number Facts',        emoji:'🔢', category:'Knowledge', free:true, description:'Kisi number ke baare mein fact', triggers:'"42 ke baare mein batao"' },
  { id:'mathfact',    name:'Math Facts',          emoji:'🧮', category:'Knowledge', free:true, description:'Maths ka koi interesting fact',  triggers:'"100 ka math fact?"' },
  { id:'datefact',    name:'On This Day',         emoji:'📅', category:'Knowledge', free:true, description:'Aaj ke din itihas mein kya hua', triggers:'"aaj ke din kya hua?"' },
  { id:'trivia',      name:'Trivia / GK Quiz',    emoji:'🧠', category:'Knowledge', free:true, description:'Random GK question',            triggers:'"ek GK question do"' },
  { id:'gutenberg',   name:'Free Books',           emoji:'📚', category:'Knowledge', free:true, description:'10,000+ classic books free',    triggers:'"Shakespeare ki free book?"' },

  // ── ENTERTAINMENT ────────────────────────────────────────
  { id:'joke',      name:'Jokes',              emoji:'😄', category:'Entertainment', free:true, description:'Programming + safe jokes',     triggers:'"joke sunao"' },
  { id:'meme',      name:'Meme Generator',     emoji:'😂', category:'Entertainment', free:true, description:'Reddit se trending meme',      triggers:'"meme dikhao"' },
  { id:'quote',     name:'Inspirational Quote',emoji:'💬', category:'Entertainment', free:true, description:'Random life quotes',           triggers:'"koi achha quote do"' },
  { id:'motivation',name:'Motivation Quotes',  emoji:'✨', category:'Entertainment', free:true, description:'ZenQuotes motivational',       triggers:'"motivate karo mujhe"' },
  { id:'advice',    name:'Life Advice',         emoji:'💡', category:'Entertainment', free:true, description:'Random useful advice',         triggers:'"koi advice do"' },
  { id:'bored',     name:'Activity Ideas',      emoji:'🎯', category:'Entertainment', free:true, description:'Bored? Kuch karne ki idea',   triggers:'"bored hoon kya karun?"' },
  { id:'catfact',   name:'Cat Facts',           emoji:'🐱', category:'Entertainment', free:true, description:'Billi ke baare mein facts',    triggers:'"cat ka fact batao"' },
  { id:'dogfact',   name:'Dog Facts',           emoji:'🐕', category:'Entertainment', free:true, description:'Kutta ke baare mein facts',    triggers:'"dog fact?"' },
  { id:'chucknorris',name:'Chuck Norris Jokes', emoji:'💪', category:'Entertainment', free:true, description:'Chuck Norris random jokes',    triggers:'"chuck norris joke"' },
  { id:'cocktail',  name:'Cocktail / Drink Recipes',emoji:'🍹',category:'Entertainment',free:true,description:'Mocktail + cocktail recipes',  triggers:'"mojito kaise banate?"' },
  { id:'recipe',    name:'Food Recipes',         emoji:'🍳', category:'Entertainment', free:true, description:'Khana banane ki recipe',       triggers:'"pasta recipe batao"' },
  { id:'food',      name:'Food Nutrition',       emoji:'🍎', category:'Entertainment', free:true, description:'Calories, protein, carbs info',triggers:'"maggi mein kya hota?"' },
  { id:'anime',     name:'Anime Info',           emoji:'🎌', category:'Entertainment', free:true, description:'Anime synopsis, ratings',      triggers:'"Naruto anime info?"' },

  // ── SCIENCE & SPACE ──────────────────────────────────────
  { id:'nasa',       name:'NASA Photo of Day',   emoji:'🚀', category:'Space & Science', free:true, description:'APOD — space ki tasveer',   triggers:'"aaj ki space photo?"' },
  { id:'iss',        name:'ISS Live Location',    emoji:'🛸', category:'Space & Science', free:true, description:'Space station kahan hai?',  triggers:'"ISS abhi kahan hai?"' },
  { id:'mars',       name:'Mars Weather',         emoji:'🔴', category:'Space & Science', free:true, description:'Red Planet ka mausam!',     triggers:'"Mars ka mausam?"' },
  { id:'spacenews',  name:'Space News',           emoji:'🚀', category:'Space & Science', free:true, description:'SpaceX, ISRO, NASA news',   triggers:'"space mein kya ho raha?"' },
  { id:'sciencenews',name:'Science News',         emoji:'🔬', category:'Space & Science', free:true, description:'Latest scientific discoveries',triggers:'"science news?"' },

  // ── TECH & DEV TOOLS ────────────────────────────────────
  { id:'ghtrending', name:'GitHub Trending',    emoji:'🔥', category:'Tech & Dev', free:true, description:'Aaj ke hot repos',              triggers:'"github trending kya hai?"' },
  { id:'hackernews', name:'HackerNews',          emoji:'💻', category:'Tech & Dev', free:true, description:'Tech startup news',             triggers:'"tech news dikhao"' },
  { id:'hash',       name:'SHA-256 Hash',        emoji:'🔐', category:'Tech & Dev', free:true, description:'Text ka hash generate karo',    triggers:'"hello world ka hash?"' },
  { id:'base64',     name:'Base64 Encode/Decode',emoji:'🔤', category:'Tech & Dev', free:true, description:'Base64 convert karo',           triggers:'"base64 encode hello"' },
  { id:'uuid',       name:'UUID Generator',      emoji:'🆔', category:'Tech & Dev', free:true, description:'Random unique ID generate',     triggers:'"UUID banao"' },
  { id:'password',   name:'Password Strength',   emoji:'🔒', category:'Tech & Dev', free:true, description:'Password kitna strong hai?',   triggers:'"password Jarvis@123 check?"' },
  { id:'qr',         name:'QR Code Generator',   emoji:'📱', category:'Tech & Dev', free:true, description:'URL/text ka QR code banao',    triggers:'"QR code banao jarvis.ai ke liye"' },
  { id:'shorturl',   name:'URL Shortener',        emoji:'🔗', category:'Tech & Dev', free:true, description:'Lamba URL short karo',         triggers:'"short karo https://example.com"' },
  { id:'color',      name:'Color Info',           emoji:'🎨', category:'Tech & Dev', free:true, description:'Hex code ka RGB/HSL/Name',     triggers:'"#ff6b35 ka naam?"' },
  { id:'pokemon',    name:'PokéAPI',              emoji:'⚡', category:'Tech & Dev', free:true, description:'Pokemon stats, types',          triggers:'"Pikachu ki stats?"' },

  // ── CREATIVITY ───────────────────────────────────────────
  { id:'aiimage',  name:'AI Image Generator',  emoji:'🎨', category:'Creativity', free:true, description:'Pollinations se AI image',      triggers:'"iron man drawing banao"' },
  { id:'youtube',  name:'YouTube Trending',    emoji:'▶️', category:'Creativity', free:true, description:'India mein trending videos',    triggers:'"youtube trending kya hai?"' },

  // ── BOOKS & READING ──────────────────────────────────────
  { id:'book', name:'Book Search', emoji:'📚', category:'Books', free:true, description:'OpenLibrary book search', triggers:'"Harry Potter book info?"' },

  // ── OPTIONAL (key chahiye) ───────────────────────────────
  { id:'github',   name:'GitHub Personal',   emoji:'🐙', category:'Optional (Key)', free:false, keyName:'jarvis_key_github_pat',    keyPlaceholder:'ghp_...', keyLink:'https://github.com/settings/tokens', description:'Apne repos, commits, issues', triggers:'"mera latest commit?"' },
  { id:'vercel',   name:'Vercel Projects',   emoji:'▲',  category:'Optional (Key)', free:false, keyName:'jarvis_key_vercel_token',  keyPlaceholder:'vercel_...', keyLink:'https://vercel.com/account/tokens', description:'Apne Vercel deployments',    triggers:'"mera latest deploy?"' },
  { id:'news',     name:'News (GNews)',       emoji:'📰', category:'Optional (Key)', free:false, keyName:'jarvis_key_gnews',         keyPlaceholder:'GNews API Key', keyLink:'https://gnews.io', description:'100 news/day free',            triggers:'"aaj ki khabar?"' },
  { id:'movie',    name:'Movies (OMDB)',      emoji:'🎬', category:'Optional (Key)', free:false, keyName:'jarvis_key_omdb',          keyPlaceholder:'OMDB API Key', keyLink:'http://www.omdbapi.com/apikey.aspx', description:'1000 movies/day free',    triggers:'"Inception ki info?"' },
  { id:'agify',    name:'Name Age Predictor', emoji:'🎂', category:'Extras', free:true, description:'Naam se average age predict', triggers:'"Priya ki predicted age?"' },
]

const CATEGORIES = ['Pinned ⭐', 'India & World', 'Finance', 'Calculators', 'Knowledge', 'Entertainment', 'Space & Science', 'Tech & Dev', 'Creativity', 'Books', 'Optional (Key)', 'Extras']

export default function ConnectedApps() {
  const [pinned, setPinned] = useState<string[]>([])
  const [disabled, setDisabled] = useState<string[]>([])
  const [keys, setKeys] = useState<Record<string,string>>({})
  const [editKey, setEditKey] = useState<string|null>(null)
  const [tempKey, setTempKey] = useState('')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Pinned ⭐')

  useEffect(() => {
    const p = JSON.parse(localStorage.getItem('jarvis_pinned_services') || '[]')
    const d = JSON.parse(localStorage.getItem('jarvis_disabled_services') || '[]')
    setPinned(p)
    setDisabled(d)
    // Load saved keys
    const k: Record<string,string> = {}
    ALL_SERVICES.forEach(s => {
      if (s.keyName) {
        const val = localStorage.getItem(s.keyName)
        if (val) k[s.id] = val
      }
    })
    setKeys(k)
  }, [])

  const togglePin = (id: string) => {
    const next = pinned.includes(id) ? pinned.filter(x=>x!==id) : [...pinned, id]
    setPinned(next)
    localStorage.setItem('jarvis_pinned_services', JSON.stringify(next))
  }

  const toggleEnable = (id: string) => {
    const next = disabled.includes(id) ? disabled.filter(x=>x!==id) : [...disabled, id]
    setDisabled(next)
    localStorage.setItem('jarvis_disabled_services', JSON.stringify(next))
  }

  const saveKey = (svc: Service) => {
    if (!svc.keyName) return
    localStorage.setItem(svc.keyName, tempKey)
    setKeys(prev => ({...prev, [svc.id]: tempKey}))
    setEditKey(null)
    setTempKey('')
  }

  // Filter by search
  const filtered = search.trim()
    ? ALL_SERVICES.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()) || s.triggers.toLowerCase().includes(search.toLowerCase()))
    : null

  // Get services for active category
  const getServices = () => {
    if (filtered) return filtered
    if (activeCategory === 'Pinned ⭐') return ALL_SERVICES.filter(s => pinned.includes(s.id))
    return ALL_SERVICES.filter(s => s.category === activeCategory)
  }

  const displayServices = getServices()
  const pinnedCount = pinned.length
  const enabledCount = ALL_SERVICES.length - disabled.length

  const s = {
    wrap: { padding:'0 0 80px' },
    header: { marginBottom:12 },
    stats: { display:'flex', gap:8, marginBottom:10 },
    stat: { flex:1, padding:'8px 10px', background:'rgba(0,229,255,.04)', border:'1px solid rgba(0,229,255,.08)', borderRadius:8, textAlign:'center' as const },
    statNum: { fontSize:18, fontWeight:700, color:'#00e5ff' },
    statLabel: { fontSize:9, color:'#2a5070', marginTop:2 },
    searchBox: { width:'100%', padding:'9px 12px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(0,229,255,.12)', borderRadius:9, color:'#e0f4ff', fontSize:13, boxSizing:'border-box' as const, marginBottom:10 },
    catScroll: { display:'flex', gap:6, overflowX:'auto' as const, paddingBottom:6, marginBottom:10, scrollbarWidth:'none' as const },
    catBtn: (active: boolean) => ({ flexShrink:0, padding:'5px 10px', borderRadius:20, border:`1px solid ${active?'#00e5ff':'rgba(0,229,255,.1)'}`, background:active?'rgba(0,229,255,.1)':'transparent', color:active?'#00e5ff':'#2a5070', fontSize:10, cursor:'pointer', whiteSpace:'nowrap' as const }),
    card: (enabled: boolean) => ({ background:enabled?'#071828':'rgba(5,12,28,.6)', border:`1px solid rgba(0,229,255,${enabled?.06:.03})`, borderRadius:10, padding:'10px 12px', marginBottom:6, opacity:enabled?1:.5 }),
    cardTop: { display:'flex', alignItems:'flex-start', gap:10 },
    emoji: { fontSize:22, flexShrink:0, marginTop:2 },
    info: { flex:1, minWidth:0 },
    name: { fontSize:13, color:'#c8e0f0', fontWeight:600 },
    desc: { fontSize:10, color:'#2a5070', marginTop:1 },
    trigger: { fontSize:9, color:'#1a3050', marginTop:2, fontStyle:'italic' as const },
    actions: { display:'flex', gap:6, alignItems:'center', flexShrink:0 },
    pinBtn: (active: boolean) => ({ background:'transparent', border:'none', fontSize:16, cursor:'pointer', opacity:active?1:.3, padding:'2px 4px' }),
    togBtn: (on: boolean) => ({ width:38, height:20, borderRadius:10, background:on?'rgba(0,229,255,.3)':'rgba(255,255,255,.06)', border:`1px solid ${on?'#00e5ff':'rgba(255,255,255,.1)'}`, cursor:'pointer', position:'relative' as const, flexShrink:0 }),
    togDot: (on: boolean) => ({ position:'absolute' as const, top:2, left:on?18:2, width:14, height:14, borderRadius:'50%', background:on?'#00e5ff':'#2a4060', transition:'left .2s' }),
    keySection: { marginTop:8, padding:'8px 10px', background:'rgba(255,152,0,.04)', border:'1px solid rgba(255,152,0,.1)', borderRadius:7 },
    keyStatus: { fontSize:10, color:'#ff9944', marginBottom:6 },
    keyRow: { display:'flex', gap:6, alignItems:'center' },
    keyInput: { flex:1, padding:'6px 8px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,152,0,.2)', borderRadius:6, color:'#e0f4ff', fontSize:11, fontFamily:'monospace' },
    keySave: { padding:'6px 10px', background:'rgba(255,152,0,.15)', border:'1px solid rgba(255,152,0,.3)', borderRadius:6, color:'#ff9944', fontSize:11, cursor:'pointer', whiteSpace:'nowrap' as const },
    keyLink: { fontSize:9, color:'#1a3050', marginTop:4 },
    emptyMsg: { textAlign:'center' as const, padding:'30px 0', color:'#1a3050', fontSize:12 },
    freeBadge: { fontSize:8, padding:'1px 5px', borderRadius:10, background:'rgba(0,230,118,.1)', color:'#00e676', border:'1px solid rgba(0,230,118,.2)', marginLeft:4 },
    optBadge: { fontSize:8, padding:'1px 5px', borderRadius:10, background:'rgba(255,152,0,.1)', color:'#ffa000', border:'1px solid rgba(255,152,0,.2)', marginLeft:4 },
  }

  return (
    <div style={s.wrap}>
      {/* Stats */}
      <div style={s.stats}>
        <div style={s.stat}>
          <div style={s.statNum}>67</div>
          <div style={s.statLabel}>Total Services</div>
        </div>
        <div style={s.stat}>
          <div style={s.statNum}>{enabledCount}</div>
          <div style={s.statLabel}>Active</div>
        </div>
        <div style={s.stat}>
          <div style={s.statNum}>{pinnedCount}</div>
          <div style={s.statLabel}>Pinned ⭐</div>
        </div>
        <div style={s.stat}>
          <div style={{...s.statNum, color:'#00e676'}}>63</div>
          <div style={s.statLabel}>FREE</div>
        </div>
      </div>

      {/* Search */}
      <input
        style={s.searchBox}
        placeholder="🔍 Search services..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Category tabs */}
      {!search && (
        <div style={s.catScroll}>
          {CATEGORIES.map(cat => (
            <button key={cat} style={s.catBtn(activeCategory===cat)} onClick={() => setActiveCategory(cat)}>
              {cat === 'Pinned ⭐' ? `⭐ Pinned (${pinnedCount})` : cat}
            </button>
          ))}
        </div>
      )}

      {/* Service cards */}
      {displayServices.length === 0 ? (
        <div style={s.emptyMsg}>
          {activeCategory === 'Pinned ⭐' && !search
            ? '⭐ Koi pin nahi hua — neeche ⭐ dabao apni pasandida services pin karne ke liye'
            : 'Koi service nahi mili'}
        </div>
      ) : (
        displayServices.map(svc => {
          const isEnabled = !disabled.includes(svc.id)
          const isPinned = pinned.includes(svc.id)
          const hasKey = svc.keyName && keys[svc.id]
          const isEditing = editKey === svc.id

          return (
            <div key={svc.id} style={s.card(isEnabled)}>
              <div style={s.cardTop}>
                <div style={s.emoji}>{svc.emoji}</div>
                <div style={s.info}>
                  <div style={s.name}>
                    {svc.name}
                    {svc.free
                      ? <span style={s.freeBadge}>FREE</span>
                      : <span style={s.optBadge}>KEY</span>
                    }
                  </div>
                  <div style={s.desc}>{svc.description}</div>
                  <div style={s.trigger}>e.g. {svc.triggers}</div>
                </div>
                <div style={s.actions}>
                  {/* Pin button */}
                  <button style={s.pinBtn(isPinned)} onClick={() => togglePin(svc.id)} title={isPinned ? 'Unpin' : 'Pin to top'}>
                    ⭐
                  </button>
                  {/* Toggle ON/OFF */}
                  <div style={s.togBtn(isEnabled)} onClick={() => toggleEnable(svc.id)}>
                    <div style={s.togDot(isEnabled)}/>
                  </div>
                </div>
              </div>

              {/* Key section for optional services */}
              {!svc.free && (
                <div style={s.keySection}>
                  <div style={s.keyStatus}>
                    {hasKey ? '✅ Key saved' : '⚠️ API Key chahiye'}
                  </div>
                  {isEditing ? (
                    <div>
                      <div style={s.keyRow}>
                        <input
                          style={s.keyInput}
                          type="password"
                          placeholder={svc.keyPlaceholder}
                          value={tempKey}
                          onChange={e => setTempKey(e.target.value)}
                          autoFocus
                        />
                        <button style={s.keySave} onClick={() => saveKey(svc)}>Save</button>
                        <button style={{...s.keySave, color:'#ef5350', borderColor:'rgba(239,83,80,.3)'}} onClick={() => setEditKey(null)}>✕</button>
                      </div>
                      {svc.keyLink && (
                        <div style={s.keyLink}>
                          Key yahan se lo: <a href={svc.keyLink} target="_blank" rel="noreferrer" style={{color:'#1a4060'}}>{svc.keyLink}</a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      style={{...s.keySave, width:'100%'}}
                      onClick={() => { setEditKey(svc.id); setTempKey(keys[svc.id] || '') }}
                    >
                      {hasKey ? '✏️ Key Update karo' : '+ Key Add karo'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
