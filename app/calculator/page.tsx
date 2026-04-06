'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'

type HistItem = { expr: string; result: string; ts: number }

const BTN_ROWS = [
  ['AC','⌫','%','÷'],
  ['7','8','9','×'],
  ['4','5','6','−'],
  ['1','2','3','+'],
  ['±','0','.','='],
]

const SCI_ROW = ['sin','cos','tan','log','ln','√','x²','π','e','(',')','^']

function evaluate(expr: string): string {
  try {
    let e = expr
      .replace(/×/g, '*').replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/sin\(/g, 'Math.sin(').replace(/cos\(/g, 'Math.cos(').replace(/tan\(/g, 'Math.tan(')
      .replace(/log\(/g, 'Math.log10(').replace(/ln\(/g, 'Math.log(')
      .replace(/√\(/g, 'Math.sqrt(')
      .replace(/π/g, 'Math.PI').replace(/e/g, 'Math.E')
      .replace(/\^/g, '**')
    // x² pattern
    e = e.replace(/(\d+(?:\.\d+)?|\))\s*²/g, '($1)**2')
    if (!e.trim()) return '0'
    const result = new Function('return (' + e + ')')()
    if (typeof result !== 'number' || !isFinite(result)) return 'Error'
    return parseFloat(result.toFixed(10)).toString()
  } catch { return 'Error' }
}

export default function CalculatorPage() {
  const [display, setDisplay] = useState('0')
  const [expr, setExpr] = useState('')
  const [history, setHistory] = useState<HistItem[]>([])
  const [sciMode, setSciMode] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const press = useCallback((val: string) => {
    if (val === 'AC') { setDisplay('0'); setExpr(''); setLastResult(null); return }
    if (val === '⌫') {
      if (expr.length <= 1) { setExpr(''); setDisplay('0') }
      else { const ne = expr.slice(0,-1); setExpr(ne); setDisplay(ne || '0') }
      return
    }
    if (val === '=') {
      if (!expr) return
      const result = evaluate(expr)
      setHistory(h => [{ expr, result, ts: Date.now() }, ...h.slice(0,19)])
      setLastResult(result)
      setDisplay(result)
      setExpr(result === 'Error' ? '' : result)
      return
    }
    if (val === '±') { const n = parseFloat(display); if (!isNaN(n)) { const s = (-n).toString(); setDisplay(s); setExpr(s) }; return }
    if (val === '%') {
      const result = evaluate(expr + '/100')
      setDisplay(result); setExpr(result); return
    }
    // Scientific functions that need open paren
    if (['sin','cos','tan','log','ln','√'].includes(val)) {
      const ne = expr + val + '('; setExpr(ne); setDisplay(ne); return
    }
    if (val === 'x²') { const ne = expr + '²'; setExpr(ne); setDisplay(ne); return }
    if (val === 'π') { const ne = expr + 'π'; setExpr(ne); setDisplay(ne); return }
    if (val === 'e') { const ne = expr + 'e'; setExpr(ne); setDisplay(ne); return }

    // Auto-clear if just showed a result and pressing digit
    const isDigit = /\d/.test(val) || val === '.'
    let base = expr
    if (lastResult && isDigit) { base = ''; setLastResult(null) }
    
    const ne = (base === '' && isDigit && val !== '.') ? val : base + val
    setExpr(ne); setDisplay(ne)
  }, [expr, display, lastResult])

  function fromHistory(item: HistItem) {
    setExpr(item.result); setDisplay(item.result); setShowHistory(false)
  }

  const isOp = (v: string) => ['÷','×','−','+','^'].includes(v)
  const isAction = (v: string) => ['='].includes(v)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "'Inter', 'Space Mono', sans-serif", padding: '0 0 80px' }}>
      <style>{`* { box-sizing: border-box } @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} } .calc-btn:active { transform: scale(0.94); }`}</style>

      <div style={{ background: 'rgba(8,13,24,0.95)', borderBottom: '1px solid rgba(0,229,255,0.07)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/" style={{ color: '#2a5070', fontSize: '18px', textDecoration: 'none' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#ddeeff' }}>🔢 Calculator</div>
          <div style={{ fontSize: '11px', color: '#2a5070' }}>Scientific mode</div>
        </div>
        <button onClick={() => setSciMode(v => !v)} style={{ background: sciMode ? 'rgba(0,229,255,0.1)' : 'rgba(0,229,255,0.04)', border: '1px solid', borderColor: sciMode ? 'rgba(0,229,255,0.3)' : 'rgba(0,229,255,0.08)', borderRadius: '7px', color: sciMode ? '#00e5ff' : '#2a5070', cursor: 'pointer', padding: '5px 10px', fontSize: '12px', fontFamily: 'inherit' }}>Sci</button>
        <button onClick={() => setShowHistory(v => !v)} style={{ background: showHistory ? 'rgba(167,139,250,0.1)' : 'rgba(0,229,255,0.04)', border: '1px solid', borderColor: showHistory ? 'rgba(167,139,250,0.3)' : 'rgba(0,229,255,0.08)', borderRadius: '7px', color: showHistory ? '#a78bfa' : '#2a5070', cursor: 'pointer', padding: '5px 10px', fontSize: '12px', fontFamily: 'inherit' }}>History</button>
      </div>

      <div style={{ maxWidth: '400px', margin: '0 auto', padding: '16px' }}>
        {/* Display */}
        <div style={{ background: 'rgba(4,8,14,0.9)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '16px', padding: '20px 20px 16px', marginBottom: '12px', animation: 'fadeUp 0.2s ease', minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          {lastResult && expr === lastResult && <div style={{ fontSize: '12px', color: '#1e3248', textAlign: 'right', marginBottom: '4px', fontFamily: "'Space Mono', monospace" }}>= {lastResult}</div>}
          <div style={{ fontSize: expr.length > 16 ? '18px' : expr.length > 10 ? '24px' : '36px', fontWeight: 700, color: '#ddeeff', textAlign: 'right', letterSpacing: '-0.5px', fontFamily: "'Space Mono', monospace", wordBreak: 'break-all', lineHeight: 1.2 }}>
            {display || '0'}
          </div>
        </div>

        {/* History panel */}
        {showHistory && (
          <div style={{ background: 'rgba(12,20,34,0.9)', border: '1px solid rgba(167,139,250,0.1)', borderRadius: '12px', padding: '12px', marginBottom: '12px', maxHeight: '200px', overflowY: 'auto' }}>
            {history.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#1e3248', textAlign: 'center', padding: '12px' }}>No history yet</div>
            ) : history.map((h, i) => (
              <button key={i} onClick={() => fromHistory(h)}
                style={{ width: '100%', background: 'none', border: 'none', borderBottom: i < history.length-1 ? '1px solid rgba(255,255,255,0.03)' : 'none', padding: '7px 0', cursor: 'pointer', textAlign: 'right', fontFamily: "'Space Mono', monospace" }}>
                <div style={{ fontSize: '11px', color: '#2a5070' }}>{h.expr}</div>
                <div style={{ fontSize: '15px', color: '#00e5ff', fontWeight: 700 }}>= {h.result}</div>
              </button>
            ))}
            {history.length > 0 && <button onClick={() => setHistory([])} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '11px', width: '100%', textAlign: 'center', marginTop: '6px', fontFamily: 'inherit' }}>Clear history</button>}
          </div>
        )}

        {/* Scientific buttons */}
        {sciMode && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', marginBottom: '8px' }}>
            {SCI_ROW.map(btn => (
              <button key={btn} className="calc-btn" onClick={() => press(btn)}
                style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: '8px', color: '#a78bfa', cursor: 'pointer', padding: '9px 2px', fontSize: '11px', fontWeight: 600, transition: 'all 0.1s', fontFamily: "'Space Mono', monospace" }}>
                {btn}
              </button>
            ))}
          </div>
        )}

        {/* Main buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {BTN_ROWS.flat().map((btn, i) => {
            const isEq = btn === '='
            const isOpr = isOp(btn) || isEq
            const isAC = btn === 'AC' || btn === '⌫'
            return (
              <button key={i} className="calc-btn" onClick={() => press(btn)}
                style={{
                  background: isEq ? 'linear-gradient(135deg, #0055cc, #00c8ff)' : isOpr ? 'rgba(0,229,255,0.1)' : isAC ? 'rgba(248,113,113,0.08)' : 'rgba(12,20,34,0.9)',
                  border: '1px solid', borderColor: isEq ? 'rgba(0,229,255,0.3)' : isOpr ? 'rgba(0,229,255,0.15)' : isAC ? 'rgba(248,113,113,0.15)' : 'rgba(0,229,255,0.07)',
                  borderRadius: '12px', color: isEq ? '#000' : isOpr ? '#00e5ff' : isAC ? '#f87171' : '#ddeeff',
                  cursor: 'pointer', padding: '18px 0', fontSize: '18px', fontWeight: isEq ? 800 : 500,
                  transition: 'all 0.1s', fontFamily: "'Space Mono', monospace",
                }}>
                {btn}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
