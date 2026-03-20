'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import MessageRow from '../components/chat/MessageRow'
import TypingIndicator from '../components/chat/TypingIndicator';
import Sidebar from '../components/shared/Sidebar';
import InputBar, { ChatMode } from '../components/chat/InputBar';
import Toast from '../components/shared/Toast';
import { buildMemoryPrompt, autoExtractMemory, saveChat, loadChat } from '../lib/storage'
import { initProactiveEngine, requestWakeLock, setupWakeLockPersist } from '../lib/proactive/engine'
import { getFullLocation, loadPlaces, distanceKm, syncLocationToCloud } from '../lib/location/tracker';
import { useRouter } from 'next/navigation';
import PinLock, { isPINEnabled } from '../components/shared/PinLock';
import { getDeviceContext, deviceContextToPrompt, vibrate } from '../lib/core/deviceContext';
import { trackCall, resetDailyUsage } from '../lib/core/usageTracker';
import { smartHistory } from '../lib/core/contextCompressor';
import { detectPhoneIntent, triggerMacrodroid, ACTION_LABELS } from '../lib/automation/macrodroid';
import { parseReminder, addReminder, formatReminderTime } from '../lib/automation/reminders';
import { isAgenticGoal, runAgentPlan, formatPlanAsMessage } from '../lib/core/agentRunner';
import { generateSpeech } from '../lib/providers/tts';
import {
  pickContacts, isContactPickerSupported,
  makeCall, sendSMSIntent,
  keepScreenOn, getSharedContent,
  checkGeoFences, capturePhoto,
} from '../lib/client/androidBridge';
import { detectMood, logMood, getDominantMood, getMoodPromptHint } from '../lib/core/moodTracker';
import { startFocusMode, extractImportantInfo } from '../lib/proactive/engine';

const STARTERS = [
  { icon:'Ã°ÂÂÂ¤Ã¯Â¸Â', t:'Aaj ka mausam kaisa hai?' },
  { icon:'Ã°ÂÂÂ¼Ã¯Â¸Â', t:'Ek beautiful realistic girl ki image banao' },
  { icon:'Ã°ÂÂ§Â ', t:'Mera NEET/exam schedule banao' },
  { icon:'Ã°ÂÂÂ±', t:'WiFi band karo' },
  { icon:'Ã°ÂÂÂ¯', t:'Mera aaj ka plan banao Ã¢ÂÂ productive day' },
  { icon:'Ã°ÂÂÂ', t:'Aaj ki top India news kya hai?' },
  { icon:'Ã°ÂÂÂ¡', t:'Koi interesting science fact batao' },
  { icon:'Ã°ÂÂÂµ', t:'Gaana chala do' },
];

const STUDY_PROMPTS = [
  { icon:'Ã°ÂÂÂ', t:'Aaj ka topic kya padhna chahiye?' },
  { icon:'Ã¢ÂÂ', t:'MCQ banao is topic pe: ' },
  { icon:'Ã°ÂÂÂÃ¯Â¸Â', t:'Flashcards banao: ' },
  { icon:'Ã°ÂÂÂ', t:'Short notes banao: ' },
  { icon:'Ã°ÂÂÂ', t:'Revision plan banao Ã¢ÂÂ exam 7 din mein' },
  { icon:'Ã°ÂÂÂ¡', t:'Ye concept simple language mein samjhao: ' },
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

// Ã¢ÂÂÃ¢ÂÂ Indian Festivals Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function getTodayFestival(): string | null {
  const now = new Date();
  const md = `${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const f: Record<string,string> = {
    '01-01':'Ã°ÂÂÂ Naya Saal Mubarak!', '01-14':'Ã°ÂÂªÂ Makar Sankranti aaj hai!',
    '01-26':'Ã°ÂÂÂ®Ã°ÂÂÂ³ Aaj Republic Day hai!', '02-14':'Ã¢ÂÂ¤Ã¯Â¸Â Valentine\'s Day aaj hai!',
    '03-08':'Ã°ÂÂÂ¸ Aaj Holi hai Ã¢ÂÂ Rang barse!', '03-25':'Ã°ÂÂÂ Gudi Padwa aaj hai!',
    '03-31':'Ã¢ÂÂªÃ¯Â¸Â Aaj Eid ul-Fitr hai!', '04-14':'Ã°ÂÂÂ Aaj Baisakhi hai!',
    '04-18':'Ã¢ÂÂÃ¯Â¸Â Aaj Good Friday hai!', '05-12':'Ã°ÂÂÂ Aaj Mother\'s Day hai!',
    '06-16':'Ã°ÂÂÂ Aaj Father\'s Day hai!', '08-15':'Ã°ÂÂÂ®Ã°ÂÂÂ³ Aaj Independence Day hai!',
    '08-26':'Ã°ÂÂÂ Aaj Ganesh Chaturthi hai!', '10-02':'Ã°ÂÂÂÃ¯Â¸Â Gandhi Jayanti aaj hai!',
    '10-13':'Ã°ÂÂÂ¥ Aaj Dussehra hai!', '10-24':'Ã°ÂÂªÂ Aaj Diwali hai!',
    '11-05':'Ã°ÂÂªÂ Aaj Bhai Dooj hai!', '11-15':'Ã°ÂÂÂ¡ Aaj Guru Nanak Jayanti hai!',
    '12-25':'Ã°ÂÂÂ Merry Christmas!', '12-31':'Ã°ÂÂÂ Aaj saal ka aakhri din hai!',
  };
  return f[md] || null;
}

function getLiveTime(): { time: string; greeting: string; date: string } {
  const now = new Date();
  const h = now.getHours();
  const greeting = h < 5 ? 'Shubb Ratri Ã°ÂÂÂ' : h < 12 ? 'Subah ki Salaam Ã¢ÂÂÃ¯Â¸Â' : h < 17 ? 'Dopahar ki Salaam Ã°ÂÂÂ' : h < 20 ? 'Shaam ki Salaam Ã°ÂÂÂ' : 'Raat ki Salaam Ã°ÂÂÂ';
  const time = now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const date = now.toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  return { time, greeting, date };
}


// Ã¢ÂÂÃ¢ÂÂ Themes Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
const THEMES = {
  dark: {
    name:'Dark', icon:'Ã°ÂÂÂ',
    bg:'#090d18', surface:'rgba(0,229,255,.04)', border:'rgba(0,229,255,.15)',
    text:'#e8f4ff', subtext:'#4a90b8', muted:'#1e3a50', accent:'#00e5ff',
    inputBg:'rgba(255,255,255,.07)', headerBg:'rgba(9,13,24,.96)',
    msgUser:'rgba(0,180,216,.12)', msgAI:'rgba(255,255,255,.03)',
  },
  black: {
    name:'Black', icon:'Ã¢ÂÂ«',
    bg:'#000000', surface:'rgba(255,255,255,.03)', border:'rgba(255,255,255,.08)',
    text:'#ffffff', subtext:'#4a6070', muted:'#1a1a1a', accent:'#00e5ff',
    inputBg:'rgba(255,255,255,.05)', headerBg:'rgba(0,0,0,.98)',
    msgUser:'rgba(0,180,216,.1)', msgAI:'rgba(255,255,255,.02)',
  },
  white: {
    name:'White', icon:'Ã¢ÂÂÃ¯Â¸Â',
    bg:'#f0f4f8', surface:'rgba(0,0,0,.04)', border:'rgba(0,0,0,.1)',
    text:'#0d1b2a', subtext:'#2a5070', muted:'#90a4ae', accent:'#0077b6',
    inputBg:'rgba(255,255,255,.9)', headerBg:'rgba(240,244,248,.97)',
    msgUser:'rgba(0,119,182,.1)', msgAI:'rgba(255,255,255,.8)',
  },
  navy: {
    name:'Navy', icon:'Ã°ÂÂÂµ',
    bg:'#0a1628', surface:'rgba(30,80,140,.12)', border:'rgba(30,80,140,.3)',
    text:'#cce0ff', subtext:'#5a8aaa', muted:'#0f2040', accent:'#4fc3f7',
    inputBg:'rgba(30,80,140,.15)', headerBg:'rgba(10,22,40,.97)',
    msgUser:'rgba(79,195,247,.12)', msgAI:'rgba(255,255,255,.03)',
  },
}
type ThemeKey = keyof typeof THEMES;

// Ã¢ÂÂÃ¢ÂÂ Auto Session Title (pure, no state) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function getAutoTitle(text: string): string {
  const t = text.trim().toLowerCase();
  if (t.match(/weather|mausam|baarish/)) return 'Ã°ÂÂÂ¤Ã¯Â¸Â Weather Chat';
  if (t.match(/image|photo|picture|banao/)) return 'Ã°ÂÂÂ¨ Image Generation';
  if (t.match(/news|khabar|today/)) return 'Ã°ÂÂÂ° News Discussion';
  if (t.match(/code|function|program|script/)) return 'Ã°ÂÂÂ» Coding Help';
  if (t.match(/study|physics|chemistry|math|science/)) return 'Ã°ÂÂÂ Study Session';
  if (t.match(/recipe|food|khana|cook/)) return 'Ã°ÂÂÂ Recipe Chat';
  if (t.match(/cricket|ipl|score|match/)) return 'Ã°ÂÂÂ Cricket';
  if (t.match(/song|music|gana/)) return 'Ã°ÂÂÂµ Music';
  if (t.match(/joke|funny|meme/)) return 'Ã°ÂÂÂ Fun Chat';
  const clean = text.replace(/[^a-zA-Z0-9 \u0900-\u097F]/g, '').trim();
  return clean.slice(0, 30) || 'Chat Session';
}

export default function ChatPage() {
  const [msgs, setMsgs]   = useState<any[]>([]);
  const [loading, setLoad] = useState(false);
  const [autoTTS, setAutoTTS]   = useState(false);      // Auto-speak every reply
  const [situation, setSit]     = useState<'normal'|'night'|'focus'>('normal'); // Situation awareness
  const [locLbl, setLoc]   = useState('');
  const [online, setOnl]   = useState(true);
  const [mode, setMode]    = useState<ChatMode>('auto');
  const [toast, setToast]  = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const [studyMode, setStudyMode] = useState(false);
  const [toolProgress, setToolProgress] = useState<string[]>([])
  const [followupChips, setFollowupChips] = useState<string[]>([])
  // Device
  const [batteryPct, setBatteryPct] = useState<number|null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [batteryCharging, setBatteryCharging] = useState(false);
  const [netType, setNetType]  = useState('');
  const deviceCtxRef = useRef<string>('');
  // Personalization
  const [userName, setUserName]   = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showOnboard, setOnboard] = useState(false);
  const [liveTime, setLiveTime]   = useState(getLiveTime());
  const [weatherInfo, setWeatherInfo] = useState<{temp:string;icon:string;city:string}|null>(null);
  // Auto session title
  const [chatTitle, setChatTitle] = useState('');
  const [lastProvider, setLastProvider] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('jarvis_last_provider') || '' : ''
  );

  const router = useRouter();
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [themeKey, setThemeKey] = useState<ThemeKey>('dark');
  const [showTheme, setShowTheme] = useState(false);
  const theme = THEMES[themeKey as keyof typeof THEMES];
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{id:string,preview:string,chatId:string}[]>([]);

  // Agent Mode
  const [_agentPlan, setAgentPlan]   = useState<any>(null);
  const [agentRunning, setAgentRunning] = useState(false); // used in InputBar disabled
  // Focus mode
  const [focusBanner, setFocusBanner] = useState<{task:string;durationMin:number;startTime:number}|null>(null);
  // Reactions handler
  const handleReact = (msgId: string, emoji: string) => {
    setMsgs(prev => {
      const updated = prev.map(m => {
        if (m.id !== msgId) return m
        const reactions = { ...(m.reactions || {}) }
        reactions[emoji] = (reactions[emoji] || 0) + 1
        return { ...m, reactions }
      })
      void save(chatId.current, updated)
      return updated
    })
  }

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
        setLoc(d < 0.2 ? 'Ã°ÂÂÂ  Ghar' : `Ã°ÂÂÂ ${loc.city||loc.area||'?'} ÃÂ· ${d.toFixed(1)}km`);
      } else {
        setLoc(`Ã°ÂÂÂ ${loc.city||loc.area||`${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}`}`);
      }
    } catch { setLoc('Ã°ÂÂÂ off'); }
  }, []);

  useEffect(() => {
    // Device context init Ã¢ÂÂ battery, network, etc.
    getDeviceContext().then(ctx => {
      deviceCtxRef.current = deviceContextToPrompt(ctx);
      if (ctx.battery) {
        setBatteryPct(ctx.battery.level);
        setBatteryCharging(ctx.battery.charging);
        // Battery change listener
        (navigator as any).getBattery?.().then((bat: any) => {
          bat.addEventListener('levelchange', () => {
            const pct = Math.round(bat.level * 100);
            setBatteryPct(pct);
            setBatteryCharging(bat.charging);
            deviceCtxRef.current = deviceContextToPrompt({ ...ctx, battery: { level: pct, charging: bat.charging, chargingTime: bat.chargingTime, dischargingTime: bat.dischargingTime } });
            // Low battery warning
            if (pct === 20 && !bat.charging) {
              setToast({ msg: 'Ã°ÂÂÂ Battery 20% Ã¢ÂÂ charge karo!', type: 'info' });
              vibrate([200, 100, 200]);
            }
          });
          bat.addEventListener('chargingchange', () => {
            setBatteryCharging(bat.charging);
            setToast({ msg: bat.charging ? 'Ã¢ÂÂ¡ Charging shuru' : 'Ã°ÂÂÂ Charging band', type: 'info' });
          });
        }).catch(() => {});
      }
      setNetType(ctx.network.type);
    });

    // Daily usage reset at midnight
    resetDailyUsage();
    const midnightTimer = setTimeout(resetDailyUsage, (() => {
      const now = new Date(); const midnight = new Date(now); midnight.setHours(24,0,0,0);
      return midnight.getTime() - now.getTime();
    })());

    // Network change listener
    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener('change', () => setNetType(conn.effectiveType ?? ''));
    }

    // PIN check
    setPinEnabled(isPINEnabled());

    // Load theme
    const savedTheme = localStorage.getItem('jarvis_theme') as ThemeKey | null;
    if (savedTheme && (savedTheme in THEMES)) setThemeKey(savedTheme);

    // Load saved name Ã¢ÂÂ show onboarding if first visit
    const saved = localStorage.getItem('jarvis_profile_name') || '';
    if (saved) setUserName(saved);
    else setOnboard(true);

    load(chatId.current).then(msgs => { if(msgs.length) setMsgs(msgs) })

    // Auto TTS preference
    setAutoTTS(localStorage.getItem('jarvis_auto_tts') === '1')

    // Situation awareness Ã¢ÂÂ detect night mode
    const updateSituation = () => {
      const h = new Date().getHours()
      if (h >= 22 || h < 7) setSit('night')
      else setSit('normal')
    }
    updateSituation()
    const sitTimer = setInterval(updateSituation, 5 * 60 * 1000);
    const cleanup = initProactiveEngine('', chatId.current)
    // Check if opened via Web Share Target (another app shared to JARVIS)
    const shared = getSharedContent()
    if (shared && (shared.text || shared.url)) {
      const sharedText = [shared.title, shared.text, shared.url].filter(Boolean).join(' ')
      setTimeout(() => send(sharedText + ' -- yeh share kiya hai, analyze karo', 'auto'), 1500)
    }
    // Keep screen on when voice active
    keepScreenOn().catch(() => {})
    // Location-based reminder check
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const triggered = checkGeoFences(pos.coords.latitude, pos.coords.longitude)
        triggered.forEach(fence => {
          window.dispatchEvent(new CustomEvent('jarvis-alert', {
            detail: { id: 'geo_' + fence.id, type: 'morning', title: 'Ã°ÂÂÂ ' + fence.label, body: fence.action }
          }))
        })
      }, () => {})
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        if ('sync' in reg) { (reg as any).sync.register('jarvis-queue').catch(() => {}) }
      }).catch(() => {})
    }
    setupWakeLockPersist()
    requestWakeLock()
    const onAlert = (e: any) => setToast({ msg: e.detail?.body || e.detail?.title, type: 'info' })
    window.addEventListener('jarvis-alert', onAlert)
    setOnl(navigator.onLine);
    window.addEventListener('online',  () => setOnl(true));
    window.addEventListener('offline', () => setOnl(false));
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(async reg => {
        // Push notification subscription
        try {
          const VAPID_PUBLIC = 'BCOKkUUNtTS31OidVojPqwYnYDcogR2LheEl__Ux9xVAYXncsthby6sfvO-7fsgwg-DblERS-VXFuvAHt9NWZHE'
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: VAPID_PUBLIC,
          })
          // Store locally
          localStorage.setItem('jarvis_push_sub', JSON.stringify(sub))
          // Save to Gist for server-side push
          fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub }),
          }).catch(() => {})
        } catch {}
      }).catch(() => {})
    }
    refreshLoc();
    const t = setInterval(refreshLoc, 3*60*1000);

    // Live clock Ã¢ÂÂ update every 30s
    const clockT = setInterval(() => setLiveTime(getLiveTime()), 30000);

    // Silent background weather fetch
    fetch('/api/jarvis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'current weather brief 1 line', history: [], userId: 'welcome', chatId: 'welcome_wx', chatMode: 'flash' })
    }).then(r => r.json()).then(d => {
      const reply = d.reply || d.text || '';
      const tempMatch = reply.match(/(\d+)\s*[ÃÂ°Ã¢ÂÂC]/);
      const iconMatch = reply.match(/[Ã¢ÂÂÃ¯Â¸ÂÃ°ÂÂÂ¤Ã¯Â¸ÂÃ¢ÂÂÃ°ÂÂÂ§Ã¯Â¸ÂÃ°ÂÂÂ©Ã¯Â¸ÂÃ¢ÂÂÃ¯Â¸ÂÃ°ÂÂÂ«Ã¯Â¸ÂÃ°ÂÂÂ¦Ã¯Â¸ÂÃ°ÂÂÂ¨Ã¯Â¸Â]/u);
      if (tempMatch) {
        setWeatherInfo({ temp: tempMatch[0], icon: iconMatch?.[0] || 'Ã°ÂÂÂ¤Ã¯Â¸Â', city: 'Rewa' });
      }
    }).catch(() => {});



  // Ã¢ÂÂÃ¢ÂÂ Chat Search Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  const searchChats = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    const query = q.toLowerCase();
    // Search current session
    const curResults = msgs
      .filter(m => (m.content||'').toLowerCase().includes(query))
      .slice(0,3)
      .map((m: any,i: number) => ({ id: `cur_${i}`, preview: (m.content||'').slice(0,60), chatId: 'current' }));
    // Search IndexedDB
    const idbResults: {id:string,preview:string,chatId:string}[] = await new Promise(resolve => {
      try {
        const req = indexedDB.open('jarvis_v10', 1);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('chats')) { resolve([]); return; }
          const all = db.transaction('chats','readonly').objectStore('chats').getAll();
          all.onsuccess = () => {
            const results: {id:string,preview:string,chatId:string}[] = [];
            (all.result||[]).forEach((r: any) => {
              if (!r.id?.startsWith('chat_')) return;
              (r.data||[]).forEach((m: any, i: number) => {
                if ((m.content||'').toLowerCase().includes(query) && results.length < 5)
                  results.push({ id: `${r.id}_${i}`, preview: m.content.slice(0,60), chatId: r.id });
              });
            });
            resolve(results);
          };
          all.onerror = () => resolve([]);
        };
        req.onerror = () => resolve([]);
      } catch { resolve([]); }
    });
    setSearchResults([...curResults, ...idbResults].slice(0,8));
  };

  return () => { clearInterval(t); clearInterval(clockT); clearInterval(sitTimer); };
  }, [refreshLoc]);

  useEffect(() => {
    bot.current?.scrollIntoView({ behavior: msgs.length > 4 ? 'smooth' : 'instant' });
  }, [msgs, loading]);

  // Ã¢ÂÂÃ¢ÂÂ Auto TTS Ã¢ÂÂ Web Speech API (FREE, zero credits) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  const speakReply = async (text: string) => {
    if (!autoTTS || situation === 'night') return
    const clean = text.replace(/[#*`_~>]/g, '').replace(/https?:[^\s]+/g, '').slice(0, 300)
    // Try Edge TTS (Microsoft Hindi Ã¢ÂÂ free, no key) Ã¢ÂÂ fallback to Web Speech
    try {
      const result = await generateSpeech({ text: clean, lang: 'hi', quality: 'fast' })
      if (!result.useBrowser) {
        if (result.audioUrl) { new Audio(result.audioUrl).play(); return }
        if (result.audioBase64) {
          new Audio('data:' + (result.mimeType||'audio/mpeg') + ';base64,' + result.audioBase64).play()
          return
        }
      }
    } catch {}
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(clean)
    utt.lang = 'hi-IN'; utt.rate = 1.05; utt.pitch = 1
    const voices = window.speechSynthesis.getVoices()
    const hindiVoice = voices.find(v => v.lang.startsWith('hi'))
    if (hindiVoice) utt.voice = hindiVoice
    window.speechSynthesis.speak(utt)
  }

  const send = useCallback(async (text: string, chatMode: ChatMode, file?: File) => {
    if (!text.trim() && !file || loading) return;

    // Ã¢ÂÂÃ¢ÂÂ SLASH COMMANDS Ã¢ÂÂ instant shortcuts, zero API cost Ã¢ÂÂÃ¢ÂÂ
    const slash = text.trim()
    if (slash === '/clear') { chatId.current = 'chat_'+Date.now(); setMsgs([]); setChatTitle(''); return }
    if (slash === '/w' || slash === '/weather') { return send('Aaj ka mausam kya hai?', 'auto') }
    if (slash === '/n' || slash === '/news')    { return send('Aaj ki top 5 khabar kya hai?', 'auto') }
    if (slash === '/img')                       { return send('Ek beautiful AI art image banao', 'auto') }
    if (slash === '/think')                     { return send(text.replace('/think','').trim() || 'Koi interesting cheez batao', 'think') }
    if (slash === '/deep')                      { return send(text.replace('/deep','').trim() || 'Koi interesting cheez batao', 'deep') }
    if (slash === '/time')                      { return send('Abhi kya time hai aur aaj ki date?', 'auto') }
    if (slash.startsWith('/img '))              { return send(slash.slice(5) + ' ka image banao', 'auto') }
    if (slash.startsWith('/w '))                { return send(slash.slice(3) + ' ka mausam batao', 'auto') }
    if (slash.startsWith('/think '))            { return send(slash.slice(7), 'think') }
    // Ã¢ÂÂÃ¢ÂÂ Android Bridge Slash Commands Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    if (slash === '/contacts') {
      try {
        if (!isContactPickerSupported()) { setMsgs(p=>[...p,{id:Date.now()+'_a',role:'assistant' as const,content:'Contact Picker is hamare browser mein support nahi karta.',timestamp:Date.now()}]); return }
        const contacts = await pickContacts()
        if (contacts.length > 0) {
          const list = contacts.map(c => (c.name?.[0]||'Unknown') + (c.tel?.[0] ? ' (' + c.tel[0] + ')' : '')).join(', ')
          return send('Mujhe ' + list + ' ke baare mein kuch batao Ã¢ÂÂ yeh mere contacts hain', 'auto')
        }
      } catch(e: any) { setMsgs(p=>[...p,{id:Date.now()+'_a',role:'assistant' as const,content:'Contacts: ' + e.message, timestamp:Date.now()}]) }
      return
    }
    if (slash.startsWith('/call ')) {
      const num = slash.slice(6).trim()
      makeCall(num)
      setMsgs(p=>[...p,{id:Date.now()+'_a',role:'assistant' as const,content:'Ã°ÂÂÂ Calling ' + num + '...',timestamp:Date.now()}])
      return
    }
    if (slash.startsWith('/sms ')) {
      const parts = slash.slice(5).split('|')
      sendSMSIntent(parts[0].trim(), parts[1]?.trim())
      setMsgs(p=>[...p,{id:Date.now()+'_a',role:'assistant' as const,content:'Ã°ÂÂÂ¬ SMS app khul raha hai...',timestamp:Date.now()}])
      return
    }
    if (slash === '/photo') {
      capturePhoto().then(dataUrl => {
        if (dataUrl) return send('Is photo mein kya hai? Describe karo', 'auto')
      }).catch(() => {})
      return
    }

    // Ã¢ÂÂÃ¢ÂÂ Agent Mode Ã¢ÂÂ complex multi-step goals Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    if (isAgenticGoal(text) && chatMode === 'auto') {
      const agentMsgId = Date.now().toString()+'_a'
      const agentUMsg = { id: Date.now().toString()+'_u', role:'user' as const, content: text, timestamp: Date.now() }
      const agentAMsg = { id: agentMsgId, role:'assistant' as const, content: 'Ã°ÂÂ¤Â Agent mode Ã¢ÂÂ goal analyze kar raha hoon...', timestamp: Date.now() }
      setMsgs(p => [...p, agentUMsg, agentAMsg])
      void save(chatId.current, [...msgs, agentUMsg, agentAMsg])
      setAgentRunning(true)
      runAgentPlan(text, { chatId: chatId.current, userName: userName || 'Boss' }, (plan) => {
        setAgentPlan({...plan})
        const formatted = formatPlanAsMessage(plan)
        setMsgs(p => p.map(m => m.id === agentMsgId ? { ...m, content: formatted } : m))
        plan.steps.forEach((step: any) => {
          if (step.result?.startsWith('FOCUS_START:')) {
            const parts = step.result.split(':')
            const dur = parseInt(parts[1]) || 25
            const task = parts[2] || text
            startFocusMode(task, dur)
            setFocusBanner({ task, durationMin: dur, startTime: Date.now() })
          }
        })
      }).finally(() => { setAgentRunning(false); setLoad(false) })
      return
    }

    // Ã¢ÂÂÃ¢ÂÂ Android Bridge intents Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    const callMatch = text.match(/\b(?:call|phone|ring|call karo|phone karo)\s+([\d+\s\-]{7,15})/i)
    if (callMatch) {
      makeCall(callMatch[1])
      const uMsg2 = { id:Date.now()+'_u', role:'user' as const, content:text, timestamp:Date.now() }
      setMsgs(p=>[...p,uMsg2,{id:Date.now()+'_a',role:'assistant' as const,content:'Ã°ÂÂÂ ' + callMatch[1] + ' pe call kar raha hoon...', timestamp:Date.now()}])
      void save(chatId.current, [...msgs, uMsg2])
      setLoad(false); return
    }

    // Ã¢ÂÂÃ¢ÂÂ SMART REMINDER DETECTION Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    const reminderParsed = parseReminder(text)
    if (reminderParsed) {
      addReminder(reminderParsed)
      const userMsg2 = { id: Date.now().toString()+'_u', role:'user' as const, content: text, timestamp: Date.now() }
      const timeStr = formatReminderTime(reminderParsed.triggerTime)
      const ackMsg = { id: Date.now().toString()+'_a', role:'assistant' as const, content: 'Ã¢ÂÂ° Reminder set! "' + reminderParsed.title + '" Ã¢ÂÂ ' + timeStr + ' mein yaad dilaaunga.' + (reminderParsed.repeat !== 'none' ? ' (' + reminderParsed.repeat + ')' : ''), timestamp: Date.now() }
      setMsgs(cur => [...cur, userMsg2, ackMsg])
      void save(chatId.current, [...msgs, userMsg2, ackMsg])
      speakReply(ackMsg.content)
      return
    }

    // Ã¢ÂÂÃ¢ÂÂ MACRODROID PHONE CONTROL Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    const macroUrl = localStorage.getItem('jarvis_macrodroid_url') || ''
    if (macroUrl) {
      const phoneAction = detectPhoneIntent(text)
      if (phoneAction) {
        const label = ACTION_LABELS[phoneAction.action] || phoneAction.action
        const userMsg = { id: Date.now().toString()+'_u', role:'user' as const, content: text, timestamp: Date.now() }
        setMsgs(cur => [...cur, userMsg])
        setLoad(true)
        const result = await triggerMacrodroid(macroUrl, phoneAction)
        const aMsg = { id: Date.now().toString()+'_a', role:'assistant' as const, content: result.success ? label + '...\n\n' + result.message : result.message, timestamp: Date.now() }
        setMsgs(cur => [...cur, aMsg])
        void save(chatId.current, [...msgs, userMsg, aMsg])
        setLoad(false)
        return
      }
    }

    // Auto session title on first message
    if (msgs.length === 0 && text.trim()) {
      // Quick keyword title immediately
      const quickTitle = getAutoTitle(text);
      setChatTitle(quickTitle);
      try { localStorage.setItem(`jarvis_title_${chatId.current}`, quickTitle); } catch {}
      // Async AI title Ã¢ÂÂ Groq nano, 1 call, upgrades title silently
      fetch('/api/jarvis', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message: 'Give a 4-6 word chat title for: "' + text.slice(0,80) + '". Reply ONLY the title, no quotes.', chatId:'title', userId:'system', chatMode:'flash', history:[] })
      }).then(r=>r.json()).then(d=>{
        const aiTitle = (d.reply||'').trim().slice(0,40);
        if (aiTitle && aiTitle.length > 3) {
          setChatTitle(aiTitle);
          try { localStorage.setItem(`jarvis_title_${chatId.current}`, aiTitle); } catch {}
        }
      }).catch(()=>{});
    }

    const moodEntry = detectMood(text)
    if (moodEntry) logMood(moodEntry)
    const url = extractURL(text)
    const uMsg = {
      id: Date.now().toString(), role:'user' as const,
      content: text, timestamp: Date.now(),
      file: file ? { name: file.name, type: file.type } : undefined,
    };
    const cur  = [...msgs, uMsg]; setMsgs(cur); void save(chatId.current, cur);
    setLoad(true); setToolProgress([]); setFollowupChips([]);

    try {
      const nowH = new Date().getHours()
      const timeCtx = nowH < 12 ? 'Subah' : nowH < 17 ? 'Dopahar' : nowH < 21 ? 'Sham' : 'Raat'
      const isNight = situation === 'night'
      const uName = userName || 'Boss'
      const baseMemory = await buildMemoryPrompt(cur.slice(-5))
      const dominantMood = getDominantMood(6)
      const moodHint = getMoodPromptHint(dominantMood)
      const memPrompt = baseMemory +
        (studyMode ? '\n\nSTUDY MODE: MCQ, flashcards, simple mein samjhao.' : '') +
        (moodHint ? '\n' + moodHint : '') +
        '\nPersonality: ' + timeCtx + ' tone. ' + (isNight ? 'Night mode Ã¢ÂÂ concise replies. ' : '') +
        'Kabhi kabhi "' + uName + '" naam se bulao. Dry wit occasionally.'

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
          body: JSON.stringify({ message: text, history: smartHistory(cur, 'deep'), userId: localStorage.getItem('jarvis_uid')||'user', chatId: chatId.current, userName, chatMode, memoryPrompt: memPrompt, fileData })
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
              if (ev.type === 'tool_start') setToolProgress(p => [...p, `Ã°ÂÂÂ§ ${ev.tool}...`])
              if (ev.type === 'tool_end')   setToolProgress(p => [...p, `Ã¢ÂÂ ${ev.tool}`])
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
          body: JSON.stringify({ message: text, history: smartHistory(cur, chatMode as any), memoryPrompt: memPrompt, chatMode, userName })
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
        body: JSON.stringify({ message: text, userId: localStorage.getItem('jarvis_uid')||'user', chatId: chatId.current, userName, chatMode, history: smartHistory(cur, chatMode as any), memoryPrompt: memPrompt, fileData, url }),
      })
      const d = await res.json()
      // Track which provider responded + actual usage tracking
      if (d.provider) {
        localStorage.setItem('jarvis_last_provider', d.provider); setLastProvider(d.provider)
        // trackCall so isNearLimit() works correctly (server can't access localStorage)
        const prov = d.provider.toLowerCase()
        if (prov.includes('groq'))     trackCall('groq')
        else if (prov.includes('gemini')) trackCall('gemini')
        else if (prov.includes('together')) trackCall('together')
        else if (prov.includes('mistral'))  trackCall('mistral')
        else if (prov.includes('cohere'))   trackCall('cohere')
        else if (prov.includes('openrouter')) trackCall('openrouter')
      }
      if (d.model) { localStorage.setItem('jarvis_last_model', d.model); }
      const aMsg = { id: Date.now().toString()+'_a', role:'assistant' as const, content: d.reply||d.text||'Error', timestamp: Date.now(), toolsUsed: d.toolsUsed, richData: d.richData, processingMs: d.processingMs, model: d.model, provider: d.provider }
      const fin  = [...cur, aMsg]; setMsgs(fin); void save(chatId.current, fin)
      setFollowupChips(getFollowUpChips(d.reply||''))
      autoExtractMemory(text, d.reply||'').catch(()=>{})

      // Image generation Ã¢ÂÂ Pollinations FREE (no credits, unlimited)
      const isImgQuery = /image banao|photo banao|tasveer|image bana|photo bana|girl|boy.*image|scenery|wallpaper|draw|generate.*image|ek.*image|photo bana/i.test(text)
      if (isImgQuery && !d.richData) {
        const cleanPrompt = text.replace(/\b(image|photo|banao|bana|ek|mujhe|karo|generate|create|draw|jarvis|please|tasveer|ki|ka|ke|aur|ek)\b/gi,' ').replace(/\s+/g,' ').trim() || text
        const seed = Math.floor(Math.random()*999999)
        // Use flux-realism for realistic, flux-anime for anime/cartoon
        const isAnime = /anime|cartoon|sketch|chibi|manga/i.test(text)
        const model = isAnime ? 'flux-anime' : 'flux-realism'
        const polUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(cleanPrompt + ', high quality, 4k, detailed') + '?width=768&height=768&nologo=true&seed=' + seed + '&model=' + model
        const imgMsg = { id: Date.now().toString()+'_img', role:'assistant' as const, content: 'Ã°ÂÂÂ¨ Image generating... (' + model + ')', timestamp: Date.now(), richData: { type:'image', data:{ image_url: polUrl, prompt: cleanPrompt, model: 'Pollinations ' + model } } }
        setMsgs(p => [...p, imgMsg])
        void save(chatId.current, [...fin, imgMsg])
      }
      const importantHint = extractImportantInfo(text)
      if (importantHint) {
        setTimeout(() => {
          setMsgs(p => [...p, { id: Date.now().toString()+'_hint', role:'assistant' as const, content: 'Ã°ÂÂÂ¡ ' + importantHint, timestamp: Date.now() }])
        }, 800)
      }
      // Auto TTS Ã¢ÂÂ speak reply if voice mode ON
      if (autoTTS && situation !== 'night') speakReply(d.reply || '')
    } catch(e) {
      const errMsg = { id: Date.now().toString()+'_e', role:'assistant' as const, content: 'Ã¢ÂÂ Kuch error aaya. Dobara try karo.', timestamp: Date.now() }
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
  
  }
  }
  }
  }
  }
  }
  }
  return (
    <div style={{ position:'fixed', inset:0, display:'flex', flexDirection:'column', background:theme.bg, color:theme.text }}>
      {/* PIN Lock */}
      {pinEnabled && !pinUnlocked && (
        <PinLock onUnlock={() => setPinUnlocked(true)} />
      )}
      <div className="bg-grid"/>
      <Sidebar onNewChat={newChat} onLoadChat={loadOldChat} currentChatId={chatId.current}/>

      {/* Ã¢ÂÂÃ¢ÂÂ ONBOARDING (first visit) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ */}
      {showOnboard && (
        <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(5,10,20,.97)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ maxWidth:340, width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:54, marginBottom:10 }}>Ã°ÂÂ¤Â</div>
            <div style={{ fontSize:24, fontWeight:800, color:theme.text, letterSpacing:4, marginBottom:6 }}>JARVIS</div>
            <div style={{ fontSize:13, color:theme.subtext, marginBottom:28, lineHeight:1.7 }}>
              Tumhara personal AI assistant.<br/>
              Pehle bata do Ã¢ÂÂ tumhara naam kya hai?
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
              {nameInput.trim() ? `Namaste, ${nameInput.trim()}! Ã°ÂÂÂ` : 'Shuru karo Ã¢ÂÂ'}
            </button>
            <div style={{ marginTop:12, fontSize:10, color:'#1a3040' }}>Naam sirf tumhare device pe store hoga</div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 14px 9px 58px', borderBottom:`1px solid ${theme.border}`, flexShrink:0, background:theme.headerBg, backdropFilter:'blur(10px)', zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0, flex:1 }}>
          <div style={{ width:22, height:22, borderRadius:6, background:'linear-gradient(135deg,rgba(0,229,255,.18),rgba(109,40,217,.12))', border:'1px solid rgba(0,229,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#00e5ff', flexShrink:0 }}>J</div>
          <div style={{ minWidth:0 }}>
            {chatTitle ? (
              <div style={{ fontSize:11, fontWeight:700, color:'#c8e0f0', letterSpacing:.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:160 }}>{chatTitle}</div>
            ) : (
              <div style={{ fontSize:11, fontWeight:700, color:theme.text, letterSpacing:3 }}>JARVIS</div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:1 }}>
              {userName && <div style={{ fontSize:9, color:theme.subtext }}>{userName}</div>}
              {locLbl && <div style={{ fontSize:9, color:theme.muted }}>ÃÂ· {locLbl}</div>}
              {/* Loading: "Thinking with Groq..." */}
              {loading ? (
                <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:'#00e5ff', display:'inline-block', animation:'pulse 1s infinite' }}/>
                  <span style={{ fontSize:8, color:'#00e5ff' }}>Thinking{lastProvider ? ` ÃÂ· ${lastProvider}` : ''}...</span>
                </div>
              ) : (
                <>
                  {/* Network badge */}
                  {netType && netType !== 'unknown' && (
                    <div style={{ fontSize:8, color: netType==='4g'||netType==='wifi'?'#00e676': netType==='3g'?'#ffd700':'#ef5350', border:`1px solid currentColor`, borderRadius:4, padding:'0 3px', opacity:.7 }}>
                      {netType.toUpperCase()}
                    </div>
                  )}
                  {/* Last provider badge */}
                  {lastProvider && msgs.length > 0 && (
                    <div style={{ fontSize:8, color:'#4a90b8', border:'1px solid rgba(74,144,184,.3)', borderRadius:4, padding:'0 4px', opacity:.8 }}>
                      {lastProvider.replace('_fast','').replace('_deep','').replace(/_/g,' ')}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {/* Battery indicator */}
          {batteryPct !== null && (
            <div style={{ display:'flex', alignItems:'center', gap:2 }}>
              <span style={{ fontSize:10 }}>{batteryCharging ? 'Ã¢ÂÂ¡' : batteryPct <= 20 ? 'Ã°ÂÂÂ´' : batteryPct <= 50 ? 'Ã°ÂÂÂ¡' : 'Ã°ÂÂÂ¢'}</span>
              <span style={{ fontSize:9, color: batteryPct<=20?'#ef5350':batteryPct<=50?'#ffd700':'#00e676', fontFamily:'monospace' }}>{batteryPct}%</span>
            </div>
          )}
{installPrompt && (
                <button onClick={() => { installPrompt.prompt(); setInstallPrompt(null); }} style={{ background:'none', border:'1px solid #00e5ff44', borderRadius:8, padding:'2px 8px', color:'#00e5ff', fontSize:10, cursor:'pointer', marginLeft:4 }}>
                  Ã°ÂÂÂ² Install
                </button>
              )}
          <span style={{ width:5, height:5, borderRadius:'50%', background: online ? '#00e676' : '#ff4444', display:'block' }}/>

          {/* Search button */}
          <button onClick={() => setShowSearch(p=>!p)} title="Search chats"
            style={{ width:26, height:26, borderRadius:7, background: showSearch ? 'rgba(0,229,255,.15)' : 'transparent', border:'1px solid rgba(255,255,255,.08)', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', color: showSearch ? '#00e5ff' : '#90b4c8' }}>
            Ã°ÂÂÂ
          </button>
          {/* Theme picker */}
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowTheme(p=>!p)}
              style={{ width:26, height:26, borderRadius:7, background:'transparent', border:'1px solid rgba(255,255,255,.08)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {THEMES[themeKey as ThemeKey].icon}
            </button>
            {showTheme && (
              <>
                <div onClick={() => setShowTheme(false)} style={{ position:'fixed', inset:0, zIndex:299 }}/>
                <div style={{ position:'absolute', top:30, right:0, zIndex:300, background:'#071828', border:'1px solid rgba(0,229,255,.2)', borderRadius:12, padding:6, minWidth:130, boxShadow:'0 8px 32px rgba(0,0,0,.8)' }}>
                  {(Object.keys(THEMES) as ThemeKey[]).map(k => (
                    <button key={k} onClick={() => { setThemeKey(k); localStorage.setItem('jarvis_theme',k); setShowTheme(false); }}
                      style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 10px', borderRadius:8, background: themeKey===k ? 'rgba(0,229,255,.1)' : 'transparent', border:'none', cursor:'pointer', color: themeKey===k ? '#00e5ff' : '#90b4c8', fontSize:12 }}>
                      <span>{THEMES[k].icon}</span><span>{THEMES[k].name}</span>
                      {themeKey===k && <span style={{ marginLeft:'auto' }}>Ã¢ÂÂ</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          {msgs.length > 0 && (
            <>
              {/* Situation indicator */}
              {situation === 'night' && (
                <span title="Night mode Ã¢ÂÂ quiet" style={{ fontSize:13 }}>Ã°ÂÂÂ</span>
              )}
              {/* Auto TTS toggle */}
              <button
                onClick={() => { const n = !autoTTS; setAutoTTS(n); localStorage.setItem('jarvis_auto_tts', n?'1':'0'); if(n) window.speechSynthesis?.cancel() }}
                title={autoTTS ? 'Auto Voice ON Ã¢ÂÂ tap to turn off' : 'Auto Voice OFF Ã¢ÂÂ tap to enable'}
                style={{ width:24, height:24, borderRadius:6, background: autoTTS ? 'rgba(0,229,255,.2)' : 'transparent', border:'1px solid rgba(255,255,255,.06)', color: autoTTS ? '#00e5ff' : '#5a7a8a', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow: autoTTS ? '0 0 8px rgba(0,229,255,.4)' : 'none' }}
              >{autoTTS ? 'Ã°ÂÂÂ' : 'Ã°ÂÂÂ'}</button>
              {/* Web Share Ã¢ÂÂ native mobile share sheet */}
              <button onClick={() => {
                const txt = msgs.map(m => (m.role==='user'?'You: ':'JARVIS: ') + m.content).join('\n\n')
                if (navigator.share) {
                  navigator.share({ title: chatTitle || 'JARVIS Chat', text: txt.slice(0,2000) }).catch(()=>{})
                } else {
                  navigator.clipboard?.writeText(txt).then(() => alert('Chat copied!')).catch(()=>{})
                }
              }} style={{ width:24, height:24, borderRadius:6, background:'transparent', border:'1px solid rgba(255,255,255,.06)', color:'#90caf9', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }} title="Share chat">Ã¢Â¬Â</button>
              <button onClick={newChat} style={{ width:24, height:24, borderRadius:6, background:'transparent', border:'1px solid rgba(255,255,255,.06)', color:'#90caf9', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>Ã¢ÂÂ</button>
            </>
          )}
        </div>
      </header>

      {/* Focus Mode Banner */}
      {focusBanner && (
        <div style={{ background:'linear-gradient(90deg,rgba(0,229,255,.1),rgba(109,40,217,.1))', borderBottom:'1px solid rgba(0,229,255,.15)', padding:'6px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:11 }}>
          <span style={{ color:'#00e5ff' }}>Ã°ÂÂÂ¯ Focus: {focusBanner.task.slice(0,40)} Ã¢ÂÂ {focusBanner.durationMin} min</span>
          <button onClick={() => setFocusBanner(null)} style={{ background:'none', border:'none', color:'#5a7a8a', cursor:'pointer', fontSize:11 }}>Ã¢ÂÂ</button>
        </div>
      )}
      {/* Agent Running indicator */}
      {agentRunning && (
        <div style={{ background:'rgba(109,40,217,.1)', borderBottom:'1px solid rgba(109,40,217,.2)', padding:'4px 16px', fontSize:10, color:'#b39ddb', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#b39ddb', display:'inline-block', animation:'pulse 1s infinite' }}/>
          JARVIS Agent Mode running...
        </div>
      )}

      {/* Messages */}
      <main style={{ flex:1, overflowY:'auto', position:'relative', zIndex:1 }}>
        <div style={{ minHeight:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', paddingBottom:4 }}>
        {msgs.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 16px' }}>
            {/* Slash command hint */}
            <div style={{ width:'100%', maxWidth:440, marginBottom:8, padding:'6px 12px', borderRadius:8, background:'rgba(0,229,255,.03)', border:'1px solid rgba(0,229,255,.06)', fontSize:10, color:'#2a5070', display:'flex', flexWrap:'wrap', gap:'4px 12px' }}>
              <span style={{ color:'#4a90b8', fontWeight:600 }}>Shortcuts:</span>
              {['/w weather','/n news','/img image','/think reason','/contacts','/photo','/call number','/clear reset'].map(s=>(
                <span key={s} style={{ cursor:'pointer', color:'#3a7090' }} onClick={() => send(s.split(' ')[0], 'auto')}>{s}</span>
              ))}
            </div>

            {/* Live info bar */}
            <div style={{ width:'100%', maxWidth:440, marginBottom:16 }}>
              <div style={{ textAlign:'center', marginBottom:12 }}>
                <div style={{ fontSize:11, color:'#4a90b8', marginBottom:2 }}>{liveTime.greeting}</div>
                <div style={{ fontSize:20, fontWeight:800, color:'#e8f4ff' }}>
                  {userName ? `${userName} Ã°ÂÂÂ` : 'Boss Ã°ÂÂÂ'}
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
                      <div style={{ fontSize:9, color:'#3a6080', marginTop:3 }}>{weatherInfo.city} ÃÂ· Abhi</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:16, color:'#1e3a50', lineHeight:1 }}>Ã°ÂÂÂ¤Ã¯Â¸Â Ã¢ÂÂ</div>
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
              <button onClick={() => setStudyMode(false)} style={{ flex:1, padding:'7px', borderRadius:20, fontSize:11, cursor:'pointer', background: !studyMode ? 'rgba(0,229,255,.1)' : 'transparent', border:`1px solid ${!studyMode?'rgba(0,229,255,.25)':'rgba(255,255,255,.06)'}`, color: !studyMode?'#00e5ff':'#2a4060' }}>Ã°ÂÂÂ¬ General</button>
              <button onClick={() => setStudyMode(true)} style={{ flex:1, padding:'7px', borderRadius:20, fontSize:11, cursor:'pointer', background: studyMode ? 'rgba(167,139,250,.1)' : 'transparent', border:`1px solid ${studyMode?'rgba(167,139,250,.3)':'rgba(255,255,255,.06)'}`, color: studyMode?'#a78bfa':'#2a4060' }}>Ã°ÂÂÂ Study Mode</button>
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
              <MessageRow msg={m} onReact={handleReact}/>
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

        {loading && (
          <div style={{display:'flex',padding:'8px 16px',gap:8,alignItems:'center'}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:'#00e5ff15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>Ã°ÂÂ¤Â</div>
            <TypingIndicator />
          </div>
        )}
        <div ref={bot} style={{ height:1 }}/>
        </div>
      </main>

      {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)}/>}

      <InputBar onSend={send} isLoading={loading} mode={mode} onModeChange={setMode}/>
    </div>
  );
}
