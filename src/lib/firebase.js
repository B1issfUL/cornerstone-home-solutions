import { initializeApp } from 'firebase/app';
import { doc, getFirestore, onSnapshot } from 'firebase/firestore';

// Loaded on demand (dynamic import / lazy admin route) so Firebase stays out of the main bundle.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app;
let db;

export function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every(Boolean);
}

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null;
  app ??= initializeApp(firebaseConfig);
  return app;
}

export function getStatsRef() {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  db ??= getFirestore(firebaseApp);
  return doc(db, 'siteSettings', 'homepageStats');
}

export function subscribeToStats(onNext, onError) {
  const statsRef = getStatsRef();
  return statsRef ? onSnapshot(statsRef, onNext, onError) : null;
}
