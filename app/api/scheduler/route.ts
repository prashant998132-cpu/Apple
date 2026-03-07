// app/api/scheduler/route.ts
// Lightweight Scheduler — Vercel compatible, no background daemon
// Trigger: GET /api/scheduler?task=daily_summary&secret=...
// Vercel Cron: add to vercel.json (free tier: 1 job/day)

import { NextRequest, NextResponse } from 'next/server';
import { sendTelegram } from '../../../lib/integrations/social';

const CRON_SECRET = process.env.CRON_SECRET || 'jarvis-cron-2025';

type ScheduledTask = 'daily_summary' | 'reminder_check' | 'status_ping';

// ── Daily summary ──────────────────────────────────────────
async function runDailySummary(): Promise<string> {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600000);
  const greeting = ist.getHours() < 12 ? 'Good Morning' : ist.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  const summary = `🤖 <b>JARVIS Daily Summary</b>
📅 ${ist.toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
⏰ ${greeting}, Mayur!

📚 <b>NEET Tip of the day:</b>
आज cell biology revise करो — NEET 2025 में हर साल 10-15 questions आते हैं!

🎯 <b>Study Target:</b>
• Biology: 30 min
• Chemistry: 30 min  
• Physics: 20 min
• Revision: 10 min

💪 You've got this! NEET 2025 🔥`;

  // Try to send via Telegram
  const tgResult = await sendTelegram({ text: summary });

  return tgResult.ok
    ? 'Daily summary sent via Telegram ✅'
    : tgResult.safeMode
    ? 'Telegram not configured — summary generated only'
    : `Summary ready (Telegram failed: ${tgResult.error})`;
}

// ── Status ping ────────────────────────────────────────────
async function runStatusPing(): Promise<string> {
  const providers = {
    gemini:     !!process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    groq:       !!process.env.GROQ_API_KEY,
    google_tts: !!process.env.GOOGLE_TTS_KEY,
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    supabase:   !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    telegram:   !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  };

  const active = Object.entries(providers).filter(([, v]) => v).map(([k]) => k);
  const missing = Object.entries(providers).filter(([, v]) => !v).map(([k]) => k);

  const msg = `🔧 <b>JARVIS Status Check</b>\n\n✅ Active: ${active.join(', ') || 'none'}\n❌ Missing: ${missing.join(', ') || 'none'}`;
  await sendTelegram({ text: msg }).catch(() => {});

  return `Status: ${active.length}/${Object.keys(providers).length} providers active`;
}

// ── Reminder check ─────────────────────────────────────────
async function runReminderCheck(): Promise<string> {
  // In production: query Supabase for pending reminders
  // For now: placeholder
  return 'Reminder check: no Supabase connection yet';
}

// ════════════════════════════════════════════════════════
// GET — Manual trigger or Vercel Cron
// ════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const secret = searchParams.get('secret');
  const task = (searchParams.get('task') || 'daily_summary') as ScheduledTask;

  // Security check
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const start = Date.now();
  let result = '';

  try {
    switch (task) {
      case 'daily_summary':  result = await runDailySummary();  break;
      case 'status_ping':    result = await runStatusPing();    break;
      case 'reminder_check': result = await runReminderCheck(); break;
      default: result = `Unknown task: ${task}`;
    }
  } catch (err) {
    result = `Task failed: ${String(err)}`;
  }

  return NextResponse.json({
    task, result, ms: Date.now() - start,
    ts: new Date().toISOString(),
  });
}

// ════════════════════════════════════════════════════════
// POST — Trigger from JARVIS chat
// ════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const { task = 'daily_summary', secret } = await req.json();
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return GET(new NextRequest(req.url + `?task=${task}&secret=${secret}`));
}
