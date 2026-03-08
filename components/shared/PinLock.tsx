'use client'
import { useState, useEffect, useCallback } from 'react'

// SHA-256 hash using Web Crypto API (browser built-in, no library needed)
async function sha256(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const PIN_KEY = 'jarvis_pin_hash'
const ATTEMPTS_KEY = 'jarvis_pin_attempts'
const LOCK_UNTIL_KEY = 'jarvis_pin_locked_until'
const MAX_ATTEMPTS = 5
const LOCK_DURATION = 5 * 60 * 1000 // 5 minutes

interface PinLockProps {
  onUnlock: () => void
}

export default function PinLock({ onUnlock }: PinLockProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    const att = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0')
    const lu = parseInt(localStorage.getItem(LOCK_UNTIL_KEY) || '0')
    setAttempts(att)
    setLockedUntil(lu)
  }, [])

  // Countdown timer when locked
  useEffect(() => {
    if (!lockedUntil) return
    const tick = () => {
      const left = Math.max(0, lockedUntil - Date.now())
      setTimeLeft(Math.ceil(left / 1000))
      if (left <= 0) {
        setLockedUntil(0)
        localStorage.removeItem(LOCK_UNTIL_KEY)
        localStorage.removeItem(ATTEMPTS_KEY)
        setAttempts(0)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lockedUntil])

  const tryUnlock = useCallback(async (p: string) => {
    if (lockedUntil && Date.now() < lockedUntil) return
    if (p.length !== 4) return

    const stored = localStorage.getItem(PIN_KEY)
    if (!stored) { onUnlock(); return }

    const hash = await sha256(p)
    if (hash === stored) {
      localStorage.removeItem(ATTEMPTS_KEY)
      localStorage.removeItem(LOCK_UNTIL_KEY)
      onUnlock()
    } else {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      localStorage.setItem(ATTEMPTS_KEY, String(newAttempts))

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockUntil = Date.now() + LOCK_DURATION
        setLockedUntil(lockUntil)
        localStorage.setItem(LOCK_UNTIL_KEY, String(lockUntil))
        setError('5 galat try. 5 min ke liye lock.')
      } else {
        setError(`Galat PIN. ${MAX_ATTEMPTS - newAttempts} try bacha.`)
      }

      setShake(true)
      setTimeout(() => setShake(false), 600)
      setPin('')
    }
  }, [attempts, lockedUntil, onUnlock])

  const handleKey = (k: string) => {
    if (lockedUntil && Date.now() < lockedUntil) return
    if (k === '⌫') {
      setPin(p => p.slice(0, -1))
      setError('')
    } else if (pin.length < 4) {
      const newPin = pin + k
      setPin(newPin)
      setError('')
      if (newPin.length === 4) tryUnlock(newPin)
    }
  }

  const isLocked = lockedUntil > 0 && Date.now() < lockedUntil

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(160deg, #020917 0%, #040d20 60%, #071020 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>⬡</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#00e5ff', letterSpacing: 6 }}>JARVIS</div>
        <div style={{ fontSize: 12, color: '#1e3a50', marginTop: 4, letterSpacing: 2 }}>LOCKED</div>
      </div>

      {/* PIN dots */}
      <div style={{
        display: 'flex', gap: 16, marginBottom: 12,
        animation: shake ? 'shake 0.4s ease' : 'none',
      }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: '50%',
            background: i < pin.length ? '#00e5ff' : 'transparent',
            border: `2px solid ${i < pin.length ? '#00e5ff' : 'rgba(0,229,255,.3)'}`,
            transition: 'all 0.15s',
            boxShadow: i < pin.length ? '0 0 8px #00e5ff88' : 'none',
          }}/>
        ))}
      </div>

      {/* Error / Lock message */}
      <div style={{ height: 20, marginBottom: 20, fontSize: 12, color: isLocked ? '#ffa000' : '#ef5350', textAlign: 'center' }}>
        {isLocked ? `🔐 ${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,'0')} mein unlock hoga` : error}
      </div>

      {/* Keypad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 10 }}>
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
          k === '' ? <div key={i}/> :
          <button key={i} onClick={() => handleKey(k)}
            disabled={isLocked}
            style={{
              width: 72, height: 72, borderRadius: 18,
              background: k === '⌫' ? 'rgba(239,83,80,.1)' : 'rgba(0,229,255,.05)',
              border: `1.5px solid ${k === '⌫' ? 'rgba(239,83,80,.25)' : 'rgba(0,229,255,.15)'}`,
              color: k === '⌫' ? '#ef5350' : '#e8f4ff',
              fontSize: k === '⌫' ? 22 : 24, fontWeight: 600,
              cursor: isLocked ? 'not-allowed' : 'pointer',
              opacity: isLocked ? 0.4 : 1,
              transition: 'all .15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >{k}</button>
        ))}
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  )
}

// ── PIN Management (for Settings page) ────────────────────
export async function setPIN(newPin: string): Promise<void> {
  if (!newPin || newPin.length !== 4) throw new Error('PIN must be 4 digits')
  const hash = await sha256(newPin)
  localStorage.setItem(PIN_KEY, hash)
}

export function isPINEnabled(): boolean {
  return !!localStorage.getItem(PIN_KEY)
}

export function clearPIN(): void {
  localStorage.removeItem(PIN_KEY)
  localStorage.removeItem(ATTEMPTS_KEY)
  localStorage.removeItem(LOCK_UNTIL_KEY)
}

export async function verifyPIN(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_KEY)
  if (!stored) return true
  const hash = await sha256(pin)
  return hash === stored
}
