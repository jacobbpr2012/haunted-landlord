// Haunted Landlord service worker.
// CACHE is versioned: bump 'hl-v1' to 'hl-v2' (etc.) to invalidate every old cache on the next visit.
// Strategy: pages (navigations / .html) are network-first so deploys show up quickly, falling back to cache offline.
// Everything else is stale-while-revalidate. Query strings (?dev=1, ?season=...) are ignored when matching the cache.
const CACHE = 'hl-v1';
const FILES = [
  './', 'index.html', 'idle.html', 'sim.html', 'manifest.webmanifest', 'icon.svg',
  'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png',
  'style.css', 'sim.css', 'home.css', 'theme.css',
  'theme.js', 'shared.js', 'audio.js', 'share.js', 'data.js', 'codex.js', 'engine.js', 'ui.js',
  'home.js', 'pwa.js', 'sim/data.js', 'sim/engine.js', 'sim/ui.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) =>
    // add one by one so a missing file never fails the whole install
    Promise.all(FILES.map((f) => c.add(new Request(f, { cache: 'reload' })).catch(() => {})))
  ).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const isPage = req.mode === 'navigate' || /\.html?$/.test(url.pathname) || url.pathname.endsWith('/');
  if (isPage) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(url.origin + url.pathname, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    const net = fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow('./index.html'))));
});
