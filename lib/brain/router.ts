// lib/brain/router.ts
// Invisible Auto-Router — User को कुछ नहीं दिखता, सब automatic

import { matchTools } from '../../config/tools.config';
import type { RouterDecision } from '../../types/jarvis.types';

// ─── Complexity Scoring ───────────────────────────────────
function scoreComplexity(text: string): number {
  let score = 1;
  const words = text.trim().split(/\s+/).length;

  if (words > 50) score += 4;
  else if (words > 20) score += 2;
  else if (words > 10) score += 1;

  const complexSignals = [
    /analyze|analyse|विश्लेषण/i,
    /compare|तुलना/i,
    /explain in detail|विस्तार से/i,
    /write a|लिखो|draft|plan/i,
    /why|क्यों|how does|कैसे काम/i,
    /summarize|summarise|सारांश/i,
    /step by step|चरण/i,
    /pros and cons|फायदे नुकसान/i,
  ];
  complexSignals.forEach(r => { if (r.test(text)) score += 1; });

  const simpleSignals = [
    /^(hi|hello|हेलो|नमस्ते|hey|हाय)/i,
    /^(thanks|thank you|धन्यवाद|शुक्रिया)/i,
    /^(ok|okay|ठीक है|हाँ|नहीं|yes|no)/i,
    /कितने बजे|what time|weather|मौसम|कीमत|price/i,
  ];
  simpleSignals.forEach(r => { if (r.test(text)) score = Math.max(1, score - 2); });

  return Math.min(10, Math.max(1, score));
}

// ─── Language Detection ────────────────────────────────────
function detectLanguage(text: string): 'hindi' | 'english' | 'mixed' {
  const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  const ratio = hindiChars / (totalChars || 1);
  if (ratio > 0.5) return 'hindi';
  if (ratio > 0.1) return 'mixed';
  return 'english';
}

// ─── Tone Detection ───────────────────────────────────────
function detectTone(text: string): 'casual' | 'formal' | 'emotional' | 'technical' {
  if (/sad|दुखी|depressed|tension|तनाव|help me|मदद|lonely|अकेला|scared|डर/i.test(text)) return 'emotional';
  if (/code|error|bug|API|function|database|server|deploy|git/i.test(text)) return 'technical';
  if (/sir|please|kindly|request|formal|application|letter/i.test(text)) return 'formal';
  return 'casual';
}

// ─── Special Detections ───────────────────────────────────
function needsImage(text: string): boolean {
  return /image|तस्वीर|photo|फोटो|generate|बनाओ picture|draw|art|design|create.*image|visual/i.test(text);
}

function needsVideo(text: string): boolean {
  return /video|वीडियो|clip|footage|film.*show|watch.*video/i.test(text)
    && !/youtube|song|music/i.test(text);
}

function isLocalQuery(text: string): boolean {
  return /रीवा|rewa|madhya pradesh|MP|मध्यप्रदेश|local|bijli|बिजली|nagar|नगर/i.test(text);
}

// ─── Token Estimator ─────────────────────────────────────
function estimateTokens(text: string, tools: string[]): number {
  const textTokens = Math.ceil(text.length / 4);
  const toolTokens = tools.length * 50;
  const contextTokens = 200; // system prompt estimate
  return textTokens + toolTokens + contextTokens;
}

// ─── MAIN ROUTER ─────────────────────────────────────────
export function route(userMessage: string): RouterDecision {
  const text = userMessage.trim();
  const complexity = scoreComplexity(text);
  const language = detectLanguage(text);
  const tone = detectTone(text);
  const matchedTools = matchTools(text);
  const imageNeeded = needsImage(text);
  const videoNeeded = needsVideo(text);
  const isLocal = isLocalQuery(text);

  // Add image tools if needed
  if (imageNeeded && !matchedTools.includes('generate_image_fast')) {
    matchedTools.unshift('generate_image_fast');
  }
  if (videoNeeded && !matchedTools.includes('get_stock_video')) {
    matchedTools.push('get_stock_video');
  }
  if (isLocal && !matchedTools.includes('get_rewa_info')) {
    matchedTools.unshift('get_rewa_info');
  }

  // ── Brain Selection Logic ──
  let brain: 'gemini' | 'groq' | 'direct';

  // Pure tool queries — no AI brain needed
  const directTools = ['get_datetime', 'calculate', 'get_sunrise_sunset', 'get_public_holidays', 'lookup_pincode'];
  const isDirectQuery = matchedTools.length === 1 && directTools.includes(matchedTools[0]);

  if (isDirectQuery) {
    brain = 'direct'; // Zero AI tokens
  } else if (complexity <= 3 && tone === 'casual' && !imageNeeded) {
    brain = 'groq';   // Fast, cheap
  } else {
    brain = 'gemini'; // Full power
  }

  const tools = [...new Set(matchedTools)].slice(0, 6); // Max 6 tools per query
  const estimatedTokens = brain === 'direct' ? 0 : estimateTokens(text, tools);

  return {
    brain,
    tools,
    complexity,
    language,
    tone,
    needsSearch: matchedTools.some(t => ['search_wikipedia', 'get_india_news', 'get_hackernews'].includes(t)),
    needsImage: imageNeeded,
    needsVideo: videoNeeded,
    isLocal,
    estimatedTokens
  };
}

// ─── Routing Summary (for debugging/logging) ─────────────
export function explainRoute(decision: RouterDecision): string {
  return [
    `Brain: ${decision.brain}`,
    `Tools: ${decision.tools.join(', ') || 'none'}`,
    `Complexity: ${decision.complexity}/10`,
    `Language: ${decision.language}`,
    `Tokens: ~${decision.estimatedTokens}`
  ].join(' | ');
}
