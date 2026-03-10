/**
 * JARVIS Connected Apps Manager — Point 9
 * Apps GitHub-style connect: one-time auth → background always-on
 * AI automatically uses connected apps when relevant — user never manually selects
 */

export interface ConnectedApp {
  id: string;
  name: string;
  icon: string;
  authType: 'api_key' | 'oauth' | 'token';
  storageKey: string;        // localStorage key for token
  isConnected: boolean;
  autoUse: boolean;          // JARVIS uses this automatically when relevant
  triggers: string[];        // keywords that trigger this app
  lastUsed?: number;
}

// App definitions — add token once, JARVIS handles the rest
const APP_DEFINITIONS: Omit<ConnectedApp, 'isConnected' | 'lastUsed'>[] = [
  {
    id: 'github', name: 'GitHub', icon: '🐙', authType: 'token',
    storageKey: 'jarvis_key_github_pat', autoUse: true,
    triggers: ['github', 'repo', 'commit', 'pull request', 'issue', 'code push'],
  },
  {
    id: 'notion', name: 'Notion', icon: '📝', authType: 'token',
    storageKey: 'jarvis_key_notion', autoUse: true,
    triggers: ['notion', 'page', 'database', 'note', 'docs'],
  },
  {
    id: 'telegram', name: 'Telegram', icon: '✈️', authType: 'token',
    storageKey: 'jarvis_key_telegram', autoUse: true,
    triggers: ['telegram', 'message', 'send notification', 'alert me'],
  },
  {
    id: 'groq', name: 'Groq AI', icon: '⚡', authType: 'api_key',
    storageKey: 'jarvis_key_groq', autoUse: true,
    triggers: ['ai', 'question', 'explain', 'help'],
  },
  {
    id: 'gemini', name: 'Gemini', icon: '💎', authType: 'api_key',
    storageKey: 'jarvis_key_gemini', autoUse: true,
    triggers: ['complex', 'analyze', 'detailed'],
  },
  {
    id: 'serper', name: 'Serper Search', icon: '🔍', authType: 'api_key',
    storageKey: 'jarvis_key_serper', autoUse: true,
    triggers: ['search', 'find', 'look up', 'latest', 'current'],
  },
  {
    id: 'elevenlabs', name: 'ElevenLabs TTS', icon: '🔊', authType: 'api_key',
    storageKey: 'jarvis_key_elevenlabs', autoUse: true,
    triggers: ['voice', 'speak', 'read out', 'audio', 'tts'],
  },
  {
    id: 'stability', name: 'Stability AI', icon: '🎨', authType: 'api_key',
    storageKey: 'jarvis_key_stability', autoUse: true,
    triggers: ['image', 'generate image', 'draw', 'photo', 'create picture'],
  },
  {
    id: 'deepseek', name: 'DeepSeek R1', icon: '🧠', authType: 'api_key',
    storageKey: 'jarvis_key_deepseek', autoUse: true,
    triggers: ['think', 'reasoning', 'step by step', 'deep think', 'solve hard'],
  },
  {
    id: 'alphavantage', name: 'Alpha Vantage', icon: '📈', authType: 'api_key',
    storageKey: 'jarvis_key_alphavantage', autoUse: true,
    triggers: ['stock', 'nifty', 'sensex', 'share price', 'market'],
  },
];

// ── Get all apps with real-time connection status ─────────────────────────────
export function getAllApps(): ConnectedApp[] {
  if (typeof window === 'undefined') return [];
  return APP_DEFINITIONS.map(app => ({
    ...app,
    isConnected: !!localStorage.getItem(app.storageKey),
    lastUsed: parseInt(localStorage.getItem(`jarvis_app_lastused_${app.id}`) || '0') || undefined,
  }));
}

// ── Auto-find the right connected app for a user query ────────────────────────
export function findAutoApp(userMessage: string): ConnectedApp | null {
  if (typeof window === 'undefined') return null;
  const lower = userMessage.toLowerCase();
  const apps = getAllApps().filter(a => a.isConnected && a.autoUse);

  let best: ConnectedApp | null = null;
  let bestScore = 0;

  for (const app of apps) {
    let score = 0;
    for (const trigger of app.triggers) {
      if (lower.includes(trigger)) score += trigger.length;
    }
    if (score > bestScore) { bestScore = score; best = app; }
  }

  return bestScore > 3 ? best : null;
}

// ── Connect an app (save token) ────────────────────────────────────────────────
export function connectApp(appId: string, token: string): boolean {
  if (typeof window === 'undefined') return false;
  const app = APP_DEFINITIONS.find(a => a.id === appId);
  if (!app || !token.trim()) return false;
  localStorage.setItem(app.storageKey, token.trim());
  return true;
}

// ── Disconnect an app ─────────────────────────────────────────────────────────
export function disconnectApp(appId: string): void {
  if (typeof window === 'undefined') return;
  const app = APP_DEFINITIONS.find(a => a.id === appId);
  if (app) localStorage.removeItem(app.storageKey);
}

// ── Get token for an app ──────────────────────────────────────────────────────
export function getAppToken(appId: string): string | null {
  if (typeof window === 'undefined') return null;
  const app = APP_DEFINITIONS.find(a => a.id === appId);
  if (!app) return null;
  return localStorage.getItem(app.storageKey);
}

// ── Record last use ───────────────────────────────────────────────────────────
export function recordAppUse(appId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`jarvis_app_lastused_${appId}`, Date.now().toString());
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export function getConnectionStats() {
  const apps = getAllApps();
  return {
    total: apps.length,
    connected: apps.filter(a => a.isConnected).length,
    autoUse: apps.filter(a => a.isConnected && a.autoUse).length,
  };
}
