// lib/india/notifications.ts
// Free Notification System:
// 1. Telegram Bot (100% free, instant, better than WhatsApp API)
// 2. Browser Push Notifications
// 3. WhatsApp Web link (no API needed)

// ─── Telegram Bot ─────────────────────────────────────────
const TELEGRAM_BOT = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID || '';

export async function sendTelegram(message: string, chatId?: string): Promise<boolean> {
  const chat = chatId || TELEGRAM_CHAT;
  if (!TELEGRAM_BOT || !chat) return false;
  
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      }),
      signal: AbortSignal.timeout(5000)
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function sendTelegramPhoto(photoUrl: string, caption: string, chatId?: string): Promise<boolean> {
  const chat = chatId || TELEGRAM_CHAT;
  if (!TELEGRAM_BOT || !chat) return false;
  
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, photo: photoUrl, caption, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(10000)
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

// Get bot info / verify setup
export async function getTelegramBotInfo(): Promise<any> {
  if (!TELEGRAM_BOT) return { error: 'TELEGRAM_BOT_TOKEN not set' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT}/getMe`);
    const data = await res.json();
    return data.ok ? data.result : { error: data.description };
  } catch {
    return { error: 'Telegram unavailable' };
  }
}

// ─── WhatsApp (Web link method — no API key needed) ───────
export function getWhatsAppLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '');
  const num = clean.startsWith('91') ? clean : '91' + clean;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export function getWhatsAppShareLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

// WhatsApp Business API (Twilio free sandbox)
// Note: Requires Twilio account — 3 months free sandbox
export async function sendWhatsAppTwilio(to: string, message: string): Promise<any> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio sandbox
  
  if (!accountSid || !authToken) {
    return {
      success: false,
      fallback: getWhatsAppLink(to, message),
      note: 'Twilio keys not set — use direct link instead'
    };
  }
  
  try {
    const toNum = to.replace(/\D/g, '');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: from,
          To: `whatsapp:+91${toNum}`,
          Body: message
        }),
        signal: AbortSignal.timeout(10000)
      }
    );
    const data = await res.json();
    return { success: !!data.sid, sid: data.sid, status: data.status };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── UPI Tracking (local only — privacy first) ───────────
export interface UPITransaction {
  id: string;
  amount: number;
  type: 'sent' | 'received';
  to_from: string;
  note?: string;
  date: number;
  category?: string;
}

const UPI_CATEGORIES = ['खाना', 'यात्रा', 'बिल', 'Shopping', 'Medical', 'EMI', 'Other'];

export function categorizeUPI(note: string, toFrom: string): string {
  const text = (note + ' ' + toFrom).toLowerCase();
  if (/food|zomato|swiggy|restaurant|खाना|dhaba/i.test(text)) return 'खाना';
  if (/ola|uber|petrol|fuel|auto|cab|यात्रा/i.test(text)) return 'यात्रा';
  if (/electricity|bill|water|बिजली|बिल/i.test(text)) return 'बिल';
  if (/amazon|flipkart|shop|mall|shopping/i.test(text)) return 'Shopping';
  if (/hospital|doctor|medical|medicine|दवा/i.test(text)) return 'Medical';
  if (/emi|loan|insurance|credit/i.test(text)) return 'EMI';
  return 'Other';
}

export function parseUPIMessage(smsText: string): Partial<UPITransaction> | null {
  // Parse UPI SMS notifications (common formats)
  const sent = smsText.match(/(?:sent|paid|debited)\s+Rs\.?\s*(\d+(?:\.\d+)?)/i);
  const received = smsText.match(/(?:received|credited)\s+Rs\.?\s*(\d+(?:\.\d+)?)/i);
  const to = smsText.match(/(?:to|To)\s+([A-Za-z\s]+?)(?:\s+on|\s+via|\.|$)/);
  const from = smsText.match(/(?:from|From)\s+([A-Za-z\s]+?)(?:\s+on|\s+via|\.|$)/);
  const refMatch = smsText.match(/(?:UPI Ref|Ref No|Transaction ID)[:\s]+(\w+)/i);
  
  if (!sent && !received) return null;
  
  return {
    amount: parseFloat((sent || received)![1]),
    type: sent ? 'sent' : 'received',
    to_from: (to || from)?.[1]?.trim() || 'Unknown',
    id: refMatch?.[1] || `upi_${Date.now()}`,
    date: Date.now(),
  };
}

// ─── Notification Setup Guide ─────────────────────────────
export const NOTIFICATION_SETUP = {
  telegram: {
    name: 'Telegram Bot (Recommended)',
    free: true,
    steps: [
      '1. Telegram app open करो',
      '2. @BotFather को message करो: /newbot',
      '3. Bot name और username set करो',
      '4. Bot token मिलेगा → .env.local में TELEGRAM_BOT_TOKEN डालो',
      '5. Bot को एक message भेजो',
      '6. https://api.telegram.org/bot{TOKEN}/getUpdates → chat_id copy करो',
      '7. .env.local में TELEGRAM_CHAT_ID डालो',
    ],
    why: 'WhatsApp API से बेहतर — instant, free, no approval needed'
  },
  whatsapp: {
    name: 'WhatsApp (Web Links)',
    free: true,
    steps: [
      '1. wa.me links automatically काम करते हैं',
      '2. No API key needed for basic sharing',
      '3. Twilio sandbox (optional): twilio.com → Free account',
    ],
    limitation: 'Full WhatsApp API के लिए Meta approval चाहिए (months)'
  },
  browser_push: {
    name: 'Browser Push Notifications',
    free: true,
    steps: [
      '1. Service Worker already installed है',
      '2. Settings → Notifications enable करो',
      '3. Browser notification permission allow करो',
    ],
    why: 'No setup needed — सबसे आसान'
  }
};
