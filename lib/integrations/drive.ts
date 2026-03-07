// lib/integrations/drive.ts — Google Drive API, OAuth based

export async function listDriveFiles(opts: { token: string; query?: string; maxResults?: number }): Promise<any> {
  if (!opts.token) return { ok: false, safeMode: true, files: [] };
  try {
    const q = opts.query ? `&q=${encodeURIComponent(opts.query)}` : '';
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?pageSize=${opts.maxResults || 20}&fields=files(id,name,mimeType,modifiedTime,webViewLink)${q}`,
      { headers: { Authorization: `Bearer ${opts.token}` }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error('drive_' + res.status);
    const data = await res.json();
    return { ok: true, files: data.files || [] };
  } catch (err) { return { ok: false, files: [], error: String(err) }; }
}
