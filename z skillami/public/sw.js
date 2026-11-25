/* Ogarnij service worker: static assets cache-first, pages network-first with offline fallback.
   Never caches API calls, the admin panel or private pages (queue, orders, unsubscribe). */
const VERSION = 'ogarnij-v1';
const STATIC = ['/css/tokens.css', '/css/site.css', '/js/site.js', '/icons/icon.svg', '/icons/icon-192.png', '/manifest.webmanifest', '/offline'];
const PRIVATE = /^\/(api|admin|kolejka|en\/kolejka|zamowienie|en\/zamowienie|wypisz|potwierdz|en\/potwierdz|platnosc-testowa)/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || PRIVATE.test(url.pathname)) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok && (url.pathname === '/' || url.pathname === '/en/' || url.pathname.startsWith('/poradnik'))) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(url.pathname, copy));
      }
      return res;
    }).catch(() => caches.match(url.pathname).then((r) => r || caches.match('/offline'))));
    return;
  }
  if (/\.(css|js|svg|png|webmanifest|woff2)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    })));
  }
});
