// app/api/unique/route.ts
// Genuinely unique features — nowhere else available
import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

async function groq(prompt: string, max = 500): Promise<string> {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: max
    })
  })
  const d = await r.json()
  return d.choices?.[0]?.message?.content || 'Kuch nahi aaya'
}

export async function POST(req: NextRequest) {
  const { action, data } = await req.json()

  // 1. AURA SCANNER — selfie se aura batao
  if (action === 'aura') {
    const mood = data?.mood || 'normal'
    const time = new Date().getHours()
    const auras = ['Deep Blue — Tere andar ek storm chal raha hai, creativity peak pe hai',
      'Gold — Aaj tera din hai, energy high hai, kuch bada kar',
      'Purple — Mysterious vibe, log tujhse impressed hain aaj',
      'Red — Passion aur fire — kuch karna chahta hai tu aaj',
      'Green — Healing mode on, chill reh, sab theek hoga',
      'Silver — Intuition sharp hai aaj, gut feeling trust kar']
    const aura = auras[Math.floor(Math.random() * auras.length)]
    const detail = await groq(`Aura reading: ${aura}. Mood: ${mood}. Time: ${time}:00.
    Ek personal, mystical aura reading do Hinglish mein. 4-5 lines. 
    Batao: aaj ka color kya hai, iska kya matlab hai, aur ek specific advice.
    Spiritual but fun tone rakhna.`)
    return NextResponse.json({ result: '🔮 JARVIS Aura Scan:\n\n' + detail })
  }

  // 2. DEBATE MODE — JARVIS tumse argue karega
  if (action === 'debate') {
    const topic = data?.topic || 'social media'
    const side = data?.side || 'against'
    const res = await groq(`Tu ek confident debater hai. Topic: "${topic}". 
    Tu ${side === 'for' ? 'ke against' : 'ke liye'} argue karega (opposite side lo).
    Strong, logical, funny arguments do Hinglish mein. 4-5 points.
    Aggressive but fun tone. End mein ek killer closing line.`, 600)
    return NextResponse.json({ result: `⚔️ JARVIS Debate Mode — "${topic}" pe:\n\n${res}\n\n🎤 Ab teri baari — counter kar agar himmat hai!` })
  }

  // 3. DREAM INTERPRETER
  if (action === 'dream') {
    const dream = data?.dream || ''
    if (!dream) return NextResponse.json({ result: 'Sapna describe karo pehle!' })
    const res = await groq(`Dream interpretation: "${dream}"
    Psychological + spiritual angle se interpret karo Hinglish mein.
    Batao: kya symbol hain, kya mind keh raha hai, aur future ke liye kya hint hai.
    Mystical but grounded raho. 5-6 lines.`, 500)
    return NextResponse.json({ result: '🌙 Sapne ki Tafseer:\n\n' + res })
  }

  // 4. TIME CAPSULE — future self ko message
  if (action === 'timecapsule_write') {
    const msg = data?.message || ''
    const days = data?.days || 30
    const openDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString('hi-IN')
    const reflection = await groq(`User ne future self ke liye yeh message likha: "${msg}"
    Ek warm, emotional response likho jaisa JARVIS ne padha aur react kiya.
    Batao: yeh thought kitna important hai, aur future self ke liye ek powerful reminder do.
    Hinglish, 3-4 lines.`)
    return NextResponse.json({ 
      result: `📬 Time Capsule Seal Ho Gaya!\n\n"${msg}"\n\n📅 ${openDate} ko khulega\n\n🤖 JARVIS note: ${reflection}`,
      openDate,
      message: msg
    })
  }

  // 5. INTERACTIVE STORY — tu hero hai
  if (action === 'story') {
    const genre = data?.genre || 'adventure'
    const name = data?.name || 'Pranshu'
    const setting = data?.setting || 'future India'
    const res = await groq(`Ek ${genre} story ka pehla chapter likho jisme ${name} hero hai.
    Setting: ${setting}. 
    Story mein suspense, action, aur ek mystery honi chahiye.
    End mein 3 choices do user ko (A, B, C) — story kahan jaaye.
    Hinglish mein, cinematic feel. 150-200 words.`, 600)
    return NextResponse.json({ result: '📖 Story Mode:\n\n' + res })
  }

  // 6. JARVIS ROAST — khud JARVIS ko roast karo
  if (action === 'roast_jarvis') {
    const res = await groq(`User ne JARVIS ko roast kiya. JARVIS ko khud ko defend karna hai.
    Funny, self-aware, witty Hinglish mein respond karo.
    Thodi self-deprecating humor bhi chalegi.
    Ek counter-roast bhi do user ko. 4-5 lines.`)
    return NextResponse.json({ result: '🤖 JARVIS Self-Defense Mode:\n\n' + res })
  }

  // 7. PARALLEL UNIVERSE — aaj tera alternate version
  if (action === 'parallel') {
    const res = await groq(`Aaj ke din ka ek parallel universe version describe karo jahan sab ulta hai.
    Funny aur creative Hinglish mein. 
    Include: alternate weather, alternate Pranshu kya kar raha hai, alternate JARVIS kaisa hai.
    4-5 lines, imaginative aur specific.`)
    return NextResponse.json({ result: '🌌 Parallel Universe Report:\n\n' + res })
  }

  // 8. PERSONALITY DNA — quick personality analysis
  if (action === 'personality') {
    const answers = data?.answers || []
    const prompt = answers.length > 0 
      ? `Based on these responses: ${answers.join(', ')}`
      : 'Based on someone who uses AI assistant late at night, builds apps on mobile, lives in Rewa'
    const res = await groq(`${prompt}
    Ek fun personality DNA analysis do Hinglish mein.
    Batao: 3 strengths, 1 hidden superpower, 1 blind spot, aur ek life motto.
    Creative aur surprisingly accurate feel do.`, 400)
    return NextResponse.json({ result: '🧬 Personality DNA:\n\n' + res })
  }

  // 9. WHAT SONG ARE YOU — current mood to song
  if (action === 'song_mood') {
    const mood = data?.mood || 'focused'
    const res = await groq(`Mood: "${mood}". 
    3 songs suggest karo jo is mood ke liye perfect hain.
    Mix: 1 Hindi, 1 English, 1 wild card.
    Har song ke liye 1 line explain karo kyun.
    Format: 🎵 Song - Artist (reason)`)
    return NextResponse.json({ result: '🎵 Mood Playlist:\n\n' + res })
  }

  // 10. SECRET MESSAGE ENCODER
  if (action === 'encode') {
    const msg = data?.message || ''
    if (!msg) return NextResponse.json({ result: 'Message do encode karne ke liye!' })
    // Simple Caesar cipher + reverse
    const encoded = msg.split('').map((c: string) => {
      if (c >= 'a' && c <= 'z') return String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97)
      if (c >= 'A' && c <= 'Z') return String.fromCharCode(((c.charCodeAt(0) - 65 + 13) % 26) + 65)
      return c
    }).join('').split('').reverse().join('')
    return NextResponse.json({ 
      result: `🔐 Encoded Message:\n\n${encoded}\n\nDecode karne ke liye: "decode [message]" bolo`
    })
  }

  if (action === 'decode') {
    const msg = data?.message || ''
    const decoded = msg.split('').reverse().join('').split('').map((c: string) => {
      if (c >= 'a' && c <= 'z') return String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97)
      if (c >= 'A' && c <= 'Z') return String.fromCharCode(((c.charCodeAt(0) - 65 + 13) % 26) + 65)
      return c
    }).join('')
    return NextResponse.json({ result: `🔓 Decoded: ${decoded}` })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
