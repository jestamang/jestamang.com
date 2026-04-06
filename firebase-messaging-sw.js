// ════════════════════════════════════════════════════════════════
// FIREBASE MESSAGING SERVICE WORKER — firebase-messaging-sw.js
// Required by FCM. MUST live at the root of the domain.
// Handles background push messages when the site is not open.
// ════════════════════════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyAKmVVW1i-ry05po5odA7VZNCN4vlPSwH8',
  authDomain:        'jestamang-e1bda.firebaseapp.com',
  projectId:         'jestamang-e1bda',
  storageBucket:     'jestamang-e1bda.firebasestorage.app',
  messagingSenderId: '16240344094',
  appId:             '1:16240344094:web:989d0b297c3d234f62820f'
});

var messaging = firebase.messaging();

// Background message handler
// Called when the site is NOT in the foreground.
messaging.onBackgroundMessage(function (payload) {
  var title = (payload.notification && payload.notification.title)
    ? payload.notification.title
    : (payload.data && payload.data.title ? payload.data.title : 'JESTAMANG');

  var body = (payload.notification && payload.notification.body)
    ? payload.notification.body
    : (payload.data && payload.data.body ? payload.data.body : '');

  var link = (payload.data && payload.data.link) ? payload.data.link : '/';

  var options = {
    body:    body,
    icon:    '/assets/icons/icon-192.png',
    badge:   '/assets/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data:    { link: link },
    tag:     'jestamang-push'
  };

  return self.registration.showNotification(title, options);
});
