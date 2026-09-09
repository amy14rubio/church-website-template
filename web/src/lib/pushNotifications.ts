import { Capacitor, type PermissionState } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { deleteToken, getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging'
import { app, db, functions } from '@/firebase/config'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

// The two possible "you'll be told about a cancellation" scopes — see
// functions/src/index.ts's matching topics. A plain member only ever
// gets subscribed to the public one; ministry-calendar access adds the
// other. This file doesn't decide which — the subscribe callable checks
// the caller's own role server-side, since a client-side decision here
// could be spoofed into subscribing to ministry notifications it has no
// business receiving. Neither callable cares whether the token it's
// given came from a browser or a native app — an FCM registration token
// is an FCM registration token either way, so the native branches below
// reuse both callables unchanged.

// On native, push always works (no browser API story to check) — the
// only question is whether the user grants permission, asked separately.
// On web, `Notification` itself doesn't exist in every environment (SSR,
// some embedded webviews); `isSupported()` additionally rules out
// browsers that lack the specific APIs Firebase Messaging needs (e.g.
// Safari without a home-screen-installed PWA — see ProfilePage's own
// copy about this).
export async function isPushSupported(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) return true
  return typeof Notification !== 'undefined' && (await isSupported())
}

export type PushPermission = NotificationPermission | 'unsupported'

// Native's PermissionState ('prompt' | 'prompt-with-rationale' | 'granted'
// | 'denied') collapses onto the same three-way shape the web
// Notification API already uses elsewhere in this file/ProfilePage —
// 'prompt'/'prompt-with-rationale' both mean "hasn't decided yet", same
// as the browser's own 'default'.
function fromNativePermission(state: PermissionState): NotificationPermission {
  return state === 'granted' || state === 'denied' ? state : 'default'
}

// Mirrors the raw permission state — 'default' (never asked), 'denied'
// (asked and refused, or blocked in system/browser settings — neither
// platform will re-show its own prompt after this), or 'granted'.
// ProfilePage's toggle only ever shows "on" when this is 'granted' AND a
// token is actually saved — see its own note on why those two are
// checked together instead of just one. Async on both platforms (native
// permission checks always are) — ProfilePage fetches this once on mount
// rather than needing a synchronous initial read.
export async function getPushPermission(): Promise<PushPermission> {
  if (Capacitor.isNativePlatform()) {
    const status = await PushNotifications.checkPermissions()
    return fromNativePermission(status.receive)
  }
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

async function getMessagingInstance(): Promise<Messaging | null> {
  if (Capacitor.isNativePlatform() || !(await isPushSupported())) return null
  return getMessaging(app)
}

export type EnableResult = 'subscribed' | 'denied' | 'unsupported'

// Waits for whichever of Capacitor's two registration events fires first
// in response to PushNotifications.register() below, since the plugin
// reports success/failure via events rather than the register() promise
// itself (register() only resolves once registration has *started*).
function waitForNativeToken(): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false
    function finish(value: string | null) {
      if (settled) return
      settled = true
      void successHandle.then((h) => h.remove())
      void errorHandle.then((h) => h.remove())
      resolve(value)
    }
    const successHandle = PushNotifications.addListener('registration', (token) => finish(token.value))
    const errorHandle = PushNotifications.addListener('registrationError', () => finish(null))
    void PushNotifications.register()
  })
}

// Requests the real permission prompt (native: only actually shown the
// first time — see requestPermissions' own doc comment; web: only shown
// when permission is still 'default', a prior explicit block makes this
// a same-tick no-op that resolves to 'denied', which is exactly what
// ProfilePage needs to show its "you've blocked this" message instead of
// silently doing nothing). On success, gets a real token (native: the
// device's own FCM/APNs registration; web: a VAPID-signed one via a
// service worker), saves it to this user's own doc, and asks the backend
// to subscribe that token to the right topic(s) — the toggle should only
// ever flip to "on" after this whole chain resolves, never optimistically.
export async function enablePushNotifications(uid: string): Promise<EnableResult> {
  if (Capacitor.isNativePlatform()) {
    const status = await PushNotifications.requestPermissions()
    if (status.receive !== 'granted') return 'denied'
    const token = await waitForNativeToken()
    if (!token) return 'denied'
    await updateDoc(doc(db, 'users', uid), { fcmToken: token, updatedAt: serverTimestamp() })
    await httpsCallable(functions, 'subscribeToEventNotifications')({ token })
    return 'subscribed'
  }

  const messaging = await getMessagingInstance()
  if (!messaging) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  // register() resolves as soon as registration starts, not once the
  // worker is actually active — calling getToken with that registration
  // directly is a race (fails intermittently, worse on a first-ever
  // visit, with "Subscription failed - no active Service Worker").
  // navigator.serviceWorker.ready only resolves once a worker for this
  // scope is genuinely active, which is what PushManager.subscribe (what
  // getToken calls under the hood) actually needs.
  await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  const registration = await navigator.serviceWorker.ready
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
  if (!token) return 'denied'

  await updateDoc(doc(db, 'users', uid), { fcmToken: token, updatedAt: serverTimestamp() })
  await httpsCallable(functions, 'subscribeToEventNotifications')({ token })
  return 'subscribed'
}

// firebase-messaging-sw.js's onBackgroundMessage only ever fires while
// this site's tab is NOT the focused one — that's a deliberate browser
// rule (a system popup would be redundant for a tab you're already
// looking at), not a bug, but it means a cancellation that arrives while
// someone happens to have this site open and focused would otherwise
// show nothing at all. This is the foreground counterpart: mounted once
// at app start (see App.tsx) regardless of whether push is enabled on
// this device — it's a no-op until a message actually arrives, which
// can't happen without a live subscription anyway. Builds the
// notification by hand since a foreground page must do that itself;
// only the background/service-worker path gets one automatically. A
// no-op on native — unverified whether Android's own foreground behavior
// needs the same explicit handling (its equivalent event is
// 'pushNotificationReceived'), left for whoever tests this on a real
// device to confirm before adding it speculatively.
export async function listenForForegroundMessages(): Promise<void> {
  const messaging = await getMessagingInstance()
  if (!messaging) return
  onMessage(messaging, (payload) => {
    const title = payload.notification?.title
    if (!title) return
    new Notification(title, { body: payload.notification?.body, icon: '/logo.png' })
  })
}

// The reverse — unsubscribes the topic(s) server-side (reading the token
// off this account's own doc, not whatever this specific device still
// has cached), invalidates the token itself, and clears it from
// Firestore. Doesn't touch the OS/browser's own permission grant — there's
// no API to revoke that from the app side; it's the same "granted" it
// always was, just no longer paired with a live token.
export async function disablePushNotifications(uid: string): Promise<void> {
  await httpsCallable(functions, 'unsubscribeFromEventNotifications')({})
  if (Capacitor.isNativePlatform()) {
    await PushNotifications.unregister().catch(() => {})
  } else {
    const messaging = await getMessagingInstance()
    if (messaging) await deleteToken(messaging).catch(() => {})
  }
  await updateDoc(doc(db, 'users', uid), { fcmToken: null, updatedAt: serverTimestamp() })
}
