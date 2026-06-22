/* sw.js — KeyMaster PRO service worker.
   =============================================================================
   Purpose: make KeyMaster PRO an installable PWA so it can open in
   standalone / full-screen (no browser chrome), and work offline. An app is
   only installable if it has a registered service worker with a fetch handler
   plus a valid manifest over HTTPS — which is exactly what GitHub Pages serves.

   Strategy (deliberately conservative, so a new build never gets "stuck"):
     • HTML / navigations  → network-first, fall back to cache (offline).
       New builds always load when online; the shell is never pinned stale.
     • Same-origin GET assets → cache-first. The app's JS/CSS carry ?v= cache
       tokens, so a new build is a new URL = guaranteed fresh fetch; old entries
       are orphaned and cleared on activate.
     • Cross-origin (e.g. Google Fonts) → not intercepted; passes through.
   Bump CACHE on each release so activate clears the previous cache.
   ============================================================================= */

const CACHE = 'keymaster-rc2-114';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png', './icon-180.png'];
// Course teaching-piano samples (small, fixed set) — precached so Course demos
// work offline immediately. Fault-tolerant: a missing one won't fail install.
const COURSE_SAMPLES = [36,40,44,48,52,56,60,64,68,72,76,80,84,88,92,96]
  .map((m) => `./audio/course/note-${m}.mp3`);
// Tutor voice MP3s (voice/en-GB/*.mp3) are cached on first play by the runtime
// cache-first handler below, so they work offline after first listen without
// precaching the whole (large, growing) pack at install time.

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE).catch(() => {})
        .then(() => Promise.all(COURSE_SAMPLES.map((u) => c.add(u).catch(() => {})))))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;          // leave cross-origin alone

  const isHTML = req.mode === 'navigate'
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('index.html');

  if (isHTML) {
    // Network-first: always try the live shell, fall back to cache offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))),
    );
    return;
  }

  // Cache-first for versioned static assets (safe: new versions are new URLs).
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => hit)),
  );
});
