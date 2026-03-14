// lib/core/contextCompressor.ts
// Smart context compression — API tokens bachao, limits protect karo
//
// Problem: Long chats mein 30+ messages = ~8000 tokens waste per request
// Solution: Last 4 messages full rakhna, baaki summarize karna
// Result: ~75% token reduction, better API limit protection
// ────────────────────────────────────────────────────────────────

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
}

// Max tokens estimate per message (rough: 1 token ≈ 4 chars)
const estimateTokens = (text: string) => Math.ceil(text.length / 4)

// ── Smart summarizer (rule-based, zero API cost) ───────────
function summarizeOldMessages(messages: Message[]): string {
  if (messages.length === 0) return ''
  
  const userMsgs    = messages.filter(m => m.role === 'user')
  const assistantMsgs = messages.filter(m => m.role === 'assistant')
  
  // ── Topic extraction — what user asked about ──
  const topics: string[] = []
  userMsgs.forEach(m => {
    const line = m.content.trim().split('\n')[0].slice(0, 70)
    if (line.length > 8) topics.push(line)
  })

  // ── Key facts — numbers, decisions, names from AI replies ──
  const keyFacts: string[] = []
  assistantMsgs.forEach(m => {
    m.content.split('\n').forEach(line => {
      // Numbers, currency, percentages, dates, capitalized proper nouns
      if (line.match(/\d{4}|\b\d+(\.\d+)?%|[₹$€]\d+|\b[A-Z][a-z]{2,}\s[A-Z][a-z]{2,}/) && line.length < 100) {
        keyFacts.push(line.trim().slice(0, 80))
      }
    })
  })

  // ── Decision/intent extraction — what user decided/confirmed ──
  const decisions: string[] = []
  userMsgs.forEach(m => {
    const c = m.content.toLowerCase()
    if (c.match(/\b(haan|yes|theek hai|okay|sure|done|kar do|set karo|remind|remember|save)\b/)) {
      decisions.push(m.content.trim().slice(0, 60))
    }
  })

  // ── Build compact summary ──
  const parts: string[] = ['[Conv summary — ' + messages.length + ' msgs]']
  if (topics.length)    parts.push('Topics: ' + topics.slice(0, 4).join(' | '))
  if (keyFacts.length)  parts.push('Facts: ' + keyFacts.slice(0, 3).join(' | '))
  if (decisions.length) parts.push('User decided: ' + decisions.slice(0, 2).join(' | '))
  parts.push('[/summary]')

  return parts.join('\n')
}

// ── Main compression function ──────────────────────────────
export function compressContext(
  messages: Message[],
  opts: {
    keepRecent?: number      // How many recent messages to keep as-is (default: 6)
    maxTotalTokens?: number  // Max tokens budget (default: 3000)
    summarizeOld?: boolean   // Summarize old messages (default: true)
  } = {}
): Message[] {
  const {
    keepRecent     = 6,
    maxTotalTokens = 3000,
    summarizeOld   = true,
  } = opts

  if (messages.length <= keepRecent) return messages

  const recentMessages = messages.slice(-keepRecent)
  const oldMessages    = messages.slice(0, -keepRecent)

  // Check if we even need compression
  const totalTokens = messages.reduce((acc, m) => acc + estimateTokens(m.content), 0)
  if (totalTokens <= maxTotalTokens && messages.length <= 14) return messages

  if (!summarizeOld || oldMessages.length === 0) {
    return recentMessages
  }

  // Create summary message
  const summaryText = summarizeOldMessages(oldMessages)
  const summaryMsg: Message = {
    role: 'system',
    content: summaryText,
    timestamp: oldMessages[0]?.timestamp,
  }

  return [summaryMsg, ...recentMessages]
}

// ── Token budget checker ────────────────────────────────────
export function getContextStats(messages: Message[]) {
  const total = messages.reduce((acc, m) => acc + estimateTokens(m.content), 0)
  const byRole = {
    user:      messages.filter(m=>m.role==='user').reduce((a,m)=>a+estimateTokens(m.content),0),
    assistant: messages.filter(m=>m.role==='assistant').reduce((a,m)=>a+estimateTokens(m.content),0),
    system:    messages.filter(m=>m.role==='system').reduce((a,m)=>a+estimateTokens(m.content),0),
  }
  return { total, byRole, messageCount: messages.length }
}

// ── Auto-compress for API calls ────────────────────────────
// Drop-in replacement for history.slice(-N)
export function smartHistory(
  messages: Message[],
  mode: 'flash' | 'auto' | 'think' | 'deep' = 'auto'
): Message[] {
  const keepRecent = mode === 'flash' ? 4 : mode === 'deep' ? 8 : 6
  const maxTokens  = mode === 'flash' ? 1500 : mode === 'deep' ? 5000 : 2500

  return compressContext(messages, { keepRecent, maxTotalTokens: maxTokens })
}
