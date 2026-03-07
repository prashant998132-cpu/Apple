// lib/agents/planner.ts
// Planner Agent — breaks user message into structured task plan
// No LLM call needed for simple intents. Uses keyword matching first.
// Falls back to Gemini for complex multi-step commands.

export type TaskType =
  | 'chat'           // simple conversation
  | 'tts'            // text to speech
  | 'image_gen'      // generate image
  | 'music_gen'      // generate music/song
  | 'video_links'    // video generation links
  | 'weather'        // weather query
  | 'news'           // news query
  | 'train'          // train search
  | 'youtube'        // youtube search
  | 'calendar_view'  // view calendar events
  | 'calendar_add'   // add calendar event
  | 'gmail_send'     // send email
  | 'social_post'    // post to social media
  | 'neet'           // NEET study query
  | 'location'       // location query
  | 'reminder'       // set reminder
  | 'web_search'     // search web
  | 'multi_step';    // complex multi-step

export interface TaskStep {
  type: TaskType;
  priority: number;          // 1 = do first
  params: Record<string, any>;
  dependsOn?: number;        // step index this depends on
}

export interface TaskPlan {
  intent: TaskType;
  steps: TaskStep[];
  isMultiStep: boolean;
  lang: 'hi' | 'en' | 'mixed';
  confidence: number;        // 0-1
  raw: string;               // original message
}

// ── Language detector ──────────────────────────────────────
function detectLang(text: string): 'hi' | 'en' | 'mixed' {
  const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  const ratio = hindiChars / (text.replace(/\s/g, '').length || 1);
  return ratio > 0.5 ? 'hi' : ratio > 0.08 ? 'mixed' : 'en';
}

// ── Intent patterns — ordered by specificity ───────────────
const PATTERNS: Array<{ types: TaskType[]; keywords: string[]; params?: Record<string, any> }> = [
  // TTS
  { types: ['tts'], keywords: ['bol', 'bolo', 'पढ़ो', 'sunao', 'सुनाओ', 'speak', 'read aloud', 'voice mein', 'आवाज़ में', 'bolke sunao'] },
  // Image
  { types: ['image_gen'], keywords: ['image banao', 'photo banao', 'तस्वीर', 'picture banao', 'generate image', 'draw', 'illustration', 'artwork', 'visual banao', 'image bana', 'photo bana'] },
  // Music
  { types: ['music_gen'], keywords: ['gaana banao', 'song banao', 'music banao', 'गाना', 'संगीत', 'music generate', 'udio', 'suno', 'compose', 'track banao', 'beat banao'] },
  // Video
  { types: ['video_links'], keywords: ['video banao', 'video generate', 'reel banao', 'short banao', 'animation', 'video bana'] },
  // Weather
  { types: ['weather'], keywords: ['mausam', 'मौसम', 'weather', 'temperature', 'rain', 'barish', 'baarish', 'बारिश', 'garmi', 'sardi', 'humidity'] },
  // News
  { types: ['news'], keywords: ['news', 'khabar', 'खबर', 'samachar', 'समाचार', 'today news', 'latest news', 'breaking'] },
  // Train
  { types: ['train'], keywords: ['train', 'rail', 'station', 'platform', 'irctc', 'express', 'rajdhani', 'shatabdi', 'se delhi', 'se mumbai'] },
  // YouTube
  { types: ['youtube'], keywords: ['youtube', 'video search', 'video dhundo', 'yt', 'channel', 'watch'] },
  // Calendar view
  { types: ['calendar_view'], keywords: ['calendar', 'events', 'schedule', 'आज क्या है', 'meetings', 'appointments', 'upcoming'] },
  // Calendar add
  { types: ['calendar_add'], keywords: ['calendar mein add', 'remind karo', 'event add', 'schedule karo', 'याद दिलाना', 'reminder set'] },
  // Gmail
  { types: ['gmail_send'], keywords: ['email bhejo', 'mail karo', 'send email', 'gmail', 'email send'] },
  // Social
  { types: ['social_post'], keywords: ['instagram pe post', 'twitter pe', 'facebook pe', 'share karo', 'post karo', 'tweet karo', 'social media'] },
  // NEET
  { types: ['neet'], keywords: ['neet', 'biology', 'chemistry', 'physics', 'cell', 'dna', 'enzyme', 'hybridization', 'newton', 'reaction', 'mcq', 'exam', 'mbbs', 'medical entrance'] },
  // Location
  { types: ['location'], keywords: ['location', 'kahan hun', 'कहाँ हूँ', 'gps', 'mera location', 'near me', 'nearby', 'distance'] },
  // Reminder
  { types: ['reminder'], keywords: ['yaad dilao', 'याद दिलाओ', 'reminder', 'alarm', 'notify', 'alert'] },
  // TTS + Image (multi-step)
  { types: ['tts', 'image_gen'], keywords: ['image banao aur bolo', 'photo banao aur sunao', 'dekho aur sunao'] },
];

// ── Extract params from message ────────────────────────────
function extractParams(msg: string, types: TaskType[]): Record<string, any> {
  const params: Record<string, any> = {};
  const m = msg.toLowerCase();

  if (types.includes('tts')) {
    params.lang = detectLang(msg) === 'en' ? 'en' : 'hi';
    params.speed = m.includes('dheere') || m.includes('slow') ? 0.8 : m.includes('fast') || m.includes('jaldi') ? 1.3 : 1.0;
    params.quality = m.includes('best') || m.includes('high quality') ? 'high' : 'fast';
  }

  if (types.includes('image_gen')) {
    const styleMap: Record<string, string> = {
      'realistic': 'realistic', 'photo': 'realistic',
      'anime': 'anime', 'cartoon': 'anime',
      'artistic': 'artistic', 'painting': 'artistic',
      'bollywood': 'bollywood',
      'nature': 'nature', 'landscape': 'nature',
      '3d': '3d',
    };
    for (const [kw, style] of Object.entries(styleMap)) {
      if (m.includes(kw)) { params.style = style; break; }
    }
  }

  if (types.includes('music_gen')) {
    const styleMap: Record<string, string> = {
      'bollywood': 'bollywood_happy', 'sad': 'bollywood_sad', 'dukhi': 'bollywood_sad',
      'devotional': 'devotional', 'bhajan': 'devotional',
      'lofi': 'lofi_study', 'study': 'lofi_study',
      'classical': 'classical', 'raga': 'classical',
      'folk': 'folk_mp', 'tribal': 'folk_mp',
      'party': 'party', 'dance': 'party',
      'motivational': 'motivational', 'energetic': 'motivational',
    };
    for (const [kw, style] of Object.entries(styleMap)) {
      if (m.includes(kw)) { params.style = style; break; }
    }
    const durMatch = m.match(/(\d+)\s*(second|sec|minute|min)/);
    if (durMatch) {
      const num = parseInt(durMatch[1]);
      params.duration = durMatch[2].startsWith('min') ? num * 60 : num;
    } else {
      params.duration = 20;
    }
  }

  if (types.includes('social_post')) {
    if (m.includes('instagram') || m.includes('ig')) params.platform = 'instagram';
    else if (m.includes('twitter') || m.includes('x pe') || m.includes('tweet')) params.platform = 'twitter';
    else if (m.includes('facebook') || m.includes('fb')) params.platform = 'facebook';
    else params.platform = 'whatsapp'; // safest default
  }

  if (types.includes('weather')) {
    const cityMatch = msg.match(/(?:in|at|of|ka|ki|mein)\s+([A-Z][a-z]+|[ए-ह]+)/);
    params.city = cityMatch?.[1] || '';
  }

  return params;
}

// ── Main planner function ──────────────────────────────────
export function planTask(message: string): TaskPlan {
  const lang = detectLang(message);
  const m = message.toLowerCase();

  // Check patterns
  for (const pattern of PATTERNS) {
    const matched = pattern.keywords.some(kw => m.includes(kw));
    if (!matched) continue;

    const types = pattern.types;
    const isMultiStep = types.length > 1;
    const params = extractParams(message, types);

    if (isMultiStep) {
      return {
        intent: 'multi_step',
        isMultiStep: true,
        lang,
        confidence: 0.85,
        raw: message,
        steps: types.map((type, i) => ({
          type,
          priority: i + 1,
          params,
          dependsOn: i > 0 ? i - 1 : undefined,
        })),
      };
    }

    return {
      intent: types[0],
      isMultiStep: false,
      lang,
      confidence: 0.9,
      raw: message,
      steps: [{ type: types[0], priority: 1, params }],
    };
  }

  // Default: chat
  return {
    intent: 'chat',
    isMultiStep: false,
    lang,
    confidence: 0.7,
    raw: message,
    steps: [{ type: 'chat', priority: 1, params: { lang } }],
  };
}

// ── Describe plan for debugging ────────────────────────────
export function describePlan(plan: TaskPlan): string {
  const stepDesc = plan.steps.map(s => `${s.priority}. ${s.type}(${JSON.stringify(s.params)})`).join(' → ');
  return `[${plan.lang}] Intent: ${plan.intent} | Steps: ${stepDesc} | Confidence: ${plan.confidence}`;
}
