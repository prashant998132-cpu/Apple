'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

type Priority = 'high' | 'medium' | 'low'
type Todo = { id: string; text: string; done: boolean; priority: Priority; tag: string; dueDate: string; createdAt: number }

const P_CONFIG: Record<Priority, { color: string; icon: string; label: string }> = {
  high:   { color: '#f87171', icon: '🔴', label: 'High' },
  medium: { color: '#fbbf24', icon: '🟡', label: 'Medium' },
  low:    { color: '#34d399', icon: '🟢', label: 'Low' },
}
const TAGS = ['Work', 'Personal', 'Study', 'Health', 'Shopping', 'Other']
const KEY = 'jarvis_todos_v1'

function load(): Todo[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function save(t: Todo[]) { try { localStorage.setItem(KEY, JSON.stringify(t)) } catch {} }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,4) }
function today() { return new Date().toISOString().slice(0,10) }

function isOverdue(t: Todo) { return !t.done && t.dueDate && t.dueDate < today() }

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [tag, setTag] = useState('Personal')
  const [dueDate, setDueDate] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | Priority>('all')
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const inpRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTodos(load()) }, [])

  function addTodo() {
    if (!text.trim()) return
    if (editId) {
      const updated = todos.map(t => t.id === editId ? { ...t, text: text.trim(), priority, tag, dueDate } : t)
      setTodos(updated); save(updated); setEditId(null)
    } else {
      const t: Todo = { id: uid(), text: text.trim(), done: false, priority, tag, dueDate, createdAt: Date.now() }
      const updated = [t, ...todos]; setTodos(updated); save(updated)
    }
    setText(''); setDueDate('')
  }

  function toggle(id: string) {
    const updated = todos.map(t => t.id === id ? { ...t, done: !t.done } : t)
    setTodos(updated); save(updated)
  }

  function deleteTodo(id: string) {
    const updated = todos.filter(t => t.id !== id)
    setTodos(updated); save(updated)
    if (editId === id) { setEditId(null); setText('') }
  }

  function startEdit(t: Todo) {
    setEditId(t.id); setText(t.text); setPriority(t.priority); setTag(t.tag); setDueDate(t.dueDate || '')
    setTimeout(() => inpRef.current?.focus(), 50)
  }

  function clearDone() {
    const updated = todos.filter(t => !t.done); setTodos(updated); save(updated)
  }

  const filtered = todos.filter(t => {
    if (search && !t.text.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'active') return !t.done
    if (filter === 'done') return t.done
    if (filter === 'high' || filter === 'medium' || filter === 'low') return t.priority === filter && !t.done
    return true
  }).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const po = { high: 0, medium: 1, low: 2 }
    return po[a.priority] - po[b.priority]
  })

  const total = todos.length
  const done = todos.filter(t => t.done).length
  const overdue = todos.filter(isOverdue).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", padding: '0 0 80px' }}>
      <style>{`* { box-sizing: border-box } @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} } .todo-row:hover { background: rgba(0,229,255,0.03) !important; } .del-btn { opacity: 0; transition: opacity 0.12s; } .todo-row:hover .del-btn { opacity: 1; }`}</style>

      <div style={{ background: 'rgba(8,13,24,0.95)', borderBottom: '1px solid rgba(0,229,255,0.07)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '10px', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/" style={{ color: '#2a5070', fontSize: '18px', textDecoration: 'none' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#ddeeff' }}>✅ Todo List</div>
          <div style={{ fontSize: '11px', color: '#2a5070' }}>{done}/{total} done{overdue > 0 ? ` · ⚠️ ${overdue} overdue` : ''}</div>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
          style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '7px', color: '#ddeeff', padding: '5px 10px', fontSize: '12px', width: '100px', outline: 'none', fontFamily: 'inherit' }} />
      </div>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '14px' }}>
        {/* Add form */}
        <div style={{ background: 'rgba(12,20,34,0.9)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '14px', padding: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input ref={inpRef} value={text} onChange={e => setText(e.target.value)} placeholder="Kya karna hai..." onKeyDown={e => e.key === 'Enter' && addTodo()}
              style={{ flex: 1, background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '8px', color: '#ddeeff', padding: '9px 12px', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }} />
            <button onClick={addTodo} disabled={!text.trim()}
              style={{ background: text.trim() ? 'linear-gradient(135deg, #0055cc, #00c8ff)' : 'rgba(0,229,255,0.04)', border: 'none', borderRadius: '8px', color: text.trim() ? '#000' : '#1e3248', cursor: text.trim() ? 'pointer' : 'not-allowed', padding: '9px 16px', fontSize: '13px', fontWeight: 700, transition: 'all 0.15s', fontFamily: 'inherit', flexShrink: 0 }}>
              {editId ? 'Update' : '+ Add'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Priority */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['high','medium','low'] as Priority[]).map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  style={{ background: priority === p ? P_CONFIG[p].color + '18' : 'none', border: `1px solid ${priority === p ? P_CONFIG[p].color + '44' : 'rgba(0,229,255,0.07)'}`, borderRadius: '6px', color: priority === p ? P_CONFIG[p].color : '#1e3248', cursor: 'pointer', padding: '4px 8px', fontSize: '11px', fontWeight: priority === p ? 700 : 400, transition: 'all 0.12s', fontFamily: 'inherit' }}>
                  {P_CONFIG[p].icon} {P_CONFIG[p].label}
                </button>
              ))}
            </div>
            {/* Tag */}
            <select value={tag} onChange={e => setTag(e.target.value)}
              style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '6px', color: '#4a7090', padding: '4px 8px', fontSize: '11px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {/* Due date */}
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '6px', color: '#4a7090', padding: '4px 8px', fontSize: '11px', outline: 'none', fontFamily: 'inherit', colorScheme: 'dark' }} />
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '5px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '2px' }}>
          {(['all','active','done','high','medium','low'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ background: filter === f ? 'rgba(0,229,255,0.1)' : 'rgba(0,229,255,0.03)', border: '1px solid', borderColor: filter === f ? 'rgba(0,229,255,0.25)' : 'rgba(0,229,255,0.07)', borderRadius: '20px', color: filter === f ? '#00e5ff' : '#2a5070', cursor: 'pointer', padding: '4px 12px', fontSize: '11px', fontWeight: filter === f ? 700 : 400, whiteSpace: 'nowrap', transition: 'all 0.12s', fontFamily: 'inherit' }}>
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'done' ? 'Done' : P_CONFIG[f as Priority].icon + ' ' + P_CONFIG[f as Priority].label}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div style={{ background: 'rgba(0,229,255,0.06)', borderRadius: '4px', height: '4px', marginBottom: '14px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #0055cc, #00e5ff)', borderRadius: '4px', width: (done/total*100)+'%', transition: 'width 0.4s ease' }} />
          </div>
        )}

        {/* Todo list */}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#1e3248', padding: '40px', fontSize: '14px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>✅</div>
            {filter === 'done' ? 'Koi completed task nahi' : 'Koi task nahi!'}
          </div>
        )}

        {filtered.map(t => {
          const p = P_CONFIG[t.priority]
          const overdue = isOverdue(t)
          return (
            <div key={t.id} className="todo-row" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '11px 12px', marginBottom: '7px', background: 'rgba(12,20,34,0.8)', border: `1px solid ${overdue ? 'rgba(248,113,113,0.15)' : 'rgba(0,229,255,0.05)'}`, borderRadius: '11px', cursor: 'pointer', transition: 'all 0.12s', animation: 'fadeUp 0.15s ease' }} onClick={() => toggle(t.id)}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${t.done ? p.color : 'rgba(255,255,255,0.12)'}`, background: t.done ? p.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px', transition: 'all 0.15s', fontSize: '11px', color: '#000' }}>
                {t.done ? '✓' : ''}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', color: t.done ? '#1e3248' : '#c8dff0', textDecoration: t.done ? 'line-through' : 'none', lineHeight: '1.4', wordBreak: 'break-word' }}>{t.text}</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '9px', color: p.color, background: p.color + '12', padding: '1px 6px', borderRadius: '10px', fontWeight: 600 }}>{p.icon} {p.label}</span>
                  <span style={{ fontSize: '9px', color: '#1e3248', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: '10px' }}>{t.tag}</span>
                  {t.dueDate && <span style={{ fontSize: '9px', color: overdue ? '#f87171' : '#1e3248', fontWeight: overdue ? 700 : 400 }}>{overdue ? '⚠️ ' : ''}Due {t.dueDate}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button className="del-btn" onClick={e => { e.stopPropagation(); startEdit(t) }} style={{ background: 'none', border: 'none', color: '#2a5070', cursor: 'pointer', fontSize: '12px', padding: '3px', fontFamily: 'inherit' }}>✏️</button>
                <button className="del-btn" onClick={e => { e.stopPropagation(); deleteTodo(t.id) }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px', padding: '3px', fontFamily: 'inherit' }}>🗑️</button>
              </div>
            </div>
          )
        })}

        {done > 0 && (
          <button onClick={clearDone} style={{ background: 'none', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '9px', color: '#f87171', cursor: 'pointer', fontSize: '12px', padding: '8px', width: '100%', marginTop: '8px', fontFamily: 'inherit', transition: 'all 0.12s' }}>
            🗑️ Clear {done} completed task{done !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  )
}
