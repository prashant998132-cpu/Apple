'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
function fmt(n: string) { return parseInt(n).toLocaleString('en-IN') }

interface BoxProps { title: string; color: string; children?: React.ReactNode; }
function Box({ title, color, children }: BoxProps) {
  return (
    <div style={{ background: 'rgba(255,255,255,.03)', border: `1px solid ${color}33`, borderRadius: 14, padding: '14px', marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function NumInput({ label, value, set }: { label: string; value: string; set: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: '#4a7090', marginBottom: 3 }}>{label}</div>
      <input type="number" value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#e8f4ff', fontSize: 13, boxSizing: 'border-box' as const }} />
    </div>
  )
}

function CalcBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} style={{ width: '100%', padding: '9px', borderRadius: 9, background: 'rgba(0,229,255,.1)', border: '1px solid rgba(0,229,255,.3)', color: '#00e5ff', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>Calculate â¡</button>
}

function ResultCard({ rows, color }: { rows: [string, string][]; color: string }) {
  return (
    <div style={{ background: `${color}11`, border: `1px solid ${color}33`, borderRadius: 10, padding: '8px 12px' }}>
      {rows.map(([k, v], i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
          <span style={{ fontSize: 11, color: '#4a7090' }}>{k}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color }}>{v}</span>
        </div>
      ))}
    </div>
  )
}

function SIPCalc() {
  const [p, setP] = useState('10000'); const [r, setR] = useState('12'); const [n, setN] = useState('10')
  const [res, setRes] = useState<[string, string][] | null>(null)
  const calc = () => {
    const monthly = parseFloat(r) / 100 / 12, months = parseFloat(n) * 12
    const maturity = parseFloat(p) * ((Math.pow(1 + monthly, months) - 1) / monthly) * (1 + monthly)
    const invested = parseFloat(p) * months
    setRes([['Invested', `â¹${fmt(invested.toFixed(0))}`], ['Maturity Value', `â¹${fmt(maturity.toFixed(0))}`], ['Total Gain', `â¹${fmt((maturity - invested).toFixed(0))}`]])
  }
  return <Box title="ð SIP Calculator" color="#00e5ff"><NumInput label="Monthly Investment (â¹)" value={p} set={setP}/><NumInput label="Expected Return (%/yr)" value={r} set={setR}/><NumInput label="Time Period (years)" value={n} set={setN}/><CalcBtn onClick={calc}/>{res && <ResultCard rows={res} color="#00e5ff"/>}</Box>
}

function EMICalc() {
  const [p, setP] = useState('500000'); const [r, setR] = useState('8.5'); const [n, setN] = useState('5')
  const [res, setRes] = useState<[string, string][] | null>(null)
  const calc = () => {
    const monthly = parseFloat(r) / 100 / 12, months = parseFloat(n) * 12
    const emi = parseFloat(p) * monthly * Math.pow(1 + monthly, months) / (Math.pow(1 + monthly, months) - 1)
    const total = emi * months
    setRes([['Monthly EMI', `â¹${fmt(emi.toFixed(0))}`], ['Total Payment', `â¹${fmt(total.toFixed(0))}`], ['Total Interest', `â¹${fmt((total - parseFloat(p)).toFixed(0))}`]])
  }
  return <Box title="ð  EMI Calculator" color="#a78bfa"><NumInput label="Loan Amount (â¹)" value={p} set={setP}/><NumInput label="Interest Rate (%/yr)" value={r} set={setR}/><NumInput label="Tenure (years)" value={n} set={setN}/><CalcBtn onClick={calc}/>{res && <ResultCard rows={res} color="#a78bfa"/>}</Box>
}

function GSTCalc() {
  const [amount, setAmount] = useState('1000'); const [rate, setRate] = useState('18')
  const [type, setType] = useState<'ex' | 'in'>('ex')
  const [res, setRes] = useState<[string, string][] | null>(null)
  const calc = () => {
    const a = parseFloat(amount), r = parseFloat(rate) / 100
    const base = type === 'ex' ? a : a / (1 + r)
    const gst = base * r
    setRes([['Base Price', `â¹${(base).toFixed(2)}`], [`CGST (${rate}/2%)`, `â¹${(gst / 2).toFixed(2)}`], [`SGST (${rate}/2%)`, `â¹${(gst / 2).toFixed(2)}`], ['Total', `â¹${(base + gst).toFixed(2)}`]])
  }
  return (
    <Box title="ð§¾ GST Calculator" color="#00e676">
      <NumInput label="Amount (â¹)" value={amount} set={setAmount}/>
      <NumInput label="GST Rate (%)" value={rate} set={setRate}/>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {(['ex', 'in'] as const).map(t => (
          <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: '7px', borderRadius: 8, border: `1px solid ${type === t ? '#00e676' : 'rgba(255,255,255,.1)'}`, background: type === t ? 'rgba(0,230,118,.12)' : 'transparent', color: type === t ? '#00e676' : '#4a7090', cursor: 'pointer', fontSize: 11 }}>
            {t === 'ex' ? 'Exclusive (add GST)' : 'Inclusive (extract GST)'}
          </button>
        ))}
      </div>
      <CalcBtn onClick={calc}/>{res && <ResultCard rows={res} color="#00e676"/>}
    </Box>
  )
}

function BMICalc() {
  const [h, setH] = useState('170'); const [w, setW] = useState('65')
  const [res, setRes] = useState<[string, string][] | null>(null)
  const calc = () => {
    const bmi = parseFloat(w) / Math.pow(parseFloat(h) / 100, 2)
    const cat = bmi < 18.5 ? 'Underweight ð¡' : bmi < 25 ? 'Normal â' : bmi < 30 ? 'Overweight ð ' : 'Obese ð´'
    const hm = parseFloat(h) / 100
    setRes([['BMI', bmi.toFixed(1)], ['Category', cat], ['Ideal Weight', `${(18.5 * hm * hm).toFixed(0)}â${(24.9 * hm * hm).toFixed(0)} kg`]])
  }
  return <Box title="âï¸ BMI Calculator" color="#ffd600"><NumInput label="Height (cm)" value={h} set={setH}/><NumInput label="Weight (kg)" value={w} set={setW}/><CalcBtn onClick={calc}/>{res && <ResultCard rows={res} color="#ffd600"/>}</Box>
}

function ElecCalc() {
  const [watt, setWatt] = useState('1000'); const [hrs, setHrs] = useState('8'); const [days, setDays] = useState('30'); const [rate, setRate] = useState('6')
  const [res, setRes] = useState<[string, string][] | null>(null)
  const calc = () => {
    const units = parseFloat(watt) / 1000 * parseFloat(hrs) * parseFloat(days)
    setRes([['Units Used', `${units.toFixed(2)} kWh`], ['Est. Bill', `â¹${(units * parseFloat(rate)).toFixed(0)}`]])
  }
  return <Box title="â¡ Electricity Bill" color="#ffa000"><NumInput label="Power (Watts)" value={watt} set={setWatt}/><NumInput label="Hours/Day" value={hrs} set={setHrs}/><NumInput label="Days" value={days} set={setDays}/><NumInput label="Rate (â¹/unit)" value={rate} set={setRate}/><CalcBtn onClick={calc}/>{res && <ResultCard rows={res} color="#ffa000"/>}</Box>
}

function PctCalc() {
  const [a, setA] = useState('80'); const [b, setB] = useState('120')
  const [res, setRes] = useState<[string, string][] | null>(null)
  const calc = () => {
    const av = parseFloat(a), bv = parseFloat(b)
    setRes([[`${a}% of ${b}`, (bv * av / 100).toFixed(2)], [`${a} is __% of ${b}`, `${(av / bv * 100).toFixed(2)}%`], ['% change AâB', `${((bv - av) / av * 100).toFixed(2)}%`]])
  }
  return <Box title="ð¯ Percentage" color="#26c6da"><NumInput label="Value A" value={a} set={setA}/><NumInput label="Value B" value={b} set={setB}/><CalcBtn onClick={calc}/>{res && <ResultCard rows={res} color="#26c6da"/>}</Box>
}

function AgeCalc() {
  const [dob, setDob] = useState('2000-01-01')
  const [res, setRes] = useState<[string, string][] | null>(null)
  const calc = () => {
    const birth = new Date(dob), now = new Date()
    let yrs = now.getFullYear() - birth.getFullYear()
    let mo = now.getMonth() - birth.getMonth()
    let d = now.getDate() - birth.getDate()
    if (d < 0) { mo--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate() }
    if (mo < 0) { yrs--; mo += 12 }
    const totalDays = Math.floor((now.getTime() - birth.getTime()) / 86400000)
    const next = new Date(now.getFullYear(), birth.getMonth(), birth.getDate())
    if (next <= now) next.setFullYear(now.getFullYear() + 1)
    const nextDays = Math.ceil((next.getTime() - now.getTime()) / 86400000)
    setRes([[' Age', `${yrs} yrs ${mo} mo ${d} days`], ['Total Days', totalDays.toLocaleString()], ['Next Birthday', `${nextDays} days`]])
  }
  return (
    <Box title="ð Age Calculator" color="#f06292">
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: '#4a7090', marginBottom: 3 }}>Date of Birth</div>
        <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#e8f4ff', fontSize: 13, boxSizing: 'border-box' as const }} />
      </div>
      <CalcBtn onClick={calc}/>{res && <ResultCard rows={res} color="#f06292"/>}
    </Box>
  )
}

function UnitCalc() {
  type CatKey = 'Length' | 'Weight' | 'Temperature'
  const cats: Record<CatKey, Record<string, number>> = {
    Length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, inch: 0.0254, ft: 0.3048, mile: 1609.34 },
    Weight: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, ton: 1000 },
    Temperature: { C: 1, F: 1, K: 1 },
  }
  const [cat, setCat] = useState<CatKey>('Length')
  const [from, setFrom] = useState('m'); const [to, setTo] = useState('km'); const [val, setVal] = useState('1'); const [res, setRes] = useState('')
  const convert = () => {
    const v = parseFloat(val)
    if (cat === 'Temperature') {
      const c: number = from === 'C' ? v : from === 'F' ? (v - 32) * 5 / 9 : v - 273.15
      const out = to === 'C' ? c : to === 'F' ? c * 9 / 5 + 32 : c + 273.15
      setRes(out.toFixed(4))
    } else {
      const catMap: Record<string,number> = cats[cat as CatKey];
      setRes(((v * catMap[from]) / catMap[to]).toFixed(6))
    }
  }
  const units = Object.keys(cats[cat as CatKey])
  return (
    <Box title="ð Unit Converter" color="#4fc3f7">
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' as const }}>
        {(Object.keys(cats) as CatKey[]).map(c => (
          <button key={c} onClick={() => { setCat(c); setFrom(Object.keys(cats[c])[0]); setTo(Object.keys(cats[c])[1]); setRes('') }}
            style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${cat === c ? '#4fc3f7' : 'rgba(255,255,255,.1)'}`, background: cat === c ? 'rgba(79,195,247,.12)' : 'transparent', color: cat === c ? '#4fc3f7' : '#4a7090', cursor: 'pointer', fontSize: 11 }}>
            {c}
          </button>
        ))}
      </div>
      <NumInput label="Value" value={val} set={setVal}/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        {(['from', 'to'] as const).map(dir => (
          <div key={dir}>
            <div style={{ fontSize: 10, color: '#4a7090', marginBottom: 3 }}>{dir === 'from' ? 'From' : 'To'}</div>
            <select value={dir === 'from' ? from : to} onChange={e => dir === 'from' ? setFrom(e.target.value) : setTo(e.target.value)}
              style={{ width: '100%', padding: '7px', borderRadius: 7, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#e8f4ff', fontSize: 12 }}>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        ))}
      </div>
      <CalcBtn onClick={convert}/>
      {res && <ResultCard rows={[[`${val} ${from}`, `${res} ${to}`]]} color="#4fc3f7"/>}
    </Box>
  )
}

const TABS = [
  { id: 'sip', label: 'SIP', icon: 'ð' }, { id: 'emi', label: 'EMI', icon: 'ð ' },
  { id: 'gst', label: 'GST', icon: 'ð§¾' }, { id: 'bmi', label: 'BMI', icon: 'âï¸' },
  { id: 'elec', label: 'Bill', icon: 'â¡' }, { id: 'pct', label: '%', icon: 'ð¯' },
  { id: 'age', label: 'Age', icon: 'ð' }, { id: 'unit', label: 'Convert', icon: 'ð' },
]

export default function ToolsPage() {
  const [tab, setTab] = useState('sip')
  const router = useRouter()
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#090d18', color: '#e8f4ff', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid rgba(0,229,255,.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#4a7090', fontSize: 20, cursor: 'pointer', padding: 2 }}>â</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#00e5ff', letterSpacing: 2 }}>TOOLS</div>
          <div style={{ fontSize: 10, color: '#1e3a50' }}>8 India Calculators Â· 100% Offline</div>
        </div>
      </div>
      <div style={{ display: 'flex', overflowX: 'auto' as const, padding: '8px 10px 0', gap: 6, borderBottom: '1px solid rgba(0,229,255,.06)', flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 9, border: `1px solid ${tab === t.id ? 'rgba(0,229,255,.35)' : 'rgba(255,255,255,.07)'}`, background: tab === t.id ? 'rgba(0,229,255,.1)' : 'transparent', color: tab === t.id ? '#00e5ff' : '#4a7090', fontSize: 11, cursor: 'pointer', fontWeight: tab === t.id ? 600 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 13 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' as const, padding: '12px 14px' }}>
        {tab === 'sip'  && <SIPCalc />}
        {tab === 'emi'  && <EMICalc />}
        {tab === 'gst'  && <GSTCalc />}
        {tab === 'bmi'  && <BMICalc />}
        {tab === 'elec' && <ElecCalc />}
        {tab === 'pct'  && <PctCalc />}
        {tab === 'age'  && <AgeCalc />}
        {tab === 'unit' && <UnitCalc />}
      </div>
    </div>
  )
}
