'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import MessageRow from '../components/chat/MessageRow';
import Sidebar from '../components/shared/Sidebar';
import InputBar, { ChatMode } from '../components/chat/InputBar';
import Toast from '../components/shared/Toast';
import { buildMemoryPrompt, autoExtractMemory, saveChat, loadChat } from '../lib/storage'
import { initProactiveEngine, detectChainedIntent, requestWakeLock, setupWakeLockPersist } from '../lib/proactive/engine'
import { getFullLocation, loadPlaces, distanceKm, syncLocationToCloud } from '../lib/location/tracker';

const STARTERS = [
  { icon:'ð¤ï¸', t:'Aaj ka mausam kaisa hai?' },
  { icon:'ð', t:'Mujhe aaj ke liye study plan bana do' },
  { icon:'ð¼ï¸', t:'Ek realistic jungle image banao' },
  { icon:'ð', t:'Nearest station se Delhi train kab hai?' },
  { icon:'ð§ ', t:'Ek concept samjhao â simple language mein' },
  { icon:'ð¯', t:'Mera weekly goal set karo aur track karo' },
];

const STUDY_PROMPTS = [
  { icon:'ð', t:'Aaj ka topic kya padhna chahiye?' },
  { icon:'â', t:'MCQ banao is topic pe: ' },
  { icon:'ðï¸', t:'Flashcards banao: ' },
  { icon:'ð', t:'Short notes banao: ' },
  { icon:'ð', t:'Revision plan banao â exam 7 din mein' },
  { icon:'ð¡', t:'Ye concept simple language mein samjhao: ' },
];

async function save(id:string, m:any[]) { await saveChat(id, m) }
async function load(id:string): Promise<any[]> { return loadChat(id) }

function extractURL(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s]+/)
  return m ? m[0] : null
}

const FOLLOWUP_CHIPS = {
  weather: ['Kal ka forecast?', 'Humidity kitni hai?', 'Aaj bahar jaana chahiye?'],
  image:   ['Aur ek banao', 'Different style mein banao', 'Portrait mein banao'],
  default: ['Aur detail mein?', 'Ek example do', 'Translate karo'],
}

function getFollowUpChips(reply: string): string[] {
  const r = reply.toLowerCase()
  const chips: string[] = []
  if (r.match(/weather|mausam|rain/)) chips.push('Kal ka forecast?')
  else if (r.match(/recipe|khana|dish/)) chips.push('Ingredients list karo')
  else if (r.match(/code|function|script/)) chips.push('Explain karo')
  else if (r.match(/train|bus|travel/)) chips.push('Book karna hai')
  else if (r.match(/news|khabar/)) chips.push('Aur news?')
  else chips.push('Aur detail mein?')
  chips.push('Translate karo')
  return chips.slice(0, 3)
}

// ââ Indian Festivals âââââââââââââââââââââââââââââââââââââââ
function getTodayFestival(): string | null {
  const now = new Date();
  const md = `${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const f: Record<string,string> = {
    '01-01':'ð Naya Saal Mubarak!', '01-14':'ðª Makar Sankranti aaj hai!',
    '01-26':'ð®ð³ Aaj Republic Day hai!', '02-14':'â¤ï¸ Valentine\'s Day aaj hai!',
    '03-08':'ð¸ Aaj Holi hai â Rang barse!', '03-25':'ð Gudi Padwa aaj hai!',
    '03-31':'âªï¸ Aaj Eid ul-Fitr hai!', '04-14':'ð Aaj Baisakhi hai!',
    '04-18':'âï¸ Aaj Good Friday hai!', '05-12':'ð Aaj Mother\'s Day hai!',
    '06-16':'ð Aaj Father\'s Day hai!', '08-15':'ð®ð³ Aaj Independence Day hai!',
    '08-26':'ð Aaj Ganesh Chaturthi hai!', '10-02':'ðï¸ Gandhi Jayanti aaj hai!',
    '10-13':'ð¥ Aaj Dussehra hai!', '10-24':'ðª Aaj Diwali hai!',
    '11-05':'ðª Aaj Bhai Dooj hai!', '11-15':'ð¡ Aaj Guru Nanak Jayanti hai!',
    '12-25':'ð Merry Christmas!', '12-31':'ð Aaj saal ka aakhri din hai!',
  };
  return f[md] || null;
}

function getLiveTime(): { time: string; greeting: string; date: string } {
  const now = new Date();
  const h = now.getHours();
  const greeting = h < 5 ? 'Shubb Ratri ð' : h < 12 ? 'Subah ki Salaam âï¸' : h < 17 ? 'Dopahar ki Salaam ð' : h < 20 ? 'Shaam ki Salaam ð' : 'Raat ki Salaam ð';
  const time = now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const date = now.toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  return { time, greeting, date };
}


// ââ Themes ââââââââââââââââââââââââââââââââââââââââââââââââ
export const THEMES = {
  dark: {
    name:'Dark', icon:'ð',
    bg:'#090d18', surface:'rgba(0,229,255,.04)', border:'rgba(0,229,255,.15)',
    text:'#e8f4ff', subtext:'#4a90b8', muted:'#1e3a50', accent:'#00e5ff',
    inputBg:'rgba(255,255,255,.07)', headerBg:'rgba(9,13,24,.96)',
    msgUser:'rgba(0,180,216,.12)', msgAI:'rgba(255,255,255,.03)',
  },
  black: {
    name:'Black', icon:'â«',
    bg:'#000000', surface:'rgba(255,255,255,.03)', border:'rgba(255,255,255,.08)',
    text:'#ffffff', subtext:'#4a6070', muted:'#1a1a1a', accent:'#00e5ff',
    inputBg:'rgba(255,255,255,.05)', headerBg:'rgba(0,0,0,.98)',
    msgUser:'rgba(0,180,216,.1)', msgAI:'rgba(255,255,255,.02)',
  },
  white: {
    name:'White', icon:'âï¸',
    bg:'#f0f4f8', surface:'rgba(0,0,0,.04)', border:'rgba(0,0,0,.1)',
    text:'#0d1b2a', subtext:'#2a5070', muted:'#90a4ae', accent:'#0077b6',
    inputBg:'rgba(255,255,255,.9)', headerBg:'rgba(240,244,248,.97)',
    msgUser:'rgba(0,119,182,.1)', msgAI:'rgba(255,255,255,.8)',
  },
  navy: {
    name:'Navy', icon:'ðµ',
    bg:'#0a1628', surface:'rgba(30,80,140,.12)', border:'rgba(30,80,140,.3)',
    text:'#cce0ff', subtext:'#5a8aaa', muted:'#0f2040', accent:'#4fc3f7',
    inputBg:'rgba(30,80,140,.15)', headerBg:'rgba(10,22,40,.97)',
    msgUser:'rgba(79,195,247,.12)', msgAI:'rgba(255,255,255,.03)',
  },
}
export type ThemeKey = keyof typeof THEMES;

export default function ChatPage() {
  const [msgs, setMsgs]   = useState<any[]>([]);
  const [loading, setLoad] = useState(false);
  const [locLbl, setLoc]   = useState('');
  const [online, setOnl]   = useState(true);
  const [mode, setMode]    = useState<ChatMode>('auto');
  const [toast, setToast]  = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const [studyMode, setStudyMode] = useState(false);
  const [toolProgress, setToolProgress] = useState<string[]>([])
  const [followupChips, setFollowupChips] = useState<string[]>([])
  // Personalization
  const [userName, setUserName]   = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showOnboard, setOnboard] = useState(false);
  const [liveTime, setLiveTime]   = useState(getLiveTime());
  const [weatherInfo, setWeatherInfo] = useState<{temp:string;icon:string;city:string}|null>(null);

  const [themeKey, setThemeKey] = useState<ThemeKey>('dark');
  const [showTheme, setShowTheme] = useState(false);
  const theme = THEMES[themeKey as keyof typeof THEMES];

  const chatId = useRef('chat_'+new Date().toDateString().replace(/ /g,'_'));
  const bot    = useRef<HTMLDivElement>(null);

  const refreshLoc = useCallback(async () => {
    try {
      const loc = await getFullLocation();
      if (!loc) return;
      syncLocationToCloud().catch(() => {});
      const places = await loadPlaces();
      const home   = places.find((p:any) => p.id === 'home');
      if (home) {
        const d = distanceKm(loc.lat, loc.lon, home.lat, home.lon);
        setLoc(d < 0.2 ? 'ð  Ghar' : `ð ${loc.city||loc.area||'?'} Â· ${d.toFixed(1)}km`);
      } else {
        setLoc(`ð ${loc.city||loc.area||`${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}`}`);
      }
    } catch { setLoc('ð off'); }
  }, []);

  useEffect(() => {
    // Load theme
    const savedTheme = localStorage.getItem('jarvis_theme') as ThemeKey | null;
    if (savedTheme && (savedTheme in THEMES)) setThemeKey(savedTheme);

    // Load saved name â show onboarding if first visit
    const saved = localStorage.getItem('jarvis_profile_name') || '';
    if (saved) setUserName(saved);
    else setOnboard(true);

    load(chatId.current).then(msgs => { if(msgs.length) setMsgs(msgs) });
    const cleanup = initProactiveEngine('', chatId.current)
    setupWakeLockPersist()
    requestWakeLock()
    const onAlert = (e: any) => setToast({ msg: e.detail?.body || e.detail?.title, type: 'info' })
    window.addEventListener('jarvis-alert', onAlert)
    setOnl(navigator.onLine);
    window.addEventListener('online',  () => setOnl(true));
    window.addEventListener('offline', () => setOnl(false));
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    refreshLoc();
    const t = setInterval(refreshLoc, 3*60*1000);

    // Live clock â update every 30s
    const clockT = setInterval(() => setLiveTime(getLiveTime()), 30000);

    // Silent background weather fetch
    fetch('/api/jarvis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'current weather brief 1 line', history: [], userId: 'welcome', chatId: 'welcome_wx', chatMode: 'flash' })
    }).then(r => r.json()).then(d => {
      const reply = d.reply || d.text || '';
      const tempMatch = reply.match(/(\d+)\s*[Â°âC]/);
      const iconMatch = reply.match(/[âï¸ð¤ï¸âð§ï¸ð©ï¸âï¸ð«ï¸ð¦ï¸ð¨ï¸]/u);
      if (tempMatch) {
        setWeatherInfo({ temp: tempMatch[0], icon: iconMatch?.[0] || 'ð¤ï¸', city: 'Rewa' });
      }
    }).catch(() => {});

    return () => { clearInterval(t); clearInterval(clockT); };
  }, [refreshLoc]);

  useEffect(() => {
    bot.current?.scrollIntoView({ behavior: msgs.length > 4 ? 'smooth' : 'instant' });
  }, [msgs, loading]);

  const send = useCallback(async (text: string, chatMode: ChatMode, file?: File) => {
    if (!text.trim() && !file || loading) return;

    const url = extractURL(text)
    const uMsg = {
      id: Date.now().toString(), role:'user' as const,
      content: text, timestamp: Date.now(),
      file: file ? { name: file.name, type: file.type } : undefined,
    };
    const cur  = [...msgs, uMsg]; setMsgs(cur); void save(chatId.current, cur);
    setLoad(true); setToolProgress([]); setFollowupChips([]);

    try {
      const memPrompt = (await buildMemoryPrompt(cur.slice(-5))) + (studyMode ? '\n\nSTUDY MODE: MCQ, flashcards, simple mein samjhao.' : '')
      const userName = localStorage.getItem('jarvis_profile_name') || 'Boss'

      if (chatMode === 'deep') {
        // Deep mode: tool-stream
        const streamId = Date.now().toString() + '_s';
        setMsgs(p => [...p, { id:streamId, role:'assistant', content:'', streaming:true, timestamp:Date.now() }])

        let fileData: string|null = null
        if (file) {
          fileData = await new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target?.result as string); r.readAsDataURL(file) })
        }

        const res = await fetch('/api/tool-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: cur.slice(-10), userId: localStorage.getItem('jarvis_uid')||'user', chatId: chatId.current, userName, chatMode, memoryPrompt: memPrompt, fileData })
        })

        const reader = res.body!.getReader()
        const dec = new TextDecoder()
        let buf = '', finalReply = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n\n'); buf = lines.pop()!
          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            try {
              const ev = JSON.parse(line.slice(5))
              if (ev.type === 'tool_start') setToolProgress(p => [...p, `ð§ ${ev.tool}...`])
              if (ev.type === 'tool_end')   setToolProgress(p => [...p, `â ${ev.tool}`])
              if (ev.type === 'chunk') { finalReply += ev.text; setMsgs(p => p.map(m => m.id===streamId ? {...m, content:finalReply} : m)) }
              if (ev.type === 'reply') {
                finalReply = ev.reply || finalReply
                setMsgs(p => p.map(m => m.id===streamId ? {...m, content:finalReply, streaming:false, toolsUsed:ev.toolsUsed, richData:ev.richData, processingMs:ev.processingMs} : m))
                void save(chatId.current, [...cur, {id:streamId, role:'assistant', content:ev.reply||'', timestamp:Date.now()}])
              }
            } catch {}
          }
        }
        setLoad(false); setToolProgress([]);
        return
      }

      if (chatMode === 'think') {
        // Think mode: streaming
        const streamId = Date.now().toString() + '_s';
        setMsgs(p => [...p, { id:streamId, role:'assistant', content:'', streaming:true, timestamp:Date.now() }])

        const res = await fetch('/api/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: cur.slice(-8), memoryPrompt: memPrompt, chatMode, userName })
        })

        const reader = res.body!.getReader()
        const dec = new TextDecoder()
        let buf = '', finalReply = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n\n'); buf = lines.pop()!
          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            try {
              const ev = JSON.parse(line.slice(5))
              if (ev.text) { finalReply += ev.text; setMsgs(p => p.map(m => m.id===streamId ? {...m, content:finalReply} : m)) }
              if (ev.reply) {
                setMsgs(p => p.map(m => m.id===streamId ? {...m, content:ev.reply, streaming:false, toolsUsed:ev.toolsUsed, richData:ev.richData} : m))
                void save(chatId.current, [...cur, {id:streamId, role:'assistant', content:ev.reply||'', timestamp:Date.now()}])
              }
            } catch {}
          }
        }
        setLoad(false);
        return
      }

      // Auto / Flash mode
      let fileData: string|null = null
      if (file) {
        fileData = await new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target?.result as string); r.readAsDataURL(file) })
      }

      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, userId: localStorage.getItem('jarvis_uid')||'user', chatId: chatId.current, userName, chatMode, history: cur.slice(-10), memoryPrompt: memPrompt, fileData, url }),
      })
      const d = await res.json()
      const aMsg = { id: Date.now().toString()+'_a', role:'assistant' as const, content: d.reply||d.text||'Error', timestamp: Date.now(), toolsUsed: d.toolsUsed, richData: d.richData, processingMs: d.processingMs }
      const fin  = [...cur, aMsg]; setMsgs(fin); void save(chatId.current, fin)
      setFollowupChips(getFollowUpChips(d.reply||''))
      autoExtractMemory(text, d.reply||'').catch(()=>{})
    } catch(e) {
      const errMsg = { id: Date.now().toString()+'_e', role:'assistant' as const, content: 'â Kuch error aaya. Dobara try karo.', timestamp: Date.now() }
      setMsgs(fin => { const f=[...fin,errMsg]; void save(chatId.current,f); return f; })
    }
    setLoad(false);
  }, [loading, msgs, studyMode]);

  const newChat = () => {
    chatId.current = 'chat_'+Date.now();
    setMsgs([]);
  };

  const loadOldChat = async (id: string) => {
    chatId.current = id;
    const msgs = await loadChat(id);
    setMsgs(msgs);
  };

  return (
    <div style={{ position:'fixed', inset:0, display:'flex', flexDirection:'column', background:theme.bg, color:theme.text }}>
      <div className="bg-grid"/>
      <Sidebar onNewChat={newChat} onLoadChat={loadOldChat} currentChatId={chatId.current}/>

      {/* ââ ONBOARDING (first visit) âââââââââââââ */}
      {showOnboard && (
        <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(5,10,20,.97)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ maxWidth:340, width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:54, marginBottom:10 }}>ð¤</div>
            <div style={{ fontSize:24, fontWeight:800, color:'#e8f4ff', letterSpacing:4, marginBottom:6 }}>JARVIS</div>
            <div style={{ fontSize:13, color:'#4a7090', marginBottom:28, lineHeight:1.7 }}>
              Tumhara personal AI assistant.<br/>
              Pehle bata do â tumhara naam kya hai?
            </div>
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const n = nameInput.trim() || 'Boss';
                  localStorage.setItem('jarvis_profile_name', n);
                  setUserName(n); setOnboard(false);
                }
              }}
              placeholder="Apna naam likho..."
              style={{ width:'100%', padding:'13px 16px', borderRadius:12, background:'rgba(0,229,255,.07)', border:'1.5px solid rgba(0,229,255,.3)', color:'#e8f4ff', fontSize:16, outline:'none', caretColor:'#00e5ff', marginBottom:10, textAlign:'center', boxSizing:'border-box' as const }}
            />
            <button
              onClick={() => {
                const n = nameInput.trim() || 'Boss';
                localStorage.setItem('jarvis_profile_name', n);
                setUserName(n); setOnboard(false);
              }}
              style={{ width:'100%', padding:'13px', borderRadius:12, background: nameInput.trim() ? 'linear-gradient(135deg,#00b4d8,#0077b6)' : 'rgba(0,229,255,.08)', border:'none', color: nameInput.trim() ? '#fff' : '#37474f', fontSize:15, fontWeight:700, cursor:'pointer' }}
            >
              {nameInput.trim() ? `Namaste, ${nameInput.trim()}! ð` : 'Shuru karo â'}
            </button>
            <div style={{ marginTop:12, fontSize:10, color:'#1a3040' }}>Naam sirf tumhare device pe store hoga</div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 14px 9px 58px', borderBottom:'1px solid rgba(255,255,255,.05)', flexShrink:0, background:'rgba(9,13,24,.96)', backdropFilter:'blur(10px)', zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:22, height:22, borderRadius:6, background:'linear-gradient(135deg,rgba(0,229,255,.18),rgba(109,40,217,.12))', border:'1px solid rgba(0,229,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#00e5ff' }}>J</div>
          <div style={{ fontSize:11, fontWeight:700, color:'#e8f4ff', letterSpacing:3 }}>JARVIS</div>
          {userName && <div style={{ fontSize:10, color:'#2a5070' }}>Â· {userName}</div>}
          {locLbl && <div style={{ fontSize:9, color:'#1a3050', marginLeft:4 }}>{locLbl}</div>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background: online ? '#00e676' : '#ff4444', display:'block' }}/>
          {/* Theme picker */}
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowTheme(p=>!p)}
              style={{ width:26, height:26, borderRadius:7, background:'transparent', border:'1px solid rgba(255,255,255,.08)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {THEMES[themeKey].icon}
            </button>
            {showTheme && (
              <>
                <div onClick={() => setShowTheme(false)} style={{ position:'fixed', inset:0, zIndex:299 }}/>
                <div style={{ position:'absolute', top:30, right:0, zIndex:300, background:'#071828', border:'1px solid rgba(0,229,255,.2)', borderRadius:12, padding:6, minWidth:130, boxShadow:'0 8px 32px rgba(0,0,0,.8)' }}>
                  {(Object.keys(THEMES) as ThemeKey[]).map(k => (
                    <button key={k} onClick={() => { setThemeKey(k); localStorage.setItem('jarvis_theme',k); setShowTheme(false); }}
                      style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 10px', borderRadius:8, background: themeKey===k ? 'rgba(0,229,255,.1)' : 'transparent', border:'none', cursor:'pointer', color: themeKey===k ? '#00e5ff' : '#90b4c8', fontSize:12 }}>
                      <span>{THEMES[k].icon}</span><span>{THEMES[k].name}</span>
                      {themeKey===k && <span style={{ marginLeft:'auto' }}>â</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {msgs.length > 0 && (
            <button onClick={newChat} style={{ width:24, height:24, borderRadius:6, background:'transparent', border:'1px solid rgba(255,255,255,.06)', color:'#90caf9', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>â</button>
          )}
        </div>
      </header>

      {/* Messages */}
      <main style={{ flex:1, overflowY:'auto', position:'relative', zIndex:1 }}>
        {msgs.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 16px' }}>

            {/* Live info bar */}
            <div style={{ width:'100%', maxWidth:440, marginBottom:16 }}>
              <div style={{ textAlign:'center', marginBottom:12 }}>
                <div style={{ fontSize:11, color:'#4a90b8', marginBottom:2 }}>{liveTime.greeting}</div>
                <div style={{ fontSize:20, fontWeight:800, color:'#e8f4ff' }}>
                  {userName ? `${userName} ð` : 'Boss ð'}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                <div style={{ flex:1, padding:'10px 12px', borderRadius:12, background:'rgba(0,229,255,.05)', border:'1px solid rgba(0,229,255,.1)' }}>
                  <div style={{ fontSize:16, fontWeight:700, color:'#00e5ff', lineHeight:1 }}>{liveTime.time}</div>
                  <div style={{ fontSize:9, color:'#3a6080', marginTop:3, lineHeight:1.4 }}>{liveTime.date}</div>
                </div>
                <div style={{ flex:1, padding:'10px 12px', borderRadius:12, background:'rgba(0,229,255,.05)', border:'1px solid rgba(0,229,255,.1)' }}>
                  {weatherInfo ? (
                    <>
                      <div style={{ fontSize:16, fontWeight:700, color:'#e8f4ff', lineHeight:1 }}>{weatherInfo.icon} {weatherInfo.temp}</div>
                      <div style={{ fontSize:9, color:'#3a6080', marginTop:3 }}>{weatherInfo.city} Â· Abhi</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:16, color:'#1e3a50', lineHeight:1 }}>ð¤ï¸ â</div>
                      <div style={{ fontSize:9, color:'#1e3040', marginTop:3 }}>Loading...</div>
                    </>
                  )}
                </div>
              </div>
              {getTodayFestival() && (
                <div style={{ padding:'7px 14px', borderRadius:10, background:'rgba(255,200,50,.08)', border:'1px solid rgba(255,200,50,.2)', color:'#ffd700', fontSize:12, textAlign:'center', marginBottom:8 }}>
                  {getTodayFestival()}
                </div>
              )}
            </div>

            {/* Mode tabs */}
            <div style={{ display:'flex', gap:6, marginBottom:10, width:'100%', maxWidth:440 }}>
              <button onClick={() => setStudyMode(false)} style={{ flex:1, padding:'7px', borderRadius:20, fontSize:11, cursor:'pointer', background: !studyMode ? 'rgba(0,229,255,.1)' : 'transparent', border:`1px solid ${!studyMode?'rgba(0,229,255,.25)':'rgba(255,255,255,.06)'}`, color: !studyMode?'#00e5ff':'#2a4060' }}>ð¬ General</button>
              <button onClick={() => setStudyMode(true)} style={{ flex:1, padding:'7px', borderRadius:20, fontSize:11, cursor:'pointer', background: studyMode ? 'rgba(167,139,250,.1)' : 'transparent', border:`1px solid ${studyMode?'rgba(167,139,250,.3)':'rgba(255,255,255,.06)'}`, color: studyMode?'#a78bfa':'#2a4060' }}>ð Study Mode</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, width:'100%', maxWidth:440 }}>
              {(studyMode ? STUDY_PROMPTS : STARTERS).map(s => (
                <button key={s.t} onClick={() => send(s.t, mode)} style={{ padding:'9px 10px', borderRadius:9, background: studyMode ? 'rgba(167,139,250,.07)' : 'rgba(0,229,255,.04)', border:`1px solid ${studyMode?'rgba(167,139,250,.25)':'rgba(0,229,255,.15)'}`, color:'#90b4c8', fontSize:11, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'flex-start', gap:6, lineHeight:1.4 }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>{s.icon}</span><span>{s.t}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          msgs.map((m, i) => (
            <div key={m.id} className="msg-enter">
              <MessageRow msg={m}/>
              {m.status && <div style={{ fontSize:11, color:'#4a90a4', padding:'4px 14px', fontStyle:'italic' }}>{m.status}</div>}
              {i === msgs.length-1 && m.role === 'assistant' && !loading && (
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:4, paddingLeft:10 }}>
                  {getFollowUpChips(m.content||'').map(chip => (
                    <button key={chip} onClick={() => send(chip, mode)}
                      style={{ padding:'4px 11px', borderRadius:20, fontSize:11, cursor:'pointer',
                        background:'rgba(0,229,255,.08)', border:'1px solid rgba(0,229,255,.25)', color:'#00b4d8' }}>
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div style={{ padding:'13px 16px', borderTop:'1px solid rgba(255,255,255,.04)', background:'rgba(255,255,255,.016)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:22, height:22, borderRadius:5, background:'rgba(120,60,255,.12)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#a78bfa' }}>J</span>
              <span style={{ fontSize:12, fontWeight:600, color:'#a78bfa' }}>JARVIS</span>
              <span style={{ display:'flex', gap:3, marginLeft:4 }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{ width:5, height:5, borderRadius:'50%', background:'#a78bfa', display:'block', opacity:.7, animation:`pulse 1s ${i*0.2}s infinite` }}/>
                ))}
              </span>
            </div>
            {toolProgress.length > 0 && (
              <div style={{ marginTop:8, paddingLeft:30 }}>
                {toolProgress.slice(-3).map((p,i) => (
                  <div key={i} style={{ fontSize:10, color:'#3a6080', marginBottom:2 }}>{p}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <div ref={bot} style={{ height:1 }}/>
      </main>

      {toast && <Toast message={toast.msg} type={toast.type}/>}

      <InputBar onSend={send} isLoading={loading} mode={mode} onModeChange={setMode}/>
    </div>
  );
}
