// JARVIS Service Worker v5 — Maximum Power
// Features: Smart caching + Push notifications + Background sync
// + Offline queue + MacroDroid background trigger + Periodic updates

const CACHE = 'jarvis-v5';
const STATIC = ['/', '/offline.html', '/manifest.json'];

// ── Install ──────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch Strategy ────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET and API calls
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  if (url.hostname !== location.hostname) return;

  // Next.js static — cache first
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

  // HTML — network first, cache fallback
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then(hit => hit || caches.match('/offline.html'))
    )
  );
});

// ── Push Notifications ────────────────────────────────────
self.addEventListener('push', e => {
  const d = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(d.title || 'JARVIS', {
      body:    d.body || '',
      icon:    '/icons/icon-192x192.png',
      badge:   '/icons/icon-192x192.png',
      tag:     d.tag || 'jarvis',
      vibrate: [200, 100, 200],
      data:    { url: d.url || '/', action: d.action, webhook: d.webhook },
      actions: [
        { action: 'open',    title: '📱 Open JARVIS' },
        { action: 'execute', title: '⚡ Execute' },
        { action: 'dismiss', title: '✕ Dismiss' },
      ],
    })
  );
});

// ── Notification Click ────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;

  // Execute action from notification (e.g. MacroDroid webhook)
  if (e.action === 'execute' && e.notification.data?.webhook) {
    e.waitUntil(fetch(e.notification.data.webhook).catch(() => {}));
    return;
  }

  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); return; }
      return clients.openWindow(url);
    })
  );
});

// ── Offline Queue ─────────────────────────────────────────
const QUEUE_DB = 'jarvis_offline_q';
const QUEUE_STORE = 'msgs';

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Background Sync — flush queue when back online
self.addEventListener('sync', e => {
  if (e.tag !== 'jarvis-queue') return;
  e.waitUntil(
    openQueueDB().then(async db => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const items = await new Promise(res => {
        const r = store.getAll();
        r.onsuccess = () => res(r.result);
        r.onerror = () => res([]);
      });
      for (const item of items) {
        try {
          const ok = await fetch(item.url, {
            method: item.method || 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: item.body,
          });
          if (ok.ok) {
            store.delete(item.id);
            // Notify success
            self.registration.showNotification('JARVIS — Sent ✅', {
              body: 'Queued message delivered!',
              icon: '/icons/icon-192x192.png',
              tag: 'sync-done',
            });
          }
        } catch {}
      }
    }).catch(() => {})
  );
});

// Periodic Background Sync — proactive checks every 30 min
self.addEventListener('periodicsync', e => {
  if (e.tag === 'jarvis-heartbeat') {
    e.waitUntil(
      clients.matchAll().then(list => {
        if (list.length > 0) return; // App open, no need
        // Send heartbeat to all clients via message
        return self.registration.showNotification('JARVIS Active', {
          body: 'JARVIS is running in background',
          icon: '/icons/icon-192x192.png',
          tag: 'heartbeat',
          silent: true,
        });
      })
    );
  }
});

// ── Message from page — execute commands background ───────
self.addEventListener('message', e => {
  const { type, payload } = e.data || {};

  // Trigger MacroDroid from background
  if (type === 'MACRODROID_TRIGGER' && payload?.url) {
    fetch(payload.url, { method: 'GET', signal: AbortSignal.timeout(8000) })
      .then(() => e.source?.postMessage({ type: 'MACRO_OK', action: payload.action }))
      .catch(() => e.source?.postMessage({ type: 'MACRO_FAIL', action: payload.action }));
  }

  // Queue a message for when back online
  if (type === 'QUEUE_MESSAGE' && payload) {
    openQueueDB().then(db => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      tx.objectStore(QUEUE_STORE).put({
        id: Date.now().toString(),
        url: payload.url,
        method: payload.method || 'POST',
        body: payload.body,
        timestamp: Date.now(),
      });
    }).catch(() => {});
  }

  // Skip waiting — force update
  if (type === 'SKIP_WAITING') self.skipWaiting();
});
