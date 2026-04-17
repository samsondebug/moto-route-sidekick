// Bad Decision Sidekick — Service Worker v6 (V4 Reel Builder build)
// Cache-first app shell. Network-first APIs with stale tile fallback. LRU tile cap.

const VERSION = 'bds-v6-2026-04-17-reel';
const SHELL_CACHE = VERSION + '-shell';
const TILE_CACHE  = VERSION + '-tiles';
const API_CACHE   = VERSION + '-api';
const TILE_CAP = 2500; // ~150 MB at ~60KB/tile

const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.svg',
  '/icon-512.svg',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  // V3: Leaflet marker assets so offline maps don't show broken-image placeholders
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/layers.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/layers-2x.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;
  // LRU-ish: delete oldest (first inserted)
  const toDelete = keys.length - maxItems;
  for (let i = 0; i < toDelete; i++) await cache.delete(keys[i]);
}

// Allow the page to pre-cache a list of tile URLs after saving a route.
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'PRECACHE_TILES' && Array.isArray(data.urls)) {
    event.waitUntil((async () => {
      const cache = await caches.open(TILE_CACHE);
      const batch = data.urls.slice(0, 1500); // safety cap per route
      let ok = 0;
      for (const url of batch) {
        try {
          const res = await fetch(url, { mode: 'no-cors' });
          await cache.put(url, res);
          ok++;
        } catch (_) { /* ignore tile misses */ }
      }
      await trimCache(TILE_CACHE, TILE_CAP);
      const clients = await self.clients.matchAll();
      clients.forEach(c => c.postMessage({ type: 'PRECACHE_DONE', ok, total: batch.length }));
    })());
  }
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Tiles: cache-first, network fallback, LRU trim in background
  if (url.hostname.includes('tile.openstreetmap.org')) {
    e.respondWith((async () => {
      const cache = await caches.open(TILE_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req, { mode: 'no-cors' });
        cache.put(req, res.clone());
        trimCache(TILE_CACHE, TILE_CAP);
        return res;
      } catch (_) {
        // Last-ditch: return a transparent 1x1 tile so the map doesn't show broken boxes
        return new Response(new Blob(), { status: 200 });
      }
    })());
    return;
  }

  // API: network-first, stale fallback (weather, routing, geocoding)
  const isAPI = url.hostname.includes('open-meteo.com') ||
                url.hostname.includes('nominatim.openstreetmap.org') ||
                url.hostname.includes('router.project-osrm.org') ||
                url.hostname.includes('api.open-elevation.com');
  if (isAPI) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(API_CACHE);
        cache.put(req, res.clone());
        return res;
      } catch (_) {
        const cache = await caches.open(API_CACHE);
        const hit = await cache.match(req);
        return hit || new Response(JSON.stringify({ offline: true }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        });
      }
    })());
    return;
  }

  // App shell: cache-first, background refresh
  e.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const hit = await cache.match(req);
    const fetchPromise = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || fetchPromise;
  })());
});
