'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Script from 'next/script'
import Sidebar from '../components/shared/Sidebar'
import { initProactiveScheduler } from '../lib/proactive'
import { awardXP } from '../lib/xp'

type Role = 'user' | 'assistant'
type ChatMode = 'auto' | 'flash' | 'think' | 'deep'
type Msg = {
  id: string; role: Role; content: string; provider?: string
  thinking?: string; imageUrl?: string; videoUrl?: string
  ts: number; reactions?: string[]; bookmarked?: boolean
}

const STORE = 'j_msgs_v5'
const MSTORE = 'j_mode_v4'
const MEMSTORE = 'j_auto_mem_v1'   // auto-extracted memory facts

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }
function genPass() {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  return Array.from({ length: 18 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}

function dateLabel(ts: number): string {
  const d = new Date(ts); const t = new Date()
  if (d.toDateString() === t.toDateString()) return 'Today'
  const y = new Date(); y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() !== t.getFullYear() ? 'numeric' : undefined })
}

function timeStr(ts: number) {
  return new Date(ts).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// Smart context-aware suggestions based on BOTH AI response + user query
function getSmartSuggestions(aiReply: string, userQuery: string): string[] {
  const r = aiReply.toLowerCase()
  const q = userQuery.toLowerCase()

  // Code-related
  if (/```|function|class|def |const |var |import |async |await /.test(r))
    return ['Explain line by line', 'Optimize karo', 'Test cases do', 'Edge cases kya hain?']

  // Math / formula
  if (/equation|formula|integral|derivative|theorem|proof|solve|calculate/.test(r))
    return ['Step by step dikhao', 'Ek aur example do', 'Iska real-life use kya hai?']

  // Health
  if (/symptoms|disease|medicine|treatment|doctor|health|diet/.test(r))
    return ['Precautions kya hain?', 'Natural remedy batao', 'Doctor kab zaruri hai?']

  // News / current events
  if (/news|khabar|headline|politics|government|election|economy/.test(r))
    return ['Background batao', 'Impact kya hoga?', 'Different perspectives do']

  // Weather
  if (/weather|mausam|temperature|rain|celsius|forecast|humidity/.test(r))
    return ['Kal ka forecast?', 'Week forecast do', 'Kya pehnen is mausam mein?']

  // Travel / places
  if (/travel|visit|city|country|tourism|flight|hotel|trip/.test(r))
    return ['Best time to visit?', 'Budget estimate do', 'Must-see places?']

  // Food / recipe
  if (/recipe|ingredient|cook|dish|food|khana|banana/.test(r))
    return ['Quick version batao', 'Substitutes kya hain?', 'Nutrition info do']

  // Study / exam
  if (/study|exam|syllabus|chapter|topic|neet|jee|concept/.test(r))
    return ['Short notes banao', 'Previous year questions?', 'Tricks yaad karne ke liye?']

  // Finance
  if (/stock|crypto|bitcoin|price|invest|mutual fund|sip|return/.test(r))
    return ['Risk kya hai?', 'Beginner ke liye guide?', '5 saal mein kya hoga?']

  // Image generated
  if (/image|photo|picture|wallpaper|generated|banaya/.test(q))
    return ['Aur variations do', 'Different style mein banao', 'HD version chahiye']

  // Story / creative
  if (/story|poem|creative|write|likhao|kahani/.test(r))
    return ['Aage kya hua?', 'Different ending do', 'Shorter version chahiye']

  // Default — smart based on response length
  if (aiReply.length > 500)
    return ['Summary do', 'Simplify karo', 'Key points list mein do']
  return ['Aur detail mein batao', 'Example do', 'Hindi mein samjhao']
}

// Legacy alias (used in some places)
function getSuggestions(text: string): string[] { return getSmartSuggestions(text, '') }

// Strip LaTeX markers: $$...$$ and $...$ → plain text
// Safe LaTeX stripping — no HTML, no crash
function renderInlineMath(text: string): string {
  return text
    .replace(/\$\$([^$\n]+?)\$\$/g, (_: string, m: string) => '[ ' + m.trim() + ' ]')
    .replace(/\$([^$\n]{1,80}?)\$/g, (_: string, m: string) => m.trim())
}
function stripLatex(text: string): string { return renderInlineMath(text) }

function MdText({ text }: { text: string }) {
  const lines = renderInlineMath(text).split('\n')
  const els: React.ReactNode[] = []
  let codeBlock = false; let codeLang = ''; let codeLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('```')) {
      if (codeBlock) {
        els.push(
          <div key={i} style={{ position: 'relative', margin: '10px 0' }}>
            {codeLang && <div style={{ position: 'absolute', top: '8px', left: '12px', fontSize: '10px', color: '#00e5ff66', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>{codeLang}</div>}
            <pre style={{ background: '#04080f', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '10px', padding: codeLang ? '28px 12px 12px' : '12px', overflowX: 'auto', fontSize: '12.5px', color: '#9ac8e8', fontFamily: "'Space Mono','Courier New',monospace", lineHeight: '1.65', whiteSpace: 'pre', margin: 0 }}>
              {codeLines.join('\n')}
            </pre>
            <CopyInline text={codeLines.join('\n')} />
          </div>
        )
        codeLines = []; codeLang = ''; codeBlock = false
      } else { codeBlock = true; codeLang = line.slice(3).trim() }
      continue
    }
    if (codeBlock) { codeLines.push(line); continue }
    if (line === '') { els.push(<div key={i} style={{ height: '5px' }} />); continue }

    const isBullet = /^[-*•] /.test(line)
    const isNum = /^\d+\. /.test(line)
    const raw = line.replace(/^[-*•] /,'').replace(/^\d+\. /,'').replace(/^#{1,3} /,'')
    const isH1 = line.startsWith('# '), isH2 = line.startsWith('## '), isH3 = line.startsWith('### ')
    const isHr = line === '---' || line === '***'

    if (isHr) { els.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '8px 0' }} />); continue }




    const styled = raw.split(/(\*\*[^*]+\*\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/).map((p, j) => {
      if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={j} style={{ color: '#e8f4ff' }}>{p.slice(2,-2)}</strong>
      if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return <code key={j} style={{ background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '4px', padding: '1px 5px', fontSize: '12px', fontFamily: "'Space Mono',monospace", color: '#6dc8f0' }}>{p.slice(1,-1)}</code>
      const lm = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (lm) return <a key={j} href={lm[2]} target="_blank" rel="noreferrer" style={{ color: '#00e5ff', textDecoration: 'underline' }}>{lm[1]}</a>
      return <span key={j}>{p}</span>
    })

    if (isH1) els.push(<div key={i} style={{ fontSize: '17px', fontWeight: 700, color: '#f0f8ff', margin: '14px 0 5px' }}>{styled}</div>)
    else if (isH2) els.push(<div key={i} style={{ fontSize: '15px', fontWeight: 600, color: '#e0efff', margin: '10px 0 4px' }}>{styled}</div>)
    else if (isH3) els.push(<div key={i} style={{ fontSize: '14px', fontWeight: 600, color: '#c8dff0', margin: '8px 0 3px' }}>{styled}</div>)
    else if (isBullet || isNum) els.push(
      <div key={i} style={{ display: 'flex', gap: '8px', margin: '3px 0', paddingLeft: '2px', lineHeight: '1.6' }}>
        <span style={{ color: '#00e5ff55', flexShrink: 0, width: '10px' }}>–</span>
        <span>{styled}</span>
      </div>
    )
    else els.push(<div key={i} style={{ margin: '2px 0', lineHeight: '1.7' }}>{styled}</div>)
  }
  return <div>{els}</div>
}

// Smart mode detection based on message content & complexity
function detectBestMode(message: string): ChatMode {
  const m = message.toLowerCase().trim()
  const words = m.split(/\s+/).length
  // Deep mode: long research / essay / analysis requests
  if (words > 60 || /research|analyze|comprehensive|write.*essay|in[- ]depth|compare.*contrast|full.*report|explain.*detail/.test(m))
    return 'deep'
  // Think mode: math, code debugging, logic problems
  if (/solve|calculate|proof|algorithm|debug|fix.*bug|optimiz|why.*error|logic|step[- ]by[- ]step|differentiate|integrate|theorem/.test(m))
    return 'think'
  // Flash mode: quick lookups, simple questions
  if (words < 8 || /^(what|who|when|where|weather|time|date|translate|define|spell|capital|how many|how much)/.test(m))
    return 'flash'
  return 'auto'
}

function CopyInline({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500) }}
      style={{ position: 'absolute', top: '8px', right: '10px', background: ok ? 'rgba(52,211,153,0.15)' : 'rgba(0,229,255,0.07)', border: '1px solid', borderColor: ok ? '#34d39944' : 'rgba(0,229,255,0.12)', borderRadius: '5px', color: ok ? '#34d399' : '#00e5ff77', cursor: 'pointer', fontSize: '10px', padding: '3px 7px', fontFamily: 'monospace' }}>
      {ok ? '✓' : 'copy'}
    </button>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000) }}
      style={{ background: ok ? 'rgba(52,211,153,0.08)' : 'rgba(0,229,255,0.05)', border: '1px solid', borderColor: ok ? '#34d39922' : 'rgba(0,229,255,0.08)', borderRadius: '5px', color: ok ? '#34d399' : '#00e5ff66', cursor: 'pointer', fontSize: '11px', padding: '3px 8px', transition: 'all 0.15s', fontWeight: 500, fontFamily: 'inherit' }}>
      {ok ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function ThinkBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const clean = text.replace(/<\/?think>/g, '').trim()
  if (!clean) return null
  return (
    <div style={{ margin: '5px 0' }}>
      <button onClick={() => setOpen(v => !v)} style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '6px', color: '#a78bfa88', cursor: 'pointer', fontSize: '11px', padding: '3px 9px', fontStyle: 'italic', fontFamily: 'inherit' }}>
        {open ? '▼ Hide reasoning' : '▶ Show reasoning...'}
      </button>
      {open && <div style={{ margin: '5px 0', padding: '10px 12px', background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.1)', borderRadius: '8px', color: '#7a7a98', fontSize: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>{clean}</div>}
    </div>
  )
}

function ImageMsg({ url, prompt }: { url: string; prompt: string }) {
  const [loaded, setLoaded] = useState(false); const [err, setErr] = useState(false)
  return (
    <div style={{ maxWidth: '320px', margin: '6px 0' }}>
      {!loaded && !err && <div style={{ width: '300px', height: '200px', background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#00e5ff77', fontSize: '13px' }}><div style={{ width: '22px', height: '22px', border: '2px solid #00e5ff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />Generating...</div>}
      {err && <div style={{ fontSize: '12px', color: '#f87171' }}>Image load failed.</div>}
      <img src={url} alt={prompt} onLoad={() => setLoaded(true)} onError={() => setErr(true)} style={{ width: '100%', borderRadius: '12px', border: '1px solid rgba(0,229,255,0.08)', display: loaded ? 'block' : 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }} />
      {loaded && <div style={{ display: 'flex', gap: '10px', marginTop: '7px' }}>
        <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#00e5ff66' }}>↓ Save</a>
        <a href={url} download="jarvis-image.jpg" style={{ fontSize: '11px', color: '#00e5ff66' }}>↓ Download</a>
      </div>}
    </div>
  )
}

const MODES: Array<{ id: ChatMode; label: string; desc: string; color: string; icon: string }> = [
  { id: 'auto',  label: 'Auto',  desc: 'Smart routing', color: '#00e5ff', icon: '������' },
  { id: 'flash', label: 'Flash', desc: 'Fastest speed',  color: '#f87171', icon: '⚡' },
  { id: 'think', label: 'Think', desc: 'Deep reasoning', color: '#a78bfa', icon: '������' },
  { id: 'deep',  label: 'Deep',  desc: '46 tools',       color: '#34d399', icon: '������' },
]

const CASCADES: Record<ChatMode, Array<{ num: number; key: string; model: string; speed: string; note: string }>> = {
  auto: [
    { num: 1, key: 'groq',         model: 'Groq · Llama 3.3 70B',     speed: '~1s', note: 'Default best' },
    { num: 2, key: 'gemini',       model: 'Gemini 2.5 Flash',          speed: '~2s', note: 'Google fallback' },
    { num: 3, key: 'together',     model: 'Together · Llama 3.3 70B',  speed: '~3s', note: 'Alt fallback' },
    { num: 4, key: 'pollinations', model: 'Pollinations AI',           speed: '~5s', note: 'No key needed' },
    { num: 5, key: 'puter',        model: 'Puter · GPT-4o-mini',       speed: '~6s', note: 'Last resort' },
  ],
  flash: [
    { num: 1, key: 'groq',         model: 'Groq · Llama 4 Scout 17B',  speed: '~1s', note: 'Fastest — server key' },
    { num: 2, key: 'together',     model: 'Together · Llama 3.3 70B',  speed: '~2s', note: 'Fallback' },
    { num: 3, key: 'gemini',       model: 'Gemini 2.5 Flash',          speed: '~3s', note: 'Google fallback' },
    { num: 4, key: 'pollinations', model: 'Pollinations (OpenAI)',      speed: '~5s', note: 'No key, browser direct' },
    { num: 5, key: 'puter',        model: 'Puter · GPT-4o-mini',       speed: '~6s', note: 'Last resort' },
  ],
  think: [
    { num: 1, key: 'groq',         model: 'Groq · DeepSeek R1 70B',    speed: '~3s', note: 'Best reasoning' },
    { num: 2, key: 'gemini',       model: 'Gemini 2.5 Flash',          speed: '~4s', note: 'Google thinking' },
    { num: 3, key: 'openrouter',   model: 'OpenRouter DeepSeek R1',    speed: '~5s', note: 'Free key' },
    { num: 4, key: 'pollinations', model: 'Pollinations AI',           speed: '~6s', note: 'No key needed' },
    { num: 5, key: 'puter',        model: 'Puter · GPT-4o-mini',       speed: '~8s', note: 'Last resort' },
  ],
  deep: [
    { num: 1, key: 'gemini',       model: 'Gemini 2.5 Flash + Tools',  speed: '~4s', note: 'Weather/news/images' },
    { num: 2, key: 'pollinations', model: 'Pollinations AI',           speed: '~6s', note: 'No key fallback' },
    { num: 3, key: 'puter',        model: 'Puter · GPT-4o-mini',       speed: '~8s', note: 'Last resort' },
  ],
}

function CascadeDrawer({ mode, onClose, onChange, forcedProvider, onForceProvider }: {
  mode: ChatMode; onClose: () => void; onChange: (m: ChatMode) => void
  forcedProvider: string | null; onForceProvider: (p: string | null) => void
}) {
  const curMode = MODES.find(m => m.id === mode)!
  const cascade = CASCADES[mode]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div style={{ background: 'rgba(4,8,16,0.98)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '18px 18px 0 0', padding: '14px 14px 30px', backdropFilter: 'blur(20px)', boxShadow: '0 -8px 40px rgba(0,0,0,0.8)', animation: 'slideUp 0.2s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ width: '36px', height: '3px', background: 'rgba(255,255,255,0.12)', borderRadius: '2px', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '2px' }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => { onChange(m.id); onForceProvider(null) }}
              style={{ flexShrink: 0, background: mode === m.id ? m.color + '18' : 'rgba(255,255,255,0.02)', border: '1px solid', borderColor: mode === m.id ? m.color + '55' : 'rgba(255,255,255,0.06)', borderRadius: '20px', color: mode === m.id ? m.color : '#2a5070', cursor: 'pointer', padding: '6px 14px', fontSize: '12px', fontWeight: mode === m.id ? 700 : 400, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
        <div style={{ background: curMode.color + '08', border: '1px solid ' + curMode.color + '20', borderRadius: '10px', padding: '9px 12px', marginBottom: '11px' }}>
          <div style={{ fontSize: '12px', color: curMode.color, fontWeight: 700, marginBottom: '2px' }}>{curMode.icon} {curMode.label} Mode — Cascade Priority</div>
          <div style={{ fontSize: '11px', color: '#1e3248' }}>
            {forcedProvider
              ? '������ Provider locked — tap row again to unlock'
              : 'Tap a provider to pin/force it • auto-fallback on error'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {cascade.map(c => {
            const isPinned = forcedProvider === c.key
            return (
              <div key={c.num} onClick={() => onForceProvider(isPinned ? null : c.key)}
                style={{ display: 'grid', gridTemplateColumns: '22px 1fr 36px 40px', alignItems: 'center', gap: '8px', padding: '8px 10px', cursor: 'pointer', transition: 'all 0.15s',
                  background: isPinned ? curMode.color + '18' : c.num === 1 ? curMode.color + '07' : 'rgba(255,255,255,0.015)',
                  borderRadius: '8px',
                  border: '1px solid ' + (isPinned ? curMode.color + '55' : c.num === 1 ? curMode.color + '18' : 'rgba(255,255,255,0.03)'),
                  boxShadow: isPinned ? '0 0 10px ' + curMode.color + '22' : 'none'
                }}>
                <span style={{ width: '20px', height: '20px',
                  background: isPinned ? curMode.color + '33' : c.num === 1 ? curMode.color + '22' : 'rgba(255,255,255,0.04)',
                  border: '1px solid ' + (isPinned ? curMode.color : c.num === 1 ? curMode.color + '44' : 'rgba(255,255,255,0.06)'),
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', color: isPinned ? curMode.color : c.num === 1 ? curMode.color : '#2a5070', fontWeight: 700 }}>
                  {c.num}
                </span>
                <span style={{ fontSize: '13px', color: isPinned ? '#e8f4ff' : c.num === 1 ? '#c4dff0' : '#3a6080', fontWeight: isPinned ? 700 : c.num === 1 ? 600 : 400 }}>{c.model}</span>
                <span style={{ fontSize: '11px', color: isPinned ? curMode.color + 'aa' : '#1e3248', textAlign: 'right' }}>{c.speed}</span>
                <span style={{ fontSize: '13px', textAlign: 'right', color: isPinned ? curMode.color : '#1a2a38' }}>{isPinned ? '������' : '·'}</span>
              </div>
            )
          })}
        </div>
        {forcedProvider && (
          <button onClick={() => onForceProvider(null)}
            style={{ marginTop: '10px', width: '100%', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)', borderRadius: '8px', color: '#f87171', cursor: 'pointer', padding: '8px', fontSize: '12px', fontFamily: 'inherit', fontWeight: 600 }}>
            ������ Unlock — resume auto cascade
          </button>
        )}
        <div style={{ marginTop: '8px', fontSize: '10px', color: '#0a1820', textAlign: 'center' }}>Tap outside to close</div>
      </div>
    </div>
  )
}

const CMDS = [
  { cmd: '/clear',    desc: 'Chat clear karo',      icon: '������️' },
  { cmd: '/pass',     desc: 'Strong password banao', icon: '������' },
  { cmd: '/luna',     desc: 'Luna page pe jao',      icon: '������' },
  { cmd: '/era',      desc: 'Era page pe jao',       icon: '������' },
  { cmd: '/mood',     desc: 'Mood tracker',          icon: '������' },
  { cmd: '/notes',    desc: 'Quick notes',           icon: '������' },
  { cmd: '/timer',    desc: 'Pomodoro timer',        icon: '⏱️' },
  { cmd: '/dash',     desc: 'Dashboard',             icon: '������' },
  { cmd: '/calc',     desc: 'Calculator',            icon: '������' },
  { cmd: '/habits',   desc: 'Habit tracker',         icon: '������' },
  { cmd: '/todo',     desc: 'Todo list',             icon: '✅' },
  { cmd: '/qr',       desc: 'QR generator',          icon: '������' },
  { cmd: '/focus',    desc: 'Focus mode',            icon: '������' },
  { cmd: '/study',    desc: 'Study mode',            icon: '������' },
  { cmd: '/xp',       desc: 'XP & Level',            icon: '⭐' },
  { cmd: '/tools',    desc: 'All Tools',             icon: '������️' },
  { cmd: '/write',    desc: 'AI Writer',             icon: '✍️' },
  { cmd: '/bookmarks',desc: 'Starred messages',       icon: '⭐' },
  { cmd: '/export',   desc: 'Export JSON',            icon: '������' },
]

// ── Smart Dynamic Prompts — time/day aware ─────────────
// All prompt pools by context
const ALL_PROMPTS = {
  morning: [
    { l: '������ Subah ki news',      m: 'aaj subah ki top headlines kya hain?',          cat: 'news' },
    { l: '☀️ Rewa mausam',         m: 'Rewa ka aaj ka mausam kya hai?',                cat: 'weather' },
    { l: '������ Motivation do',       m: 'mujhe aaj ke liye ek powerful motivation do',   cat: 'motivation' },
    { l: '������ Aaj ka plan',         m: 'mera aaj ka productive schedule banao',         cat: 'planning' },
    { l: '������ Morning routine',     m: 'best morning routine batao jo energy de',       cat: 'health' },
    { l: '������ Headlines summary',   m: 'aaj ki top 5 khabar short mein batao',          cat: 'news' },
    { l: '☕ Nashta idea',          m: 'quick healthy breakfast idea batao',            cat: 'health' },
    { l: '������ Aaj ka thought',      m: 'ek powerful thought of the day do',             cat: 'motivation' },
  ],
  afternoon: [
    { l: '������ Math solve',          m: 'solve karo: ',                                  cat: 'study' },
    { l: '������ Python code',         m: 'Python mein ',                                  cat: 'code' },
    { l: '������ Topic samjhao',       m: 'samjhao mujhe: ',                               cat: 'study' },
    { l: '������ Translate karo',      m: 'Hindi mein translate karo: ',                   cat: 'language' },
    { l: '������️ Image banao',         m: 'image banao ',                                  cat: 'creative' },
    { l: '⚡ Code debug karo',     m: 'ye code fix karo: ',                            cat: 'code' },
    { l: '������ Essay likhao',        m: 'ek short essay likho topic: ',                  cat: 'study' },
    { l: '������ Science explain',     m: 'science concept explain karo: ',                cat: 'study' },
  ],
  evening: [
    { l: '������ Sham ki news',        m: 'aaj ki top news kya rahi?',                     cat: 'news' },
    { l: '������ Movie recommend',     m: 'aaj raat ke liye ek achhi movie recommend karo', cat: 'entertainment' },
    { l: '������️ Dinner idea',         m: 'aaj raat kya banayein? simple recipe batao',    cat: 'health' },
    { l: '������️ Art banao',           m: 'ek creative wallpaper image banao: ',           cat: 'creative' },
    { l: '������ New ideas do',        m: 'mujhe ek creative project idea do',             cat: 'creative' },
    { l: '������ Music mood',          m: 'iske liye songs suggest karo: ',                cat: 'entertainment' },
    { l: '������ Workout plan',        m: 'aaj raat ke liye quick workout plan do',        cat: 'health' },
    { l: '������ Tech news',           m: 'aaj ki latest tech news kya hai?',              cat: 'news' },
  ],
  night: [
    { l: '������ Raat ki baat',        m: 'koi interesting fact batao jo mind blow kare',  cat: 'fun' },
    { l: '������ Story sunao',         m: 'mujhe ek interesting short story sunao',        cat: 'entertainment' },
    { l: '������ Quiz khelo',          m: 'mujhse ek interesting quiz lo',                 cat: 'fun' },
    { l: '������ Deep question',       m: 'ek deep philosophical question ka jawab do: ',  cat: 'philosophy' },
    { l: '������ Space baat',          m: 'universe ke baare mein kuch mind-blowing batao', cat: 'science' },
    { l: '������️ Dream image',        m: 'ek surreal dreamy night sky image banao',        cat: 'creative' },
    { l: '������ Poem likho',          m: 'ek beautiful Hinglish poem likho: ',            cat: 'creative' },
    { l: '������ Neend tips',          m: 'achhi neend ke liye tips do',                   cat: 'health' },
  ],
  // day-specific bonus prompts
  monday: [
    { l: '������ Week plan banao',     m: 'is hafte ka productive plan banao mere liye',   cat: 'planning' },
    { l: '������ Goals set karo',      m: 'is hafte ke top 3 goals set karne mein help karo', cat: 'planning' },
  ],
  friday: [
    { l: '������ Weekend plan',        m: 'is weekend ke liye fun plan do',                cat: 'entertainment' },
    { l: '������ Binge list',          m: 'weekend mein dekhne layak web series recommend karo', cat: 'entertainment' },
  ],
  saturday: [
    { l: '������️ Outing idea',        m: 'aaj ghumne ke liye Rewa ke aas paas koi jagah batao', cat: 'travel' },
    { l: '������ Photo idea',          m: 'ek creative photo wallpaper banao sunset theme',  cat: 'creative' },
  ],
  sunday: [
    { l: '������ Week ahead',          m: 'aane wale hafte ki tayari kaise karein?',        cat: 'planning' },
    { l: '������ Organize karo',       m: 'apni life organize karne ke tips do',            cat: 'planning' },
  ],
  // always-available utility
  utility: [
    { l: '������️ Mausam batao',        m: 'Rewa ka aaj ka mausam kya hai?',                cat: 'weather' },
    { l: '������ Crypto rate',         m: 'Bitcoin aur Ethereum ka aaj ka rate kya hai?',  cat: 'finance' },
    { l: '������ Stock market',        m: 'aaj Sensex aur Nifty kaise hai?',               cat: 'finance' },
    { l: '������ Password banao',      m: '/pass',                                          cat: 'utility' },
    { l: '������ Translate',           m: 'Hindi mein translate karo: ',                   cat: 'language' },
    { l: '������️ Image banao',         m: 'image banao ',                                  cat: 'creative' },
    { l: '������ Aaj ki khabar',       m: 'aaj ki top news kya hai?',                      cat: 'news' },
    { l: '������ Math solve',          m: 'solve karo: ',                                  cat: 'study' },
  ]
}

function getSmartPrompts(): Array<{ l: string; m: string; cat: string }> {
  const now   = new Date()
  const hour  = now.getHours()
  const day   = now.getDay() // 0=Sun,1=Mon,...,6=Sat

  // Pick time pool
  const timePool =
    hour >= 5  && hour < 12 ? ALL_PROMPTS.morning   :
    hour >= 12 && hour < 17 ? ALL_PROMPTS.afternoon :
    hour >= 17 && hour < 21 ? ALL_PROMPTS.evening   : ALL_PROMPTS.night

  // Pick day-specific bonus
  const dayPool =
    day === 1 ? ALL_PROMPTS.monday   :
    day === 5 ? ALL_PROMPTS.friday   :
    day === 6 ? ALL_PROMPTS.saturday :
    day === 0 ? ALL_PROMPTS.sunday   : []

  // Shuffle time pool deterministically based on date+hour (changes every hour)
  const seed = now.getFullYear() * 1000 + now.getMonth() * 30 + now.getDate() + hour
  const shuffled = [...timePool].sort((a, b) => {
    const ha = Math.sin(seed + a.l.charCodeAt(0)) * 10000
    const hb = Math.sin(seed + b.l.charCodeAt(0)) * 10000
    return (ha - Math.floor(ha)) - (hb - Math.floor(hb))
  })

  // Merge: 4 from time pool + 1 day bonus (if exists) + 1 utility
  const picks: Array<{ l: string; m: string; cat: string }> = []
  const cats = new Set<string>()

  for (const p of shuffled) {
    if (picks.length >= 4) break
    if (!cats.has(p.cat)) { picks.push(p); cats.add(p.cat) }
  }
  // pad if needed
  for (const p of shuffled) {
    if (picks.length >= 4) break
    if (!picks.includes(p)) picks.push(p)
  }

  if (dayPool.length) picks.push(dayPool[Math.floor(Math.random() * dayPool.length)])

  const utilPick = ALL_PROMPTS.utility.find(u => !cats.has(u.cat))
  if (utilPick) picks.push(utilPick)

  return picks.slice(0, 6)
}

export default function Home() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [inp, setInp] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [streamThink, setStreamThink] = useState('')
  const [streamProv, setStreamProv] = useState('')
  const [chatMode, setChatMode] = useState<ChatMode>('auto')
  const [sidebar, setSidebar] = useState(false)
  const [recording, setRecording] = useState(false)
  const [tts, setTts] = useState(false)
  const [forcedProvider, setForcedProvider] = useState<string | null>(null)
  const [cascadeOpen, setCascadeOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdFilter, setCmdFilter] = useState('')
  const [contextMsg, setContextMsg] = useState<string | null>(null)
  const [autoMemory, setAutoMemory] = useState<string[]>([])  // auto-saved facts
  const [memBadge, setMemBadge] = useState(false)             // "memory saved" flash
  const [moodGlow, setMoodGlow] = useState('#00e5ff')

  const bottomRef = useRef<HTMLDivElement>(null)
  const inpRef = useRef<HTMLTextAreaElement>(null)
  const mediaRef = useRef<any>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORE)
      if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) setMsgs(p) }
      const m = localStorage.getItem(MSTORE) as ChatMode | null
      if (m && ['auto','flash','think','deep'].includes(m)) setChatMode(m)
      const t = localStorage.getItem('j_tts')
      if (t === '1') setTts(true)
    } catch {}
    try { initProactiveScheduler('Rewa') } catch {}

    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setSearchOpen(v => !v) }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSidebar(true) }
      if (e.key === 'Escape') { setCascadeOpen(false); setSearchOpen(false); setCmdOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(msgs.slice(-80))) } catch {}
  }, [msgs])

  useEffect(() => {
    if (!streaming && !showScrollBtn) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, streamText])

  useEffect(() => {
    if (inpRef.current) {
      inpRef.current.style.height = 'auto'
      inpRef.current.style.height = Math.min(inpRef.current.scrollHeight, 130) + 'px'
    }
    if (inp.startsWith('/')) {
      const f = inp.slice(1).toLowerCase()
      setCmdFilter(f)
      setCmdOpen(true)
    } else {
      setCmdOpen(false)
      // Auto-detect best mode when user is in auto mode and types enough
      if (chatMode === 'auto' && inp.trim().split(/\s+/).length >= 5) {
        const suggested = detectBestMode(inp)
        if (suggested !== 'auto') setChatMode(suggested)
      }
    }
  }, [inp])

  function handleScroll() {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 150)
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollBtn(false)
  }

  function changeMode(m: ChatMode) {
    setChatMode(m); setCascadeOpen(false)
    try { localStorage.setItem(MSTORE, m) } catch {}
  }

  function toggleTts() {
    const nv = !tts; setTts(nv)
    try { localStorage.setItem('j_tts', nv ? '1' : '0') } catch {}
  }

  async function extractAndSaveMemory(recentMsgs: Msg[]) {
    try {
      const conversation = recentMsgs
        .map(m => (m.role === 'user' ? 'User' : 'JARVIS') + ': ' + m.content.slice(0, 200))
        .join('\n')
      const prompt = 'From this conversation, extract 2-3 short personal facts about the user worth remembering (name, location, preferences, goals, habits). Return JSON array of short strings only. If nothing worth remembering, return [].\n\n' + conversation
      const r = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages: [{ role: 'system', content: 'Return only a JSON array. No markdown, no explanation.' }, { role: 'user', content: prompt }],
          max_tokens: 150
        })
      })
      const d = await r.json()
      const raw = d.choices?.[0]?.message?.content || '[]'
      const match = raw.match(/[[sS]*]/)
      if (!match) return
      const facts: string[] = JSON.parse(match[0])
      if (!facts.length) return
      setAutoMemory(prev => {
        const merged = [...new Set([...prev, ...facts])].slice(0, 20)
        try { localStorage.setItem(MEMSTORE, JSON.stringify(merged)) } catch {}
        return merged
      })
      setMemBadge(true)
      setTimeout(() => setMemBadge(false), 3000)
    } catch {}
  }

  function clearChat() {
    setMsgs([]); setSuggestions([])
    try { localStorage.removeItem(STORE) } catch {}
  }

  function exportChat() {
    if (!msgs.length) return
    const lines = msgs.map(m => {
      const ts  = new Date(m.ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      const who = m.role === 'user' ? '������ You' : '������ JARVIS'
      return '[' + ts + '] ' + who + ':\n' + m.content
    }).join('\n\n---\n\n')
    const blob = new Blob([lines], { type: 'text/plain; charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'JARVIS-' + new Date().toISOString().slice(0, 10) + '.txt'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function addReaction(msgId: string, emoji: string) {
    setMsgs(prev => prev.map(m =>
      m.id === msgId ? { ...m, reactions: m.reactions?.includes(emoji) ? m.reactions.filter(r => r !== emoji) : [...(m.reactions || []), emoji] } : m
    ))
  }

  function deleteMsg(id: string) {
    setMsgs(prev => prev.filter(m => m.id !== id))
    setContextMsg(null)
  }

  function toggleBookmark(id: string) {
    setMsgs(prev => prev.map(m => m.id === id ? { ...m, bookmarked: !m.bookmarked } : m))
  }

  function calcInline(expr: string): string {
    try {
      const s = expr.replace(/[^0-9+\-*/().\s%]/g, '')
      if (!s.trim()) return 'Empty'
      // eslint-disable-next-line no-new-func
      const fn = new Function('return (' + s + ')')
      const r = fn()
      return typeof r === 'number' ? (Number.isFinite(r) ? String(r) : 'Infinity') : String(r)
    } catch { return 'Invalid' }
  }

  async function speak(text: string) {
    if (!tts) return
    try {
      const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 300) }) })
      if (r.ok) { const b = await r.blob(); new Audio(URL.createObjectURL(b)).play() }
    } catch {}
  }

  async function toggleVoice() {
    if (recording) {
      // Stop: try WebSpeech first, then MediaRecorder
      const ws = (window as any)._jarvisWSR
      if (ws) { ws.stop(); (window as any)._jarvisWSR = null }
      mediaRef.current?.stop()
      setRecording(false)
      return
    }
    // Try Web Speech API first (no server needed, instant, Hindi support)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      try {
        const sr = new SpeechRecognition()
        sr.lang = 'hi-IN'           // Hindi primary
        sr.interimResults = true
        sr.continuous = false
        sr.maxAlternatives = 1
        setRecording(true)
        let finalText = ''
        sr.onresult = (e: any) => {
          const transcript = Array.from(e.results)
            .map((r: any) => r[0].transcript).join('')
          setInp(transcript)
          if (e.results[e.results.length - 1].isFinal) finalText = transcript
        }
        sr.onerror = () => { setRecording(false); (window as any)._jarvisWSR = null }
        sr.onend = () => {
          setRecording(false)
          ;(window as any)._jarvisWSR = null
          if (finalText.trim()) setTimeout(() => send(finalText.trim()), 200)
        }
        sr.start()
        ;(window as any)._jarvisWSR = sr
        // Auto-stop after 15s
        setTimeout(() => { try { sr.stop() } catch {} }, 15000)
        return
      } catch {}
    }
    // Fallback: MediaRecorder → /api/stt (Groq Whisper)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      const mr = new MediaRecorder(stream, { mimeType })
      const chunks: Blob[] = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setInp('������ Transcribing...')
        const fd = new FormData()
        fd.append('audio', new Blob(chunks, { type: mimeType }), 'audio.webm')
        try {
          const r = await fetch('/api/stt', { method: 'POST', body: fd })
          const d = await r.json()
          if (d.text) { setInp(d.text); setTimeout(() => send(d.text), 200) }
          else setInp('')
        } catch { setInp('') }
      }
      mr.start(250)  // collect chunks every 250ms
      mediaRef.current = mr
      setRecording(true)
      setTimeout(() => { if (mr.state === 'recording') mr.stop() }, 15000)
    } catch { alert('Mic permission chahiye! Browser settings mein allow karo.') }
  }

  async function handleImageFile(file: File) {
    const question = inp.trim() || 'Is image mein kya dikh raha hai? Hinglish mein batao.'
    const userLabel = inp.trim() || 'Photo sent for analysis'
    if (inp.trim()) setInp('')
    const reader = new FileReader()
    reader.onload = async () => {
      const newMsgs: Msg[] = [...msgs, { id: uid(), role: 'user', content: userLabel, ts: Date.now() }]
      setMsgs(newMsgs); setStreaming(true); setStreamText(''); setStreamProv('Gemini Vision')
      try {
        const r = await fetch('/api/photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: reader.result, question }) })
        const d = await r.json()
        const rep = d.answer || 'Could not analyse'
        setMsgs([...newMsgs, { id: uid(), role: 'assistant', content: rep, provider: 'Gemini Vision', ts: Date.now() }])
        speak(rep)
      } catch {
        setMsgs([...newMsgs, { id: uid(), role: 'assistant', content: 'Photo analyse nahi ho payi.', ts: Date.now() }])
      }
      setStreaming(false); setStreamText(''); setStreamProv('')
    }
    reader.readAsDataURL(file)
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await handleImageFile(file)
    e.target.value = ''
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) handleImageFile(file)
        return
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) handleImageFile(file)
  }

  const send = useCallback(async (override?: string) => {
    const text = (override ?? inp).trim()
    if (!text || streaming) return
    setInp(''); setSuggestions([])

    const t = text.toLowerCase()
    if (t === '/clear') { clearChat(); return }
    if (/^\/(calc|c) .+/i.test(t)) {
      const expr = text.slice(text.indexOf(' ') + 1).trim()
      const res  = calcInline(expr)
      setMsgs(m => [...m,
        { id: uid(), role: 'user', content: '/calc ' + expr, ts: Date.now() },
        { id: uid(), role: 'assistant', content: '\uD83D\uDD22 **' + expr + ' = ' + res + '**\n\n_No API used — instant result._', ts: Date.now() }
      ])
      return
    }
    if (t === '/pass' || t === '/password') {
      const p = genPass()
      setMsgs(m => [...m, { id: uid(), role: 'user', content: text, ts: Date.now() }, { id: uid(), role: 'assistant', content: `������ **Strong Password Generated:**\n\n\`${p}\`\n\n18 characters, mixed case + symbols. Copy karo!`, ts: Date.now() }])
      return
    }
    const PAGE_CMDS: Record<string, string> = { '/luna': '/luna', '/era': '/era', '/mood': '/mood', '/notes': '/notes', '/timer': '/timer', '/dash': '/dashboard', '/calc': '/calculator', '/habits': '/habits', '/todo': '/todo', '/qr': '/qr', '/focus': '/focus', '/study': '/study', '/xp': '/xp', '/tools': '/tools', '/write': '/write' }
    if (PAGE_CMDS[t]) { window.location.href = PAGE_CMDS[t]; return }
    if (t === '/bookmarks') { setShowBookmarks(v => !v); setInp(''); return }
    if (t === '/export' || t === '/exportjson') {
      if (!msgs.length) return
      const jb = new Blob([JSON.stringify(msgs, null, 2)], { type: 'application/json' })
      const ja = document.createElement('a')
      ja.href = URL.createObjectURL(jb)
      ja.download = 'JARVIS-' + new Date().toISOString().slice(0, 10) + '.json'
      ja.click(); URL.revokeObjectURL(ja.href)
      setMsgs(m => [...m,
        { id: uid(), role: 'user', content: text, ts: Date.now() },
        { id: uid(), role: 'assistant', content: '\uD83D\uDCBE Exported **' + msgs.length + ' messages** as JSON!', ts: Date.now() }
      ])
      return
    }

    const userMsg: Msg = { id: uid(), role: 'user', content: text, ts: Date.now() }
    const newMsgs = [...msgs, userMsg]
    setMsgs(newMsgs)

    if (/^\/run (.+)/i.test(text)) {
      const jsCode = text.slice(text.indexOf(' ')+1).trim()
      const logs: string[] = []
      const origLog = console.log
      try {
        console.log = (...a: any[]) => { logs.push(a.map(String).join(' ')); origLog(...a) }
        // eslint-disable-next-line no-new-func
        const fn = new Function(jsCode)
        const result = fn()
        console.log = origLog
        const out = logs.length ? logs.join('\n') : (result !== undefined ? String(result) : '(void — no output)')
        setMsgs(m => [...m,
          { id: uid(), role: 'user', content: '/run ' + jsCode, ts: Date.now() },
          { id: uid(), role: 'assistant', content: '\u25B6 **Output:**\n```\n' + out + '\n```\n\n_JS executed in your browser — zero API cost. Try: /run Date.now()_', ts: Date.now() }
        ])
      } catch(e: any) {
        console.log = origLog
        setMsgs(m => [...m,
          { id: uid(), role: 'user', content: '/run ' + jsCode, ts: Date.now() },
          { id: uid(), role: 'assistant', content: '\u274C **Error:** `' + e.message + '`\n\nTip: `/run 2**10` or `/run [1,2,3].map(x=>x*2).join(", ")`', ts: Date.now() }
        ])
      }
      return
    }

    if (t === '/cards' || t === '/flashcards') {
      const lastAI = [...msgs].reverse().find(m => m.role === 'assistant' && m.content.length > 50)
      if (!lastAI) {
        setMsgs(m => [...m, { id: uid(), role: 'user', content: text, ts: Date.now() }, { id: uid(), role: 'assistant', content: '\u274C Pehle koi AI reply hona chahiye jisse cards banaun.', ts: Date.now() }])
        return
      }
      const cardMsgs: Msg[] = [...msgs, { id: uid(), role: 'user', content: '/cards', ts: Date.now() }]
      setMsgs(cardMsgs); setStreaming(true); setStreamProv('Card Generator')
      try {
        const prompt = encodeURIComponent('Generate exactly 5 flashcards from this text as numbered Q&A. Format:\nQ1: question\nA1: answer\n\nText: ' + lastAI.content.slice(0,600))
        const r = await fetch('https://text.pollinations.ai/' + prompt, { signal: AbortSignal.timeout(15000) })
        const raw = await r.text()
        const clean = raw.replace(/```[\s\S]*?```/g,'').trim()
        setMsgs([...cardMsgs, { id: uid(), role: 'assistant', content: '\uD83C\uDFAF **Flashcards Generated!**\n\n' + clean + '\n\n_Tip: /cards dobara type karo for new set!_', ts: Date.now() }])
      } catch {
        setMsgs([...cardMsgs, { id: uid(), role: 'assistant', content: '\u26A0\uFE0F Cards generate nahi ho payi. Dobara try karo.', ts: Date.now() }])
      }
      setStreaming(false); setStreamText(''); setStreamProv('')
      return
    }

    if (t === '/roast') {
      const lastUser = [...msgs].reverse().find(m => m.role === 'user')
      if (!lastUser) { setMsgs(m => [...m, { id: uid(), role: 'user', content: text, ts: Date.now() }, { id: uid(), role: 'assistant', content: 'Roast kya karein? Pehle kuch toh likho! \uD83D\uDE02', ts: Date.now() }]); return }
      const roastMsgs: Msg[] = [...msgs, { id: uid(), role: 'user', content: '/roast', ts: Date.now() }]
      setMsgs(roastMsgs); setStreaming(true); setStreamProv('Roast Mode \uD83D\uDD25')
      try {
        const roastPrompt = encodeURIComponent('You are a savage but friendly roast master. Roast this message in funny Hinglish (Hindi+English mix), max 3 lines, no offensive content, keep it playful: "' + lastUser.content.slice(0,200) + '"')
        const r = await fetch('https://text.pollinations.ai/' + roastPrompt, { signal: AbortSignal.timeout(12000) })
        const roast = await r.text()
        setMsgs([...roastMsgs, { id: uid(), role: 'assistant', content: '\uD83D\uDD25 **Roast incoming...**\n\n' + roast.trim() + '\n\n_No hard feelings! \uD83D\uDE02_', ts: Date.now() }])
      } catch {
        setMsgs([...roastMsgs, { id: uid(), role: 'assistant', content: 'Roast mode crash ho gaya... aap khud hi roasty ho! \uD83D\uDE02', ts: Date.now() }])
      }
      setStreaming(false); setStreamText(''); setStreamProv('')
      return
    }

    if (/image banao|photo banao|generate image|draw|wallpaper|sketch|create image/i.test(t)) {
      const prompt = text.replace(/image banao|photo banao|generate image|draw|wallpaper|sketch|create image/gi, '').trim() || text
      const seed = Math.floor(Math.random() * 999999)
      const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) + '?model=flux&width=1024&height=1024&seed=' + seed + '&nologo=true'
      setMsgs([...newMsgs, { id: uid(), role: 'assistant', content: prompt, imageUrl: url, provider: 'Pollinations FLUX', ts: Date.now() }])
      return
    }

    if (/video banao|clip banao/i.test(t)) {
      const prompt = text.replace(/video banao|clip banao/gi, '').trim() || text
      setMsgs([...newMsgs, { id: uid(), role: 'assistant', content: 'Video generating...', videoUrl: 'https://video.pollinations.ai/' + encodeURIComponent(prompt), provider: 'Pollinations Video', ts: Date.now() }])
      return
    }

    setStreaming(true); setStreamText(''); setStreamThink(''); setStreamProv('Connecting...')
    abortRef.current = new AbortController()
    // Smart auto-mode detection
    const effectiveMode: ChatMode = chatMode === 'auto'
      ? (/weather|news|image|search|find|khabar|mausam|photo|banao/.test(t) ? 'deep'
         : /why|explain|samjhao|theorem|formula|kaise.*kaam|difference|compare/.test(t) ? 'think'
         : t.length < 15 && /^(hi|ok|haan|nahi|thanks|bye|hello|hey)/.test(t) ? 'flash'
         : 'auto')
      : chatMode

    let full = '', think = '', prov = ''

    try {
      const res = await fetch('/api/stream', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: text,
            history: newMsgs.slice(-8).map(x => ({ role: x.role === 'user' ? 'user' : 'assistant', content: x.content })),
            chatMode,
            forcedProvider: forcedProvider || undefined,
            userName: 'Pranshu',
            memoryPrompt: autoMemory.length
              ? 'JARVIS ko pata hai user ke baare mein:\n' + autoMemory.map(f => '• ' + f).join('\n')
              : undefined
          }),
        signal: abortRef.current.signal,
      })
      if (!res.ok || !res.body) throw new Error('Stream failed')
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim(); if (!raw || raw === '[DONE]') continue
          try {
            const ev = JSON.parse(raw)
            if (ev.type === 'start') { prov = ev.provider || ''; setStreamProv(prov) }
            else if (ev.type === 'token') { full += ev.text; setStreamText(full) }
            else if (ev.type === 'think') { think += ev.text; setStreamThink(think) }
            else if (ev.type === 'fallback' && ev.message === 'USE_PUTER') {
              // Puter.js fallback — attempt if loaded, else show helpful message
              const puter = (window as any).puter
              if (puter?.ai?.chat) {
                try {
                  prov = 'Puter · GPT-4o-mini'; setStreamProv(prov)
                  const pr = await puter.ai.chat('You are JARVIS. Hinglish mein baat karo.\nUser: ' + text)
                  full = typeof pr === 'string' ? pr : pr?.message?.content?.[0]?.text || ''
                  if (full) setStreamText(full)
                  else { full = 'Koi response nahi aaya. Dobara try karo.'; setStreamText(full) }
                } catch { full = 'Sab providers unavailable hain. Thodi der baad try karo.'; setStreamText(full) }
              } else {
                full = 'Network ya API issue. Groq/Gemini key Vercel mein check karo.'; setStreamText(full)
              }
            }
          } catch {}
        }
      }
      const finalMsg: Msg = { id: uid(), role: 'assistant', content: full || '⚠️ Reply nahi mila. Mode switch karke retry karo.', thinking: think.replace(/<\/?think>/g, '').trim() || undefined, provider: prov || undefined, ts: Date.now() }
      setMsgs([...newMsgs, finalMsg])
      speak(full)
      awardXP('chat_message')
      setSuggestions(getSmartSuggestions(full, text))
      // Mood ambient glow
      const moodTxt = full.toLowerCase()
      setMoodGlow(
        /happy|great|amazing|perfect|haan|bilkul|zabardast|mast|awesome|\u0916\u0941\u0936|badhiya/.test(moodTxt) ? '#34d399' :
        /sorry|sad|error|fail|problem|tension|nahi|mushkil|issue|bug/.test(moodTxt) ? '#f87171' :
        /think|explain|analyze|calculate|theorem|formula|samjhao|kyun|kaise|logic/.test(moodTxt) ? '#a78bfa' :
        /news|weather|today|aaj|khabar|search|found|result/.test(moodTxt) ? '#fbbf24' :
        '#00e5ff'
      )

      // Auto-memory: extract facts every 6 messages
      const allMsgs = [...newMsgs, { role: 'assistant', content: full }]
      if (allMsgs.length > 0 && allMsgs.length % 6 === 0) {
        extractAndSaveMemory(allMsgs.slice(-12))
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setMsgs([...newMsgs, { id: uid(), role: 'assistant', content: '⚠️ Network issue — retry karo!', ts: Date.now() }])
      }
    } finally {
      setStreaming(false); setStreamText(''); setStreamThink(''); setStreamProv('')
    }
  }, [inp, streaming, msgs, chatMode, tts])

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
    if (e.key === 'Escape') { setCmdOpen(false) }
  }

  function selectCmd(cmd: string) {
    setInp(cmd + ' '); setCmdOpen(false)
    setTimeout(() => { inpRef.current?.focus() }, 50)
  }

  const curMode = MODES.find(m => m.id === chatMode) || MODES[0]
  const filteredCmds = CMDS.filter(c => c.cmd.slice(1).includes(cmdFilter) || c.desc.toLowerCase().includes(cmdFilter))
  const displayMsgs = showBookmarks
    ? msgs.filter(m => m.bookmarked)
    : search.trim()
      ? msgs.filter(m => m.content.toLowerCase().includes(search.toLowerCase()))
      : msgs

  function renderMessages() {
    const els: React.ReactNode[] = []
    let lastDate = ''
    let lastRole = ''

    displayMsgs.forEach((msg, idx) => {
      const msgDate = dateLabel(msg.ts)
      if (msgDate !== lastDate) {
        els.push(
          <div key={'d-' + idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', margin: '4px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.04)' }} />
            <span style={{ fontSize: '11px', color: '#1e3248', fontWeight: 600, letterSpacing: '0.5px', padding: '3px 10px', background: 'rgba(0,229,255,0.03)', borderRadius: '10px', border: '1px solid rgba(0,229,255,0.05)' }}>{msgDate}</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.04)' }} />
          </div>
        )
        lastDate = msgDate
      }

      const isContextOpen = contextMsg === msg.id
      lastRole = msg.role

      if (msg.role === 'user') {
        els.push(
          <div key={msg.id} style={{ padding: '2px 14px', animation: 'fadeUp 0.15s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ maxWidth: '82%', position: 'relative' }}>
                {isContextOpen && (
                  <div style={{ position: 'absolute', top: '0', right: '110%', background: 'rgba(8,13,24,0.98)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '10px', padding: '4px', zIndex: 20, display: 'flex', gap: '4px', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
                    <button onClick={() => { navigator.clipboard?.writeText(msg.content); setContextMsg(null) }} style={{ background: 'none', border: 'none', color: '#7ca5c0', cursor: 'pointer', fontSize: '12px', padding: '5px 8px', borderRadius: '6px', fontFamily: 'inherit' }}>������ Copy</button>
                    <button onClick={() => { setInp(msg.content); setContextMsg(null) }} style={{ background: 'none', border: 'none', color: '#7ca5c0', cursor: 'pointer', fontSize: '12px', padding: '5px 8px', borderRadius: '6px', fontFamily: 'inherit' }}>✏️ Edit</button>
                    <button onClick={() => deleteMsg(msg.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px', padding: '5px 8px', borderRadius: '6px', fontFamily: 'inherit' }}>������️</button>
                  </div>
                )}
                <div onContextMenu={e => { e.preventDefault(); setContextMsg(isContextOpen ? null : msg.id) }}
                  style={{ background: 'linear-gradient(135deg, rgba(0,80,180,0.2), rgba(0,119,255,0.15))', border: '1px solid rgba(0,119,255,0.2)', borderRadius: '16px 16px 3px 16px', padding: '9px 14px', fontSize: '14px', color: '#ddeeff', lineHeight: '1.65', cursor: 'default', wordBreak: 'break-word' }}>
                  {msg.content}
                </div>
                <div style={{ fontSize: '10px', color: '#1e3248', textAlign: 'right', marginTop: '3px', paddingRight: '2px' }}>{timeStr(msg.ts)}</div>
              </div>
            </div>
          </div>
        )
      } else {
        els.push(
          <div key={msg.id} style={{ padding: '5px 14px', animation: 'fadeUp 0.15s ease' }}>
            <div style={{ display: 'flex', gap: '9px', maxWidth: '820px', margin: '0 auto' }}>
              <div style={{ width: '26px', height: '26px', background: 'linear-gradient(135deg, #003fa3, #00e5ff)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900, color: '#000', flexShrink: 0, marginTop: '2px', boxShadow: '0 2px 8px rgba(0,229,255,0.2)' }}>J</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {msg.thinking && <ThinkBlock text={msg.thinking} />}
                {msg.imageUrl && <ImageMsg url={msg.imageUrl} prompt={msg.content} />}
                {msg.videoUrl && (
                  <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: '10px', padding: '12px', maxWidth: '280px' }}>
                    <div style={{ fontSize: '13px', marginBottom: '8px', color: '#6a6a88' }}>{msg.content}</div>
                    <a href={msg.videoUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '6px', padding: '6px 12px', color: '#a78bfa', textDecoration: 'none', fontSize: '12px' }}>▶ Watch Video</a>
                  </div>
                )}
                {!msg.imageUrl && !msg.videoUrl && (
                  <div style={{ fontSize: '14px', color: '#c4dff0', lineHeight: '1.75' }}>
                    <MdText text={msg.content} />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '7px', flexWrap: 'wrap' }}>
                  {!msg.imageUrl && !msg.videoUrl && <CopyBtn text={msg.content} />}
                  {tts && !msg.imageUrl && (
                    <button onClick={() => speak(msg.content)} style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '5px', color: '#00e5ff55', cursor: 'pointer', fontSize: '12px', padding: '3px 8px', fontFamily: 'inherit' }}>������ Suno</button>
                  )}
                  <button onClick={() => toggleBookmark(msg.id)}
                      title={msg.bookmarked ? 'Remove bookmark' : 'Bookmark'}
                      style={{ background: msg.bookmarked ? 'rgba(251,191,36,0.12)' : 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '2px 5px', borderRadius: '5px', opacity: msg.bookmarked ? 1 : 0.28, color: '#fbbf24', transition: 'all 0.12s' }}>
                      {msg.bookmarked ? '⭐' : '☆'}
                    </button>
                  {['������','❤️','������','������'].map(em => (
                    <button key={em} onClick={() => addReaction(msg.id, em)}
                      style={{ background: msg.reactions?.includes(em) ? 'rgba(255,255,255,0.1)' : 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '2px 4px', borderRadius: '5px', opacity: msg.reactions?.includes(em) ? 1 : 0.25, transition: 'all 0.12s' }}>
                      {em}
                    </button>
                  ))}
                  {!msg.imageUrl && !msg.videoUrl && msg.content.split(/\s+/).length > 150 && (
                    <span style={{ fontSize: '10px', color: '#1e3248', padding: '1px 4px' }}
                      title='Estimated reading time'>
                      ������ {Math.ceil(msg.content.split(/\s+/).length / 200)}min
                    </span>
                  )}
                  {msg.provider && (
                    <button onClick={() => setCascadeOpen(true)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#1e3248', marginLeft: 'auto', padding: '2px 5px', borderRadius: '4px', fontFamily: 'inherit', transition: 'color 0.1s' }}
                      title="Model cascade">
                      ������ {msg.provider} ▾
                    </button>
                  )}
                  {!msg.provider && <span style={{ fontSize: '10px', color: '#0e2030', marginLeft: 'auto' }}>{timeStr(msg.ts)}</span>}
                </div>
                {msg.reactions && msg.reactions.length > 0 && (
                  <div style={{ marginTop: '5px', fontSize: '14px', letterSpacing: '2px' }}>{msg.reactions.join('')}</div>
                )}
                {idx === displayMsgs.length - 1 && msg.role === 'assistant' && !streaming && (
                  <button onClick={() => {
                    const lastUser = [...msgs].reverse().find(m => m.role === 'user')
                    if (lastUser) { setMsgs(prev => prev.slice(0, -1)); send(lastUser.content) }
                  }}
                    style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '8px', color: '#1e3a52', cursor: 'pointer', padding: '5px 10px', fontSize: '11px', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                    ↺ Regenerate
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }
    })
    return els
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 80% 40% at 50% 0%, ' + moodGlow + '11 0%, #080d18 65%)', transition: 'background 1.5s ease', color: '#ddeeff', fontFamily: "'Inter','Noto Sans Devanagari',sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Puter.js — client-side GPT-4o-mini fallback */}
      <Script src="https://js.puter.com/v2/" strategy="afterInteractive" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .math-block { display: block; text-align: center; font-family: 'Georgia', serif; font-size: 16px; color: #a8d8ff; padding: 8px 0; letter-spacing: 0.5px; }
        .math-inline { font-family: 'Georgia', serif; font-size: 14px; color: #a8d8ff; font-style: italic; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(5px) } to { opacity:1; transform:translateY(0) } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes slideDown { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes recording { 0%,100%{box-shadow:0 0 0 0 rgba(248,113,113,0)} 50%{box-shadow:0 0 0 6px rgba(248,113,113,0.15)} }
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 3px }
        ::-webkit-scrollbar-thumb { background: rgba(0,229,255,0.15); border-radius: 3px }
        textarea { resize: none; }
        textarea::placeholder { color: #1a3048; }
        .tool-btn:hover { background: rgba(0,229,255,0.1) !important; color: #00e5ff !important; }
        .send-btn:hover { filter: brightness(1.12); transform: translateY(-1px); }
        .send-btn:active { transform: scale(0.97); }
        .cmd-opt:hover { background: rgba(0,229,255,0.06) !important; }
        .quick-btn:hover { border-color: rgba(0,229,255,0.25) !important; background: rgba(0,229,255,0.05) !important; }
        .suggest-btn:hover { background: rgba(0,229,255,0.12) !important; border-color: rgba(0,229,255,0.3) !important; }
      `}</style>

      {isDragging && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,229,255,0.06)', border: '2px dashed rgba(0,229,255,0.3)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: '18px', color: '#00e5ff88', fontWeight: 700, textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>������️</div>
            Drop image here to analyze
          </div>
        </div>
      )}

      {cascadeOpen && <CascadeDrawer mode={chatMode} onClose={() => setCascadeOpen(false)} onChange={changeMode} forcedProvider={forcedProvider} onForceProvider={p => { setForcedProvider(p); setCascadeOpen(false) }} />}

      <Sidebar isOpen={sidebar} onClose={() => setSidebar(false)} />

      <header style={{ flexShrink: 0, height: '52px', background: 'rgba(6,10,18,0.97)', borderBottom: '1px solid rgba(0,229,255,0.07)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '10px', zIndex: 10, backdropFilter: 'blur(16px)' }}>
        <button onClick={() => setSidebar(true)} style={{ background: 'none', border: 'none', color: '#2a5070', cursor: 'pointer', padding: '6px', borderRadius: '8px', fontSize: '18px', lineHeight: 1, fontFamily: 'inherit' }}>☰</button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #003fa3, #00e5ff)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900, color: '#000', boxShadow: '0 0 10px rgba(0,229,255,0.25)', flexShrink: 0 }}>J</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#ddeeff', letterSpacing: '0.8px', lineHeight: 1.1 }}>JARVIS</div>
            <div style={{ fontSize: '9px', color: '#1a3048', letterSpacing: '2px' }}>LIFE OS v10.62</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <button onClick={() => setShowBookmarks(v => !v)} className="tool-btn"
            style={{ background: showBookmarks ? 'rgba(251,191,36,0.1)' : 'none', border: '1px solid', borderColor: showBookmarks ? 'rgba(251,191,36,0.3)' : 'transparent', borderRadius: '6px', color: showBookmarks ? '#fbbf24' : '#2a5070', cursor: 'pointer', padding: '5px 7px', fontSize: '13px', fontFamily: 'inherit', transition: 'all 0.12s' }} title="Bookmarks">{showBookmarks ? '⭐' : '☆'}</button>
          <button onClick={() => setSearchOpen(v => !v)} className="tool-btn"
            style={{ background: searchOpen ? 'rgba(0,229,255,0.08)' : 'none', border: '1px solid', borderColor: searchOpen ? 'rgba(0,229,255,0.2)' : 'transparent', borderRadius: '6px', color: searchOpen ? '#00e5ff' : '#2a5070', cursor: 'pointer', padding: '5px 7px', fontSize: '13px', fontFamily: 'inherit', transition: 'all 0.12s' }} title="Search (Ctrl+F)">������</button>
          <button onClick={toggleTts} className="tool-btn"
            style={{ background: tts ? 'rgba(0,229,255,0.08)' : 'none', border: '1px solid', borderColor: tts ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.04)', borderRadius: '6px', color: tts ? '#00e5ff' : '#1e3248', cursor: 'pointer', padding: '5px 7px', fontSize: '11px', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.12s' }}>
            {tts ? '������ ON' : '������ TTS'}
          </button>
          <button onClick={clearChat} className="tool-btn"
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', color: '#2a5070', cursor: 'pointer', padding: '5px 7px', fontSize: '11px', fontFamily: 'inherit', transition: 'all 0.12s' }}>Clear</button>
          <button onClick={exportChat} className="tool-btn" title="Export chat as .txt"
            style={{ background: 'none', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '6px', color: '#1e4a60', cursor: 'pointer', padding: '5px 7px', fontSize: '11px', fontFamily: 'inherit', transition: 'all 0.12s' }}>������</button>
          <button title={'Memory: ' + autoMemory.length + ' facts saved'}
            onClick={() => { if (autoMemory.length && confirm('Memory clear karein? (' + autoMemory.length + ' facts)')) { setAutoMemory([]); try { localStorage.removeItem(MEMSTORE) } catch {} } }}
            style={{ position: 'relative', background: memBadge ? 'rgba(52,211,153,0.1)' : 'none', border: '1px solid ' + (memBadge ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.04)'), borderRadius: '6px', color: autoMemory.length ? '#34d399' : '#1a2a38', cursor: 'pointer', padding: '5px 7px', fontSize: '11px', fontFamily: 'inherit', transition: 'all 0.3s' }}>
            ������{autoMemory.length > 0 && <span style={{ position: 'absolute', top: '-3px', right: '-3px', background: '#34d399', borderRadius: '50%', width: '12px', height: '12px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700 }}>{autoMemory.length}</span>}
          </button>
        </div>
      </header>

      {searchOpen && (
        <div style={{ flexShrink: 0, padding: '7px 12px', background: 'rgba(6,10,18,0.95)', borderBottom: '1px solid rgba(0,229,255,0.06)', animation: 'slideDown 0.12s ease' }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Messages mein search karo..."
            style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '8px', color: '#ddeeff', padding: '7px 12px', fontSize: '13px', width: '100%', outline: 'none', fontFamily: 'inherit' }} />
          {search && <div style={{ fontSize: '10px', color: '#1e3248', marginTop: '3px' }}>{displayMsgs.length} result{displayMsgs.length !== 1 ? 's' : ''}</div>}
        </div>
      )}

      <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '8px 0 4px', scrollBehavior: 'smooth' }}>
        {msgs.length === 0 && !streaming ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px', padding: '20px', animation: 'fadeUp 0.3s ease' }}>
            <div style={{ position: 'relative', width: '76px', height: '76px' }}>
              <div style={{ position: 'absolute', inset: '-10px', borderRadius: '50%', border: '1px solid rgba(0,229,255,0.1)', animation: 'recording 3s ease-in-out infinite' }} />
              <div style={{ width: '76px', height: '76px', background: 'linear-gradient(135deg, #002fa3, #00e5ff)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 900, color: '#000', boxShadow: '0 0 30px rgba(0,229,255,0.25)' }}>J</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '21px', fontWeight: 700, color: '#ddeeff', marginBottom: '5px' }}>
  {(() => {
    const h = new Date().getHours()
    return h >= 5 && h < 12 ? 'Subah Bakhair Pranshu ☀️' :
           h >= 12 && h < 17 ? 'Namaste Pranshu ������' :
           h >= 17 && h < 21 ? 'Shubh Sham Pranshu ������' : 'Raat Mubarak Pranshu ������'
  })()}
</div>
              <div style={{ fontSize: '12px', color: '#1e3248' }}>JARVIS ready hai • Type <code style={{ color: '#00e5ff55', background: 'rgba(0,229,255,0.06)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>/</code> for commands</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', maxWidth: '340px', width: '100%' }}>
              {getSmartPrompts().map(q => (
                <button key={q.l} className="quick-btn"
                  onClick={() => { if (q.m.endsWith(' ') || q.m === '/pass') { if (q.m === '/pass') send('/pass'); else setInp(q.m) } else send(q.m) }}
                  title={q.cat}
                  style={{ background: 'rgba(0,229,255,0.02)', border: '1px solid rgba(0,229,255,0.07)', borderRadius: '10px', color: '#4a7090', cursor: 'pointer', padding: '10px 12px', fontSize: '12px', textAlign: 'left', transition: 'all 0.12s', fontFamily: 'inherit', position: 'relative' }}>
                  {q.l}
                  <span style={{ position: 'absolute', top: '3px', right: '5px', fontSize: '8px', color: '#0e2030', opacity: 0.6 }}>{q.cat}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <div style={{ fontSize: '10px', color: '#0e2030' }}>Ctrl+K · Ctrl+F · Paste image</div>
              <button onClick={() => { /* force re-render by toggling dummy state */ setSuggestions([]) }}
                title="Prompts refresh karo"
                style={{ background: 'none', border: '1px solid rgba(0,229,255,0.06)', borderRadius: '6px', color: '#0e2030', cursor: 'pointer', padding: '2px 7px', fontSize: '10px', fontFamily: 'inherit' }}>
                ↻ refresh
              </button>
            </div>
          </div>
        ) : (
          renderMessages()
        )}

        {streaming && (
          <div style={{ padding: '5px 14px', animation: 'fadeUp 0.15s ease' }}>
            <div style={{ display: 'flex', gap: '9px', maxWidth: '820px', margin: '0 auto' }}>
              <div style={{ width: '26px', height: '26px', background: 'linear-gradient(135deg, #003fa3, #00e5ff)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900, color: '#000', flexShrink: 0, marginTop: '2px' }}>J</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {streamThink && <ThinkBlock text={streamThink} />}
                <div style={{ fontSize: '14px', color: '#c4dff0', lineHeight: '1.75' }}>
                  {streamText ? (
                    <><MdText text={streamText} /><span style={{ display: 'inline-block', width: '2px', height: '13px', background: '#00e5ff', marginLeft: '2px', animation: 'blink 0.7s infinite', verticalAlign: 'middle' }} /></>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0' }}>
                      {[0,1,2].map(i => <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: curMode.color, animation: `blink 1.3s infinite ${i * 0.22}s` }} />)}
                      <span style={{ fontSize: '12px', color: '#1a3048' }}>{streamProv || curMode.icon + ' ' + curMode.label}...</span>
                    </div>
                  )}
                </div>
                {streamProv && streamText && <div style={{ fontSize: '10px', color: '#0e2030', marginTop: '4px' }}>{streamProv}</div>}
              </div>
            </div>
          </div>
        )}

        {!streaming && suggestions.length > 0 && msgs.length > 0 && (
          <div style={{ padding: '6px 14px 2px', animation: 'fadeUp 0.2s ease' }}>
            <div style={{ maxWidth: '820px', margin: '0 auto', paddingLeft: '35px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {suggestions.map(s => (
                  <button key={s} className="suggest-btn" onClick={() => { send(s); setSuggestions([]) }}
                    style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '20px', color: '#00e5ff88', cursor: 'pointer', fontSize: '12px', padding: '5px 12px', transition: 'all 0.12s', fontFamily: 'inherit' }}>
                    {s}
                  </button>
                ))}
                <button onClick={() => setSuggestions([])} style={{ background: 'none', border: 'none', color: '#1e3248', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', padding: '5px' }}>×</button>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} style={{ height: '4px' }} />
      </div>

      {showScrollBtn && (
        <button onClick={scrollToBottom}
          style={{ position: 'absolute', bottom: '90px', right: '16px', background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.25)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00e5ff', cursor: 'pointer', fontSize: '16px', zIndex: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', fontFamily: 'inherit', transition: 'all 0.15s' }}>
          ↓
        </button>
      )}

      <div style={{ flexShrink: 0, background: 'rgba(5,9,16,0.97)', borderTop: '1px solid rgba(0,229,255,0.06)', padding: '9px 12px 14px', backdropFilter: 'blur(16px)' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          {cmdOpen && filteredCmds.length > 0 && (
            <div style={{ background: 'rgba(5,9,16,0.99)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '12px', padding: '5px', marginBottom: '8px', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 -8px 32px rgba(0,0,0,0.6)', animation: 'slideDown 0.1s ease' }}>
              {filteredCmds.map(c => (
                <button key={c.cmd} className="cmd-opt" onClick={() => send(c.cmd)}
                  style={{ width: '100%', background: 'none', border: 'none', borderRadius: '7px', color: '#00e5ff88', cursor: 'pointer', padding: '7px 10px', fontSize: '13px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'inherit', transition: 'background 0.1s' }}>
                  <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{c.icon}</span>
                  <span style={{ color: '#00e5ff', fontWeight: 600 }}>{c.cmd}</span>
                  <span style={{ color: '#1e3248', fontSize: '12px' }}>{c.desc}</span>
                </button>
              ))}
            </div>
          )}

          <div style={{ background: 'rgba(10,18,30,0.95)', border: '1px solid', borderColor: streaming ? curMode.color + '33' : inp ? 'rgba(0,229,255,0.18)' : 'rgba(0,229,255,0.07)', borderRadius: '14px', padding: '10px 11px', transition: 'border-color 0.2s' }}>
            <textarea
              ref={inpRef} value={inp}
              onChange={e => setInp(e.target.value)}
              onKeyDown={handleKey} onPaste={handlePaste}
              placeholder={recording ? '������ Listening...' : 'Message JARVIS... (/ for commands)'}
              disabled={streaming} rows={1}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#ddeeff', fontSize: '14px', lineHeight: '1.5', maxHeight: '130px', overflowY: 'auto', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '7px' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => setCascadeOpen(true)}
                  style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '6px', color: curMode.color, cursor: 'pointer', padding: '4px 8px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', fontFamily: 'inherit' }}>
                  {curMode.icon} {curMode.label}{forcedProvider ? <span style={{ fontSize: '9px', background: curMode.color + '22', borderRadius: '4px', padding: '1px 4px', color: curMode.color, marginLeft: '2px' }}>������</span> : <span style={{ opacity: 0.4, fontSize: '9px' }}>▾</span>}
                </button>
                <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
                <button onClick={() => photoRef.current?.click()} className="tool-btn"
                  style={{ background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.07)', borderRadius: '6px', color: '#1e3a52', cursor: 'pointer', padding: '4px 8px', fontSize: '13px', transition: 'all 0.12s', fontFamily: 'inherit' }} title="Photo upload (or paste)">������</button>
                <button onClick={toggleVoice} className="tool-btn"
                  style={{ background: recording ? 'rgba(248,113,113,0.08)' : 'rgba(0,229,255,0.03)', border: '1px solid', borderColor: recording ? 'rgba(248,113,113,0.25)' : 'rgba(0,229,255,0.07)', borderRadius: '6px', color: recording ? '#f87171' : '#1e3a52', cursor: 'pointer', padding: '4px 8px', fontSize: '13px', animation: recording ? 'recording 1.5s infinite' : 'none', transition: 'all 0.12s', fontFamily: 'inherit' }}>
                  {recording ? '⏹' : '������'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {inp.length > 20 && <span style={{ fontSize: '10px', color: '#1a3048' }}>{inp.trim().split(/\s+/).filter(Boolean).length}w · {inp.length}c</span>}
                {streaming ? (
                  <button onClick={() => abortRef.current?.abort()}
                    style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', color: '#f87171', cursor: 'pointer', padding: '5px 13px', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit' }}>Stop</button>
                ) : (
                  <button onClick={() => send()} disabled={!inp.trim()} className={inp.trim() ? 'send-btn' : ''}
                    style={{ background: inp.trim() ? `linear-gradient(135deg, #0055cc, #00c8ff)` : 'rgba(0,229,255,0.04)', border: 'none', borderRadius: '8px', color: inp.trim() ? '#000' : '#0e2030', cursor: inp.trim() ? 'pointer' : 'not-allowed', padding: '6px 16px', fontSize: '13px', fontWeight: 700, transition: 'all 0.15s', fontFamily: 'inherit' }}>
                    Send ↑
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
