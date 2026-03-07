# JARVIS — Mayur Edition 🎯
> GPS-aware Personal AI | Nadan, MP | NEET Student | 100% Free

## तुम्हारा JARVIS क्या करेगा

✅ **Location automatic track करेगा** — हर 3 min में GPS update  
✅ **घर पहुँचे तो बताएगा** — Nadan detect होगा automatically  
✅ **जहाँ हो वहाँ का weather, news, transport** — location-based सब  
✅ **NEET questions** — Biology/Physics/Chemistry expert mode  
✅ **Online storage** — Supabase में सब save, कहीं से access  
✅ **Train/Bus** — Maihar, Shahdol, Amarkantak से routes  
✅ **RTO, Municipal, Govt services** — Maihar/Shahdol area  
✅ **Telegram notifications** — Phone पर alert  

---

## ⚡ Setup — 5 Minutes

```bash
# 1. Project folder खोलो
npm install

# 2. .env.local बनाओ
cp .env.example .env.local

# 3. Minimum 2 keys डालो
NEXT_PUBLIC_GEMINI_API_KEY=...   # aistudio.google.com (free)
GROQ_API_KEY=...                 # console.groq.com (free)

# 4. Run करो
npm run dev
# Browser में: http://localhost:3000
```

---

## 📍 GPS Setup (Important!)

1. `npm run dev` → Browser में खोलो  
2. Address bar में **🔒 lock icon** click करो  
3. **Location → Allow** करो  
4. Chat page पर **🔄 button** click करो — GPS start  
5. **🏠 button** click करो — Nadan को घर set करो  

बस! अब JARVIS को हमेशा पता रहेगा तुम कहाँ हो।

---

## 🗄️ Online Storage (Supabase) — Optional

```
1. supabase.com → New project (free)
2. SQL Editor → scripts/db-setup.sql paste करो → Run
3. Settings → API → URL और anon key copy करो
4. .env.local में NEXT_PUBLIC_SUPABASE_URL और KEY डालो
```

बिना Supabase के भी काम करेगा (local only)।

---

## 📁 Files

```
app/
├── page.tsx              ← Chat (GPS always-on)
├── location/page.tsx     ← GPS Hub: Live, History, Places
├── dashboard/page.tsx    ← Home Dashboard
├── image-studio/         ← Image Generation
├── voice/                ← Voice Mode
├── india/                ← RTO + Transport + Govt
├── upi/                  ← Expense Tracker
└── api/jarvis/route.ts   ← Main Brain (all 39 tools + location)

lib/location/tracker.ts   ← GPS engine (new!)
lib/india/                ← RTO, Transport, Municipal
lib/brain/                ← Gemini + Groq + Router
lib/tools/                ← 39 tools
```

---

## 🧪 NEET Features (Ask Karke Dekho!)

```
"Mitochondria ka kya function hai?"
"Cell division mein anaphase explain karo"
"Newton ke 3 laws MCQ style mein do"
"Acid-base reaction ka formula"
"Digestive system ka diagram describe karo"
```

---

## 🚂 Nearby Transport

Maihar → Satna → Jabalpur → Delhi  
Amarkantak → Shahdol → Rewa  
Trains: Mahakoshal Express, Vindhyachal Express
