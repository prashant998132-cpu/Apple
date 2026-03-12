// app/api/telegram/route.ts — JARVIS Telegram Bot
// Setup: BotFather se bot banao → token lo → Vercel env TELEGRAM_BOT_TOKEN set karo
// Webhook set: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://apple-lemon-zeta.vercel.app/api/telegram

import { NextRequest, NextResponse } from 'next/server'
import { orchestrate } from '../../../lib/core/orchestrator'

export const runtime = 'nodejs'
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const ALLOWED_CHAT = process.env.TELEGRAM_ALLOWED_CHAT || '' // your personal chat ID — leave blank = allow all

async function sendTelegram(chatId: number, text: string) {
  if (!BOT_TOKEN) return
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4096), // Telegram limit
      parse_mode: 'Markdown',
    }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const msg = body?.message
    if (!msg) return NextResponse.json({ ok: true })

    const chatId = msg.chat?.id
    const text   = msg.text || ''
    const from   = msg.from?.first_name || 'Boss'

    // Security: only allow your personal chat if TELEGRAM_ALLOWED_CHAT is set
    if (ALLOWED_CHAT && String(chatId) !== ALLOWED_CHAT) {
      await sendTelegram(chatId, '❌ Unauthorized. Yeh JARVIS personal hai.')
      return NextResponse.json({ ok: true })
    }

    if (!BOT_TOKEN) return NextResponse.json({ ok: false, error: 'No bot token' })

    // /start command
    if (text === '/start') {
      await sendTelegram(chatId, `🤖 *JARVIS Online*\n\nNamaste ${from}! Main tumhara personal AI assistant hoon.\n\nAb tum mujhse seedha Telegram pe baat kar sakte ho. Kuch bhi puchho — main jawab dunga.\n\n_Commands:_\n/status — JARVIS status\n/help — help`)
      return NextResponse.json({ ok: true })
    }

    // /status command
    if (text === '/status') {
      await sendTelegram(chatId, `🟢 *JARVIS Status*\n\n✅ Online\n⚡ API: Active\n🕐 IST: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n🔋 Server: Vercel Edge`)
      return NextResponse.json({ ok: true })
    }

    // /help command
    if (text === '/help') {
      await sendTelegram(chatId, `🤖 *JARVIS Help*\n\nMujhse kuch bhi puchh sakte ho:\n• Mausam, news, cricket\n• Math, code, recipes\n• Reminders, goals\n• "WiFi on karo" (MacroDroid se)\n\n_Bas seedha likh do — main samjh jaunga_`)
      return NextResponse.json({ ok: true })
    }

    // Typing indicator
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    })

    // Pass to JARVIS orchestrator
    const result = await orchestrate({
      message: text,
      userId: `telegram_${chatId}`,
      chatId: `tg_${chatId}`,
      history: [],
      baseUrl: 'https://apple-lemon-zeta.vercel.app',
      chatMode: 'flash',
      userName: from,
      memoryPrompt: `You are JARVIS, ${from} ka personal AI. Telegram pe short, crisp replies do. Markdown use karo. Hinglish preferred.`,
    })

    await sendTelegram(chatId, result.reply || '❌ Kuch error aaya, dobara try karo.')
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Telegram webhook error:', e)
    return NextResponse.json({ ok: false, error: e.message })
  }
}

// GET — webhook verify + setup instructions
export async function GET() {
  return NextResponse.json({
    status: 'JARVIS Telegram Bot active',
    setup: {
      step1: 'BotFather se /newbot karo → token lo',
      step2: 'Vercel env mein TELEGRAM_BOT_TOKEN set karo',
      step3: 'Optional: TELEGRAM_ALLOWED_CHAT = your chat ID (security)',
      step4: `Webhook set karo: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://apple-lemon-zeta.vercel.app/api/telegram`,
    },
  })
}
