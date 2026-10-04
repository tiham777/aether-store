/* =========================================================================
   AETHER — Firebase configuration (Cloud Firestore, free Spark plan)

   Filled in from the Firebase console. These web-config values are public
   by design — access is governed by firestore.rules, not by secrecy.
   js/cloud.js imports the SDK lazily and initialises it from this object,
   so nothing else in the site needs to change.

   If you ever need a fresh config: Firebase console → Project settings →
   General → Your apps → the Web (</>) app → copy the firebaseConfig.
   ========================================================================= */
window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDvCilAcl3DLcenwNrsL9Bza1i7oEx58Po',
  authDomain: 'aether-store-c1eab.firebaseapp.com',
  projectId: 'aether-store-c1eab',
  storageBucket: 'aether-store-c1eab.firebasestorage.app',
  messagingSenderId: '802759053484',
  appId: '1:802759053484:web:044aa0c439631866de4f09',
  measurementId: 'G-H369PJW4QH',
};
