// public/sw.js — JARVIS Service Worker v2
const CACHE = 'jarvis-v3';
const STATIC = ['/', '/dashboard', '/image-studio', '/voice', '/settings', '/manifest.json'];
const API_CACHE = 'jarvis-api-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE && k !== API_CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API calls — network first, offline fallback
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request.clone()).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(API_CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        return new Response(JSON.stringify({
          success: false,
          reply: '📡 ऑफलाइन हो। इंटरनेट connect करो। कुछ features काम नहीं करेंगे।',
          toolsUsed: [], processingMs: 0, model: 'offline', language: 'hindi'
        }), { headers: { 'Content-Type': 'application/json' } });
      })
    );
    return;
  }

  // Static assets — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/'));
    })
  );
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'JARVIS', body: 'New notification' };
  e.waitUntil(
    self.registration.showNotification(data.title || 'JARVIS', {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-96x96.png',
      data: data.url,
      actions: [{ action: 'open', title: 'खोलो' }]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data || '/'));
});
