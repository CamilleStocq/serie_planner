// Service worker : l'app s'ouvre même hors connexion.
// Fichiers de l'app : réseau d'abord (toujours la dernière version), cache en secours.
// Affiches : cache d'abord (elles ne changent pas).
const APP_CACHE = 'saison-app-v12';
const IMG_CACHE = 'saison-images-v1';
const SHELL = ['./', './index.html', './styles.css', './app.js', './cloud.js', './firebase-config.js', './catalog.json', './manifest.webmanifest', './icons/icon-192.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== APP_CACHE && k !== IMG_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(APP_CACHE).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Bibliothèque Firebase : versionnée, donc cache d'abord
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    event.respondWith(caches.open(APP_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }

  if (url.hostname === 'static.tvmaze.com' || (url.hostname === 'www.google.com' && url.pathname === '/s2/favicons')) {
    event.respondWith(
      caches.open(IMG_CACHE).then(cache => cache.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') {
          cache.put(req, res.clone());
          // Garde le cache raisonnable : 400 images au plus
          cache.keys().then(keys => keys.slice(0, Math.max(0, keys.length - 400)).forEach(k => cache.delete(k)));
        }
        return res;
      })))
    );
  }
});
