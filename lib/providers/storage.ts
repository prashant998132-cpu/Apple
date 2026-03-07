// lib/providers/storage.ts
// FIXED: Server-side = Supabase / Firebase ONLY
//        Client-side = Supabase → Firebase → IndexedDB → localStorage
//
// SERVER functions (API routes call these):
//   saveMessagesServer() / loadMessagesServer()
//
// CLIENT functions (React components call these):
//   saveMessagesClient() / loadMessagesClient()

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { firebaseSave, firebaseLoad, hasFirebase } from './firebase'

export type StorageProvider = 'supabase' | 'firebase' | 'indexeddb' | 'localstorage'

// ─────────────────────────────────────────────────────────
// SUPABASE — works both server + client
// ─────────────────────────────────────────────────────────
let _sb: SupabaseClient | null = null
function getSB(): SupabaseClient | null {
  if (_sb) return _sb
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  _sb = createClient(url, key)
  return _sb
}

// ─────────────────────────────────────────────────────────
// INDEXEDDB — client only
// ─────────────────────────────────────────────────────────
function isClient() { return typeof window !== 'undefined' }

function openIDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open('jarvis_db', 1)
    req.onupgradeneeded = () => {
      ;['chats', 'settings', 'prefs'].forEach(s => {
        if (!req.result.objectStoreNames.contains(s))
          req.result.createObjectStore(s, { keyPath: 'id' })
      })
    }
    req.onsuccess = () => res(req.result)
    req.onerror   = () => rej(req.error)
  })
}

async function idbPut(store: string, data: any): Promise<boolean> {
  if (!isClient() || typeof indexedDB === 'undefined') return false
  try {
    const db = await openIDB()
    return new Promise(res => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).put(data)
      tx.oncomplete = () => res(true)
      tx.onerror    = () => res(false)
    })
  } catch { return false }
}

async function idbGet(store: string, id: string): Promise<any> {
  if (!isClient() || typeof indexedDB === 'undefined') return null
  try {
    const db = await openIDB()
    return new Promise(res => {
      const req = db.transaction(store, 'readonly').objectStore(store).get(id)
      req.onsuccess = () => res(req.result ?? null)
      req.onerror   = () => res(null)
    })
  } catch { return null }
}

// ─────────────────────────────────────────────────────────
// SERVER-SIDE SAVE / LOAD
// Only Supabase or Firebase — no browser APIs
// ─────────────────────────────────────────────────────────
export async function saveMessagesServer(
  userId: string,
  chatId: string,
  messages: any[],
): Promise<StorageProvider | 'none'> {
  const payload = {
    id: chatId,
    user_id: userId,
    messages: messages.slice(-100),
    updated_at: new Date().toISOString(),
  }

  // 1. Supabase
  try {
    const sb = getSB()
    if (sb) {
      const { error } = await sb
        .from('jarvis_chats')
        .upsert(payload, { onConflict: 'id' })
      if (!error) return 'supabase'
    }
  } catch { /* next */ }

  // 2. Firebase
  try {
    if (hasFirebase()) {
      const ok = await firebaseSave('jarvis_chats', chatId, payload)
      if (ok) return 'firebase'
    }
  } catch { /* next */ }

  return 'none'
}

export async function loadMessagesServer(
  userId: string,
  chatId: string,
): Promise<any[]> {
  // 1. Supabase
  try {
    const sb = getSB()
    if (sb) {
      const { data } = await sb
        .from('jarvis_chats')
        .select('messages')
        .eq('id', chatId)
        .single()
      if (data?.messages) return data.messages
    }
  } catch { /* next */ }

  // 2. Firebase
  try {
    if (hasFirebase()) {
      const doc = await firebaseLoad('jarvis_chats', chatId)
      if (doc?.messages) return doc.messages
    }
  } catch { /* next */ }

  // Server has no more fallbacks — return empty
  // Client will fill from IndexedDB / localStorage on next load
  return []
}

// ─────────────────────────────────────────────────────────
// CLIENT-SIDE SAVE / LOAD
// Full cascade: Supabase → Firebase → IndexedDB → localStorage
// Call these from React components / hooks ONLY
// ─────────────────────────────────────────────────────────
export async function saveMessagesClient(
  userId: string,
  chatId: string,
  messages: any[],
): Promise<StorageProvider | 'none'> {
  const payload = {
    id: chatId,
    user_id: userId,
    messages: messages.slice(-100),
    updated_at: new Date().toISOString(),
  }

  // 1. Supabase
  try {
    const sb = getSB()
    if (sb) {
      const { error } = await sb
        .from('jarvis_chats')
        .upsert(payload, { onConflict: 'id' })
      if (!error) return 'supabase'
    }
  } catch { /* next */ }

  // 2. Firebase
  try {
    if (hasFirebase()) {
      const ok = await firebaseSave('jarvis_chats', chatId, payload)
      if (ok) return 'firebase'
    }
  } catch { /* next */ }

  // 3. IndexedDB
  try {
    const ok = await idbPut('chats', payload)
    if (ok) return 'indexeddb'
  } catch { /* next */ }

  // 4. localStorage
  try {
    localStorage.setItem(`jc_${chatId}`, JSON.stringify(messages.slice(-80)))
    return 'localstorage'
  } catch { /* next */ }

  return 'none'
}

export async function loadMessagesClient(
  userId: string,
  chatId: string,
): Promise<any[]> {
  // 1. Supabase
  try {
    const sb = getSB()
    if (sb) {
      const { data } = await sb
        .from('jarvis_chats')
        .select('messages')
        .eq('id', chatId)
        .single()
      if (data?.messages) return data.messages
    }
  } catch { /* next */ }

  // 2. Firebase
  try {
    if (hasFirebase()) {
      const doc = await firebaseLoad('jarvis_chats', chatId)
      if (doc?.messages) return doc.messages
    }
  } catch { /* next */ }

  // 3. IndexedDB
  try {
    const row = await idbGet('chats', chatId)
    if (row?.messages) return row.messages
  } catch { /* next */ }

  // 4. localStorage
  try {
    const raw = localStorage.getItem(`jc_${chatId}`)
    if (raw) return JSON.parse(raw)
  } catch { /* next */ }

  return []
}

// ─────────────────────────────────────────────────────────
// SETTINGS — server-safe + client versions
// ─────────────────────────────────────────────────────────
export async function saveSettingsServer(
  userId: string,
  settings: Record<string, any>,
): Promise<void> {
  const payload = { id: `settings_${userId}`, user_id: userId, settings, updated_at: Date.now() }
  try {
    const sb = getSB()
    if (sb) {
      await sb.from('jarvis_settings').upsert(payload, { onConflict: 'id' })
      return
    }
  } catch { /* next */ }
  try {
    if (hasFirebase()) await firebaseSave('jarvis_settings', `settings_${userId}`, payload)
  } catch { /* ignore */ }
}

export async function loadSettingsServer(userId: string): Promise<Record<string, any>> {
  try {
    const sb = getSB()
    if (sb) {
      const { data } = await sb
        .from('jarvis_settings')
        .select('settings')
        .eq('id', `settings_${userId}`)
        .single()
      if (data?.settings) return data.settings
    }
  } catch { /* next */ }
  try {
    if (hasFirebase()) {
      const doc = await firebaseLoad('jarvis_settings', `settings_${userId}`)
      if (doc?.settings) return doc.settings
    }
  } catch { /* next */ }
  return {}
}

// ─────────────────────────────────────────────────────────
// API KEYS — always client localStorage (never cloud)
// ─────────────────────────────────────────────────────────
export function saveApiKey(k: string, v: string) {
  if (!isClient()) return
  try { localStorage.setItem(`jarvis_key_${k}`, v) } catch {}
}

export function loadApiKey(k: string): string {
  if (!isClient()) return ''
  try { return localStorage.getItem(`jarvis_key_${k}`) || '' } catch { return '' }
}

// ─────────────────────────────────────────────────────────
// Backwards compat aliases (used in older files)
// ─────────────────────────────────────────────────────────
export const saveMessages = saveMessagesServer
export const loadMessages = loadMessagesServer
