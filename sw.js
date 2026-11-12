// Cambia VERSION cada vez que subas un data.json o código nuevo:
// así los móviles descargan la versión nueva la próxima vez que abran la app.
const VERSION = 'cctt-2026-11-12';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'data.json', 'lib/leaflet.js', 'lib/leaflet.css',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const TILES = 'cctt-tiles';
const MAX_TILES = 3000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== VERSION && k !== TILES).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

async function trimTiles(){
  const c = await caches.open(TILES); const keys = await c.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await c.delete(keys[i]);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Map tiles: network first, keep a copy so areas already seen work without coverage
  if (/ign\.es$|openstreetmap\.org$/.test(url.hostname)){
    e.respondWith(fetch(req).then(res => {
      if (res.ok || res.type === 'opaque'){ const copy = res.clone(); caches.open(TILES).then(c => c.put(req, copy)).then(trimTiles); }
      return res;
    }).catch(() => caches.match(req)));
    return;
  }

  // App files and data: cache first, update in background
  if (url.origin === location.origin){
    e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => {
      const net = fetch(req).then(res => { if (res.ok){ const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
