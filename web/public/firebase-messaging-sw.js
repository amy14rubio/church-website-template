// Handles a push notification arriving while no tab has this site open —
// the browser can only invoke a background handler like this one through
// a real service worker, not through any code running in a page/tab
// itself (see src/lib/pushNotifications.ts, which registers this file).
// Must stay plain, unbundled JS at this exact path (service workers load
// as a raw script, not through Vite) — hence the older compat SDK via
// importScripts rather than the ES-module SDK the rest of the app uses.
//
// The config below is the same public, non-secret client config already
// shipped in the app's own JS bundle (see src/firebase/config.ts) — there
// is no way to inject env vars into a static file served as-is, so it's
// duplicated here rather than read from anywhere.
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyD89ZA-yW0bxIdN01c9AB34DtQ3-Fh39H8',
  authDomain: 'your-firebase-project-id.firebaseapp.com',
  projectId: 'your-firebase-project-id',
  storageBucket: 'your-firebase-project-id.firebasestorage.app',
  messagingSenderId: '916058049542',
  appId: '1:916058049542:web:de2c90acf0f38713a20787',
})

const messaging = firebase.messaging()

// The Cloud Function only ever sends a plain `notification` payload (see
// notifyOnEventCancellation), which most browsers already show
// automatically without this handler — this just guarantees consistent
// behavior across browsers that don't do that on their own.
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {}
  if (!title) return
  self.registration.showNotification(title, {
    body,
    icon: '/logo.png',
  })
})
