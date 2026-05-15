// ════════════════════════════════════════════════════════════════
// JESTAMANG SERVICE WORKER — sw.js
// Handles: push notifications, PWA caching, offline fallback
// UPDATE CACHE_VERSION DATE ON EVERY PUSH
// ════════════════════════════════════════════════════════════════

var CACHE_NAME = 'jestamang-v26';
var BADGE      = '/assets/icons/icon-192.png';

var PRECACHE_URLS = [
  '/index.html',
  '/albums.html',
  '/entities.html',
  '/lyrics.html',
  '/merch.html',
  '/photos.html',
  '/videos.html',
  '/email.html',
  '/comix.html',
  '/arcade.html',
  '/blog.html',
  '/shows.html',
  '/login.html',
  '/profile.html',
  '/members.html',
  '/dossier.html',
  '/listen.html',
  '/radio.html',
  '/game-oracle.html',
  '/game-memory.html',
  '/games/entity-pair.html',
  '/privacy.html',
  '/refund.html',
  '/404.html',
  '/terms.html',
  '/accessibility.html',
  '/offline.html',
  '/assets/fonts/Luminari.ttf',
  '/assets/icons/icon-192.png',
  '/assets/homepage/logo%20png.webp',
  '/assets/homepage/background/Jesta background.jpg',
  '/assets/js/firebase-config.js',
  '/assets/js/jesta-auth.js'
];

// ── Install: precache core assets ────────────────────────────
self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Cache individually so one missing file doesn't block install
      return Promise.all(
        PRECACHE_URLS.map(function (url) {
          return cache.add(url).catch(function () {
            // Silently skip assets that don't exist yet
          });
        })
      );
    })
  );
});

// ── Activate: purge old caches, reload all open tabs ─────────
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      var oldKeys = keys.filter(function (key) { return key !== CACHE_NAME; });
      var wasUpdate = oldKeys.length > 0;
      return Promise.all(oldKeys.map(function (key) { return caches.delete(key); }))
        .then(function () { return self.clients.claim(); })
        .then(function () {
          // Notify open tabs to show update banner (no jarring force-reload)
          if (wasUpdate) {
            return self.clients.matchAll({ type: 'window' }).then(function (clients) {
              clients.forEach(function (client) {
                client.postMessage({ type: 'UPDATE' });
              });
            });
          }
        });
    })
  );
});

// Large asset paths that should never be cached (photos, albums, videos, etc.)
var SKIP_CACHE_PATHS = [
  '/assets/photos/',
  '/assets/albums/',
  '/assets/comix/',
  '/assets/videos/',
  '/assets/merch/'
];

// ── Fetch: network-first for HTML, cache-first for assets ───
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  var url = event.request.url;

  // Always go to network for Firebase / external APIs
  if (url.indexOf('firestore.googleapis.com') !== -1 ||
      url.indexOf('firebase') !== -1 ||
      url.indexOf('googleapis.com') !== -1 ||
      url.indexOf('gstatic.com') !== -1 ||
      url.indexOf('cloudflareinsights') !== -1) {
    return;
  }

  // Skip caching for large media assets — always fetch from network
  try {
    var parsed = new URL(url);
    var skip = SKIP_CACHE_PATHS.some(function (p) { return parsed.pathname.startsWith(p); });
    if (skip) {
      event.respondWith(fetch(event.request));
      return;
    }
  } catch (e) {}

  var isNavigation = event.request.mode === 'navigate';

  if (isNavigation) {
    // Network-first for HTML pages: always fetch fresh, fall back to cache
    event.respondWith(
      fetch(event.request).then(function (response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
        }
        return response;
      }).catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || caches.match('/offline.html');
        });
      })
    );
  } else {
    // Cache-first for static assets (fonts, images, scripts)
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        if (cached) return cached;
        return fetch(event.request).then(function (response) {
          if (response && response.status === 200 && response.type === 'basic') {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
          }
          return response;
        }).catch(function () {});
      })
    );
  }
});

// ── Push event — triggered by FCM ────────────────────────────
self.addEventListener('push', function (event) {
  var data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'JESTAMANG', body: event.data.text() };
    }
  }

  var title   = (data.notification && data.notification.title) ? data.notification.title : (data.title || 'JESTAMANG');
  var body    = (data.notification && data.notification.body)  ? data.notification.body  : (data.body  || '');
  var link    = (data.data && data.data.link) ? data.data.link : '/';

  var options = {
    body:               body,
    icon:               BADGE,
    badge:              BADGE,
    vibrate:            [200, 100, 200],
    data:               { link: link },
    requireInteraction: false,
    tag:                'jestamang-push'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var link    = (event.notification.data && event.notification.data.link) ? event.notification.data.link : '/';
  var fullUrl = link.startsWith('http') ? link : ('https://jestamang.com/' + link.replace(/^\/+/, ''));

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.indexOf('jestamang.com') !== -1 && 'focus' in clients[i]) {
          clients[i].focus();
          clients[i].navigate(fullUrl);
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl);
      }
    })
  );
});

// ── Message from client (skip waiting or show local notification) ───
self.addEventListener('message', function (event) {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (event.data.type !== 'SHOW_NOTIFICATION') return;

  var d = event.data;
  var options = {
    body:    d.body    || '',
    icon:    BADGE,
    badge:   BADGE,
    vibrate: [200, 100, 200],
    data:    { link: d.link || '/' },
    tag:     'jestamang-push'
  };

  self.registration.showNotification(d.title || 'JESTAMANG', options);
});
