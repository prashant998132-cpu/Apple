// lib/providers/puter.ts — Puter.js Image Generation
// Browser-side only (client component mein use karo)
// Unlimited, no API key needed

export async function puterImage(prompt: string, size = 1024): Promise<string | null> {
  try {
    // Load Puter.js dynamically if not loaded
    if (!(window as any).puter) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://js.puter.com/v2/'
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('puter_load_failed'))
        document.head.appendChild(s)
      })
      // Wait for puter to init
      await new Promise(r => setTimeout(r, 1000))
    }

    const puter = (window as any).puter
    if (!puter?.ai?.txt2img) throw new Error('puter_api_unavailable')

    const result = await puter.ai.txt2img(prompt)
    if (result?.src) return result.src

    return null
  } catch (e: any) {
    console.warn('Puter.js failed:', e.message)
    return null
  }
}

// For text completion via Puter (Claude/GPT-4o free)
export async function puterChat(messages: {role:string;content:string}[], model = 'claude-3-5-sonnet'): Promise<string | null> {
  try {
    if (!(window as any).puter) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://js.puter.com/v2/'
        s.onload = () => resolve()
        s.onerror = () => reject()
        document.head.appendChild(s)
      })
      await new Promise(r => setTimeout(r, 1000))
    }

    const puter = (window as any).puter
    if (!puter?.ai?.chat) throw new Error('puter_chat_unavailable')

    const lastMsg = messages[messages.length - 1]?.content || ''
    const result = await puter.ai.chat(lastMsg, { model })
    return result?.message?.content || result?.text || null
  } catch (e: any) {
    console.warn('Puter chat failed:', e.message)
    return null
  }
}
