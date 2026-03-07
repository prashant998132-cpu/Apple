'use client'
// Settings — Provider Mode (Auto/Select/Smart) + API Keys + Storage
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/shared/Sidebar'
import MemoryTab from '../../components/settings/MemoryTab'

type MainTab = 'mode' | 'keys' | 'storage' | 'memory'
type KeyTab  = 'llm' | 'tts' | 'image' | 'music' | 'social'

// ── Provider options — best first ─────────────────────────
const PROVIDERS = {
  llm:   ['auto','gemini','groq','openrouter','aimlapi'],
  tts:   ['auto','google','elevenlabs','azure','playht','openai','fish','huggingface','browser'],
  image: ['auto','puter','gemini','flux','aimlapi','deepai','pollinations'],
  music: ['auto','musicgen','elevenlabs','mubert','suno_link','udio_link'],
  storage: ['auto','supabase','firebase','indexeddb','localstorage'],
}

const PROVIDER_INFO: Record<string, { label: string; limit: string; quality: number; note?: string }> = {
  // LLM
  auto:        { label:'🤖 Auto (Smart)',         limit:'Best for each query',      quality:5 },
  gemini:      { label:'Gemini 2.0 Flash 🥇',    limit:'1500 req/day free',        quality:5 },
  groq:        { label:'Groq Llama 3.3 70B 🥈',  limit:'6K tokens/min free',      quality:4 },
  openrouter:  { label:'OpenRouter 🥉',           limit:'Free models available',    quality:3 },
  aimlapi:     { label:'AIMLAPI',                 limit:'Free credits',             quality:4 },
  // TTS
  google:      { label:'Google Cloud TTS 🥇',    limit:'1M chars/month',           quality:5, note:'Best Hindi' },
  elevenlabs:  { label:'ElevenLabs 🥈',           limit:'10K chars/month',          quality:5, note:'Most realistic' },
  azure:       { label:'Azure Neural 🥉',         limit:'500K chars/month',         quality:4 },
  playht:      { label:'Play.ht',                 limit:'12.5K words/month',        quality:4 },
  openai:      { label:'OpenAI TTS',              limit:'Free credits',             quality:4 },
  fish:        { label:'Fish Audio',              limit:'Free credits',             quality:3 },
  huggingface: { label:'HuggingFace MMS',         limit:'Rate limited',             quality:3, note:'Hindi local' },
  browser:     { label:'Browser Speech ✅',       limit:'Unlimited, always works',  quality:2 },
  // Image
  puter:       { label:'Puter.js ✅ 🥇',         limit:'Unlimited, no key',        quality:4 },
  flux:        { label:'FLUX.1 via HF 🥈',        limit:'Rate limited',             quality:5 },
  deepai:      { label:'DeepAI',                  limit:'Free tier',                quality:3 },
  pollinations:{ label:'Pollinations ✅ 🥉',      limit:'Unlimited, no key',        quality:3 },
  // Music
  musicgen:    { label:'MusicGen via HF 🥇',      limit:'Rate limited',             quality:4 },
  mubert:      { label:'Mubert API 🥈',           limit:'Free tier',                quality:3 },
  suno_link:   { label:'Suno AI (link) 🥉',       limit:'~50/day free',             quality:5, note:'Best quality' },
  udio_link:   { label:'Udio AI (link)',           limit:'Free tier',                quality:5 },
  // Storage
  supabase:    { label:'Supabase 🥇',             limit:'500MB free, cross-device', quality:5 },
  firebase:    { label:'Firebase 🥈',             limit:'1GB free, 50K reads/day',  quality:5 },
  indexeddb:   { label:'IndexedDB ✅ 🥉',         limit:'Device storage, offline',  quality:4 },
  localstorage:{ label:'localStorage ✅',         limit:'5-10MB always works',      quality:2 },
}

const KEY_CONFIG: Record<KeyTab, Array<{ id:string; label:string; env:string; link:string; ph?:string; req?:boolean }>> = {
  llm: [
    { id:'gemini_key',  label:'Gemini API Key 🥇',        env:'GEMINI_API_KEY',     link:'https://aistudio.google.com',      ph:'AIza...',  req:true },
    { id:'groq',        label:'Groq API Key 🥈',          env:'GROQ_API_KEY',       link:'https://console.groq.com',         ph:'gsk_...',  req:true },
    { id:'openrouter',  label:'OpenRouter Key 🥉',         env:'OPENROUTER_KEY',     link:'https://openrouter.ai',            ph:'sk-or-...' },
    { id:'aimlapi',     label:'AIMLAPI Key',               env:'AIMLAPI_KEY',        link:'https://aimlapi.com',              ph:'...' },
    { id:'deepseek',    label:'DeepSeek API Key 🧠',       env:'DEEPSEEK_API_KEY',   link:'https://platform.deepseek.com',  ph:'sk-...' },
    { id:'mistral',     label:'Mistral API Key',           env:'MISTRAL_API_KEY',    link:'https://console.mistral.ai',     ph:'...' },
    { id:'grok',        label:'Grok (xAI) Key',           env:'GROK_API_KEY',       link:'https://x.ai/api',              ph:'xai-...' },
    { id:'together',    label:'Together AI Key',           env:'TOGETHER_API_KEY',   link:'https://api.together.xyz',       ph:'...' },
    { id:'cohere',      label:'Cohere API Key',            env:'COHERE_API_KEY',     link:'https://dashboard.cohere.com',   ph:'...' },
  ],
  tts: [
    { id:'google_tts',  label:'Google Cloud TTS 🥇',      env:'GOOGLE_TTS_KEY',     link:'https://console.cloud.google.com', ph:'AIza...' },
    { id:'elevenlabs',  label:'ElevenLabs 🥈',             env:'ELEVENLABS',         link:'https://elevenlabs.io',            ph:'...' },
    { id:'azure',       label:'Azure TTS Key 🥉',          env:'AZURE_TTS_KEY',      link:'https://portal.azure.com',         ph:'...' },
    { id:'playht',      label:'Play.ht Key',               env:'PLAYHT_API_KEY',     link:'https://play.ht',                  ph:'...' },
    { id:'openai',      label:'OpenAI Key',                env:'OPENAI_API_KEY',     link:'https://platform.openai.com',      ph:'sk-...' },
    { id:'huggingface', label:'HuggingFace Token',         env:'HF_TOKEN',           link:'https://huggingface.co/settings/tokens', ph:'hf_...' },
  ],
  image: [
    { id:'hf2',         label:'HuggingFace (FLUX) 🥈',    env:'HF_TOKEN',           link:'https://huggingface.co/settings/tokens', ph:'hf_...' },
    { id:'aimlapi2',    label:'AIMLAPI 🥉',                env:'AIMLAPI_KEY',        link:'https://aimlapi.com',              ph:'...' },
    { id:'deepai',      label:'DeepAI',                    env:'DEEPAI_KEY',         link:'https://deepai.org/api',           ph:'...' },
  ],
  music: [
    { id:'hf3',         label:'HuggingFace (MusicGen) 🥇',env:'HF_TOKEN',           link:'https://huggingface.co/settings/tokens', ph:'hf_...' },
    { id:'elevenlabs2', label:'ElevenLabs (Sound) 🥈',    env:'ELEVENLABS',         link:'https://elevenlabs.io',            ph:'...' },
    { id:'mubert',      label:'Mubert API 🥉',             env:'MUBERT_API_KEY',     link:'https://mubert.com/api',           ph:'...' },
  ],
  social: [
    { id:'telegram',    label:'Telegram Bot Token 🥇',    env:'TELEGRAM_BOT',       link:'https://t.me/BotFather',           ph:'123:ABC...' },
    { id:'meta',        label:'Meta App ID (IG+FB) 🥈',   env:'META_APP_ID',        link:'https://developers.facebook.com',  ph:'...' },
    { id:'twitter',     label:'Twitter Bearer Token 🥉',  env:'TWITTER_BEARER',     link:'https://developer.twitter.com',    ph:'...' },
    { id:'google_cal',  label:'Google OAuth Client ID',   env:'GOOGLE_CLIENT_ID',   link:'https://console.cloud.google.com', ph:'...' },
    { id:'supabase_u',  label:'Supabase URL 🥇',          env:'SUPABASE_URL',       link:'https://supabase.com',             ph:'https://xxx.supabase.co' },
    { id:'supabase_k',  label:'Supabase Anon Key',        env:'SUPABASE_ANON_KEY',  link:'https://supabase.com',             ph:'eyJ...' },
    { id:'firebase_k',  label:'Firebase API Key 🥈',      env:'FIREBASE_API_KEY',   link:'https://console.firebase.google.com', ph:'AIza...' },
    { id:'firebase_p',  label:'Firebase Project ID',      env:'FIREBASE_PROJECT_ID',link:'https://console.firebase.google.com', ph:'my-project' },
  ],
}

// ── Mode descriptions ─────────────────────────────────────
const MODE_INFO = {
  smart: {
    label: '⚡ Smart Mode',
    desc:  'JARVIS khud decide karta hai — simple messages pe Groq (cheap+fast), NEET pe Gemini, images pe direct API. Zero waste.',
    color: '#00e5ff',
  },
  auto: {
    label: '🤖 Auto Mode',
    desc:  'Har cheez ke liye best available provider use karo. Simple full cascade.',
    color: '#a78bfa',
  },
  select: {
    label: '🎛️ Select Mode',
    desc:  'Tum khud choose karo — TTS ke liye kaun, Image ke liye kaun, etc. Fallback phir bhi active.',
    color: '#00e676',
  },
}

// ── Helpers ───────────────────────────────────────────────
const lsGet = (k: string) => { try { return localStorage.getItem(k) || '' } catch { return '' } }
const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch {} }

export default function SettingsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<MainTab>('mode')
  const [keyTab, setKeyTab] = useState<KeyTab>('llm')
  const [saved, setSaved] = useState('')
  const [verified, setVerified] = useState<Record<string, 'ok'|'fail'|'testing'>>({})
  const [prefs, setPrefs] = useState<Record<string,string>>({})
  const [keys, setKeys]   = useState<Record<string,string>>({})

  useEffect(() => {
    try {
      const p = JSON.parse(lsGet('jarvis_provider_prefs') || '{}')
      setPrefs({ mode: 'smart', ...p })
    } catch { setPrefs({ mode: 'smart' }) }
    // Load saved keys
    const allKeys: Record<string,string> = {}
    Object.values(KEY_CONFIG).flat().forEach(k => {
      allKeys[k.env] = lsGet('jarvis_key_' + k.env)
    })
    setKeys(allKeys)
  }, [])

  const savePref = (k: string, v: string) => {
    const updated = { ...prefs, [k]: v }
    setPrefs(updated)
    lsSet('jarvis_provider_prefs', JSON.stringify(updated))
    setSaved(k); setTimeout(() => setSaved(''), 1200)
  }

  const verifyKey = async (env: string, val: string) => {
    if (!val.trim()) return
    setVerified(p => ({ ...p, [env]: 'testing' }))
    try {
      const r = await fetch('/api/verify-key', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ keyName: env, keyValue: val }) })
      const d = await r.json()
      setVerified(p => ({ ...p, [env]: d.ok ? 'ok' : 'fail' }))
    } catch { setVerified(p => ({ ...p, [env]: 'fail' })) }
  }

  const saveKey = (env: string, val: string) => {
    lsSet('jarvis_key_' + env, val)
    setSaved(env); setTimeout(() => setSaved(''), 1200)
  }

  const mode = prefs.mode || 'smart'

  const s: Record<string,any> = {
    wrap:     { position:'fixed', inset:0, background:'#090d18', color:'#ddeeff', display:'flex', flexDirection:'column', fontFamily:"'Inter',sans-serif" },
    header:   { display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderBottom:'1px solid rgba(255,255,255,.05)', background:'rgba(9,13,24,.97)', flexShrink:0, zIndex:10 },
    backBtn:  { width:28, height:28, borderRadius:6, border:'1px solid rgba(0,229,255,.1)', background:'#0c1422', color:'#3a6080', fontSize:14, cursor:'pointer' },
    mainTabs: { display:'flex', borderBottom:'1px solid rgba(255,255,255,.04)', flexShrink:0 },
    mainTab:  (active: boolean) => ({ flex:1, padding:'10px 0', background:'transparent', border:'none', borderBottom:`2px solid ${active?'#00e5ff':'transparent'}`, color:active?'#00e5ff':'#2a4060', fontSize:12, cursor:'pointer' }),
    body:     { flex:1, overflowY:'auto', padding:'14px', position:'relative' as const },
  }

  return (
    <div style={s.wrap}>
      <div className="bg-grid"/>
      <header style={s.header}>
        <button onClick={() => router.back()} style={s.backBtn}>←</button>
        <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:'#00e5ff', letterSpacing:2 }}>⚙️ SETTINGS</span>
        <span style={{ fontSize:10, color:'#1e3858', marginLeft:'auto' }}>Keys: localStorage only</span>
      </header>

      {/* Main tabs */}
      <div style={s.mainTabs}>
        {(['mode','keys','storage','memory'] as MainTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={s.mainTab(tab===t)}>
            {t === 'mode' ? '⚡ Mode' : t === 'keys' ? '🔑 API Keys' : t === 'storage' ? '💾 Storage' : '🧠 Memory'}
          </button>
        ))}
      </div>

      <div style={s.body}>

        {/* ═══ MODE TAB ══════════════════════════════════════ */}
        {tab === 'mode' && (
          <div>
            <div style={{ fontSize:10, color:'#1a3050', marginBottom:14, lineHeight:1.7 }}>
              JARVIS kaise kaam kare? Smart = API waste nahi, Auto = simple, Select = tumhari marzi.
            </div>

            {/* 3 mode cards */}
            {(['smart','auto','select'] as const).map(m => {
              const info = MODE_INFO[m]
              const active = mode === m
              return (
                <div key={m} onClick={() => savePref('mode', m)}
                  style={{ marginBottom:10, padding:'13px 14px', background: active ? 'rgba(0,229,255,.05)' : '#0c1422',
                    border:`1.5px solid ${active ? info.color : 'rgba(0,229,255,.07)'}`, borderRadius:11, cursor:'pointer',
                    transition:'all .2s' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:14, color: active ? info.color : '#c8dff0', fontWeight:600 }}>{info.label}</span>
                    <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${info.color}`,
                      background: active ? info.color : 'transparent', transition:'all .2s' }}/>
                  </div>
                  <div style={{ fontSize:11, color:'#1e3858', marginTop:5, lineHeight:1.6 }}>{info.desc}</div>
                  {active && m === 'smart' && (
                    <div style={{ marginTop:8, padding:'6px 9px', background:'rgba(0,229,255,.05)', borderRadius:6, fontSize:10, color:'#00e5ff' }}>
                      ✅ Active — "hello" → Groq | "image banao" → direct API | "cell kya hai" → Gemini
                    </div>
                  )}
                </div>
              )
            })}

            {/* Select mode — provider pickers */}
            {mode === 'select' && (
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:11, color:'#00e676', marginBottom:10 }}>🎛️ Har category ke liye choose karo:</div>
                {(['llm','tts','image','music'] as const).map(cat => (
                  <div key={cat} style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, color:'#1e3858', marginBottom:5, textTransform:'uppercase', letterSpacing:1 }}>{cat}</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {PROVIDERS[cat].map(p => {
                        const sel = (prefs[cat] || 'auto') === p
                        const info = PROVIDER_INFO[p]
                        return (
                          <button key={p} onClick={() => savePref(cat, p)}
                            style={{ padding:'5px 10px', borderRadius:20, fontSize:11, cursor:'pointer',
                              background: sel ? 'rgba(0,229,255,.15)' : '#0c1422',
                              border:`1px solid ${sel?'#00e5ff':'rgba(0,229,255,.1)'}`,
                              color: sel ? '#00e5ff' : '#3a6080' }}>
                            {info?.label?.split(' ')[0]} {p === 'auto' ? '(auto)' : ''}
                          </button>
                        )
                      })}
                    </div>
                    {prefs[cat] && prefs[cat] !== 'auto' && (
                      <div style={{ fontSize:9, color:'#1a3858', marginTop:3 }}>
                        Selected: {PROVIDER_INFO[prefs[cat]]?.label} • {PROVIDER_INFO[prefs[cat]]?.limit}
                        {PROVIDER_INFO[prefs[cat]]?.note ? ` • ${PROVIDER_INFO[prefs[cat]].note}` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ KEYS TAB ═══════════════════════════════════════ */}
        {tab === 'keys' && (
          <div>
            {/* Key sub-tabs */}
            <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
              {(['llm','tts','image','music','social'] as KeyTab[]).map(t => (
                <button key={t} onClick={() => setKeyTab(t)}
                  style={{ padding:'5px 11px', borderRadius:20, fontSize:11, cursor:'pointer',
                    background: keyTab===t ? 'rgba(0,229,255,.15)' : '#0c1422',
                    border:`1px solid ${keyTab===t?'#00e5ff':'rgba(0,229,255,.1)'}`,
                    color: keyTab===t ? '#00e5ff' : '#3a6080' }}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            <div style={{ fontSize:9, color:'#1a3050', marginBottom:10 }}>
              🥇 Best provider first. ✅ = no key needed. Keys stored locally only.
            </div>

            {KEY_CONFIG[keyTab].map((cfg, i) => (
              <div key={cfg.id} style={{ marginBottom:9, padding:'11px 12px', background:'#0c1422',
                border:`1px solid ${cfg.req?'rgba(0,229,255,.2)':'rgba(0,229,255,.06)'}`, borderRadius:10 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
                  <div>
                    <span style={{ fontSize:12, color: i===0?'#00e5ff':'#c8dff0', fontWeight:600 }}>{cfg.label}</span>
                    {cfg.req && <span style={{ fontSize:9, color:'#ff9944', marginLeft:6, padding:'1px 5px', borderRadius:3, border:'1px solid rgba(255,153,68,.3)' }}>REQUIRED</span>}
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    {keys[cfg.env] && <span style={{ fontSize:9, color:'#00e676', padding:'1px 5px', borderRadius:3, background:'rgba(0,230,118,.08)' }}>✓</span>}
                    {cfg.link && <a href={cfg.link} target="_blank" rel="noreferrer"
                      style={{ fontSize:9, color:'#00e5ff', padding:'2px 7px', borderRadius:5, border:'1px solid rgba(0,229,255,.15)', textDecoration:'none' }}>Get →</a>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:7 }}>
                  <input type="password" value={keys[cfg.env]||''} placeholder={cfg.ph || 'Enter key...'}
                    onChange={e => setKeys(prev => ({ ...prev, [cfg.env]: e.target.value }))}
                    style={{ flex:1, fontSize:11, padding:'7px 10px', background:'#060c18',
                      border:'1px solid rgba(0,229,255,.08)', borderRadius:7, color:'#ddeeff',
                      fontFamily:"'Space Mono',monospace" }}/>
                  <button onClick={() => saveKey(cfg.env, keys[cfg.env]||'')}
                    style={{ padding:'7px 13px', borderRadius:7, fontSize:11, cursor:'pointer', flexShrink:0,
                      background: saved===cfg.env ? 'rgba(0,230,118,.15)' : 'rgba(0,229,255,.08)',
                      border:`1px solid ${saved===cfg.env?'rgba(0,230,118,.3)':'rgba(0,229,255,.15)'}`,
                      color: saved===cfg.env ? '#00e676' : '#00e5ff' }}>
                    {saved===cfg.env ? '✓' : 'Save'}
                  </button>
                  <button onClick={() => verifyKey(cfg.env, keys[cfg.env]||'')}
                    disabled={!keys[cfg.env]?.trim()}
                    style={{ padding:'7px 10px', borderRadius:7, fontSize:11, cursor:'pointer', flexShrink:0,
                      background: verified[cfg.env]==='ok' ? 'rgba(0,230,118,.15)' : verified[cfg.env]==='fail' ? 'rgba(255,68,68,.1)' : 'rgba(255,255,255,.04)',
                      border:`1px solid ${verified[cfg.env]==='ok'?'rgba(0,230,118,.3)':verified[cfg.env]==='fail'?'rgba(255,68,68,.2)':'rgba(255,255,255,.08)'}`,
                      color: verified[cfg.env]==='ok' ? '#00e676' : verified[cfg.env]==='fail' ? '#ff6666' : '#3a6080' }}>
                    {verified[cfg.env]==='testing' ? '⏳' : verified[cfg.env]==='ok' ? '✅' : verified[cfg.env]==='fail' ? '❌' : 'Test'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ STORAGE TAB ════════════════════════════════════ */}
        {tab === 'storage' && (
          <div>
            <div style={{ fontSize:10, color:'#1a3050', marginBottom:12, lineHeight:1.7 }}>
              Chat history kahan save ho? Cloud = cross-device sync. Local = fast, offline, private.
            </div>

            {/* Storage mode */}
            <div style={{ display:'flex', gap:7, marginBottom:14 }}>
              {(['auto','select'] as const).map(m => (
                <button key={m} onClick={() => savePref('storageMode', m)}
                  style={{ flex:1, padding:'8px', borderRadius:8, fontSize:12, cursor:'pointer',
                    background: (prefs.storageMode||'auto')===m ? 'rgba(0,229,255,.1)' : '#0c1422',
                    border:`1.5px solid ${(prefs.storageMode||'auto')===m?'#00e5ff':'rgba(0,229,255,.08)'}`,
                    color: (prefs.storageMode||'auto')===m ? '#00e5ff' : '#3a6080' }}>
                  {m === 'auto' ? '🤖 Auto (cascade)' : '🎛️ Select provider'}
                </button>
              ))}
            </div>

            {/* Provider cards */}
            {PROVIDERS.storage.filter(p => p !== 'auto').map((p, i) => {
              const info = PROVIDER_INFO[p]
              const sel = prefs.storage === p
              const selMode = (prefs.storageMode || 'auto') === 'select'
              return (
                <div key={p} onClick={() => selMode && savePref('storage', p)}
                  style={{ marginBottom:9, padding:'12px 13px',
                    background: sel && selMode ? 'rgba(0,229,255,.06)' : '#0c1422',
                    border:`1.5px solid ${sel && selMode?'#00e5ff':i===0?'rgba(0,229,255,.15)':'rgba(0,229,255,.06)'}`,
                    borderRadius:11, cursor: selMode ? 'pointer' : 'default' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <span style={{ fontSize:13, color: i===0?'#00e5ff':'#c8dff0', fontWeight:600 }}>{info.label}</span>
                      <div style={{ fontSize:10, color:'#1e3858', marginTop:2 }}>{info.limit}</div>
                    </div>
                    <div style={{ textAlign:'right' as const }}>
                      {'⭐'.repeat(info.quality).padEnd(5,'☆')}
                      {sel && selMode && <div style={{ fontSize:9, color:'#00e676', marginTop:2 }}>✓ Selected</div>}
                      {!selMode && i===0 && <div style={{ fontSize:9, color:'#00e5ff', marginTop:2 }}>Primary</div>}
                    </div>
                  </div>
                </div>
              )
            })}

            <div style={{ marginTop:10, padding:'10px 12px', background:'rgba(255,153,68,.05)', border:'1px solid rgba(255,153,68,.1)', borderRadius:8 }}>
              <div style={{ fontSize:10, color:'#ff9944', lineHeight:1.7 }}>
                💡 Supabase/Firebase keys = Vercel env variables mein daalte hain (GitHub push se pehle).<br/>
                IndexedDB + localStorage = koi key nahi chahiye, auto works ✅
              </div>
            </div>
          </div>
        )}


        {/* ═══ MEMORY TAB ════════════════════════════════════ */}
        {tab === 'memory' && (
          <MemoryTab />
        )}

        <div style={{ height:70 }}/>
      </div>
      <Sidebar/>
    </div>
  )
}
