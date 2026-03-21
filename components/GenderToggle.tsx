'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const LunaOverlay = dynamic(() => import('./LunaOverlay'), { ssr: false })

export default function GenderToggle() {
  const [lunaMode, setLunaMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Remember last mode
    const saved = localStorage.getItem('jarvis_mode')
    if (saved === 'luna') setLunaMode(true)
  }, [])

  function toggle() {
    const next = !lunaMode
    setLunaMode(next)
    localStorage.setItem('jarvis_mode', next ? 'luna' : 'jarvis')
    // Stop TTS when switching
    if (next === false && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  if (!mounted) return null

  return (
    <>
      {/* LUNA full overlay */}
      {lunaMode && <LunaOverlay onClose={toggle} />}

      {/* Floating toggle — always visible */}
      {!lunaMode && (
        <button
          onClick={toggle}
          style={{
            position: 'fixed',
            bottom: '88px',
            right: '14px',
            zIndex: 9998,
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            color: 'white',
            border: 'none',
            borderRadius: '22px',
            padding: '9px 16px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(236,72,153,0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'monospace',
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          🌸 Girl Mode
        </button>
      )}
    </>
  )
}
