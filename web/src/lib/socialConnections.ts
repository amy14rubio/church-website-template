import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase/config'

// Kicks off the Facebook OAuth flow (functions/src/index.ts's
// startFacebookAuth) and sends the browser to Facebook's own consent
// screen. The actual token exchange happens server-side in
// facebookAuthCallback once Facebook redirects back.
export async function startFacebookConnect(): Promise<void> {
  const start = httpsCallable<void, { url: string }>(functions, 'startFacebookAuth')
  const result = await start()
  window.location.href = result.data.url
}

// Same flow, requesting the Instagram-scoped configuration instead
// (startInstagramAuth/instagramAuthCallback) — still authenticates
// through the church's Facebook account, since the linked Instagram
// professional account is reached via Facebook Login for Business.
export async function startInstagramConnect(): Promise<void> {
  const start = httpsCallable<void, { url: string }>(functions, 'startInstagramAuth')
  const result = await start()
  window.location.href = result.data.url
}
