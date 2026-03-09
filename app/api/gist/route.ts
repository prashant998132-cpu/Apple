// app/api/gist/route.ts — Server-side Gist sync handler
// GITHUB_PAT + GIST_ID stored in Vercel env vars only

import { NextRequest, NextResponse } from 'next/server';

const PAT     = process.env.GITHUB_PAT!;
const GIST_ID = process.env.JARVIS_GIST_ID; // optional — auto-creates if not set

const FILENAME = 'jarvis-sync.json';

// ─── GET — pull from Gist ────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  if (action !== 'pull') return NextResponse.json({ error: 'bad action' }, { status: 400 });

  if (!PAT) return NextResponse.json({ error: 'no token' }, { status: 500 });

  try {
    // If we have a GIST_ID, fetch it directly
    if (GIST_ID) {
      const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: { Authorization: `token ${PAT}`, 'User-Agent': 'JARVIS-App' },
      });
      if (!r.ok) return NextResponse.json({ data: null });
      const g = await r.json();
      const raw = g.files?.[FILENAME]?.content;
      if (!raw) return NextResponse.json({ data: null });
      return NextResponse.json({ data: JSON.parse(raw) });
    }

    // No GIST_ID — search user gists for our file
    const r = await fetch('https://api.github.com/gists?per_page=30', {
      headers: { Authorization: `token ${PAT}`, 'User-Agent': 'JARVIS-App' },
    });
    if (!r.ok) return NextResponse.json({ data: null });
    const gists = await r.json();
    const found = gists.find((g: { files: Record<string, unknown> }) => g.files?.[FILENAME]);
    if (!found) return NextResponse.json({ data: null });

    const detail = await fetch(`https://api.github.com/gists/${found.id}`, {
      headers: { Authorization: `token ${PAT}`, 'User-Agent': 'JARVIS-App' },
    });
    const g = await detail.json();
    const raw = g.files?.[FILENAME]?.content;
    return NextResponse.json({ data: raw ? JSON.parse(raw) : null, gistId: found.id });
  } catch (e) {
    console.error('[gist pull]', e);
    return NextResponse.json({ data: null });
  }
}

// ─── POST — push to Gist ─────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!PAT) return NextResponse.json({ error: 'no token' }, { status: 500 });

  try {
    const body = await req.json();
    const { action, data } = body;
    if (action !== 'push') return NextResponse.json({ error: 'bad action' }, { status: 400 });

    const content = JSON.stringify(data, null, 2);
    const payload = {
      description: 'JARVIS AI — auto sync backup',
      public: false,
      files: { [FILENAME]: { content } },
    };

    let gistId = GIST_ID;

    // Try to find existing gist if no ID set
    if (!gistId) {
      const r = await fetch('https://api.github.com/gists?per_page=30', {
        headers: { Authorization: `token ${PAT}`, 'User-Agent': 'JARVIS-App' },
      });
      if (r.ok) {
        const gists = await r.json();
        const found = gists.find((g: { files: Record<string, unknown> }) => g.files?.[FILENAME]);
        if (found) gistId = found.id;
      }
    }

    let res;
    if (gistId) {
      // Update existing
      res = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `token ${PAT}`,
          'Content-Type': 'application/json',
          'User-Agent': 'JARVIS-App',
        },
        body: JSON.stringify(payload),
      });
    } else {
      // Create new
      res = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          Authorization: `token ${PAT}`,
          'Content-Type': 'application/json',
          'User-Agent': 'JARVIS-App',
        },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const err = await res.text();
      console.error('[gist push]', err);
      return NextResponse.json({ ok: false, error: err }, { status: 500 });
    }

    const result = await res.json();
    return NextResponse.json({ ok: true, gistId: result.id });
  } catch (e) {
    console.error('[gist push]', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
