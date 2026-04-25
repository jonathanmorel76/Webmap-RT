// ─────────────────────────────────────────────────────────────
//  GTFS-RT Control · Service Worker v2
//  Stratégie : SW minimaliste. Cache uniquement le shell de l'app.
//  Tous les autres fetch passent en network direct (pas d'interception)
//  pour éviter les bugs iOS sur les gros transferts (ZIP GTFS, flux RT).
// ─────────────────────────────────────────────────────────────
const CACHE_VERSION = 'gtfsrt-v2';
const SHELL_CACHE   = `${CACHE_VERSION}-shell`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => !k.startsWith(CACHE_VERSION))
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // UNIQUEMENT le shell same-origin passe par le cache du SW
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
    return;
  }

  // Tout le reste passe en réseau direct, sans interception SW.
  // Les flux GTFS-RT, SIRI et les ZIP GTFS/NeTEx ne sont JAMAIS
  // touchés par le SW : pas de res.clone() qui doublerait la
  // mémoire sur iOS et pas de pollution du cache.
});
