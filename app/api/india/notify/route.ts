// app/api/india/notify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendTelegram, sendWhatsAppTwilio, getWhatsAppLink, getTelegramBotInfo } from '../../../../lib/india/notifications';

export async function POST(req: NextRequest) {
  const { type, message, phone, chatId } = await req.json();

  if (type === 'telegram') {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({
        sent: false,
        note: 'TELEGRAM_BOT_TOKEN set नहीं है। BotFather से token लो।',
        setup_guide: 'Settings → Notifications tab देखो'
      });
    }
    const sent = await sendTelegram(message, chatId);
    return NextResponse.json({ sent, message });
  }

  if (type === 'whatsapp_link') {
    const link = getWhatsAppLink(phone, message);
    return NextResponse.json({ link, note: 'Link opens WhatsApp directly' });
  }

  if (type === 'whatsapp_api') {
    const result = await sendWhatsAppTwilio(phone, message);
    return NextResponse.json(result);
  }

  if (type === 'bot_info') {
    const info = await getTelegramBotInfo();
    return NextResponse.json(info);
  }

  return NextResponse.json({ error: 'type required: telegram | whatsapp_link | whatsapp_api | bot_info' }, { status: 400 });
}

export async function GET() {
  const telegramSet = !!process.env.TELEGRAM_BOT_TOKEN;
  const twilioSet = !!process.env.TWILIO_ACCOUNT_SID;
  return NextResponse.json({
    telegram: telegramSet ? '✅ configured' : '❌ not set',
    twilio_whatsapp: twilioSet ? '✅ configured' : '❌ not set',
    whatsapp_links: '✅ always available (no key needed)',
    browser_push: '✅ via service worker',
  });
}
