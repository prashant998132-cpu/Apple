'use client';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/shared/Sidebar';

interface Target {
  id: string;
  title: string;
  category: string;
  deadline: string;
  dailyMinutes: number;
  tasks: DailyTask[];
  progress: number;
  createdAt: number;
  streak: number;
  lastDone?: string;
}

interface DailyTask {
  id: string;
  text: string;
  done: boolean;
  day: string;
}

const CATEGORIES = [
  { id: 'study', icon: '📚', label: 'Padhai' },
  { id: 'fitness', icon: '💪', label: 'Fitness' },
  { id: 'skill', icon: '🎯', label: 'Skill' },
  { id: 'work', icon: '💼', label: 'Kaam' },
  { id: 'habit', icon: '🔥', label: 'Aadat' },
  { id: 'other', icon: '✨', label: 'Aur' },
];

function load(): Target[] {
  try { return JSON.parse(localStorage.getItem('jarvis_targets') || '[]'); } catch { return []; }
}
function save(t: Target[]) {
  try { localStorage.setItem('jarvis_targets', JSON.stringify(t)); } catch {}
}
function today() { return new Date().toDateString(); }

async function generateTasks(title: string, category: string, dailyMins: number, deadline: string): Promise<string[]> {
  const groqKey = localStorage.getItem('jarvis_key_GROQ_API_KEY') || '';
  if (!groqKey) return defaultTasks(category, dailyMins);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', max_tokens: 300,
        messages: [{
          role: 'system',
          content: 'You are a smart daily planner. Generate exactly 4-5 specific daily tasks in Hindi/Hinglish. Return ONLY a JSON array of strings, nothing else. Example: ["Task 1", "Task 2", "Task 3", "Task 4"]'
        }, {
          role: 'user',
          content: `Target: "${title}", Category: ${category}, Daily time: ${dailyMins} minutes, Deadline: ${deadline}. Generate practical daily tasks.`
        }]
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error('api');
    const d = await res.json();
    const text = d.choices?.[0]?.message?.content?.trim() || '[]';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed.slice(0, 5);
  } catch {}
  return defaultTasks(category, dailyMins);
}

function defaultTasks(category: string, mins: number): string[] {
  const map: Record<string, string[]> = {
    study:   [`${Math.round(mins*0.4)} min padhai karo`, 'Notes likho ya revise karo', 'Practice questions solve karo', 'Kal ka plan banao'],
    fitness: [`${mins} min exercise karo`, 'Warm up + cool down', 'Paani peeyo 2+ glass', 'Progress note karo'],
    skill:   [`${mins} min practice karo`, 'Ek naya concept seekho', 'Apply karo jo seekha', 'Review karo progress'],
    work:    [`${Math.round(mins*0.5)} min focused kaam`, 'Priority task complete karo', 'Review aur check karo', 'Kal ka plan'],
    habit:   [`Aaj ka routine follow karo`, `${mins} min dedicated time`, 'Track karo progress', 'Reflect karo evening mein'],
    other:   [`${mins} min kaam karo`, 'Ek step aage badho', 'Review karo kya kiya', 'Next step plan karo'],
  };
  return map[category] || map.other;
}

export default function TargetPage() {
  const [targets, setTargets]     = useState<Target[]>([]);
  const [showAdd, setShowAdd]     = useState(false);
  const [generating, setGen]      = useState(false);
  const [selected, setSelected]   = useState<Target|null>(null);
  const [title, setTitle]         = useState('');
  const [category, setCat]        = useState('study');
  const [deadline, setDeadline]   = useState('');
  const [dailyMins, setMins]      = useState(60);

  useEffect(() => { setTargets(load()); }, []);

  const addTarget = async () => {
    if (!title.trim()) return;
    setGen(true);
    const tasks = await generateTasks(title, category, dailyMins, deadline || '30 din mein');
    const t: Target = {
      id: Date.now().toString(),
      title: title.trim(),
      category,
      deadline: deadline || '',
      dailyMinutes: dailyMins,
      tasks: tasks.map((text, i) => ({ id: `t${i}`, text, done: false, day: today() })),
      progress: 0,
      createdAt: Date.now(),
      streak: 0,
    };
    const updated = [t, ...targets];
    setTargets(updated); save(updated);
    setTitle(''); setCat('study'); setDeadline(''); setMins(60);
    setShowAdd(false); setGen(false); setSelected(t);
  };

  const toggleTask = (targetId: string, taskId: string) => {
    const updated = targets.map(t => {
      if (t.id !== targetId) return t;
      const tasks = t.tasks.map(tk => tk.id === taskId && tk.day === today() ? { ...tk, done: !tk.done } : tk);
      const todayTasks = tasks.filter(tk => tk.day === today());
      const doneTasks  = todayTasks.filter(tk => tk.done);
      const progress   = todayTasks.length > 0 ? Math.round((doneTasks.length / todayTasks.length) * 100) : 0;
      const allDone    = todayTasks.length > 0 && doneTasks.length === todayTasks.length;
      const streak     = allDone && t.lastDone !== today() ? t.streak + 1 : t.streak;
      const lastDone   = allDone ? today() : t.lastDone;
      return { ...t, tasks, progress, streak, lastDone };
    });
    setTargets(updated); save(updated);
    const sel = updated.find(t => t.id === targetId) || null;
    setSelected(sel);
  };

  const resetDaily = (targetId: string) => {
    const updated = targets.map(t => {
      if (t.id !== targetId) return t;
      const tasks = t.tasks.map(tk => tk.day !== today() ? tk : { ...tk, done: false });
      return { ...t, tasks, progress: 0 };
    });
    setTargets(updated); save(updated);
    const sel = updated.find(t => t.id === targetId) || null;
    setSelected(sel);
  };

  const deleteTarget = (id: string) => {
    const updated = targets.filter(t => t.id !== id);
    setTargets(updated); save(updated); setSelected(null);
  };

  const cat = CATEGORIES.find(c => c.id === (selected?.category || category));

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#090d18', display: 'flex', flexDirection: 'column', fontFamily: "'Noto Sans Devanagari','Inter',sans-serif" }}>
      <div className="bg-grid"/>
      <Sidebar />

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 10px 58px', borderBottom: '1px solid rgba(255,255,255,.05)', background: 'rgba(9,13,24,.96)', backdropFilter: 'blur(10px)', flexShrink: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f4ff', letterSpacing: 2, fontFamily: "'Space Mono',monospace" }}>🎯 TARGET</div>
          <div style={{ fontSize: 9, color: '#1a3050', letterSpacing: 1 }}>Koi bhi goal — JARVIS plan banayega</div>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '7px 14px', borderRadius: 20, background: 'linear-gradient(135deg,rgba(0,229,255,.1),rgba(109,40,217,.1))', border: '1px solid rgba(0,229,255,.2)', color: '#00e5ff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Naya Target
        </button>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '12px', position: 'relative', zIndex: 1 }}>
        {targets.length === 0 && !showAdd && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
            <div style={{ fontSize: 48 }}>🎯</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#e8f4ff' }}>Koi target nahi abhi</div>
            <div style={{ fontSize: 12, color: '#1a3050', textAlign: 'center', maxWidth: 260 }}>
              Koi bhi goal set karo — padhai, fitness, skill, kaam — JARVIS daily plan banayega
            </div>
            <button onClick={() => setShowAdd(true)} style={{ padding: '10px 24px', borderRadius: 24, background: 'linear-gradient(135deg,#00e5ff20,#6d28d920)', border: '1px solid rgba(0,229,255,.25)', color: '#00e5ff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
              + Pehla Target Set Karo
            </button>
          </div>
        )}

        {/* Target List */}
        {!selected && targets.map(t => {
          const todayTasks = t.tasks.filter(tk => tk.day === today());
          const done = todayTasks.filter(tk => tk.done).length;
          const c = CATEGORIES.find(c => c.id === t.category);
          return (
            <div key={t.id} onClick={() => setSelected(t)}
              style={{ padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', marginBottom: 10, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>{c?.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f4ff' }}>{t.title}</div>
                  <div style={{ fontSize: 10, color: '#1a3050' }}>{c?.label} · {t.dailyMinutes} min/day {t.deadline && `· ${t.deadline} tak`}</div>
                </div>
                {t.streak > 0 && <div style={{ fontSize: 10, color: '#ffd600', background: 'rgba(255,214,0,.1)', border: '1px solid rgba(255,214,0,.2)', borderRadius: 20, padding: '2px 8px' }}>🔥 {t.streak}</div>}
              </div>
              {/* Progress bar */}
              <div style={{ height: 4, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${t.progress}%`, background: t.progress === 100 ? '#00e676' : 'linear-gradient(90deg,#00e5ff,#6d28d9)', borderRadius: 3, transition: 'width .4s' }}/>
              </div>
              <div style={{ marginTop: 6, fontSize: 10, color: '#1a4060' }}>{done}/{todayTasks.length} tasks aaj · {t.progress}% done</div>
            </div>
          );
        })}

        {/* Selected Target Detail */}
        {selected && (() => {
          const todayTasks = selected.tasks.filter(tk => tk.day === today());
          const done = todayTasks.filter(tk => tk.done).length;
          return (
            <div>
              <button onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#4a7096', fontSize: 12, cursor: 'pointer', marginBottom: 14, padding: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                Wapas
              </button>

              <div style={{ padding: '16px', borderRadius: 14, background: 'rgba(0,229,255,.04)', border: '1px solid rgba(0,229,255,.12)', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 26 }}>{CATEGORIES.find(c => c.id === selected.category)?.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#e8f4ff', marginBottom: 2 }}>{selected.title}</div>
                    <div style={{ fontSize: 10, color: '#1a4060' }}>{CATEGORIES.find(c => c.id === selected.category)?.label} · {selected.dailyMinutes} min/day {selected.deadline && `· ${selected.deadline} tak`}</div>
                  </div>
                  {selected.streak > 0 && <div style={{ fontSize: 13, color: '#ffd600' }}>🔥 {selected.streak} day streak</div>}
                </div>

                <div style={{ marginTop: 12, height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${selected.progress}%`, background: selected.progress === 100 ? '#00e676' : 'linear-gradient(90deg,#00e5ff,#6d28d9)', borderRadius: 4, transition: 'width .5s' }}/>
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: '#1a4060' }}>{done}/{todayTasks.length} tasks complete · {selected.progress}%</div>
              </div>

              <div style={{ fontSize: 10, color: '#1a4060', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Aaj ke Tasks</div>
              {todayTasks.length === 0
                ? <div style={{ fontSize: 12, color: '#1a3050', textAlign: 'center', padding: '20px 0' }}>Aaj ke tasks reset ho gaye</div>
                : todayTasks.map(task => (
                  <div key={task.id} onClick={() => toggleTask(selected.id, task.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 11, background: task.done ? 'rgba(0,230,118,.06)' : 'rgba(255,255,255,.025)', border: `1px solid ${task.done ? 'rgba(0,230,118,.15)' : 'rgba(255,255,255,.05)'}`, marginBottom: 8, cursor: 'pointer', transition: 'all .2s' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${task.done ? '#00e676' : 'rgba(255,255,255,.15)'}`, background: task.done ? '#00e676' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' }}>
                      {task.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#020917" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span style={{ fontSize: 13, color: task.done ? '#00e676' : '#c8e0f0', textDecoration: task.done ? 'line-through' : 'none', opacity: task.done ? 0.7 : 1 }}>{task.text}</span>
                  </div>
                ))
              }

              {selected.progress === 100 && (
                <div style={{ textAlign: 'center', padding: '14px', marginTop: 8, borderRadius: 12, background: 'rgba(0,230,118,.08)', border: '1px solid rgba(0,230,118,.2)', fontSize: 14, color: '#00e676' }}>
                  🎉 Aaj ke sab tasks complete! Kal phir aa jaana.
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => resetDaily(selected.id)} style={{ flex: 1, padding: '9px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: '#4a7096', fontSize: 11, cursor: 'pointer' }}>
                  🔄 Reset Aaj ke Tasks
                </button>
                <button onClick={() => deleteTarget(selected.id)} style={{ padding: '9px 14px', borderRadius: 10, background: 'rgba(255,68,68,.06)', border: '1px solid rgba(255,68,68,.12)', color: '#ff4444', fontSize: 11, cursor: 'pointer' }}>
                  🗑️ Delete
                </button>
              </div>
            </div>
          );
        })()}
      </main>

      {/* Add Target Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }} onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div style={{ width: '100%', background: '#0c1830', borderRadius: '18px 18px 0 0', padding: '20px 16px 32px', border: '1px solid rgba(0,229,255,.1)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e8f4ff', marginBottom: 4 }}>🎯 Naya Target</div>
            <div style={{ fontSize: 10, color: '#1a3050', marginBottom: 16 }}>Koi bhi goal — JARVIS daily tasks banayega</div>

            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Kya karna hai? (jaise: Guitar seekhna, 5km run, Python seekhna)"
              style={{ width: '100%', padding: '11px 13px', borderRadius: 10, background: '#0a1628', border: '1px solid rgba(0,229,255,.15)', color: '#e8f4ff', fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box', fontFamily: "'Noto Sans Devanagari','Inter',sans-serif" }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginBottom: 12 }}>
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCat(c.id)} style={{ padding: '9px 6px', borderRadius: 10, background: category === c.id ? 'rgba(0,229,255,.1)' : 'rgba(255,255,255,.03)', border: `1px solid ${category === c.id ? 'rgba(0,229,255,.25)' : 'rgba(255,255,255,.06)'}`, color: category === c.id ? '#00e5ff' : '#2a4060', cursor: 'pointer', fontSize: 12, fontWeight: category === c.id ? 600 : 400 }}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: '#1a3050', marginBottom: 5, letterSpacing: 1 }}>DEADLINE (optional)</div>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 9, background: '#0a1628', border: '1px solid rgba(255,255,255,.08)', color: '#e8f4ff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}/>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#1a3050', marginBottom: 5, letterSpacing: 1 }}>DAILY TIME</div>
                <select value={dailyMins} onChange={e => setMins(Number(e.target.value))}
                  style={{ padding: '9px 10px', borderRadius: 9, background: '#0a1628', border: '1px solid rgba(255,255,255,.08)', color: '#e8f4ff', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                  {[15,30,45,60,90,120].map(m => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
            </div>

            <button onClick={addTarget} disabled={!title.trim() || generating}
              style={{ width: '100%', padding: '13px', borderRadius: 12, background: title.trim() && !generating ? 'linear-gradient(135deg,#00e5ff,#0099cc)' : 'rgba(255,255,255,.05)', border: 'none', color: title.trim() && !generating ? '#020917' : '#1a3050', fontSize: 14, fontWeight: 700, cursor: title.trim() && !generating ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {generating
                ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.2)', borderTopColor: '#020917', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/> JARVIS plan bana raha hai...</>
                : '🎯 Target Set Karo'
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
