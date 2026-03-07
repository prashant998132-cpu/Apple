// lib/providers/firebase.ts
// Firebase Firestore — alternative to Supabase
// Free: 1GB storage, 50K reads/day, 20K writes/day
// Setup: console.firebase.google.com → new project → Firestore

export interface FirebaseConfig {
  apiKey: string
  projectId: string
  appId: string
}

function getConfig(): FirebaseConfig | null {
  const apiKey   = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const appId    = process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  if (!apiKey || !projectId) return null
  return { apiKey, projectId, appId: appId || '' }
}

// Firestore REST API (no SDK needed — works in Next.js edge)
function firestoreUrl(projectId: string, path: string) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`
}

async function getIdToken(): Promise<string | null> {
  // For server-side: use service account
  // For client-side: use Firebase Auth token from localStorage
  try {
    return localStorage.getItem('jarvis_firebase_token')
  } catch { return null }
}

// ── Save document ─────────────────────────────────────────
export async function firebaseSave(
  collection: string,
  docId: string,
  data: Record<string, any>,
): Promise<boolean> {
  const cfg = getConfig()
  if (!cfg) return false

  try {
    const token = await getIdToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    // Convert to Firestore field format
    const fields: Record<string, any> = {}
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'string')  fields[k] = { stringValue: v }
      else if (typeof v === 'number') fields[k] = { integerValue: String(Math.round(v)) }
      else if (typeof v === 'boolean') fields[k] = { booleanValue: v }
      else fields[k] = { stringValue: JSON.stringify(v) }
    }

    const url = `${firestoreUrl(cfg.projectId, `${collection}/${docId}`)}`
    const res = await fetch(url + '?key=' + cfg.apiKey, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields }),
      signal: AbortSignal.timeout(10000),
    })
    return res.ok
  } catch { return false }
}

// ── Load document ─────────────────────────────────────────
export async function firebaseLoad(
  collection: string,
  docId: string,
): Promise<Record<string, any> | null> {
  const cfg = getConfig()
  if (!cfg) return null

  try {
    const token = await getIdToken()
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`

    const url = `${firestoreUrl(cfg.projectId, `${collection}/${docId}`)}?key=${cfg.apiKey}`
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null

    const doc = await res.json()
    if (!doc.fields) return null

    // Convert back from Firestore format
    const result: Record<string, any> = {}
    for (const [k, v] of Object.entries(doc.fields as Record<string, any>)) {
      if (v.stringValue !== undefined) {
        try { result[k] = JSON.parse(v.stringValue) }
        catch { result[k] = v.stringValue }
      } else if (v.integerValue !== undefined) result[k] = Number(v.integerValue)
      else if (v.booleanValue !== undefined) result[k] = v.booleanValue
    }
    return result
  } catch { return null }
}

export function hasFirebase(): boolean {
  return !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
}
