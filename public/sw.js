// JARVIS Service Worker v3 — Bandwidth Optimized
// Strategy: Cache static assets aggressively, never cache API/media

const CACHE = 'jarvis-v3';
const STATIC = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// Install: cache static shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // NEVER cache: API routes, external media, audio, images
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname !== location.hostname ||
    e.request.method !== 'GET'
  ) {
    return; // Network only
  }

  // Next.js static assets (_next/static) — cache first, long TTL
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const hit = await cache.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      })
    );
    return;
  }

  // HTML pages — network first, cache fallback
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then(hit => hit || caches.match('/offline.html'))
    )
  );
});

// Push notifications
self.addEventListener('push', e => {
  const d = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(d.title || 'JARVIS', {
      body: d.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: d.tag || 'jarvis',
    })
  );
});
