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
  { icon:'🌤️', t:'Aaj ka mausam kaisa hai?' },
  { icon:'📚', t:'Mujhe aaj ke liye study plan bana do' },
  { icon:'🖼️', t:'Ek realistic jungle image banao' },
  { icon:'🚂', t:'Nearest station se Delhi train kab hai?' },
  { icon:'🧠', t:'Ek concept samjhao — simple language mein' },
  { icon:'🎯', t:'Mera weekly goal set karo aur track karo' },
];

// Study mode quick prompts — shown when mode is study
const STUDY_PROMPTS = [
  { icon:'📖', t:'Aaj ka topic kya padhna chahiye?' },
  { icon:'❓', t:'MCQ banao is topic pe: ' },
  { icon:'🗂️', t:'Flashcards banao: ' },
  { icon:'📝', t:'Short notes banao: ' },
  { icon:'🔄', t:'Revision plan banao — exam 7 din mein' },
  { icon:'💡', t:'Ye concept simple language mein samjhao: ' },
];

async function save(id:string, m:any[]) { await saveChat(id, m) }
async function load(id:string): Promise<any[]> { return loadChat(id) }

// URL detector
function extractURL(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s]+/)
  return m ? m[0] : null
}

// Follow-up chips per mode
const FOLLOWUP_CHIPS: Record<string, string[]> = {
  default:  ['Aur detail mein', 'Example do', 'Hindi mein samjhao'],
  weather:  ['Kal kaisa hoga?', 'Weekly forecast', 'Humidity kitni hai?'],
  image:    ['Alag style mein banao', 'Dark version banao', 'Save karo'],
  study:    ['MCQ banao isse', 'Notes banao', 'Aur explain karo'],
  code:     ['Explain karo', 'Optimize karo', 'Test likhao'],
  search:   ['Source link do', 'Aur detail mein', 'Summary do'],
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
        setLoc(d < 0.2 ? '🏠 Ghar' : `📍 ${loc.city||loc.area||'?'} · ${d.toFixed(1)}km`);
      } else {
        setLoc(`📍 ${loc.city||loc.area||`${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}`}`);
      }
    } catch { setLoc('📍 off'); }
  }, []);

  useEffect(() => {
    load(chatId.current).then(msgs => { if(msgs.length) setMsgs(msgs) });
    // Proactive engine
    const cleanup = initProactiveEngine('', chatId.current)
    setupWakeLockPersist()
    requestWakeLock()
    // In-app alert listener (when notification denied)
    const onAlert = (e: any) => setToast({ msg: e.detail?.body || e.detail?.title, type: 'info' })
    window.addEventListener('jarvis-alert', onAlert)
    setOnl(navigator.onLine);
    window.addEventListener('online',  () => setOnl(true));
    window.addEventListener('offline', () => setOnl(false));
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    refreshLoc();
    const t = setInterval(refreshLoc, 3*60*1000);
    return () => clearInterval(t);
  }, [refreshLoc]);

  useEffect(() => {
    bot.current?.scrollIntoView({ behavior: msgs.length > 4 ? 'smooth' : 'instant' });
  }, [msgs, loading]);

  const send = useCallback(async (text: string, chatMode: ChatMode, file?: File) => {
    if (!text.trim() && !file || loading) return;
    setLoad(true);
    const uMsg = { id:'u_'+Date.now(), role:'user', content: file ? (text || file.name) : text, timestamp: Date.now(), mode: chatMode, hasFile: !!file };
    const cur  = [...msgs, uMsg]; setMsgs(cur); void save(chatId.current, cur);
    try {
      const memPrompt = (await buildMemoryPrompt(cur.slice(-5))) + (studyMode ? '\n\nSTUDY MODE: MCQ, flashcards, simple mein samjhao.' : '')
      let replied = false
      
      // Deep mode — tool-stream SSE (shows tool progress live)
      if (chatMode === 'deep') {
        try {
          setToolProgress([])
          const ds = await fetch('/api/tool-stream', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, userId: localStorage.getItem('jarvis_uid')||'user', chatId: chatId.current, chatMode: 'deep', history: cur.slice(-8), memoryPrompt: memPrompt }),
          })
          if (ds.ok && ds.body) {
            const reader = ds.body.getReader(); const dec = new TextDecoder(); let buf = ''
            const streamId = 'a_' + Date.now()
            setMsgs((p:any[]) => [...p, { id: streamId, role:'assistant', content:'', thinking:'', timestamp:Date.now(), toolsUsed:[], richData:null, processingMs:0, model:'deep', mode:'deep', streaming:true }])
            outer2: while(true) {
              const { done, value } = await reader.read(); if(done) break
              buf += dec.decode(value, { stream:true })
              const lines = buf.split('\n'); buf = lines.pop() || ''
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                try {
                  const ev = JSON.parse(line.slice(6))
                  if (ev.type === 'tool') setToolProgress(p => ev.status === 'start' ? [...p.filter(x=>x!==ev.label), ev.label] : p.filter(x=>x!==ev.label))
                  else if (ev.type === 'reply') {
                    setMsgs((p:any[]) => p.map((m:any) => m.id===streamId ? {...m, content:ev.reply||'', thinking:ev.thinking||'', toolsUsed:ev.toolsUsed||[], richData:ev.richData, streaming:false} : m))
                    setToolProgress([])
                    // Set follow-up chips
                    const chips = ev.toolsUsed?.includes('get_weather') ? FOLLOWUP_CHIPS.weather : ev.toolsUsed?.includes('generate_image') ? FOLLOWUP_CHIPS.image : FOLLOWUP_CHIPS.default
                    setFollowupChips(chips)
                    void save(chatId.current, [...cur, {id:streamId, role:'assistant', content:ev.reply||'', timestamp:Date.now()}])
                    autoExtractMemory(text, ev.reply||'').catch(()=>{})
                  }
                  else if (ev.type === 'done') break outer2
                } catch {}
              }
            }
            setLoad(false); return
          }
        } catch { setToolProgress([]) }
      }

      // Try streaming first (Groq/Gemini SSE)
      try {
        const sRes = await fetch('/api/stream', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: cur.slice(-8).map((m:any) => ({ role: m.role==='assistant'?'assistant':'user', content: m.content||m.text||'' })), memoryPrompt: memPrompt, chatMode }),
        })
        if (sRes.ok && sRes.body) {
          replied = true
          const streamId = 'a_' + Date.now()
          const sMsg = { id: streamId, role:'assistant', content:'', thinking:'', timestamp: Date.now(), toolsUsed:[], richData:null, processingMs:0, model:'streaming', mode: chatMode, streaming: true }
          setMsgs((prev:any[]) => [...prev, sMsg])
          
          const reader = sRes.body!.getReader()
          const decoder = new TextDecoder()
          let buf = '', full = '', think = ''
          
          outer: while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const lines = buf.split('\n'); buf = lines.pop() || ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              try {
                const ev = JSON.parse(line.slice(6))
                if (ev.type === 'status') { setMsgs((p:any[]) => p.map((m:any) => m.id===streamId ? {...m, status: ev.text} : m)) }
                else if (ev.type === 'token') { full += ev.text; setMsgs((p:any[]) => p.map((m:any) => m.id===streamId ? {...m, content: full, status: ''} : m)) }
                else if (ev.type === 'think') { think += ev.text; setMsgs((p:any[]) => p.map((m:any) => m.id===streamId ? {...m, thinking: think} : m)) }
                else if (ev.type === 'done') { setMsgs((p:any[]) => p.map((m:any) => m.id===streamId ? {...m, streaming:false} : m)); break outer }
                else if (ev.type === 'error') { replied = false; break outer }
              } catch {}
            }
          }
          if (replied && full) {
            const finMsgs = cur.concat([{...sMsg, content: full, thinking: think, streaming: false}])
            void save(chatId.current, finMsgs)
            autoExtractMemory(text, full).catch(() => {})
          }
        }
      } catch { replied = false }

      // Fallback: non-streaming
      if (!replied) {
        const res = await fetch('/api/jarvis', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, userId: (typeof window!=='undefined' ? localStorage.getItem('jarvis_uid')||'user' : 'user'), chatId: chatId.current, userName: (typeof window!=='undefined' ? localStorage.getItem('jarvis_profile_name')||'User' : 'User'), chatMode, history: cur.slice(-10), memoryPrompt: memPrompt }),
        });
        const d = await res.json();
        if (d.richData?.type === 'tts' && d.richData.data?.useBrowser) {
          const u = new SpeechSynthesisUtterance(d.richData.data.text || text);
          u.lang = d.richData.data.lang === 'hi' ? 'hi-IN' : 'en-US';
          window.speechSynthesis.speak(u);
        }
        autoExtractMemory(text, d.reply || '').catch(() => {})
        const aMsg = { id:'a_'+Date.now(), role:'assistant', content: d.reply||'Error', thinking: d.thinking||'', timestamp: Date.now(), toolsUsed: d.toolsUsed, richData: d.richData, processingMs: d.processingMs, model: d.model, mode: chatMode };
        const fin  = [...cur, aMsg]; setMsgs(fin); void save(chatId.current, fin);
      }
    } catch {
      const fin = [...cur, { id:'e_'+Date.now(), role:'assistant', content: online ? '⚠️ Error — try again' : '📡 Internet nahi.', timestamp: Date.now() }];
      setMsgs(fin); void save(chatId.current, fin);
      setToast({ msg: 'Error aaya — try again', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
    setLoad(false);
  }, [loading, msgs, online]);

  const newChat = () => {
    chatId.current = 'chat_'+Date.now();
    setMsgs([]);
  };

  return (
    <div style={{ position:'fixed', inset:0, display:'flex', flexDirection:'column', background:'#090d18' }}>
      <div className="bg-grid"/>
      <Sidebar onNewChat={newChat}/>

      {/* Header */}
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 14px 9px 58px', borderBottom:'1px solid rgba(255,255,255,.05)', flexShrink:0, background:'rgba(9,13,24,.96)', backdropFilter:'blur(10px)', zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:26, height:26, borderRadius:6, background:'linear-gradient(135deg,rgba(0,229,255,.1),rgba(109,40,217,.1))', border:'1px solid rgba(0,229,255,.18)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#00e5ff', fontFamily:"'Space Mono',monospace" }}>J</div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'#e8f4ff', letterSpacing:3, fontFamily:"'Space Mono',monospace" }}>JARVIS</div>
            <div style={{ fontSize:8, color:'#546e7a', letterSpacing:1 }}></div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          {locLbl && (
            <button onClick={refreshLoc} style={{ padding:'2px 8px', borderRadius:20, background:'rgba(0,229,255,.04)', border:'1px solid rgba(0,229,255,.07)', color:'#78909c', fontSize:9, cursor:'pointer' }}>
              {locLbl}
            </button>
          )}
          <span style={{ width:5, height:5, borderRadius:'50%', background: online ? '#00e676' : '#ff4444', display:'block' }}/>
          {msgs.length > 0 && (
            <button onClick={newChat} style={{ width:24, height:24, borderRadius:6, background:'transparent', border:'1px solid rgba(255,255,255,.06)', color:'#90caf9', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>⊘</button>
          )}
        </div>
      </header>

      {/* Messages */}
      <main style={{ flex:1, overflowY:'auto', position:'relative', zIndex:1 }}>
        {msgs.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'36px 16px', minHeight:'62vh' }}>
            <div style={{ fontSize:40, color:'rgba(0,229,255,.18)', marginBottom:8 }}>⬡</div>
            <div style={{ fontSize:24, fontWeight:800, color:'#e8f4ff', letterSpacing:5, fontFamily:"'Space Mono',monospace", marginBottom:5 }}>JARVIS</div>
            <div style={{ fontSize:10, color:'#142030', letterSpacing:1, marginBottom:26 }}>Tumhara personal AI</div>
            {/* Study toggle */}
            <div style={{ display:'flex', gap:6, marginBottom:10 }}>
              <button onClick={() => setStudyMode(false)} style={{ flex:1, padding:'6px', borderRadius:20, fontSize:10, cursor:'pointer', background: !studyMode ? 'rgba(0,229,255,.1)' : 'transparent', border:`1px solid ${!studyMode?'rgba(0,229,255,.25)':'rgba(255,255,255,.06)'}`, color: !studyMode?'#00e5ff':'#2a4060' }}>💬 General</button>
              <button onClick={() => setStudyMode(true)} style={{ flex:1, padding:'6px', borderRadius:20, fontSize:10, cursor:'pointer', background: studyMode ? 'rgba(167,139,250,.1)' : 'transparent', border:`1px solid ${studyMode?'rgba(167,139,250,.3)':'rgba(255,255,255,.06)'}`, color: studyMode?'#a78bfa':'#2a4060' }}>📚 Study Mode</button>
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
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6, paddingLeft:12 }}>
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
              <span style={{ fontSize:10, color:'#607d8b' }}>
                {mode === 'think' ? '🧠 soch raha hun...' : mode === 'deep' ? '🔬 deep analysis...' : 'soch raha hun...'}
              </span>
              <span style={{ display:'flex', gap:3, marginLeft:3 }}>
                <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
              </span>
            </div>
          </div>
        )}
        <div ref={bot} style={{ height:2 }}/>
      </main>

      <InputBar onSend={send} isLoading={loading} mode={mode} onModeChange={setMode}/>
      {toast && <Toast message={toast.msg} type={toast.type}/>}
    </div>
  );
}
