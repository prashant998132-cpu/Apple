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
  
  const topics: string[] = []
  const userMsgs = messages.filter(m => m.role === 'user')
  const assistantMsgs = messages.filter(m => m.role === 'assistant')
  
  // Extract key topics from user messages
  userMsgs.slice(0, 8).forEach(m => {
    const content = m.content.trim()
    if (content.length > 10) {
      // Get first meaningful line
      const firstLine = content.split('\n')[0].slice(0, 60)
      topics.push(firstLine)
    }
  })

  // Extract any key facts AI mentioned (numbers, names, dates)
  const keyFacts: string[] = []
  assistantMsgs.slice(-3).forEach(m => {
    const content = m.content
    // Extract lines with numbers/dates/names (likely important facts)
    const lines = content.split('\n')
    lines.forEach(line => {
      if (line.match(/\d{4}|\b[A-Z][a-z]+\b.*\b[A-Z][a-z]+\b|\b\d+%|\₹\d+|\$\d+/) && line.length < 80) {
        keyFacts.push(line.trim().slice(0, 70))
      }
    })
  })

  let summary = `[Earlier conversation summary — ${messages.length} messages]:\n`
  if (topics.length > 0) {
    summary += `User discussed: ${topics.slice(0, 5).join(' | ')}\n`
  }
  if (keyFacts.length > 0) {
    summary += `Key facts: ${keyFacts.slice(0, 3).join(' | ')}\n`
  }
  summary += `[End of summary — continue from recent messages below]`
  
  return summary
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
