// lib/providers/registry.ts
// JARVIS Master Provider Registry
// RULE: Best provider first. If it fails → next. Always a fallback.
// ─────────────────────────────────────────────────────────────────

export type ProviderStatus = 'active' | 'limit_near' | 'exhausted' | 'no_key' | 'error';

export interface Provider {
  id: string;
  name: string;
  tier: 'unlimited_free' | 'free_key' | 'oauth' | 'local_browser';
  limit?: string;
  keyEnv?: string;           // env var name
  quality: 1 | 2 | 3 | 4 | 5;  // 5 = best
  mobile: boolean;           // works on mobile browser
  offline: boolean;          // works without internet
  hindi: boolean;            // good Hindi support
  notes?: string;
}

// ═══════════════════════════════════════════════════════════
// TTS PROVIDERS — Best first
// ═══════════════════════════════════════════════════════════
export const TTS_PROVIDERS: Provider[] = [
  {
    id: 'google_tts',
    name: 'Google Cloud TTS',
    tier: 'free_key',
    limit: '1,000,000 chars/month',
    keyEnv: 'GOOGLE_TTS_KEY',
    quality: 5,
    mobile: true, offline: false, hindi: true,
    notes: 'Best Hindi voices (WaveNet). console.cloud.google.com'
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    tier: 'free_key',
    limit: '10,000 chars/month',
    keyEnv: 'ELEVENLABS_API_KEY',
    quality: 5,
    mobile: true, offline: false, hindi: true,
    notes: 'Most realistic. Multilingual v2 model. elevenlabs.io'
  },
  {
    id: 'azure_tts',
    name: 'Microsoft Azure Neural TTS',
    tier: 'free_key',
    limit: '500,000 chars/month',
    keyEnv: 'AZURE_TTS_KEY',
    quality: 4,
    mobile: true, offline: false, hindi: true,
    notes: 'hi-IN-SwaraNeural voice. portal.azure.com'
  },
  {
    id: 'playht',
    name: 'Play.ht',
    tier: 'free_key',
    limit: '12,500 words/month',
    keyEnv: 'PLAYHT_API_KEY',
    quality: 4,
    mobile: true, offline: false, hindi: true,
    notes: 'Good Hindi voices. play.ht → API access'
  },
  {
    id: 'openai_tts',
    name: 'OpenAI TTS (gpt-4o-mini)',
    tier: 'free_key',
    limit: 'Free tier credits',
    keyEnv: 'OPENAI_API_KEY',
    quality: 4,
    mobile: true, offline: false, hindi: true,
    notes: 'tts-1 model, nova voice. platform.openai.com'
  },
  {
    id: 'fish_audio',
    name: 'Fish Audio',
    tier: 'free_key',
    limit: 'Free credits',
    keyEnv: 'FISH_AUDIO_KEY',
    quality: 4,
    mobile: true, offline: false, hindi: false,
    notes: 'Open source + API. fish.audio'
  },
  {
    id: 'transformers_tts',
    name: 'Transformers.js (Local)',
    tier: 'local_browser',
    limit: 'Unlimited (device power)',
    quality: 3,
    mobile: true, offline: true, hindi: true,
    notes: 'facebook/mms-tts-hin. First load ~30MB. WebGPU Chrome 113+'
  },
  {
    id: 'huggingface_tts',
    name: 'HuggingFace TTS API',
    tier: 'free_key',
    limit: 'Rate limited',
    keyEnv: 'HUGGINGFACE_TOKEN',
    quality: 3,
    mobile: true, offline: false, hindi: true,
    notes: 'facebook/mms-tts-hin for Hindi. huggingface.co/settings/tokens'
  },
  {
    id: 'web_speech',
    name: 'Browser Web Speech API',
    tier: 'unlimited_free',
    limit: 'Unlimited',
    quality: 2,
    mobile: true, offline: true, hindi: true,
    notes: 'Always works. Built into browser. Basic quality.'
  },
];

// ═══════════════════════════════════════════════════════════
// IMAGE GENERATION PROVIDERS — Best first
// ═══════════════════════════════════════════════════════════
export const IMAGE_PROVIDERS: Provider[] = [
  {
    id: 'puter_js',
    name: 'Puter.js (Frontend)',
    tier: 'unlimited_free',
    limit: 'Unlimited',
    quality: 4,
    mobile: true, offline: false, hindi: false,
    notes: 'No API key. Runs in browser. puter.com'
  },
  {
    id: 'gemini_imagen',
    name: 'Google Gemini Imagen 3',
    tier: 'free_key',
    limit: 'Generous free tier',
    keyEnv: 'NEXT_PUBLIC_GEMINI_API_KEY',
    quality: 5,
    mobile: true, offline: false, hindi: false,
    notes: 'Best quality. Uses existing Gemini key.'
  },
  {
    id: 'flux_hf',
    name: 'HuggingFace FLUX.1-schnell',
    tier: 'free_key',
    limit: 'Rate limited',
    keyEnv: 'HUGGINGFACE_TOKEN',
    quality: 5,
    mobile: true, offline: false, hindi: false,
    notes: 'State-of-art quality when available.'
  },
  {
    id: 'aimlapi_flux',
    name: 'AIMLAPI (Flux + others)',
    tier: 'free_key',
    limit: 'Free tier',
    keyEnv: 'AIMLAPI_KEY',
    quality: 4,
    mobile: true, offline: false, hindi: false,
    notes: 'One key for image+TTS+LLM. aimlapi.com'
  },
  {
    id: 'deepai',
    name: 'DeepAI',
    tier: 'free_key',
    limit: 'Free tier',
    keyEnv: 'DEEPAI_KEY',
    quality: 3,
    mobile: true, offline: false, hindi: false,
    notes: 'deepai.org/api → free key'
  },
  {
    id: 'pollinations',
    name: 'Pollinations.ai',
    tier: 'unlimited_free',
    limit: 'Unlimited',
    quality: 3,
    mobile: true, offline: false, hindi: false,
    notes: 'No key needed. URL-based. Always works.'
  },
  {
    id: 'craiyon',
    name: 'Craiyon (Link)',
    tier: 'unlimited_free',
    limit: 'Unlimited',
    quality: 2,
    mobile: true, offline: false, hindi: false,
    notes: 'Opens in browser. Completely free.'
  },
  {
    id: 'perchance',
    name: 'Perchance AI (Link)',
    tier: 'unlimited_free',
    limit: 'Unlimited',
    quality: 3,
    mobile: true, offline: false, hindi: false,
    notes: 'No signup. Opens in browser.'
  },
];

// ═══════════════════════════════════════════════════════════
// MUSIC / SONG PROVIDERS — Best first
// ═══════════════════════════════════════════════════════════
export const MUSIC_PROVIDERS: Provider[] = [
  {
    id: 'musicgen_hf',
    name: 'HuggingFace MusicGen',
    tier: 'free_key',
    limit: 'Rate limited',
    keyEnv: 'HUGGINGFACE_TOKEN',
    quality: 4,
    mobile: true, offline: false, hindi: true,
    notes: 'facebook/musicgen-small. Direct audio output.'
  },
  {
    id: 'musicgen_local',
    name: 'MusicGen Local (Transformers.js)',
    tier: 'local_browser',
    limit: 'Unlimited',
    quality: 3,
    mobile: false, offline: true, hindi: true,
    notes: 'Slow on mobile. PC recommended. ~300MB model.'
  },
  {
    id: 'mubert',
    name: 'Mubert API',
    tier: 'free_key',
    limit: 'Free tier',
    keyEnv: 'MUBERT_API_KEY',
    quality: 3,
    mobile: true, offline: false, hindi: false,
    notes: 'Royalty-free. mubert.com/api'
  },
  {
    id: 'elevenlabs_music',
    name: 'ElevenLabs Music',
    tier: 'free_key',
    limit: 'Included in TTS quota',
    keyEnv: 'ELEVENLABS_API_KEY',
    quality: 4,
    mobile: true, offline: false, hindi: true,
    notes: 'Uses same ElevenLabs key as TTS.'
  },
  {
    id: 'suno',
    name: 'Suno AI (Link)',
    tier: 'unlimited_free',
    limit: '~50 songs/day',
    quality: 5,
    mobile: true, offline: false, hindi: true,
    notes: 'Best quality. Opens browser. suno.com'
  },
  {
    id: 'udio',
    name: 'Udio AI (Link)',
    tier: 'unlimited_free',
    limit: 'Free tier',
    quality: 5,
    mobile: true, offline: false, hindi: true,
    notes: 'Excellent quality. udio.com'
  },
  {
    id: 'boomy',
    name: 'Boomy (Link)',
    tier: 'unlimited_free',
    limit: 'Free tier',
    quality: 3,
    mobile: true, offline: false, hindi: false,
    notes: 'boomy.com — quick instrumental'
  },
  {
    id: 'aiva',
    name: 'AIVA (Link)',
    tier: 'unlimited_free',
    limit: '3 downloads/month',
    quality: 4,
    mobile: true, offline: false, hindi: false,
    notes: 'Classical/orchestral. aiva.ai'
  },
];

// ═══════════════════════════════════════════════════════════
// VIDEO PROVIDERS — Best first (all link-based, no free API)
// ═══════════════════════════════════════════════════════════
export const VIDEO_PROVIDERS = [
  { id:'runway',   name:'Runway ML',         url:'https://runwayml.com/',                  limit:'125 credits free', type:'generate', quality:5 },
  { id:'pika',     name:'Pika Labs',          url:'https://pika.art/',                      limit:'Free tier',        type:'generate', quality:5 },
  { id:'luma',     name:'Luma Dream Machine', url:'https://lumalabs.ai/dream-machine',      limit:'Free tier',        type:'generate', quality:5 },
  { id:'kling',    name:'Kling AI',           url:'https://klingai.com/',                   limit:'Free credits',     type:'generate', quality:4 },
  { id:'hailuo',   name:'Hailuo / MiniMax',   url:'https://hailuoai.video/',                limit:'Free credits',     type:'generate', quality:4 },
  { id:'veo',      name:'Google Veo',         url:'https://aitestkitchen.withgoogle.com/',  limit:'Waitlist',         type:'generate', quality:5 },
  { id:'invideo',  name:'InVideo AI',         url:'https://invideo.io/',                    limit:'Free tier',        type:'edit',     quality:4 },
  { id:'capcut',   name:'CapCut AI',          url:'https://www.capcut.com/',                limit:'Free editing+AI',  type:'edit',     quality:4 },
  { id:'veed',     name:'VEED AI',            url:'https://www.veed.io/',                   limit:'Free tier',        type:'edit',     quality:4 },
  { id:'kapwing',  name:'Kapwing',            url:'https://www.kapwing.com/',               limit:'Free tier',        type:'edit',     quality:3 },
];

// ═══════════════════════════════════════════════════════════
// STORAGE PROVIDERS — Best first
// ═══════════════════════════════════════════════════════════
export const STORAGE_PROVIDERS = [
  {
    id: 'supabase',
    name: 'Supabase',
    tier: 'cloud',
    limit: '500MB free, 50K MAU',
    features: ['persistent', 'cross-device', 'realtime', 'auth', 'search'],
    keyEnvs: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    notes: 'Primary. supabase.com → New project → free.'
  },
  {
    id: 'indexeddb',
    name: 'Browser IndexedDB',
    tier: 'local',
    limit: 'Device storage (GB)',
    features: ['persistent_local', 'offline', 'large_data', 'no_key'],
    notes: 'Offline fallback. Survives tab close. Per-device only.'
  },
  {
    id: 'localstorage',
    name: 'Browser localStorage',
    tier: 'local',
    limit: '5-10MB',
    features: ['simple', 'fast', 'always_available'],
    notes: 'Final fallback. Small data only. Never sync.'
  },
];

// ═══════════════════════════════════════════════════════════
// LLM PROVIDERS — Best first
// ═══════════════════════════════════════════════════════════
export const LLM_PROVIDERS = [
  {
    id: 'gemini_flash',
    name: 'Gemini 2.0 Flash',
    tier: 'free_key',
    limit: '1500 req/day free',
    keyEnv: 'NEXT_PUBLIC_GEMINI_API_KEY',
    quality: 5,
    tools: true,
    notes: 'Primary brain. Best function calling.'
  },
  {
    id: 'groq_llama',
    name: 'Groq (Llama 3.3 70B)',
    tier: 'free_key',
    limit: '6000 tokens/min free',
    keyEnv: 'GROQ_API_KEY',
    quality: 4,
    tools: false,
    notes: 'Ultra fast. Simple queries / fallback.'
  },
  {
    id: 'openrouter_free',
    name: 'OpenRouter (free models)',
    tier: 'free_key',
    limit: 'Varies per model',
    keyEnv: 'OPENROUTER_API_KEY',
    quality: 3,
    tools: false,
    notes: 'Llama, Gemma, Mistral free. openrouter.ai'
  },
  {
    id: 'aimlapi_llm',
    name: 'AIMLAPI (GPT-4o mini etc)',
    tier: 'free_key',
    limit: 'Free credits',
    keyEnv: 'AIMLAPI_KEY',
    quality: 4,
    tools: false,
    notes: 'Same key as image. aimlapi.com'
  },
];

// ═══════════════════════════════════════════════════════════
// SOCIAL / PRODUCTIVITY PROVIDERS
// ═══════════════════════════════════════════════════════════
export const SOCIAL_PROVIDERS = [
  { id:'whatsapp',   name:'WhatsApp Share',   type:'share',  tier:'free',  limit:'Unlimited', notes:'Always works. Link-based.' },
  { id:'instagram',  name:'Instagram',        type:'post',   tier:'oauth', limit:'Free',      keyEnvs:['META_APP_ID','META_APP_SECRET'], notes:'Meta Graph API v21.' },
  { id:'facebook',   name:'Facebook Page',    type:'post',   tier:'oauth', limit:'Free',      keyEnvs:['META_APP_ID','META_APP_SECRET'], notes:'Same Meta app as Instagram.' },
  { id:'twitter',    name:'Twitter/X',        type:'post',   tier:'oauth', limit:'1500 tw/mo', keyEnvs:['TWITTER_API_KEY','TWITTER_API_SECRET'], notes:'API v2 basic.' },
  { id:'telegram',   name:'Telegram Bot',     type:'notify', tier:'free_key', limit:'Unlimited', keyEnvs:['TELEGRAM_BOT_TOKEN','TELEGRAM_CHAT_ID'], notes:'Best for personal notifications.' },
  { id:'youtube',    name:'YouTube Data API', type:'search', tier:'free_key', limit:'10K units/day', keyEnvs:['YOUTUBE_API_KEY'], notes:'Already in tools.' },
];

// ═══════════════════════════════════════════════════════════
// Helper: get env value (server-side)
// ═══════════════════════════════════════════════════════════
export function getKey(envName: string): string | undefined {
  if (typeof process !== 'undefined') return process.env[envName];
  return undefined;
}

export function hasKey(envName: string): boolean {
  return !!getKey(envName);
}

// Get available providers (have key or no key needed)
export function getAvailableTTS(): Provider[] {
  return TTS_PROVIDERS.filter(p =>
    !p.keyEnv || hasKey(p.keyEnv) || p.tier === 'unlimited_free' || p.tier === 'local_browser'
  );
}

export function getAvailableImage(): Provider[] {
  return IMAGE_PROVIDERS.filter(p =>
    !p.keyEnv || hasKey(p.keyEnv) || p.tier === 'unlimited_free'
  );
}
