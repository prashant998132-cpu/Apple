// lib/proactive/index.ts — Proactive Alerts Engine
// JARVIS खुद से बोलता है — user को wait नहीं करना

import { get_weather } from '../tools/no-key';

export interface Alert {
  id: string;
  type: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

// ─── Morning Briefing (7 AM) ─────────────────────────────
export async function buildMorningBriefing(city = ''): Promise<Alert> {
  let weatherLine = '';
  try {
    const w = await get_weather({ location: city, days: 1 });
    if (w.current) {
      weatherLine = `मौसम: ${w.current.temperature}, ${w.current.condition_hindi} | बारिश: ${w.forecast?.[0]?.rain_chance || 'N/A'}`;
    }
  } catch {}

  const now = new Date();
  const day = now.toLocaleDateString('hi-IN', { timeZone: 'Asia/Kolkata', weekday: 'long' });
  const date = now.toLocaleDateString('hi-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long' });

  const tips = ['पानी पीना मत भूलो 💧', 'आज कुछ नया सीखो 📚', 'किसी को call करो 📞', 'थोड़ा walk करो 🚶'];
  const tip = tips[now.getDay() % tips.length];

  return {
    id: `morning_${Date.now()}`,
    type: 'morning',
    title: `🌅 सुप्रभात! ${day}, ${date}`,
    body: [weatherLine, tip, 'JARVIS तैयार है — क्या help चाहिए?'].filter(Boolean).join(' | '),
    url: '/',
    icon: '🌅'
  };
}

// ─── Weather Alert ───────────────────────────────────────
export async function checkWeatherAlert(city = ''): Promise<Alert | null> {
  try {
    const w = await get_weather({ location: city, days: 1 });
    const rainChance = parseInt(w.forecast?.[0]?.rain_chance || '0');
    const temp = parseFloat(w.current?.temperature || '25');

    if (rainChance >= 70) {
      return {
        id: `rain_${Date.now()}`,
        type: 'weather',
        title: '🌧️ बारिश Alert — ' + city,
        body: `आज बारिश ${rainChance}% chance। छाता साथ रखो! ${w.current?.condition_hindi}`,
        url: '/?q=weather',
        icon: '🌧️'
      };
    }
    if (temp >= 40) {
      return {
        id: `heat_${Date.now()}`,
        type: 'weather',
        title: '🔥 Heat Alert — ' + city,
        body: `तापमान ${w.current?.temperature}! बाहर कम जाओ, पानी ज़्यादा पीओ।`,
        url: '/?q=weather',
        icon: '🔥'
      };
    }
    if (temp <= 8) {
      return {
        id: `cold_${Date.now()}`,
        type: 'weather',
        title: '🥶 Cold Alert — ' + city,
        body: `तापमान ${w.current?.temperature}! गर्म कपड़े पहनो।`,
        icon: '🥶'
      };
    }
  } catch {}
  return null;
}

// ─── Festival Reminders ──────────────────────────────────
export function getUpcomingFestival(): Alert | null {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const festivals = [
    { month: 1, day: 26, name: 'गणतंत्र दिवस', emoji: '🇮🇳' },
    { month: 3, day: 8, name: 'होली', emoji: '🎨' },
    { month: 4, day: 14, name: 'डॉ. अंबेडकर जयंती', emoji: '🎂' },
    { month: 8, day: 15, name: 'स्वतंत्रता दिवस', emoji: '🇮🇳' },
    { month: 8, day: 19, name: 'रक्षाबंधन', emoji: '🪢' },
    { month: 9, day: 7, name: 'जन्माष्टमी', emoji: '🎉' },
    { month: 10, day: 2, name: 'गांधी जयंती', emoji: '🕊️' },
    { month: 10, day: 12, name: 'दशहरा', emoji: '🏹' },
    { month: 11, day: 1, name: 'दीवाली', emoji: '🪔' },
    { month: 12, day: 25, name: 'Christmas', emoji: '🎄' },
  ];

  for (const f of festivals) {
    const diff = (f.month - month) * 30 + (f.day - day);
    if (diff >= 0 && diff <= 3) {
      return {
        id: `festival_${f.name}`,
        type: 'festival',
        title: `${f.emoji} ${diff === 0 ? 'आज' : diff === 1 ? 'कल' : `${diff} दिन में'`} — ${f.name}`,
        body: `${f.name} ${diff === 0 ? 'है आज!' : `आने वाला है ${diff} दिन में।`} तैयारी करो!`,
        icon: f.emoji
      };
    }
  }
  return null;
}

// ─── Push Notification (browser) ─────────────────────────
export async function sendPushNotification(alert: Alert): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return false;

  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(alert.title, {
      body: alert.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-96x96.png',
      data: alert.url || '/'
    });
    return true;
  }

  new Notification(alert.title, { body: alert.body, icon: '/icons/icon-192x192.png' });
  return true;
}

// ─── Scheduler (call on app load) ────────────────────────
export function initProactiveScheduler(city = '') {
  if (typeof window === 'undefined') return;

  const checkTime = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();

    // Morning briefing at 7:00 AM
    if (h === 7 && m === 0) {
      buildMorningBriefing(city).then(alert => sendPushNotification(alert));
    }

    // Weather check at 8 AM and 5 PM
    if ((h === 8 || h === 17) && m === 0) {
      checkWeatherAlert(city).then(alert => { if (alert) sendPushNotification(alert); });
    }
  };

  // Check every minute
  setInterval(checkTime, 60000);

  // Festival check on load
  const festival = getUpcomingFestival();
  if (festival) setTimeout(() => sendPushNotification(festival), 5000);
}
