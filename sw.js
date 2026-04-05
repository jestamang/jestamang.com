// ════════════════════════════════════════════════════════════════
// JESTAMANG SERVICE WORKER — sw.js
// Handles: push notifications, PWA caching, offline fallback
// ════════════════════════════════════════════════════════════════

var CACHE_NAME = 'jestamang-v2';
var BADGE      = '/assets/homepage/logo%20png.png';

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
  '/games.html',
  '/arcade.html',
  '/blog.html',
  '/shows.html',
  '/login.html',
  '/profile.html',
  '/members.html',
  '/404.html',
  '/terms.html',
  '/accessibility.html',
  '/offline.html',
  '/assets/fonts/Luminari.ttf',
  '/assets/homepage/logo%20png.png',
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

// ── Activate: purge old caches ───────────────────────────────
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key)   { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// ── Fetch: cache-first, network fallback, offline page ──────
self.addEventListener('fetch', function (event) {
  // Only handle GET requests for same-origin or CDN assets
  if (event.request.method !== 'GET') return;

  // Skip Firebase / Cloudflare API calls — always network
  var url = event.request.url;
  if (url.indexOf('firestore.googleapis.com') !== -1 ||
      url.indexOf('firebase') !== -1 ||
      url.indexOf('googleapis.com') !== -1 ||
      url.indexOf('gstatic.com') !== -1 ||
      url.indexOf('cloudflareinsights') !== -1) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;

      return fetch(event.request).then(function (response) {
        // Cache successful responses for future use
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () {
        // Network failed — serve offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      });
    })
  );
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

// ── Message from client (show local notification) ────────────
self.addEventListener('message', function (event) {
  if (!event.data || event.data.type !== 'SHOW_NOTIFICATION') return;

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
