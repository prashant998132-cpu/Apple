'use client'
// ThinkBlock — shows <think>...</think> content with toggle
import { useState } from 'react'

interface Props { thinking: string; answer: string }

export default function ThinkBlock({ thinking, answer }: Props) {
  const [open, setOpen] = useState(false)
  const lines = thinking.trim().split('\n').length

  return (
    <div style={{ fontFamily: "'Inter','Noto Sans Devanagari',sans-serif" }}>
      {/* Think toggle */}
      <button onClick={() => setOpen(p => !p)} style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        background: open ? 'rgba(167,139,250,.1)' : 'rgba(167,139,250,.05)',
        border: '1px solid rgba(167,139,250,.2)', borderRadius: 20,
        padding: '5px 12px', cursor: 'pointer', color: '#a78bfa', fontSize: 12,
      }}>
        <span style={{ animation: open ? 'none' : 'spin 2s linear infinite', display: 'inline-block' }}>🧠</span>
        <span>{open ? 'Soch chhupao' : `Soch dikhao (${lines} lines)`}</span>
        <span style={{ opacity: .6 }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Think content */}
      {open && (
        <div style={{
          background: 'rgba(167,139,250,.05)', border: '1px solid rgba(167,139,250,.15)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 12,
          borderLeft: '3px solid #a78bfa',
        }}>
          <div style={{ fontSize: 10, color: '#a78bfa', marginBottom: 6, letterSpacing: 1 }}>
            JARVIS KI SOCH (DeepSeek R1)
          </div>
          <pre style={{
            fontSize: 12, color: '#6b7280', lineHeight: 1.6, whiteSpace: 'pre-wrap',
            wordBreak: 'break-word', margin: 0, fontFamily: 'inherit',
          }}>
            {thinking}
          </pre>
        </div>
      )}

      {/* Final answer */}
      <div style={{ fontSize: 15, color: '#e8f4ff', lineHeight: 1.7 }}>
        {answer}
      </div>
    </div>
  )
}
