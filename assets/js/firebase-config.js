// ════════════════════════════════════════════════════════════════
// JESTAMANG FIREBASE CONFIGURATION
// ════════════════════════════════════════════════════════════════
//
// FIRESTORE SECURITY RULES (paste into Firestore → Rules tab):
// ────────────────────────────────────────────────────────────────
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /users/{userId} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }
//     match /favorites/{docId} {
//       allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
//       allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
//     }
//     match /comments/{docId} {
//       allow read: if true;
//       allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
//       allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
//     }
//     match /inquiries/{docId} {
//       allow create: if true;
//     }
//   }
// }
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
