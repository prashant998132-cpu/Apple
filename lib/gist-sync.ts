// lib/gist-sync.ts — GitHub Gist cross-device sync
// Syncs: memory facts + user profile from IndexedDB ↔ GitHub Gist
// Uses: GITHUB_PAT env var (server-side only via /api/gist route)

export interface GistData {
  memoryFacts: string[];
  profile: Record<string, unknown>;
  lastSync: string;
  device: string;
}

// ─── CLIENT SIDE ─────────────────────────────────────────────

/** Push local data to Gist via our API route */
export async function pushToGist(data: GistData): Promise<boolean> {
  try {
    const res = await fetch('/api/gist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'push', data }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Pull latest data from Gist */
export async function pullFromGist(): Promise<GistData | null> {
  try {
    const res = await fetch('/api/gist?action=pull');
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

/** Auto sync — call this on app load and every 10 mins */
export async function autoSync(
  getLocal: () => Promise<GistData>,
  setLocal: (d: GistData) => Promise<void>
): Promise<'pushed' | 'pulled' | 'conflict' | 'error'> {
  try {
    const [local, remote] = await Promise.all([getLocal(), pullFromGist()]);

    if (!remote) {
      // First sync — push local up
      const ok = await pushToGist(local);
      return ok ? 'pushed' : 'error';
    }

    const localTime  = new Date(local.lastSync).getTime();
    const remoteTime = new Date(remote.lastSync).getTime();

    if (remoteTime > localTime) {
      // Remote is newer — pull down
      await setLocal(remote);
      return 'pulled';
    } else if (localTime > remoteTime) {
      // Local is newer — push up
      const ok = await pushToGist(local);
      return ok ? 'pushed' : 'error';
    }
    return 'pushed'; // same time, no-op
  } catch {
    return 'error';
  }
}
