// app/api/study/route.ts — Study tools: Pomodoro, Flashcards, Quiz
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { action, data } = await req.json()

  if (action === 'daily_plan') {
    const { subjects, hours, goal } = data || {}
    const subList = (subjects || ['Physics','Chemistry','Biology']).join(', ')
    const hrs = hours || 8
    const prompt = `Create a detailed daily study plan for NEET/competitive exam student.
Subjects: ${subList}
Total hours: ${hrs}
Goal: ${goal || 'NEET 2025'}
Include: time slots, break schedule, revision time, sleep time.
Format as a clean schedule in Hindi/English mix.`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800
      })
    })
    const d = await groqRes.json()
    return NextResponse.json({ plan: d.choices?.[0]?.message?.content || 'Plan generate nahi ho saka' })
  }

  if (action === 'flashcard') {
    const { topic } = data || {}
    const prompt = `Create 5 flashcards for: ${topic || 'Cell Biology'}
Format as JSON array: [{"q":"question","a":"answer"}]
Keep answers concise, exam-focused.`
    
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600
      })
    })
    const d = await groqRes.json()
    const text = d.choices?.[0]?.message?.content || '[]'
    try {
      const cards = JSON.parse(text.match(/[[sS]*]/)?.[0] || '[]')
      return NextResponse.json({ flashcards: cards })
    } catch {
      return NextResponse.json({ flashcards: [], raw: text })
    }
  }

  if (action === 'quiz') {
    const { topic, count } = data || {}
    const prompt = `Create ${count || 5} MCQ questions for NEET on: ${topic || 'Photosynthesis'}
Format as JSON: [{"q":"question","options":["A","B","C","D"],"ans":"A","exp":"explanation"}]
Make questions exam-level.`
    
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 900
      })
    })
    const d = await groqRes.json()
    const text = d.choices?.[0]?.message?.content || '[]'
    try {
      const questions = JSON.parse(text.match(/[[sS]*]/)?.[0] || '[]')
      return NextResponse.json({ quiz: questions })
    } catch {
      return NextResponse.json({ quiz: [], raw: text })
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
