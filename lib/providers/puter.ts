// lib/providers/puter.ts
// Puter.js — FREE unlimited AI + Cloud Storage
// User apne Puter account se pay karta hai, developer $0
// ─────────────────────────────────────────────────────

declare global {
  interface Window {
    puter?: any
  }
}

// Load Puter.js script dynamically
async function loadPuter(): Promise<any> {
  if (typeof window === 'undefined') throw new Error('Client only')
  if (window.puter) return window.puter

  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://js.puter.com/v2/'
    s.onload = () => {
      const wait = setInterval(() => {
        if (window.puter) { clearInterval(wait); resolve(window.puter) }
      }, 100)
      setTimeout(() => { clearInterval(wait); reject(new Error('Puter load timeout')) }, 8000)
    }
    s.onerror = () => reject(new Error('Puter script failed'))
    document.head.appendChild(s)
  })
}

// ── AI Chat ───────────────────────────────────────────────
export async function puterChat(
  messages: Array<{ role: string; content: string }>,
  model: 'gpt-4o' | 'claude-3-7-sonnet' | 'o1-mini' = 'gpt-4o'
): Promise<string> {
  const puter = await loadPuter()
  const res = await puter.ai.chat(messages, { model })
  return res?.message?.content?.[0]?.text
    || res?.message?.content
    || res?.text
    || ''
}

// Streaming version
export async function puterChatStream(
  messages: Array<{ role: string; content: string }>,
  onChunk: (text: string) => void,
  model: 'gpt-4o' | 'claude-3-7-sonnet' = 'gpt-4o'
): Promise<string> {
  const puter = await loadPuter()
  let full = ''
  const res = await puter.ai.chat(messages, { model, stream: true })
  for await (const part of res) {
    const chunk = part?.text || part?.delta?.content || ''
    if (chunk) { full += chunk; onChunk(chunk) }
  }
  return full
}

// ── Cloud KV Storage ──────────────────────────────────────
export async function puterSet(key: string, value: any): Promise<boolean> {
  try {
    const puter = await loadPuter()
    await puter.kv.set(`jarvis_${key}`, JSON.stringify(value))
    return true
  } catch { return false }
}

export async function puterGet(key: string): Promise<any> {
  try {
    const puter = await loadPuter()
    const val = await puter.kv.get(`jarvis_${key}`)
    return val ? JSON.parse(val) : null
  } catch { return null }
}

export async function puterDel(key: string): Promise<boolean> {
  try {
    const puter = await loadPuter()
    await puter.kv.del(`jarvis_${key}`)
    return true
  } catch { return false }
}

// ── Cloud File Storage ────────────────────────────────────
export async function puterSaveFile(
  filename: string,
  content: string | Blob,
  folder = 'JARVIS'
): Promise<string | null> {
  try {
    const puter = await loadPuter()
    // Ensure folder exists
    try { await puter.fs.mkdir(folder) } catch {}
    const file = await puter.fs.write(`${folder}/${filename}`, content, { overwrite: true })
    return file?.path || null
  } catch { return null }
}

export async function puterReadFile(filename: string, folder = 'JARVIS'): Promise<string | null> {
  try {
    const puter = await loadPuter()
    const blob: Blob = await puter.fs.read(`${folder}/${filename}`)
    return await blob.text()
  } catch { return null }
}

// ── Full Memory Backup ────────────────────────────────────
export async function puterBackupMemory(memories: any[]): Promise<boolean> {
  return puterSet('memories', { memories, ts: Date.now() })
}

export async function puterRestoreMemory(): Promise<any[] | null> {
  const data = await puterGet('memories')
  return data?.memories || null
}

export async function puterBackupChats(chats: any[]): Promise<boolean> {
  return puterSet('chats_backup', { chats, ts: Date.now() })
}

// ── Is Puter available? ───────────────────────────────────
export function isPuterAvailable(): boolean {
  return typeof window !== 'undefined'
}

export async function isPuterSignedIn(): Promise<boolean> {
  try {
    const puter = await loadPuter()
    return !!(await puter.auth.getUser())
  } catch { return false }
}

export async function puterSignIn(): Promise<boolean> {
  try {
    const puter = await loadPuter()
    await puter.auth.signIn()
    return true
  } catch { return false }
}
