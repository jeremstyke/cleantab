// CleanTab service worker - light PWA (installable + faster repeat loads)
// Bump this version when you push updates so clients refresh their cache.
const CACHE = 'cleantab-v1';
const CORE = [
  '/index.html',
  '/tools.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(CORE).catch(function () { /* ignore individual failures */ });
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  // Only handle GET requests from our own origin. Never touch ad scripts, APIs, etc.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML pages (so users always get the latest content),
  // falling back to cache when offline.
  if (req.headers.get('accept') && req.headers.get('accept').indexOf('text/html') !== -1) {
    e.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (m) { return m || caches.match('/index.html'); });
      })
    );
    return;
  }

  // Cache-first for static assets (icons, etc.) for faster repeat loads.
  e.respondWith(
    caches.match(req).then(function (m) {
      return m || fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      });
    })
  );
});
