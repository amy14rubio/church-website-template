import { getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
// Must match functions/src/index.ts's REGION constant — callable
// functions resolve by region, not just by name.
export const functions = getFunctions(app, 'us-east1')

// Lets this template run against the Firebase Local Emulator Suite with
// no real Firebase project at all — see README.md's setup options. Only
// ever active in `npm run dev` (never a production build) and only when
// explicitly opted into, so a dev who DOES want to point their local
// server at a real project isn't silently redirected to the emulator.
// Guarded by a module-level flag (rather than relying on
// connect*Emulator's own idempotency, which isn't guaranteed the same
// way across all four SDKs) since Vite's HMR can re-run this module.
let emulatorsConnected = false
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' && !emulatorsConnected) {
  emulatorsConnected = true
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}
