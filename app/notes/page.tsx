'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

type Note = { id: string; text: string; color: string; pinned: boolean; ts: number }

const COLORS = ['#00e5ff', '#a78bfa', '#34d399', '#f87171', '#fbbf24', '#f9a8d4']
const KEY = 'jarvis_notes_v1'

function load(): Note[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function save(n: Note[]) { try { localStorage.setItem(KEY, JSON.stringify(n)) } catch {} }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [text, setText] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [q, setQ] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const txtRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setNotes(load()) }, [])

  function addNote() {
    if (!text.trim()) return
    if (editId) {
      const updated = notes.map(n => n.id === editId ? { ...n, text: text.trim(), color } : n)
      setNotes(updated); save(updated); setEditId(null)
    } else {
      const n: Note = { id: uid(), text: text.trim(), color, pinned: false, ts: Date.now() }
      const updated = [n, ...notes]
      setNotes(updated); save(updated)
    }
    setText(''); txtRef.current?.focus()
  }

  function deleteNote(id: string) {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated); save(updated)
    if (editId === id) { setEditId(null); setText('') }
  }

  function pinNote(id: string) {
    const updated = notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n)
    setNotes(updated); save(updated)
  }

  function startEdit(n: Note) {
    setEditId(n.id); setText(n.text); setColor(n.color)
    setTimeout(() => { txtRef.current?.focus(); txtRef.current?.select() }, 50)
  }

  const filtered = q.trim()
    ? notes.filter(n => n.text.toLowerCase().includes(q.toLowerCase()))
    : notes

  const pinned = filtered.filter(n => n.pinned)
  const unpinned = filtered.filter(n => !n.pinned)
  const sorted = [...pinned, ...unpinned]

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote()
    if (e.key === 'Escape') { setEditId(null); setText('') }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", padding: '0 0 80px' }}>
      <style>{`* { box-sizing: border-box } @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} } .note-card:hover .note-actions { opacity:1 } .note-actions { opacity:0; transition:opacity 0.15s }`}</style>

      <div style={{ background: 'rgba(8,13,24,0.95)', borderBottom: '1px solid rgba(0,229,255,0.07)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/" style={{ color: '#2a5070', fontSize: '18px', textDecoration: 'none' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#ddeeff' }}>📝 Quick Notes</div>
          <div style={{ fontSize: '11px', color: '#2a5070' }}>{notes.length} notes</div>
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search..."
          style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '8px', color: '#ddeeff', padding: '6px 10px', fontSize: '12px', width: '120px', outline: 'none' }} />
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '14px' }}>
        {/* Add note */}
        <div style={{ background: 'rgba(12,20,34,0.9)', border: `1px solid ${color}33`, borderRadius: '14px', padding: '14px', marginBottom: '16px', borderLeftWidth: '3px', borderLeftColor: color }}>
          <textarea ref={txtRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey}
            placeholder="Kuch note karo... (Ctrl+Enter to save)"
            rows={3}
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#ddeeff', fontSize: '14px', lineHeight: '1.6', resize: 'none', fontFamily: 'inherit', marginBottom: '10px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  style={{ width: '18px', height: '18px', borderRadius: '50%', background: c, border: color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer', transition: 'transform 0.15s', transform: color === c ? 'scale(1.2)' : 'scale(1)' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {editId && (
                <button onClick={() => { setEditId(null); setText('') }}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', color: '#4a7090', cursor: 'pointer', padding: '5px 10px', fontSize: '12px', fontFamily: 'inherit' }}>Cancel</button>
              )}
              <button onClick={addNote} disabled={!text.trim()}
                style={{ background: text.trim() ? `${color}22` : 'rgba(0,229,255,0.04)', border: `1px solid ${text.trim() ? color + '44' : 'rgba(0,229,255,0.08)'}`, borderRadius: '7px', color: text.trim() ? color : '#2a5070', cursor: text.trim() ? 'pointer' : 'not-allowed', padding: '5px 14px', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s', fontFamily: 'inherit' }}>
                {editId ? 'Update' : '+ Add'}
              </button>
            </div>
          </div>
        </div>

        {/* Notes grid */}
        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', color: '#1e3248', fontSize: '14px', padding: '40px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>📝</div>
            Koi notes nahi. Likho kuch!
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
          {sorted.map(n => (
            <div key={n.id} className="note-card"
              style={{ background: 'rgba(12,20,34,0.9)', border: `1px solid ${n.color}22`, borderRadius: '12px', padding: '12px', borderLeftWidth: '3px', borderLeftColor: n.pinned ? n.color : n.color + '66', position: 'relative', animation: 'fadeUp 0.18s ease', minHeight: '80px', cursor: 'pointer' }}
              onDoubleClick={() => startEdit(n)}>
              {n.pinned && <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '10px', opacity: 0.5 }}>📌</div>}
              <div style={{ fontSize: '13px', color: '#c8dff0', lineHeight: '1.5', wordBreak: 'break-word', whiteSpace: 'pre-wrap', marginBottom: '28px' }}>{n.text}</div>
              <div style={{ position: 'absolute', bottom: '8px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', color: '#1e3248' }}>{new Date(n.ts).toLocaleDateString('en', { day: 'numeric', month: 'short' })}</span>
                <div className="note-actions" style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => pinNote(n.id)} title={n.pinned ? 'Unpin' : 'Pin'}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '2px', opacity: n.pinned ? 1 : 0.5 }}>📌</button>
                  <button onClick={() => startEdit(n)} title="Edit"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '2px', opacity: 0.6 }}>✏️</button>
                  <button onClick={() => deleteNote(n.id)} title="Delete"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '2px', opacity: 0.5 }}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
