const CACHE = 'stone-tracker-v1';
const CORE = [
  './',
  './index.html',
  './stones.json',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for stones.json; offline fallback to cache.
// Cache-first for other same-origin requests; navigation fallback to index.html.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle data file explicitly
  if (url.origin === location.origin && url.pathname.endsWith('stones.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put('./stones.json', clone));
          return resp;
        })
        .catch(() => caches.match('./stones.json'))
    );
    return;
  }

  // App shell for navigations
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static same-origin assets: cache-first
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
          return resp;
        });
      })
    );
  }
});
