'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type Expense = { id: string; amount: number; category: string; note: string; date: string; type: 'expense'|'income' }
const CATS = [
  { name: 'Food',       icon: '🍔', color: '#f87171' },
  { name: 'Transport',  icon: '🚗', color: '#60a5fa' },
  { name: 'Shopping',   icon: '🛍️', color: '#f9a8d4' },
  { name: 'Bills',      icon: '💡', color: '#fbbf24' },
  { name: 'Health',     icon: '💊', color: '#34d399' },
  { name: 'Fun',        icon: '🎮', color: '#a78bfa' },
  { name: 'Education',  icon: '📚', color: '#60a5fa' },
  { name: 'Other',      icon: '📦', color: '#94a3b8' },
]
const KEY = 'jarvis_finance_v1'
function uid() { return Date.now().toString(36) }
function load(): Expense[] { try { return JSON.parse(localStorage.getItem(KEY)||'[]') } catch { return [] } }
function save(e: Expense[]) { try { localStorage.setItem(KEY, JSON.stringify(e)) } catch {} }
function today() { return new Date().toISOString().slice(0,10) }

export default function FinancePage() {
  const [items, setItems] = useState<Expense[]>([])
  const [amount, setAmount] = useState('')
  const [cat, setCat] = useState('Food')
  const [note, setNote] = useState('')
  const [type, setType] = useState<'expense'|'income'>('expense')
  const [period, setPeriod] = useState<'today'|'week'|'month'>('month')
  const [tab, setTab] = useState<'add'|'stats'|'history'>('add')

  useEffect(() => { setItems(load()) }, [])

  function addItem() {
    if (!amount || parseFloat(amount) <= 0) return
    const item: Expense = { id: uid(), amount: parseFloat(amount), category: cat, note, date: today(), type }
    const updated = [item, ...items]; setItems(updated); save(updated)
    setAmount(''); setNote('')
  }

  function deleteItem(id: string) {
    const updated = items.filter(i => i.id !== id); setItems(updated); save(updated)
  }

  const filtered = items.filter(i => {
    const d = new Date(i.date); const now = new Date()
    if (period === 'today') return i.date === today()
    if (period === 'week') { const w = new Date(); w.setDate(w.getDate()-7); return d >= w }
    const m = new Date(); m.setDate(1); m.setHours(0,0,0,0); return d >= m
  })

  const totalExp = filtered.filter(i => i.type === 'expense').reduce((s,i) => s+i.amount, 0)
  const totalInc = filtered.filter(i => i.type === 'income').reduce((s,i) => s+i.amount, 0)
  const balance = totalInc - totalExp

  const catBreakdown = CATS.map(c => ({
    ...c,
    total: filtered.filter(i => i.category === c.name && i.type === 'expense').reduce((s,i) => s+i.amount, 0)
  })).filter(c => c.total > 0).sort((a,b) => b.total - a.total)

  const maxCat = catBreakdown[0]?.total || 1

  return (
    <div style={{ minHeight: '100vh', background: '#070d1a', color: '#ddeeff', fontFamily: "'Inter', sans-serif", padding: '0 0 80px' }}>
      <style>{`* { box-sizing: border-box } @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }`}</style>

      <div style={{ background: 'rgba(7,13,26,0.97)', borderBottom: '1px solid rgba(0,229,255,0.07)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)' }}>
        <Link href="/" style={{ color: '#2a5070', fontSize: '18px', textDecoration: 'none' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fbbf24' }}>💰 Finance</div>
          <div style={{ fontSize: '11px', color: balance >= 0 ? '#34d399' : '#f87171' }}>Balance: ₹{Math.abs(balance).toLocaleString('en-IN')} {balance >= 0 ? '▲' : '▼'}</div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['today','week','month'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ background: period === p ? 'rgba(251,191,36,0.12)' : 'none', border: `1px solid ${period === p ? 'rgba(251,191,36,0.3)' : 'transparent'}`, borderRadius: '6px', color: period === p ? '#fbbf24' : '#2a5070', cursor: 'pointer', padding: '4px 7px', fontSize: '10px', fontFamily: 'inherit', fontWeight: period === p ? 700 : 400 }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '14px' }}>
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          {[
            { l: 'Income', v: totalInc, c: '#34d399', i: '📈' },
            { l: 'Expense', v: totalExp, c: '#f87171', i: '📉' },
            { l: 'Balance', v: Math.abs(balance), c: balance >= 0 ? '#34d399' : '#f87171', i: balance >= 0 ? '✅' : '⚠️' },
          ].map(s => (
            <div key={s.l} style={{ background: 'rgba(12,20,34,0.8)', border: `1px solid ${s.c}18`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>{s.i}</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: s.c }}>₹{s.v.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: '9px', color: '#1e3248', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(12,20,34,0.7)', borderRadius: '10px', padding: '4px', marginBottom: '14px' }}>
          {(['add','stats','history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 'none', background: tab === t ? 'rgba(251,191,36,0.1)' : 'transparent', color: tab === t ? '#fbbf24' : '#2a5070', fontSize: '11px', fontWeight: tab === t ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
              {t === 'add' ? '+ Add' : t === 'stats' ? '📊 Stats' : '📋 History'}
            </button>
          ))}
        </div>

        {tab === 'add' && (
          <div style={{ animation: 'fadeUp 0.15s ease' }}>
            <div style={{ background: 'rgba(12,20,34,0.9)', border: '1px solid rgba(251,191,36,0.1)', borderRadius: '14px', padding: '16px' }}>
              {/* Type */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                {(['expense','income'] as const).map(t => (
                  <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${type === t ? (t==='expense'?'rgba(248,113,113,0.4)':'rgba(52,211,153,0.4)'):'rgba(255,255,255,0.06)'}`, background: type === t ? (t==='expense'?'rgba(248,113,113,0.1)':'rgba(52,211,153,0.1)') : 'none', color: type === t ? (t==='expense'?'#f87171':'#34d399') : '#4a7090', cursor: 'pointer', fontSize: '13px', fontWeight: type === t ? 700 : 400, fontFamily: 'inherit', transition: 'all 0.12s' }}>
                    {t === 'expense' ? '📉 Expense' : '📈 Income'}
                  </button>
                ))}
              </div>
              {/* Amount */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px' }}>
                <span style={{ fontSize: '18px', color: '#fbbf24', fontWeight: 700 }}>₹</span>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" onKeyDown={e => e.key === 'Enter' && addItem()}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#ddeeff', fontSize: '24px', fontWeight: 800, fontFamily: 'inherit' }} />
              </div>
              {/* Category */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px', marginBottom: '12px' }}>
                {CATS.map(c => (
                  <button key={c.name} onClick={() => setCat(c.name)} style={{ background: cat === c.name ? `${c.color}18` : 'rgba(0,229,255,0.03)', border: `1px solid ${cat === c.name ? c.color+'44' : 'rgba(0,229,255,0.07)'}`, borderRadius: '8px', cursor: 'pointer', padding: '7px 4px', fontSize: '10px', color: cat === c.name ? c.color : '#4a7090', transition: 'all 0.12s', fontFamily: 'inherit', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', marginBottom: '2px' }}>{c.icon}</div>
                    {c.name}
                  </button>
                ))}
              </div>
              {/* Note */}
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)..." onKeyDown={e => e.key === 'Enter' && addItem()}
                style={{ width: '100%', background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '8px', color: '#ddeeff', padding: '9px 12px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', marginBottom: '12px' }} />
              <button onClick={addItem} disabled={!amount || parseFloat(amount) <= 0}
                style={{ width: '100%', background: amount && parseFloat(amount) > 0 ? 'linear-gradient(135deg, #0055cc, #00c8ff)' : 'rgba(0,229,255,0.04)', border: 'none', borderRadius: '10px', color: amount && parseFloat(amount) > 0 ? '#000' : '#1e3248', cursor: amount ? 'pointer' : 'not-allowed', padding: '12px', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                Add {type === 'expense' ? 'Expense' : 'Income'}
              </button>
            </div>
          </div>
        )}

        {tab === 'stats' && (
          <div style={{ animation: 'fadeUp 0.15s ease' }}>
            <div style={{ background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.07)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#2a5070', marginBottom: '14px', fontWeight: 600 }}>SPENDING BY CATEGORY</div>
              {catBreakdown.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#1e3248', textAlign: 'center', padding: '20px' }}>Koi data nahi</div>
              ) : catBreakdown.map(c => (
                <div key={c.name} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#7ca5c0' }}>{c.icon} {c.name}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: c.color }}>₹{c.total.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '6px' }}>
                    <div style={{ height: '100%', background: c.color, borderRadius: '4px', width: (c.total/totalExp*100)+'%', transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: '#1e3248', marginTop: '2px' }}>{Math.round(c.total/totalExp*100)}% of total</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div style={{ animation: 'fadeUp 0.15s ease' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#1e3248', padding: '40px', fontSize: '14px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>💰</div>
                Koi transaction nahi
              </div>
            ) : filtered.slice(0, 30).map(item => {
              const c = CATS.find(c => c.name === item.category) || CATS[CATS.length-1]
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', marginBottom: '6px', background: 'rgba(12,20,34,0.8)', border: '1px solid rgba(0,229,255,0.04)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '20px', width: '28px', textAlign: 'center', flexShrink: 0 }}>{c.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: '#c8dff0' }}>{item.note || item.category}</div>
                    <div style={{ fontSize: '10px', color: '#1e3248' }}>{item.category} · {item.date}</div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: item.type === 'income' ? '#34d399' : '#f87171', flexShrink: 0 }}>
                    {item.type === 'income' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
                  </div>
                  <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', color: '#1e3248', cursor: 'pointer', fontSize: '12px', padding: '3px', flexShrink: 0, fontFamily: 'inherit' }}>✕</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
