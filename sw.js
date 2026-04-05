// ════════════════════════════════════════════════════════════════
// JESTAMANG SERVICE WORKER — sw.js
// Handles push notifications and background caching
// ════════════════════════════════════════════════════════════════

var BADGE = '/assets/homepage/logo%20png.png';

// ── Install: activate immediately ────────────────────────────
self.addEventListener('install', function (event) {
  self.skipWaiting();
});

// ── Activate: claim all clients ──────────────────────────────
self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

// ── Push event — triggered by FCM ────────────────────────────
// Receives the push payload and shows a notification.
// FCM sends data in payload.notification + payload.data.
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
    body:             body,
    icon:             BADGE,
    badge:            BADGE,
    vibrate:          [200, 100, 200],
    data:             { link: link },
    requireInteraction: false,
    tag:              'jestamang-push'
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
      // Focus an existing jestamang.com tab if open
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.indexOf('jestamang.com') !== -1 && 'focus' in clients[i]) {
          clients[i].focus();
          clients[i].navigate(fullUrl);
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl);
      }
    })
  );
});

// ── Message from client (e.g. show local notification) ───────
// Used as free-tier fallback: client sends notification data
// via postMessage when it detects a new Firestore document.
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
