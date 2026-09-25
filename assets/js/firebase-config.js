// ════════════════════════════════════════════════════════════════
// JESTAMANG FIREBASE CONFIGURATION
// ════════════════════════════════════════════════════════════════
// Firestore security rules live in /firestore.rules (deployed with
// `firebase deploy --only firestore:rules` from main). Do not copy
// rules into this file.
// ════════════════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey:            "AIzaSyAKmVVW1i-ry05po5odA7VZNCN4vlPSwH8",
  authDomain:        "jestamang-e1bda.firebaseapp.com",
  projectId:         "jestamang-e1bda",
  storageBucket:     "jestamang-e1bda.firebasestorage.app",
  messagingSenderId: "16240344094",
  appId:             "1:16240344094:web:989d0b297c3d234f62820f",
  measurementId:     "G-K01W25Z4KJ"
};

// Initialize Firebase — do not edit below this line
if (!firebase.apps || !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Expose global references for use across all pages
window.jestaAuth = firebase.auth();
window.jestaDB   = firebase.firestore();

// ── Firebase Cloud Messaging (FCM) ───────────────────────────
// SETUP REQUIRED:
// 1. Firebase Console → Project Settings → Cloud Messaging tab
// 2. Under "Web configuration" click "Generate key pair"
// 3. Copy the key and replace the placeholder below
// ─────────────────────────────────────────────────────────────
window.JESTA_VAPID_KEY = 'BH9tGcRFeHW2MbKwkgXmkEhozQAIuflcEwEiNrsp9LObjKO6DOlnvEfcMCOA__x0SMfXxNkCyXY1kMbxVpiwQac';

// Initialize FCM only if the browser supports it and the
// firebase-messaging SDK has been loaded on this page.
(function () {
  try {
    if (typeof firebase.messaging === 'function' &&
        firebase.messaging.isSupported && firebase.messaging.isSupported()) {
      window.jestaMessaging = firebase.messaging();
    } else {
      window.jestaMessaging = null;
    }
  } catch (e) {
    window.jestaMessaging = null;
  }
})();
