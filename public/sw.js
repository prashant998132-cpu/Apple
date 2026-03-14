// JARVIS Service Worker v3 — Bandwidth Optimized
// Strategy: Cache static assets aggressively, never cache API/media

const CACHE = 'jarvis-v4';
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

// Push notifications — show with action buttons
self.addEventListener('push', e => {
  const d = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(d.title || 'JARVIS', {
      body:    d.body || '',
      icon:    '/icons/icon-192x192.png',
      badge:   '/icons/icon-192x192.png',
      tag:     d.tag || 'jarvis',
      vibrate: [200, 100, 200],
      data:    { url: d.url || '/' },
      actions: [
        { action: 'open',    title: '📱 Open JARVIS' },
        { action: 'dismiss', title: '✕ Dismiss' },
      ],
    })
  );
});

// Notification click — open app or dismiss
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

// ════════════════════════════════════════════════════════
// OFFLINE QUEUE — net nahi toh queue, aane pe auto-send
// ════════════════════════════════════════════════════════
const QUEUE_DB = 'jarvis_offline_queue'
const QUEUE_STORE = 'pending'

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(QUEUE_STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// When fetch fails for API — queue it
self.addEventListener('fetch', e => {
  if (!e.request.url.includes('/api/jarvis')) return
  if (e.request.method !== 'POST') return

  e.waitUntil(
    e.request.clone().text().then(async body => {
      try {
        const resp = await fetch(e.request.clone())
        return resp
      } catch {
        // Offline — queue the request
        const db = await openQueueDB()
        const tx = db.transaction(QUEUE_STORE, 'readwrite')
        tx.objectStore(QUEUE_STORE).put({
          id: Date.now().toString(),
          url: e.request.url,
          body,
          timestamp: Date.now(),
        })
        // Notify user
        self.registration.showNotification('JARVIS — Offline', {
          body: 'Message queued — net aane pe automatically send ho jaayega.',
          icon: '/icons/icon-192x192.png',
        })
      }
    }).catch(() => {})
  )
})

// Background sync — process queue when back online
self.addEventListener('sync', e => {
  if (e.tag !== 'jarvis-queue') return
  e.waitUntil(
    openQueueDB().then(async (db) => {
      const tx = (db as IDBDatabase).transaction(QUEUE_STORE, 'readwrite')
      const store = tx.objectStore(QUEUE_STORE)
      const all = await new Promise<any[]>(res => {
        const req = store.getAll()
        req.onsuccess = () => res(req.result)
        req.onerror = () => res([])
      })
      for (const item of all) {
        try {
          await fetch(item.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: item.body,
          })
          store.delete(item.id)
        } catch {}
      }
    }).catch(() => {})
  )
})
