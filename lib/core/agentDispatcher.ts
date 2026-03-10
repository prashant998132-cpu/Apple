/**
 * JARVIS Agent Dispatcher
 * User message → intent → category → tool/model → cached response
 * The brain that makes JARVIS truly agentic
 */

import { cacheGet, cacheSet, TTL } from './responseCache';
import { findToolByIntent, ToolCategory } from './toolRegistry';

export type ModelTier = 'nano' | 'standard' | 'powerful' | 'reasoning';

export interface DispatchResult {
  tool: string | null;
  category: ToolCategory;
  modelTier: ModelTier;
  useCache: boolean;
  cachedResponse?: unknown;
  reasoning: string;
  apiSave: boolean; // true if we avoided an AI API call
}

// ── Intent patterns (regex-based, zero API cost) ──────────────────────────────
const INTENT_PATTERNS: Array<{ pattern: RegExp; category: ToolCategory; modelTier: ModelTier }> = [
  { pattern: /\b(bitcoin|btc|eth|crypto|coin|usdt|binance)\b/i,        category:'finance',     modelTier:'nano' },
  { pattern: /\b(stock|nifty|sensex|share price|nse|bse)\b/i,          category:'finance',     modelTier:'nano' },
  { pattern: /\b(emi|sip|loan|interest rate|mutual fund)\b/i,           category:'finance',     modelTier:'nano' },
  { pattern: /\b(weather|temperature|rain|forecast|mausam|baarish)\b/i, category:'weather',     modelTier:'nano' },
  { pattern: /\b(news|khabar|headline|breaking|samachar)\b/i,           category:'news',        modelTier:'nano' },
  { pattern: /\b(ipl|cricket|match score|t20|rcb|csk|mi|dhoni)\b/i,    category:'india',       modelTier:'nano' },
  { pattern: /\b(train|railway|pnr|irctc|station)\b/i,                  category:'india',       modelTier:'nano' },
  { pattern: /\b(wikipedia|wiki|kya hai|what is|explain|history of)\b/i,category:'education',   modelTier:'standard' },
  { pattern: /\b(image|photo|generate image|draw|picture banao)\b/i,    category:'ai_tools',    modelTier:'nano' },
  { pattern: /\b(translate|translation|hindi mein|english mein)\b/i,    category:'ai_tools',    modelTier:'nano' },
  { pattern: /\b(calculate|math|equation|solve|compute)\b/i,            category:'utilities',   modelTier:'nano' },
  { pattern: /\b(uuid|hash|base64|regex|json format|ip address)\b/i,   category:'developer',   modelTier:'nano' },
  { pattern: /\b(github|repo|commit|pull request|issue)\b/i,            category:'productivity',modelTier:'standard' },
  { pattern: /\b(youtube|video|transcript|yt link)\b/i,                 category:'media',       modelTier:'nano' },
  { pattern: /\b(bmi|calorie|weight|height|diet)\b/i,                   category:'health',      modelTier:'nano' },
  { pattern: /\b(anime|manga|naruto|one piece)\b/i,                     category:'media',       modelTier:'nano' },
  // Complex reasoning triggers
  { pattern: /\b(explain|analyze|compare|pros cons|strategy|plan|essay|write)\b/i, category:'general', modelTier:'standard' },
  { pattern: /\b(code|function|program|debug|error|algorithm)\b/i,      category:'developer',   modelTier:'powerful' },
  { pattern: /\b(think|reasoning|step by step|solve complex|research)\b/i, category:'general',  modelTier:'reasoning' },
];

// Which model tier maps to which actual provider
export const MODEL_MAP: Record<ModelTier, { model: string; provider: string; note: string }> = {
  nano:      { model:'llama-3.1-8b-instant',    provider:'groq',     note:'Fast, cheap — simple queries' },
  standard:  { model:'llama-3.3-70b-versatile', provider:'groq',     note:'Balanced — most tasks' },
  powerful:  { model:'gemini-2.0-flash',        provider:'gemini',   note:'Complex tasks' },
  reasoning: { model:'deepseek-r1-distill-llama-70b', provider:'groq', note:'Chain-of-thought' },
};

export function dispatch(userMessage: string): DispatchResult {
  const text = userMessage.toLowerCase().trim();

  // 1. Find matching tool by keywords
  const tool = findToolByIntent(text);

  // 2. Detect intent category + model tier
  let category: ToolCategory = 'general';
  let modelTier: ModelTier = 'standard';

  for (const { pattern, category: cat, modelTier: tier } of INTENT_PATTERNS) {
    if (pattern.test(text)) {
      category = cat;
      modelTier = tier;
      break;
    }
  }

  // 3. Check cache for tool responses
  if (tool?.cacheTTL) {
    const cached = cacheGet(tool.category, text);
    if (cached) {
      return {
        tool: tool.id,
        category,
        modelTier,
        useCache: true,
        cachedResponse: cached,
        reasoning: `Cache hit → ${tool.name} (saved API call)`,
        apiSave: true,
      };
    }
  }

  // 4. Local tools → no AI needed at all
  if (tool?.local) {
    return {
      tool: tool.id,
      category,
      modelTier: 'nano',
      useCache: false,
      reasoning: `Local tool → ${tool.name} (zero API cost)`,
      apiSave: true,
    };
  }

  // 5. Short greeting / simple query → nano model
  if (text.length < 30 && /^(hi|hello|hey|ok|haan|shukriya|thanks|bye|theek|acha)/.test(text)) {
    modelTier = 'nano';
    category = 'general';
  }

  return {
    tool: tool?.id || null,
    category,
    modelTier,
    useCache: false,
    reasoning: `${modelTier} model → ${MODEL_MAP[modelTier].provider}`,
    apiSave: false,
  };
}

// Cache a tool response for future use
export function cacheToolResponse(toolId: string, query: string, response: unknown, ttl?: number): void {
  const tool = findToolByIntent(query);
  const cacheTTL = ttl || tool?.cacheTTL || TTL.DEFAULT;
  cacheSet(toolId, query, response, cacheTTL);
}

// Get the recommended Groq model string for a tier
export function getModelForTier(tier: ModelTier): string {
  return MODEL_MAP[tier].model;
}
