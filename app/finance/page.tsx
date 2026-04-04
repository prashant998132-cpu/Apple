'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../../components/shared/Sidebar'

const C = {
  bg: '#030a14', surface: '#070e1c', border: 'rgba(255,255,255,0.07)',
  text: '#c8dff0', dim: '#3a5a7a', gold: '#ffd600', green: '#00e676',
  red: '#ff5252', blue: '#40c4ff', purple: '#b388ff',
}

const CATS = [
  { id: 'food',      icon: '🍕', label: 'Khaana',    color: '#ff7043' },
  { id: 'transport', icon: '🚗', label: 'Aana-Jana',  color: '#42a5f5' },
  { id: 'fun',       icon: '🎮', label: 'Masti',      color: '#ab47bc' },
  { id: 'bills',     icon: '💡', label: 'Bills',      color: '#ffa726' },
  { id: 'shop',      icon: '🛒', label: 'Shopping',   color: '#26c6da' },
  { id: 'health',    icon: '💊', label: 'Health',     color: '#66bb6a' },
  { id: 'study',     icon: '📚', label: 'Study',      color: '#5c6bc0' },
  { id: 'other',     icon: '💰', label: 'Other',      color: '#8d6e63' },
]

type Expense = { id: string; amount: number; cat: string; note: string; ts: number }
type Tab = 'add' | 'log' | 'stats'

function monthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}
function fmt(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function FinancePage() {
  const [sidebar, setSidebar] = useState(false)
  const [tab, setTab] = useState<Tab>('add')

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budget, setBudget] = useState(10000)
  const [budgetInput, setBudgetInput] = useState('')
  const [editingBudget, setEditingBudget] = useState(false)

  const [amount, setAmount] = useState('')
  const [cat, setCat] = useState('food')
  const [note, setNote] = useState('')

  const mk = monthKey()

  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem('j_expenses') || '[]')
      setExpenses(all)
      const b = Number(localStorage.getItem('j_budget') || 10000)
      setBudget(b)
      setBudgetInput(String(b))
    } catch {}
  }, [])

  function saveExpenses(list: Expense[]) {
    setExpenses(list)
    localStorage.setItem('j_expenses', JSON.stringify(list))
  }

  function addExpense() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    const entry: Expense = { id: Date.now().toString(), amount: amt, cat, note, ts: Date.now() }
    saveExpenses([entry, ...expenses])
    setAmount(''); setNote('')
  }

  function deleteExpense(id: string) {
    saveExpenses(expenses.filter(e => e.id !== id))
  }

  function saveBudget() {
    const b = parseFloat(budgetInput)
    if (!b || b <= 0) return
    setBudget(b)
    localStorage.setItem('j_budget', String(b))
    setEditingBudget(false)
  }

  // This month's expenses
  const thisMonth = expenses.filter(e => {
    const d = new Date(e.ts)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === mk
  })
  const totalSpent = thisMonth.reduce((a, e) => a + e.amount, 0)
  const remaining = budget - totalSpent
  const pct = Math.min(100, (totalSpent / budget) * 100)

  // Category breakdown
  const catTotals = CATS.map(c => ({
    ...c,
    total: thisMonth.filter(e => e.cat === c.id).reduce((a, e) => a + e.amount, 0),
    count: thisMonth.filter(e => e.cat === c.id).length,
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  const S = {
    card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 12 } as React.CSSProperties,
    label: { fontSize: 9, color: C.dim, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' as const },
    input: { width: '100%', padding: '9px 12px', borderRadius: 9, background: '#050b16', border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, fontFamily: "'Inter','Noto Sans Devanagari',sans-serif", paddingTop: 48, paddingBottom: 80 }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 48, background: 'rgba(3,10,20,.96)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 14px 0 58px', backdropFilter: 'blur(10px)', gap: 10 }}>
        <span style={{ fontSize: 13, color: C.gold, letterSpacing: 1, fontWeight: 700 }}>💰 FINANCE</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: remaining >= 0 ? C.green : C.red, fontWeight: 700 }}>
          {remaining >= 0 ? '✓' : '⚠'} ₹{Math.abs(remaining).toLocaleString('en-IN')} {remaining >= 0 ? 'bacha' : 'overspent'}
        </span>
      </header>

      <button onClick={() => setSidebar(true)} style={{ position: 'fixed', top: 10, left: 14, zIndex: 51, background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: 6, borderRadius: 6, fontSize: 18 }}>☰</button>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '12px 14px' }}>

        {/* Budget overview card */}
        <div style={{ ...S.card, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>IS MAHINE KA BUDGET</div>
              {editingBudget ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={budgetInput} onChange={e => setBudgetInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveBudget()} type="number" style={{ ...S.input, width: 120, fontSize: 16, fontWeight: 800 }} autoFocus />
                  <button onClick={saveBudget} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,214,0,.1)', border: `1px solid rgba(255,214,0,.3)`, color: C.gold, fontSize: 12, cursor: 'pointer' }}>✓</button>
                </div>
              ) : (
                <div onClick={() => setEditingBudget(true)} style={{ fontSize: 22, fontWeight: 800, color: C.text, cursor: 'pointer' }}>₹{budget.toLocaleString('en-IN')} ✎</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>KHARCH</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: pct > 90 ? C.red : pct > 70 ? C.gold : C.text }}>₹{totalSpent.toLocaleString('en-IN')}</div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,214,0,0.1)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct > 90 ? C.red : pct > 70 ? '#ff9800' : C.gold, borderRadius: 4, transition: 'width .4s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.dim }}>
            <span>{pct.toFixed(0)}% use ho gaya</span>
            <span>₹{Math.max(0, remaining).toLocaleString('en-IN')} bacha</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {([['add','➕ Add'],['log','📋 Log'],['stats','📊 Stats']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 11, cursor: 'pointer', background: tab === id ? 'rgba(255,214,0,.1)' : C.surface, border: `1px solid ${tab === id ? 'rgba(255,214,0,.3)' : C.border}`, color: tab === id ? C.gold : C.dim, fontWeight: tab === id ? 700 : 400 }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── ADD ── */}
        {tab === 'add' && (
          <div style={S.card}>
            <div style={S.label}>EXPENSE ADD KARO</div>
            {/* Amount */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 5 }}>AMOUNT (₹)</div>
              <input value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExpense()} placeholder="0" type="number" style={{ ...S.input, fontSize: 20, fontWeight: 700, color: C.gold }} autoFocus />
            </div>
            {/* Quick amounts */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[50,100,200,500,1000].map(n => (
                <button key={n} onClick={() => setAmount(String(n))} style={{ flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 11, cursor: 'pointer', background: amount === String(n) ? 'rgba(255,214,0,.1)' : 'transparent', border: `1px solid ${amount === String(n) ? 'rgba(255,214,0,.3)' : C.border}`, color: amount === String(n) ? C.gold : C.dim }}>
                  ₹{n}
                </button>
              ))}
            </div>
            {/* Category */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 5 }}>CATEGORY</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {CATS.map(c => (
                  <button key={c.id} onClick={() => setCat(c.id)} style={{ padding: '8px 0', borderRadius: 10, fontSize: 11, cursor: 'pointer', background: cat === c.id ? `${c.color}18` : 'transparent', border: `1px solid ${cat === c.id ? c.color + '44' : C.border}`, color: cat === c.id ? c.color : C.dim, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 18 }}>{c.icon}</span>
                    <span style={{ fontSize: 9 }}>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Note */}
            <div style={{ marginBottom: 12 }}>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional) — kahan kharcha?" style={S.input} />
            </div>
            <button onClick={addExpense} disabled={!amount || parseFloat(amount) <= 0} style={{ width: '100%', padding: '12px 0', borderRadius: 10, background: amount && parseFloat(amount) > 0 ? 'rgba(255,214,0,.15)' : 'transparent', border: `1px solid ${amount && parseFloat(amount) > 0 ? 'rgba(255,214,0,.4)' : C.border}`, color: amount && parseFloat(amount) > 0 ? C.gold : C.dim, fontSize: 14, fontWeight: 700, cursor: amount && parseFloat(amount) > 0 ? 'pointer' : 'default' }}>
              ✓ Add Expense
            </button>
          </div>
        )}

        {/* ── LOG ── */}
        {tab === 'log' && (
          <>
            {thisMonth.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.dim }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>💸</div>
                <div style={{ fontSize: 12 }}>Is mahine koi expense nahi add kiya</div>
              </div>
            ) : (
              <div style={S.card}>
                <div style={S.label}>IS MAHINE — {thisMonth.length} entries</div>
                {thisMonth.map((e, i) => {
                  const c = CATS.find(x => x.id === e.cat) || CATS[7]
                  return (
                    <div key={e.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: i < thisMonth.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${c.color}18`, border: `1px solid ${c.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{c.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>₹{e.amount.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: 10, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}{e.note ? ` · ${e.note}` : ''}</div>
                      </div>
                      <div style={{ fontSize: 9, color: C.dim, flexShrink: 0, textAlign: 'right' }}>
                        <div>{fmt(e.ts).split(',')[0]}</div>
                      </div>
                      <button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 13, padding: 4, flexShrink: 0 }}>✕</button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── STATS ── */}
        {tab === 'stats' && (
          <>
            {catTotals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.dim }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
                <div style={{ fontSize: 12 }}>Pehle expenses add karo</div>
              </div>
            ) : (
              <>
                {/* Category breakdown */}
                <div style={S.card}>
                  <div style={S.label}>CATEGORY BREAKDOWN</div>
                  {catTotals.map(c => (
                    <div key={c.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: C.text }}>{c.icon} {c.label} <span style={{ fontSize: 10, color: C.dim }}>({c.count}x)</span></span>
                        <span style={{ fontSize: 12, color: c.color, fontWeight: 700 }}>₹{c.total.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: `${c.color}18`, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(c.total/totalSpent)*100}%`, background: c.color, borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 9, color: C.dim, marginTop: 2, textAlign: 'right' }}>{((c.total/totalSpent)*100).toFixed(0)}% of total</div>
                    </div>
                  ))}
                </div>
                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Total Kharch', value: `₹${totalSpent.toLocaleString('en-IN')}`, color: C.text },
                    { label: 'Daily Average', value: `₹${(totalSpent/new Date().getDate()).toFixed(0)}`, color: C.gold },
                    { label: 'Budget Used', value: `${pct.toFixed(0)}%`, color: pct > 80 ? C.red : C.green },
                    { label: 'Transactions', value: String(thisMonth.length), color: C.blue },
                  ].map(s => (
                    <div key={s.label} style={{ ...S.card, marginBottom: 0, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

      </div>

      <Sidebar isOpen={sidebar} onClose={() => setSidebar(false)} />
    </div>
  )
}
