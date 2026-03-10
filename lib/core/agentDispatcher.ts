/**
 * JARVIS Agent Dispatcher — Model Tier Selector
 * brain/router.ts decides WHICH tool, this decides WHICH model tier
 * Used by orchestrator.ts to pick nano/standard/powerful/reasoning
 */

export type ModelTier = 'nano' | 'standard' | 'powerful' | 'reasoning';

// Tier → actual model + provider
export const MODEL_MAP: Record<ModelTier, { model: string; provider: 'groq' | 'gemini'; note: string }> = {
  nano:      { model: 'llama-3.1-8b-instant',          provider: 'groq',   note: 'Fast, cheap — greetings, simple' },
  standard:  { model: 'llama-3.3-70b-versatile',       provider: 'groq',   note: 'Balanced — most tasks' },
  powerful:  { model: 'gemini-2.0-flash',              provider: 'gemini', note: 'Complex, code, analysis' },
  reasoning: { model: 'deepseek-r1-distill-llama-70b', provider: 'groq',   note: 'Step-by-step reasoning' },
};

/**
 * Pick model tier based on message complexity + brain decision.
 * Called from orchestrator.ts after brain/router decides the brain.
 */
export function pickModelTier(
  message: string,
  brain: 'gemini' | 'groq' | 'direct',
  complexity: number,
  chatMode?: string,
): ModelTier {
  // chatMode overrides everything
  if (chatMode === 'flash') return 'nano';
  if (chatMode === 'think') return 'reasoning';
  if (chatMode === 'deep')  return 'powerful';

  // brain/router already decided — respect it
  if (brain === 'direct') return 'nano';   // no LLM needed but nano for fallback
  if (brain === 'gemini') return complexity >= 7 ? 'powerful' : 'standard';

  // brain === 'groq' — pick tier by complexity
  if (complexity >= 7) return 'standard';  // 70B for complex groq queries
  if (complexity <= 2) return 'nano';      // 8B for simple greetings
  return 'standard';
}

export function getModelForTier(tier: ModelTier): string {
  return MODEL_MAP[tier].model;
}

export function getProviderForTier(tier: ModelTier): string {
  return MODEL_MAP[tier].provider;
}
