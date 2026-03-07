'use client';
// app/india/page.tsx — India Hub: RTO + Transport + Municipal + Notifications
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'rto' | 'transport' | 'municipal' | 'notify';

const TABS = [
  { id: 'rto', label: '🚗 RTO', icon: '🚗' },
  { id: 'transport', label: '🚂 Transport', icon: '🚂' },
  { id: 'municipal', label: '🏛️ Govt', icon: '🏛️' },
  { id: 'notify', label: '🔔 Notify', icon: '🔔' },
];

// ─── RTO Tab ──────────────────────────────────────────────
function RTOTab() {
  const [reg, setReg] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    if (!reg.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/india/rto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration: reg })
      });
      setResult(await res.json());
    } catch { setResult({ error: 'Lookup failed' }); }
    setLoading(false);
  };

  return (
    <div>
      <div style={S.label}>🚗 Vehicle Registration Lookup</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={reg} onChange={e => setReg(e.target.value.toUpperCase())} placeholder="MP20AB1234" style={S.input}
          onKeyDown={e => e.key === 'Enter' && lookup()} />
        <button onClick={lookup} disabled={loading || !reg.trim()} style={S.btn}>{loading ? '...' : '🔍'}</button>
      </div>
      {result && !result.error && (
        <div style={S.resultCard}>
          <Row label="Registration" value={result.registration} />
          <Row label="State" value={result.state} />
          <Row label="RTO" value={result.rto} />
          {result.make && <Row label="Make/Model" value={`${result.make} ${result.model || ''}`} />}
          {result.color && <Row label="Color" value={result.color} />}
          {result.fuel && <Row label="Fuel" value={result.fuel} />}
          {result.registrationDate && <Row label="Reg. Date" value={result.registrationDate} />}
          {result.validity && <Row label="Valid Until" value={result.validity} />}
          {result.insurance && <Row label="Insurance" value={result.insurance} />}
          {result.status && <Row label="Status" value={result.status} />}
        </div>
      )}
      {result?.error && <div style={{ color: '#ff4444', fontSize: 13 }}>⚠️ {result.error}</div>}

      <div style={{ marginTop: 16 }}>
        <div style={S.label}>Quick Links</div>
        {[
          { label: '💰 Challan Check', url: 'https://echallan.parivahan.gov.in/index/accused-challan' },
          { label: '🪪 DL Verify', url: 'https://sarathi.parivahan.gov.in/sarathiservice/dlSearchGridDetail.do' },
          { label: '🚗 RC Verify', url: 'https://vahan.parivahan.gov.in/vahanservice/' },
          { label: '🏍️ PUCC Certificate', url: 'https://vahan.parivahan.gov.in/puccservice/' },
        ].map(l => (
          <a key={l.label} href={l.url} target="_blank" rel="noreferrer" style={S.linkRow}>{l.label} →</a>
        ))}
      </div>
    </div>
  );
}

// ─── Transport Tab ────────────────────────────────────────
function TransportTab() {
  const [from, setFrom] = useState('Rewa');
  const [to, setTo] = useState('');
  const [type, setType] = useState<'train' | 'bus' | 'flight'>('train');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!to.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/india/transport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, type })
      });
      setResult(await res.json());
    } catch { setResult({ error: 'Search failed' }); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['train', 'bus', 'flight'] as const).map(t => (
          <button key={t} onClick={() => setType(t)} style={{ ...S.typeBtn, ...(type === t ? S.typeBtnActive : {}) }}>
            {t === 'train' ? '🚂' : t === 'bus' ? '🚌' : '✈️'} {t}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={from} onChange={e => setFrom(e.target.value)} placeholder="From" style={{ ...S.input, flex: 1 }} />
        <input value={to} onChange={e => setTo(e.target.value)} placeholder="To" style={{ ...S.input, flex: 1 }}
          onKeyDown={e => e.key === 'Enter' && search()} />
        <button onClick={search} disabled={loading || !to.trim()} style={S.btn}>{loading ? '...' : '🔍'}</button>
      </div>

      {result && (
        <div>
          {result.trains?.map((t: any, i: number) => (
            <div key={i} style={S.trainCard}>
              <div style={{ color: '#00e5ff', fontWeight: 600, fontSize: 13 }}>{t.name}</div>
              <div style={{ color: '#4a7096', fontSize: 11 }}>#{t.number} | {t.days}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 13 }}>🕐 {t.departs}</span>
                <span style={{ color: '#4a7096', fontSize: 11 }}>→</span>
                <span style={{ fontSize: 13 }}>🕐 {t.arrives}</span>
              </div>
              <div style={{ color: '#4a7096', fontSize: 11, marginTop: 4 }}>{t.class}</div>
            </div>
          ))}
          {result.route && (
            <div style={S.trainCard}>
              <div style={{ color: '#e8f4ff' }}>{result.route.destination}</div>
              <div style={{ color: '#00e5ff' }}>{result.route.fare_approx} | {result.route.duration}</div>
              <div style={{ color: '#4a7096', fontSize: 11 }}>{result.route.frequency}</div>
            </div>
          )}
          {result.book_link && (
            <a href={result.book_link} target="_blank" rel="noreferrer" style={S.bookBtn}>🎫 Book on IRCTC →</a>
          )}
          {result.book_online && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <a href={result.book_online.redbus} target="_blank" rel="noreferrer" style={S.bookBtn}>🔴 redBus</a>
              <a href={result.book_online.abhibus} target="_blank" rel="noreferrer" style={S.bookBtn}>🚌 AbhiBus</a>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={S.label}>Rewa Trains — Quick</div>
        {[
          { name: 'Mahakoshal (Mumbai)', num: '12189', dep: '06:10' },
          { name: 'Shridham (Delhi)', num: '12191', dep: '14:30' },
          { name: 'Lucknow Express', num: '12429', dep: '23:45' },
          { name: 'Jabalpur Express', num: '11755', dep: '07:15' },
        ].map(t => (
          <div key={t.num} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,229,255,.06)', fontSize: 13 }}>
            <span style={{ color: '#e8f4ff' }}>{t.name}</span>
            <span style={{ color: '#00e5ff' }}>{t.dep}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Municipal/Govt Tab ───────────────────────────────────
function MunicipalTab() {
  const SERVICES = [
    { icon: '💧', name: 'जल बिल', url: 'https://mpwrd.gov.in/', phone: '07662-230013' },
    { icon: '🏠', name: 'संपत्ति कर', url: 'https://www.mpenagarpalika.gov.in/', phone: '07662-230013' },
    { icon: '⚡', name: 'बिजली बिल', url: 'https://mpez.co.in/', phone: '1912' },
    { icon: '📜', name: 'Birth Certificate', url: 'https://mpenagarpalika.gov.in/', phone: '07662-230013' },
    { icon: '🗂️', name: 'E-District (Caste/Income)', url: 'https://mpedistrict.gov.in/', phone: '0755-2700800' },
    { icon: '📋', name: 'Ration Card', url: 'https://rationmitra.nic.in/', phone: '181' },
    { icon: '🌾', name: 'PM Kisan Status', url: 'https://pmkisan.gov.in/', phone: '' },
    { icon: '💰', name: 'Sambal Yojana', url: 'https://sambal.mp.gov.in/', phone: '181' },
    { icon: '🎓', name: 'MP Scholarship', url: 'https://scholarshipportal.mp.nic.in/', phone: '0755-2550762' },
    { icon: '👶', name: 'Ladli Laxmi', url: 'https://ladlilaxmi.mp.gov.in/', phone: '07552-550340' },
    { icon: '📱', name: 'DigiLocker', url: 'https://digilocker.gov.in/', phone: '1800-3000-3468' },
    { icon: '💼', name: 'Udyam Registration', url: 'https://udyamregistration.gov.in/', phone: '' },
  ];

  return (
    <div>
      <div style={{ background: 'rgba(255,171,0,.08)', border: '1px solid rgba(255,171,0,.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: '#ffab00' }}>
        📞 CM Helpline: <strong>181</strong> (24/7 free) | Nagar Palika: <strong>07662-230013</strong>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {SERVICES.map(s => (
          <a key={s.name} href={s.url} target="_blank" rel="noreferrer" style={S.serviceCard}>
            <span style={{ fontSize: 24 }}>{s.icon}</span>
            <span style={{ fontSize: 12, color: '#e8f4ff', marginTop: 4, textAlign: 'center' as const }}>{s.name}</span>
            {s.phone && <span style={{ fontSize: 10, color: '#4a7096' }}>{s.phone}</span>}
          </a>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={S.label}>Emergency Numbers</div>
        {[['🚨 Police', '100'], ['🔥 Fire', '101'], ['🚑 Ambulance', '108'], ['👩 Women', '1091'], ['⚡ Bijli', '1912'], ['📞 CM Helpline', '181']].map(([k, v]) => (
          <a key={k} href={`tel:${v}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#060f22', borderRadius: 8, marginBottom: 6, textDecoration: 'none' }}>
            <span style={{ fontSize: 13, color: '#e8f4ff' }}>{k}</span>
            <span style={{ fontSize: 14, color: '#00e5ff', fontWeight: 700 }}>{v}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────
function NotifyTab() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [telegramMsg, setTelegramMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');

  const sendTelegram = async () => {
    if (!telegramMsg.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/india/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'telegram', message: telegramMsg })
      });
      const data = await res.json();
      setResult(data.sent ? '✅ Telegram message sent!' : '⚠️ ' + (data.note || 'Failed'));
    } catch { setResult('⚠️ Error'); }
    setSending(false);
  };

  const getWhatsAppLink = () => {
    const clean = phone.replace(/\D/g, '');
    const num = clean.startsWith('91') ? clean : '91' + clean;
    return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div>
      {/* Telegram */}
      <div style={S.notifyCard}>
        <div style={{ fontSize: 14, color: '#00e5ff', fontWeight: 600, marginBottom: 8 }}>📨 Telegram Bot</div>
        <textarea value={telegramMsg} onChange={e => setTelegramMsg(e.target.value)}
          placeholder="JARVIS से message भेजो..." style={{ ...S.input, height: 80, resize: 'none' as const }} />
        <button onClick={sendTelegram} disabled={sending || !telegramMsg.trim()} style={{ ...S.btn, width: '100%', marginTop: 8 }}>
          {sending ? '...' : '📨 Send via Telegram'}
        </button>
        {result && <div style={{ fontSize: 12, marginTop: 8, color: result.includes('✅') ? '#00e676' : '#ff4444' }}>{result}</div>}
        <div style={{ fontSize: 11, color: '#2a5070', marginTop: 8 }}>Setup: BotFather → New Bot → Token .env में डालो</div>
      </div>

      {/* WhatsApp */}
      <div style={S.notifyCard}>
        <div style={{ fontSize: 14, color: '#25d366', fontWeight: 600, marginBottom: 8 }}>💬 WhatsApp Link</div>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone: 9876543210" style={S.input} />
        <textarea value={message} onChange={e => setMessage(e.target.value)}
          placeholder="Message लिखो..." style={{ ...S.input, height: 60, resize: 'none' as const, marginTop: 8 }} />
        <a href={phone && message ? getWhatsAppLink() : '#'} target="_blank" rel="noreferrer"
          style={{ ...S.btn, display: 'block', textAlign: 'center' as const, marginTop: 8, textDecoration: 'none', opacity: phone && message ? 1 : 0.4, background: '#25d366', color: '#fff' }}>
          💬 WhatsApp में खोलो
        </a>
        <div style={{ fontSize: 11, color: '#2a5070', marginTop: 8 }}>No API needed — directly WhatsApp opens</div>
      </div>

      {/* Setup Guide */}
      <div style={S.notifyCard}>
        <div style={{ fontSize: 13, color: '#e8f4ff', fontWeight: 600, marginBottom: 10 }}>🔧 Telegram Bot Setup</div>
        {[
          '1. Telegram में @BotFather को message करो',
          '2. /newbot command भेजो',
          '3. Bot name + username set करो',
          '4. Token मिलेगा → .env.local में TELEGRAM_BOT_TOKEN डालो',
          '5. Bot को एक message भेजो',
          '6. Browser में खोलो: api.telegram.org/bot{TOKEN}/getUpdates',
          '7. chat_id copy करो → TELEGRAM_CHAT_ID डालो',
          '8. Done! JARVIS Telegram पर message भेज सकेगा',
        ].map((step, i) => (
          <div key={i} style={{ fontSize: 12, color: '#4a7096', padding: '4px 0' }}>{step}</div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────
export default function IndiaHubPage() {
  const [tab, setTab] = useState<Tab>('rto');
  const router = useRouter();

  return (
    <div style={S.app}>
      <div style={S.grid} />
      {/* Header */}
      <header style={S.header}>
        <button onClick={() => router.back()} style={S.back}>←</button>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, color: '#00e5ff', letterSpacing: 2 }}>INDIA HUB</div>
        <div style={{ width: 32 }} />
      </header>

      {/* Tabs */}
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)} style={{ ...S.tabBtn, ...(tab === t.id ? S.tabActive : {}) }}>
            {t.icon}<br /><span style={{ fontSize: 10 }}>{t.label.split(' ').slice(1).join(' ')}</span>
          </button>
        ))}
      </div>

      <main style={S.main}>
        {tab === 'rto' && <RTOTab />}
        {tab === 'transport' && <TransportTab />}
        {tab === 'municipal' && <MunicipalTab />}
        {tab === 'notify' && <NotifyTab />}
        <div style={{ height: 40 }} />
      </main>
    </div>
  );
}

// Shared helpers
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,229,255,.06)', fontSize: 13 }}>
      <span style={{ color: '#4a7096' }}>{label}</span>
      <span style={{ color: '#e8f4ff', maxWidth: '60%', textAlign: 'right' as const }}>{value}</span>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  app: { position: 'fixed', inset: 0, background: '#020917', color: '#e8f4ff', display: 'flex', flexDirection: 'column', fontFamily: "'Noto Sans Devanagari','Segoe UI',sans-serif" },
  grid: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,229,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.03) 1px,transparent 1px)', backgroundSize: '40px 40px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(0,229,255,.1)', zIndex: 10, flexShrink: 0 },
  back: { width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(0,229,255,.15)', background: '#060f22', color: '#4a7096', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  tabs: { display: 'flex', borderBottom: '1px solid rgba(0,229,255,.1)', flexShrink: 0 },
  tabBtn: { flex: 1, padding: '10px 4px', background: 'transparent', color: '#4a7096', fontSize: 18, cursor: 'pointer', borderBottom: '2px solid transparent', transition: 'color .2s' },
  tabActive: { color: '#00e5ff', borderBottom: '2px solid #00e5ff' },
  main: { flex: 1, overflowY: 'auto', padding: '14px 14px 0', position: 'relative', zIndex: 1 },
  label: { fontSize: 11, color: '#4a7096', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8, marginTop: 4 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,229,255,.12)', background: '#0a1628', color: '#e8f4ff', fontSize: 14, outline: 'none', fontFamily: 'inherit' },
  btn: { padding: '10px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#00e5ff,#0090a8)', color: '#020917', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', flexShrink: 0 },
  resultCard: { padding: '12px 14px', background: '#060f22', border: '1px solid rgba(0,229,255,.15)', borderRadius: 12, marginBottom: 12 },
  linkRow: { display: 'block', padding: '10px 12px', background: '#060f22', border: '1px solid rgba(0,229,255,.08)', borderRadius: 10, marginBottom: 6, color: '#00e5ff', textDecoration: 'none', fontSize: 13 },
  typeBtn: { flex: 1, padding: '8px', borderRadius: 10, border: '1px solid rgba(0,229,255,.1)', background: '#060f22', color: '#4a7096', fontSize: 12, cursor: 'pointer' },
  typeBtnActive: { border: '1px solid #00e5ff', color: '#00e5ff', background: 'rgba(0,229,255,.06)' },
  trainCard: { padding: '10px 12px', background: '#060f22', border: '1px solid rgba(0,229,255,.08)', borderRadius: 10, marginBottom: 8 },
  bookBtn: { display: 'inline-block', marginTop: 10, padding: '8px 16px', borderRadius: 10, background: 'rgba(0,229,255,.1)', border: '1px solid rgba(0,229,255,.3)', color: '#00e5ff', textDecoration: 'none', fontSize: 13 },
  serviceCard: { padding: '14px 8px', borderRadius: 12, border: '1px solid rgba(0,229,255,.1)', background: '#060f22', display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', gap: 4 },
  notifyCard: { padding: '14px', background: '#060f22', border: '1px solid rgba(0,229,255,.1)', borderRadius: 12, marginBottom: 12 },
};
