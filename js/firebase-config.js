/* =========================================================================
   AETHER — Firebase configuration (Cloud Firestore, free Spark plan)

   One-time setup (~5 minutes, no card required):

   1. Create a project at https://console.firebase.google.com  (Spark plan
      is free: 50K reads / 20K writes / 1 GiB stored per day in Firestore)
   2. Build → Firestore Database → Create database → Production mode
      (pick a region close to your visitors)
   3. Project settings → Your apps → </> (Web) → register the app
   4. Copy the firebaseConfig object the console shows you and paste it
      into the object below, exactly as given
   5. Publish the security rules from firestore.rules:
        · Firebase console → Firestore → Rules → paste the file → Publish
        · or: firebase deploy --only firestore:rules

   The web config values are public by design — access is controlled by
   the Firestore rules, never by keeping these secret.

   Leaving apiKey empty keeps the store running on local storage only
   (single-browser, exactly as before).
   ========================================================================= */
window.FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};
