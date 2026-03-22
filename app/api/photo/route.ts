import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { imageBase64, question = 'Is image mein kya dikh raha hai? Hinglish mein batao.' } = await req.json()
  if (!imageBase64) return NextResponse.json({ error: 'No image' }, { status: 400 })

  // Groq vision
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageBase64 } },
            { type: 'text', text: question }
          ]
        }],
        max_tokens: 400
      })
    })
    const d = await r.json()
    const answer = d.choices?.[0]?.message?.content
    if (answer) return NextResponse.json({ answer })
  } catch {}

  // Gemini vision fallback
  try {
    const base64Data = imageBase64.split(',')[1] || imageBase64
    const mimeType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: base64Data } },
            { text: question }
          ]
        }]
      })
    })
    const d = await r.json()
    const answer = d.candidates?.[0]?.content?.parts?.[0]?.text
    if (answer) return NextResponse.json({ answer })
  } catch {}

  return NextResponse.json({ answer: 'Image samajh nahi aaya, phir try karo!' })
}
