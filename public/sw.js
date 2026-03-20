// public/sw.js — JARVIS Service Worker v6
// Better offline, background sync, Pomodoro notifications

const CACHE = 'jarvis-v6';
const OFFLINE_URLS = ['/', '/offline.html'];
const API_CACHE_TTL = { weather: 900000, news: 300000, default: 60000 };

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // API calls — network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).then(r => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  
  // Static assets — cache first
  if (e.request.destination === 'image' || url.pathname.match(/\.(js|css|woff2?)$/)) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
        caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        return r;
      }))
    );
    return;
  }
  
  // Pages — network first, offline fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match('/') || new Response('<h1>JARVIS Offline</h1>', { headers: { 'Content-Type': 'text/html' } })
      )
    );
  }
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'JARVIS', {
      body: data.body || 'Notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: data.tag || 'jarvis',
      data: data.url || '/',
      vibrate: [100, 50, 100],
      actions: data.actions || [{ action: 'open', title: 'Open JARVIS' }]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      const url = e.notification.data || '/';
      for (const c of list) {
        if (c.url === url && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Background sync — MacroDroid triggers
self.addEventListener('sync', e => {
  if (e.tag === 'jarvis-bg-sync') {
    e.waitUntil(
      clients.matchAll().then(list => {
        list.forEach(c => c.postMessage({ type: 'bg_sync' }));
      })
    );
  }
});

// Message handler — Pomodoro timer, reminders
self.addEventListener('message', e => {
  const { type, data } = e.data || {};
  
  if (type === 'POMODORO_DONE') {
    self.registration.showNotification('Pomodoro Complete! 🎉', {
      body: data?.message || '25 min khatam! 5 min break lo.',
      icon: '/icons/icon-192x192.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'pomodoro'
    });
  }
  
  if (type === 'REMINDER') {
    self.registration.showNotification('JARVIS Reminder ⏰', {
      body: data?.text || 'Reminder!',
      icon: '/icons/icon-192x192.png',
      tag: 'reminder-' + Date.now()
    });
  }
  
  if (type === 'SKIP_WAITING') self.skipWaiting();
});
