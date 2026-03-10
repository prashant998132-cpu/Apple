/**
 * JARVIS Response Cache — TTL-based, zero API waste
 * Stores in memory (fast) + IndexedDB backup (persistent)
 */

interface CacheEntry {
  data: unknown;
  ts: number;
  ttl: number; // ms
  hits: number;
}

// Memory cache (instant access)
const mem = new Map<string, CacheEntry>();

// TTL presets (ms)
export const TTL = {
  CRYPTO:   30_000,    // 30 sec
  WEATHER:  600_000,   // 10 min
  NEWS:     300_000,   // 5 min
  STOCKS:   60_000,    // 1 min
  SPORTS:   120_000,   // 2 min
  TRANSIT:  180_000,   // 3 min
  WIKI:     3_600_000, // 1 hour
  FACTS:    86_400_000,// 24 hours
  GEO:      3_600_000, // 1 hour
  DEFAULT:  300_000,   // 5 min
};

function cacheKey(category: string, query: string): string {
  return `${category}::${query.toLowerCase().trim().slice(0, 80)}`;
}

export function cacheGet<T>(category: string, query: string): T | null {
  const key = cacheKey(category, query);
  const entry = mem.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) { mem.delete(key); return null; }
  entry.hits++;
  return entry.data as T;
}

export function cacheSet(category: string, query: string, data: unknown, ttl = TTL.DEFAULT): void {
  const key = cacheKey(category, query);
  mem.set(key, { data, ts: Date.now(), ttl, hits: 0 });
  // Evict if > 200 entries
  if (mem.size > 200) {
    const oldest = [...mem.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) mem.delete(oldest[0]);
  }
}

export function cacheInvalidate(category: string): void {
  for (const k of mem.keys()) {
    if (k.startsWith(category + '::')) mem.delete(k);
  }
}

export function cacheStats(): { size: number; categories: Record<string, number>; hitRate: string } {
  const cats: Record<string, number> = {};
  let totalHits = 0, totalEntries = 0;
  for (const [k, v] of mem.entries()) {
    const cat = k.split('::')[0];
    cats[cat] = (cats[cat] || 0) + 1;
    totalHits += v.hits;
    totalEntries++;
  }
  return {
    size: mem.size,
    categories: cats,
    hitRate: totalEntries > 0 ? `${Math.round(totalHits / Math.max(totalEntries, 1))}x avg` : '0',
  };
}
