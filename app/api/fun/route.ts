// app/api/fun/route.ts
import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.1-8b-instant'

async function groq(prompt: string): Promise<string> {
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 400 })
  })
  const d = await r.json()
  return d.choices?.[0]?.message?.content || 'Kuch hua nahi yaar'
}

export async function POST(req: NextRequest) {
  const { action, data } = await req.json()

  // 1. ROAST MODE
  if (action === 'roast') {
    const name = data?.name || 'yaar'
    const topic = data?.topic || 'zindagi'
    const res = await groq(`Tu ek funny AI assistant hai. ${name} ko ${topic} ke baare mein light-hearted Hinglish mein roast karo. 3-4 lines, funny hona chahiye, dil pe mat lo wali vibe. No offensive stuff.`)
    return NextResponse.json({ result: res })
  }

  // 2. SHAYARI GENERATOR
  if (action === 'shayari') {
    const topic = data?.topic || 'dosti'
    const style = data?.style || 'romantic'
    const res = await groq(`Ek beautiful ${style} shayari likho ${topic} pe. Hindi/Urdu mein, 4 lines, dil ko chhu jaaye wali. Format: bas shayari, koi explanation nahi.`)
    return NextResponse.json({ result: res })
  }

  // 3. RAP GENERATOR
  if (action === 'rap') {
    const topic = data?.topic || 'JARVIS'
    const res = await groq(`Ek chhota Hindi rap banao ${topic} pe. 8 lines, rhyming honi chahiye, desi hip-hop vibe. Pranshu ke liye personal feel de.`)
    return NextResponse.json({ result: res })
  }

  // 4. MAGIC 8 BALL
  if (action === 'magic8') {
    const question = data?.question || 'kya hoga'
    const answers = [
      'Bilkul hoga! 🔥', 'Pakka nahi yaar 🤔', 'Haan bhai, 100% 💯',
      'Abhi nahi, thoda wait karo ⏳', 'Sapne mat dekh 😂', 'Signs achhe hain! ✨',
      'Mushkil lagta hai 😬', 'JARVIS kehta hai — kar de! 🚀',
      'Kal phir poochh 😴', 'Dil ki sun, dimag baad mein 💙'
    ]
    const ans = answers[Math.floor(Math.random() * answers.length)]
    return NextResponse.json({ result: `🎱 Magic 8 Ball says:\n\n"${question}" ke baare mein...\n\n👉 ${ans}` })
  }

  // 5. DARE / CHALLENGE
  if (action === 'dare') {
    const dares = [
      '10 pushups abhi karo! 💪', 'Kisi ek dost ko "Tu best hai" message bhejo',
      '1 minute mein 20 jumping jacks', 'Phone rakho, 15 min baad uthao',
      'Apni favourite memory likho JARVIS ko', 'Pani piyo — abhi 🥤',
      'Kuch naya seekhna start karo aaj se', '5 min meditation karo, phone band karo',
      'Ek naya skill Google karo jo seekhna chahte ho', 'Apni photo lo aur dekho — tu accha lagta hai!'
    ]
    const d2 = dares[Math.floor(Math.random() * dares.length)]
    return NextResponse.json({ result: `🎯 JARVIS Dare:\n\n${d2}\n\nKar sakta hai? 😏` })
  }

  // 6. RANDOM LIFE HACK
  if (action === 'lifehack') {
    const res = await groq('Ek genuinely useful, practical life hack do jo aaj se use kar sakein. Hinglish mein, 2-3 lines max, real tip honi chahiye.')
    return NextResponse.json({ result: '💡 Life Hack:\n\n' + res })
  }

  // 7. JOKE
  if (action === 'joke') {
    const res = await groq('Ek funny Hindi/Hinglish joke sunao. Clean, family-friendly, genuinely funny. Setup + punchline format.')
    return NextResponse.json({ result: '😂 ' + res })
  }

  // 8. MOTIVATIONAL (desi style)
  if (action === 'motivation') {
    const res = await groq('Ek desi style motivational quote do. Bilkul real lagni chahiye, bakwaas inspirational poster jaisi nahi. Pranshu ek developer hai jo Rewa mein mobile pe kaam karta hai. Uske liye specific.')
    return NextResponse.json({ result: '🔥 ' + res })
  }

  // 9. WHAT TO DO (boredom killer)
  if (action === 'bored') {
    const res = await groq('Pranshu bore ho raha hai Rewa mein. 5 creative, fun, free cheezein suggest karo jo abhi kar sake. Hinglish mein, realistic suggestions.')
    return NextResponse.json({ result: '🎲 ' + res })
  }

  // 10. TRUTH OR DARE (self-reflection)
  if (action === 'truth') {
    const questions = [
      'Teri zindagi mein ab tak ka sabse brave kaam kya tha?',
      'Ek cheez jo tu change karna chahta hai apne baare mein?',
      'Kiska call aaye toh sabse zyada khushi hogi?',
      'Aaj ek kaam jo tune avoid kiya — kyun?',
      'Teri ek secret talent kya hai?',
      'Agar kal last din hota toh kya karta?',
      '5 saal baad khud ko kahan dekhta hai?',
      'Ek cheez jiske liye grateful hai aaj?'
    ]
    const q = questions[Math.floor(Math.random() * questions.length)]
    return NextResponse.json({ result: `🤔 Truth Question:\n\n${q}\n\nSoch ke jawab de! 💭` })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
