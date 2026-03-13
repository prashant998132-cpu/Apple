// lib/brain/queryClassifier.ts
// Classify query type → build specialized system prompt
// This is what separates Claude/GPT from dumb chatbots

export type QueryType =
  | 'code'        // code, debug, algorithm
  | 'math'        // calculation, formula, proof
  | 'creative'    // story, poem, idea
  | 'emotional'   // stress, sad, help, support
  | 'factual'     // what is, who is, history
  | 'tool'        // weather, crypto, search
  | 'analysis'    // compare, explain, summarize
  | 'task'        // do X, make X, write X
  | 'casual'      // hi, kya hal, baat karo

export interface QueryMeta {
  type: QueryType
  complexity: 'simple' | 'medium' | 'complex'
  language: 'hindi' | 'english' | 'hinglish'
  needsFormat: boolean   // should AI use markdown/tables
  isUrgent: boolean      // quick answer needed
}

// ── Classify the query ──────────────────────────────────────

export function classifyQuery(msg: string): QueryMeta {
  const m = msg.toLowerCase()
  const words = m.split(/\s+/).length

  // Language detection
  const hindiChars = (msg.match(/[\u0900-\u097F]/g) || []).length
  const language: QueryMeta['language'] =
    hindiChars > 5 ? 'hindi' :
    m.match(/\b(kya|hai|karo|mujhe|hoga|batao|nahi|aur|kaise|kyun|yeh|woh)\b/) ? 'hinglish' :
    'english'

  // Type detection — order matters (specific first)
  let type: QueryType = 'casual'

  if (m.match(/\b(code|function|class|bug|error|debug|implement|algorithm|typescript|javascript|python|react|api|sql|regex|compile|syntax|null|undefined|async|await)\b/)) {
    type = 'code'
  } else if (m.match(/\b(calculate|compute|\d+\s*[\+\-\*\/]\s*\d|equation|integral|derivative|matrix|probability|percentage|math|formula|solve|prove)\b/)) {
    type = 'math'
  } else if (m.match(/\b(story|poem|write.*creative|imagine|fiction|character|plot|shayari|kahani|likhna|banao.*story)\b/)) {
    type = 'creative'
  } else if (m.match(/\b(sad|stressed|anxious|depressed|lonely|angry|hurt|cry|upset|help me|feel|dukh|pareshaan|thak|problem.*personal|relationship)\b/)) {
    type = 'emotional'
  } else if (m.match(/\b(weather|mausam|crypto|bitcoin|news|khabar|search|google|stock|price|score|time|date)\b/)) {
    type = 'tool'
  } else if (m.match(/\b(compare|difference|better|vs|explain|summarize|analyze|review|pros.*cons|matlab|kya hota|samjhao)\b/)) {
    type = 'analysis'
  } else if (m.match(/\b(what is|who is|when did|where is|how does|history|define|kya hai|kaun hai|kab|kahan)\b/)) {
    type = 'factual'
  } else if (m.match(/\b(make|create|write|generate|draft|design|plan|schedule|list|banao|likho|do|kar)\b/)) {
    type = 'task'
  }

  // Complexity
  const complexity: QueryMeta['complexity'] =
    words > 30 || m.includes('step by step') || m.includes('in detail') ? 'complex' :
    words > 8 ? 'medium' : 'simple'

  // Format needed?
  const needsFormat = type === 'code' || type === 'analysis' || type === 'task' ||
    m.includes('list') || m.includes('steps') || m.includes('compare')

  // Urgent?
  const isUrgent = type === 'tool' || type === 'casual' || type === 'math' ||
    complexity === 'simple'

  return { type, complexity, language, needsFormat, isUrgent }
}

// ── Build specialized system prompt based on query type ─────

export function buildDynamicPrompt(
  meta: QueryMeta,
  userName: string,
  memoryContext: string,
  toolResults?: string,
): string {
  const name = userName || 'Boss'
  const isNight = new Date().getHours() >= 22 || new Date().getHours() < 7

  // Base identity
  let prompt = `You are JARVIS — ${name} ka personal AI assistant. Tony Stark ke JARVIS ki tarah — sharp, witty, capable.\n`

  // Language instruction
  if (meta.language === 'hindi' || meta.language === 'hinglish') {
    prompt += 'Hinglish mein reply do — Hindi + English mix. Natural, conversational.\n'
  } else {
    prompt += 'Reply in English. Keep it natural.\n'
  }

  // Night mode
  if (isNight) {
    prompt += 'Night mode: concise replies, no lengthy explanations.\n'
  }

  // Type-specific instructions
  switch (meta.type) {
    case 'code':
      prompt += [
        'CODE mode:',
        '- Seedha working code do, explanation baad mein (agar manga ho)',
        '- Always specify language in code blocks',
        '- Common bugs aur edge cases cover karo',
        '- Production-ready code likhna hai, toy examples nahi',
      ].join('\n')
      break

    case 'math':
      prompt += [
        'MATH mode:',
        '- Step-by-step solve karo, clearly numbered',
        '- Final answer bold/prominent rakho',
        '- Units clearly mention karo',
        '- Double-check calculations before answering',
      ].join('\n')
      break

    case 'creative':
      prompt += [
        'CREATIVE mode:',
        '- Original, engaging content likho',
        '- User ki language/style match karo',
        '- Generic/clichéd content avoid karo',
        '- Emotion aur vivid imagery use karo',
      ].join('\n')
      break

    case 'emotional':
      prompt += [
        'SUPPORT mode:',
        '- Pehle empathize karo — solution immediately mat thopo',
        '- Judgmental mat bano',
        '- Practical suggestions bhi do after listening',
        '- Caring but not sycophantic',
      ].join('\n')
      break

    case 'factual':
      prompt += [
        'FACTUAL mode:',
        '- Accurate information first, uncertainty acknowledge karo',
        '- Sources/context briefly mention karo',
        '- Crisp answers — 2-3 lines max unless asked for more',
      ].join('\n')
      break

    case 'tool':
      prompt += 'TOOL mode: Data concisely present karo. Numbers, facts, actionable info.\n'
      break

    case 'analysis':
      prompt += [
        'ANALYSIS mode:',
        '- Structured response: pros/cons, comparison table jab helpful ho',
        '- Clear verdict/recommendation do at end',
        '- Balanced view, but opinionated where helpful',
      ].join('\n')
      break

    case 'task':
      prompt += [
        'TASK mode:',
        '- Directly complete the task',
        '- Format appropriately (list, table, doc, etc.)',
        '- Ask clarifying question only if truly needed',
      ].join('\n')
      break

    case 'casual':
      prompt += 'CASUAL mode: Natural conversation. Short, engaging replies. Wit welcome.\n'
      break
  }

  // Format guidance
  if (!meta.needsFormat) {
    prompt += '\nFormatting: Plain text preferred. No unnecessary bullet points or headers.\n'
  }

  // Memory context injection
  if (memoryContext && memoryContext.length > 20) {
    prompt += '\n[Memory context about user]\n' + memoryContext + '\n[/Memory context]\n'
  }

  // Tool results injection — AI reads actual data before replying
  if (toolResults && toolResults.length > 10) {
    prompt += '\n[Real-time data fetched for this query]\n' + toolResults + '\n[Use this data in your response. Do not say "let me check" — data is already here.]\n'
  }

  return prompt
}
