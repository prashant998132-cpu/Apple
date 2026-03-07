// lib/integrations/youtube.ts — YouTube Data API v3, 10K units/day free

export async function searchYouTube(opts: { query: string; maxResults?: number }): Promise<any> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return { ok: false, safeMode: true, items: [], note: 'Add YOUTUBE_API_KEY in Vercel env' };
  try {
    const q = encodeURIComponent(opts.query);
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&maxResults=${opts.maxResults || 8}&type=video&key=${key}&relevanceLanguage=hi`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error('yt_' + res.status);
    const data = await res.json();
    return {
      ok: true,
      items: (data.items || []).map((item: any) => ({
        id: item.id?.videoId,
        title: item.snippet?.title,
        channel: item.snippet?.channelTitle,
        thumb: item.snippet?.thumbnails?.medium?.url,
        url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
      })),
    };
  } catch (err) { return { ok: false, items: [], error: String(err) }; }
}
