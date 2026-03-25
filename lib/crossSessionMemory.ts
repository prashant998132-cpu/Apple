'use client';

export interface MemoryFact {
  id: string; type: 'fact' | 'preference' | 'goal' | 'pattern' | 'correction';
  text: string; confidence: number; mentions: number; lastSeen: number; tags: string[];
}

const KEY = 'jarvis_cross_memory';
const MAX_FACTS = 200;

export function loadMemoryFacts(): MemoryFact[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function saveFacts(facts: MemoryFact[]) {
  if (typeof window === 'undefined') return;
  try {
    const data = JSON.stringify(facts.slice(-MAX_FACTS));
    localStorage.setItem(KEY, data);
    saveToIDB(facts.slice(-MAX_FACTS)).catch(() => {});
  } catch {}
}

async function saveToIDB(facts: MemoryFact[]) {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('JarvisDB', 3);
    req.onupgradeneeded = e => { const db = (e.target as IDBOpenDBRequest).result; if (!db.objectStoreNames.contains('memory')) db.createObjectStore('memory'); };
    req.onsuccess = e => { const db = (e.target as IDBOpenDBRequest).result; const tx = db.transaction('memory', 'readwrite'); tx.objectStore('memory').put(facts, 'facts'); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(); };
    req.onerror = () => reject();
  });
}

export async function loadFromIDB(): Promise<MemoryFact[]> {
  return new Promise(resolve => {
    const req = indexedDB.open('JarvisDB', 3);
    req.onsuccess = e => { const db = (e.target as IDBOpenDBRequest).result; if (!db.objectStoreNames.contains('memory')) { db.close(); resolve([]); return; } const tx = db.transaction('memory', 'readonly'); const gr = tx.objectStore('memory').get('facts'); gr.onsuccess = () => { db.close(); resolve(gr.result || []); }; gr.onerror = () => { db.close(); resolve([]); }; };
    req.onerror = () => resolve([]);
  });
}

export function extractAndStoreFacts(userMsg: string, aiResponse: string) {
  const facts = loadMemoryFacts(); const u = userMsg.toLowerCase(); const timestamp = Date.now();
  const nameMatch = userMsg.match(/(?:mera naam|my name is|main|I am|I'm)\s+([A-Z][a-z]+)/i);
  if (nameMatch) upsertFact(facts, { type: 'fact', text: `User ka naam ${nameMatch[1]} hai`, confidence: 0.9, tags: ['name', 'personal'] });
  const locMatch = userMsg.match(/(?:main|I|mujhe)\s+(?:rahta|rehta|stay|live|from)\s+(?:hoon|hun|in|at)?\s*([A-Za-z]+(?:\s[A-Za-z]+)?)/i);
  if (locMatch) upsertFact(facts, { type: 'fact', text: `User ${locMatch[1]} mein rehta hai`, confidence: 0.85, tags: ['location', 'personal'] });
  const examMatch = u.match(/(neet|jee|upsc|gate|cat|board|12th|10th|clat|ssc|ias)/);
  if (examMatch) upsertFact(facts, { type: 'goal', text: `User ${examMatch[1].toUpperCase()} exam prepare kar raha hai`, confidence: 0.85, tags: ['exam', 'goal'] });
  if (u.match(/jarvis|project|app|banaya|build|develop|kaam chal raha/)) upsertFact(facts, { type: 'pattern', text: 'User apna JARVIS AI app build kar raha hai', confidence: 0.95, tags: ['project', 'tech'] });
  const techMatch = u.match(/(javascript|python|react|nextjs|typescript|flutter|android|ios|web dev)/i);
  if (techMatch) upsertFact(facts, { type: 'preference', text: `User ${techMatch[1]} use karta hai`, confidence: 0.8, tags: ['tech', 'language'] });
  const topicKeywords: Record<string, string> = { weather: 'mausam/weather', crypto: 'crypto/finance', news: 'news/khabar', coding: 'coding help', study: 'study/padhai', food: 'khana/recipes' };
  for (const [kw, topic] of Object.entries(topicKeywords)) { if (u.includes(kw)) upsertFact(facts, { type: 'pattern', text: `User aksar ${topic} ke baare mein poochta hai`, confidence: 0.55, tags: ['topic'] }); }
  saveFacts(facts);
}

function upsertFact(facts: MemoryFact[], input: Omit<MemoryFact, 'id' | 'mentions' | 'lastSeen'>) {
  const existing = facts.find(f => f.type === input.type && f.tags.some(t => input.tags.includes(t)) && similarity(f.text, input.text) > 0.6);
  if (existing) { existing.mentions++; existing.confidence = Math.min(1, existing.confidence + 0.05); existing.lastSeen = Date.now(); }
  else facts.push({ ...input, id: `mem_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, mentions: 1, lastSeen: Date.now() });
}

function similarity(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\s+/)); const wb = new Set(b.toLowerCase().split(/\s+/)); let overlap = 0;
  wa.forEach(w => { if (wb.has(w)) overlap++; }); return overlap / Math.max(wa.size, wb.size);
}

export function getRelevantMemories(query: string, limit = 6): string[] {
  const facts = loadMemoryFacts(); if (!facts.length) return [];
  const q = query.toLowerCase().split(/\s+/);
  return facts.filter(f => f.confidence >= 0.5).map(f => ({ ...f, score: q.filter(w => f.text.toLowerCase().includes(w)).length * f.confidence * (f.mentions * 0.1 + 1) })).sort((a, b) => b.score - a.score).slice(0, limit).map(f => f.text);
}

export function getProactiveSuggestion(): string | null {
  const facts = loadMemoryFacts(); const hour = new Date().getHours(); const patterns = facts.filter(f => f.type === 'pattern');
  if (hour >= 7 && hour <= 9 && patterns.some(p => p.text.includes('exam'))) return '📚 Subah hai — aaj ka study session shuru karein?';
  if ((hour >= 23 || hour <= 2) && patterns.some(p => p.text.includes('raat'))) return '🌙 Raat ko active ho — kya kaam chal raha hai?';
  return null;
}

export function getMemorySummary(): string {
  const facts = loadMemoryFacts(); if (!facts.length) return 'Abhi koi memory nahi — baat karte raho toh seekhta jaaunga!';
  const top = facts.sort((a, b) => b.mentions - a.mentions).slice(0, 10).map(f => `• ${f.text} (${Math.round(f.confidence * 100)}%)`).join('\n');
  return `🧠 **Mujhe yaad hai:**\n${top}`;
}
