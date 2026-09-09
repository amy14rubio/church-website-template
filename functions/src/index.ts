import { randomUUID } from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { getStorage } from 'firebase-admin/storage'
import { defineSecret } from 'firebase-functions/params'
import { onDocumentDeleted } from 'firebase-functions/v2/firestore'
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https'

initializeApp()
const db = getFirestore()
const bucket = getStorage().bucket()
const messaging = getMessaging()
const auth = getAuth()

const REGION = 'us-east1'
const GRAPH_VERSION = 'v21.0'
// TODO: replace the four IDs below with your own Meta app's values.
// Facebook Login for Business config — created in the app dashboard under
// Facebook Login for Business > Configurations. It bakes in the requested
// permissions (pages_show_list, pages_read_engagement) and the token type
// (User access token), so the authorize URL references it by id instead of
// listing scopes directly.
const FACEBOOK_APP_ID = 'REPLACE_WITH_YOUR_FACEBOOK_APP_ID'
const FACEBOOK_LOGIN_CONFIG_ID = 'REPLACE_WITH_YOUR_FACEBOOK_LOGIN_CONFIG_ID'
const FACEBOOK_PAGE_ID = 'REPLACE_WITH_YOUR_FACEBOOK_PAGE_ID'
// A second Facebook Login for Business configuration, requesting the
// Instagram-specific permission bundle (instagram_basic,
// instagram_content_publishing, business_management, plus the same
// pages_* ones) instead of the Facebook one's. Same app, same App
// Secret — Instagram-via-Facebook-Login authenticates entirely through
// the original Facebook app, not a separate Instagram app/secret pair
// (confirmed via the Meta dashboard's "API setup with Facebook login"
// page, which shows no distinct credentials of its own).
const INSTAGRAM_LOGIN_CONFIG_ID = 'REPLACE_WITH_YOUR_INSTAGRAM_LOGIN_CONFIG_ID'

// Set via: firebase functions:secrets:set FACEBOOK_APP_SECRET
// (run by a human in their own terminal — never pasted into chat/code).
const facebookAppSecret = defineSecret('FACEBOOK_APP_SECRET')

// Cloud Functions v2's stable cloudfunctions.net URL — the authorize
// request and the token exchange must agree on the exact same string
// byte-for-byte, since Facebook requires the redirect_uri to match
// across both. Confirmed against the real deployed URL after first
// deploy (see the note left with the user). Shared by both Facebook's
// and Instagram's callbacks — each just names its own function.
function callbackUrl(functionName: string): string {
  return `https://${REGION}-your-firebase-project-id.cloudfunctions.net/${functionName}`
}

async function assertStaffRole(uid: string): Promise<void> {
  const userDoc = await db.doc(`users/${uid}`).get()
  const role = userDoc.data()?.role
  if (role !== 'admin' && role !== 'coAdmin') {
    throw new HttpsError('permission-denied', 'Solo el Pastor o Co-admins pueden conectar redes sociales.')
  }
}

// Called by an authenticated admin/co-admin from Medios del sitio's
// "Conectar" button. Returns the Facebook authorize URL to redirect the
// browser to — the actual code/token exchange happens in
// facebookAuthCallback below, since that step needs the App Secret,
// which never reaches the client.
export const startFacebookAuth = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  await assertStaffRole(request.auth.uid)

  // A random, one-time, server-stored nonce — both a CSRF guard and how
  // the callback (which Facebook calls directly, with no Firebase auth
  // context of its own) learns which admin initiated this.
  const state = randomUUID()
  await db.doc(`oauthStates/${state}`).set({
    uid: request.auth.uid,
    provider: 'facebook',
    createdAt: FieldValue.serverTimestamp(),
  })

  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: callbackUrl('facebookAuthCallback'),
    state,
    config_id: FACEBOOK_LOGIN_CONFIG_ID,
    response_type: 'code',
  })

  return { url: `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}` }
})

function htmlResponse(title: string, message: string): string {
  return `<!doctype html><html><body style="font-family: sans-serif; text-align: center; padding: 60px;">
    <h1>${title}</h1>
    <p>${message}</p>
  </body></html>`
}

// Facebook redirects the browser here after the admin approves (or
// denies) access on Facebook's own consent screen.
export const facebookAuthCallback = onRequest(
  { region: REGION, secrets: [facebookAppSecret] },
  async (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code : undefined
    const state = typeof req.query.state === 'string' ? req.query.state : undefined

    if (!code || !state) {
      res.status(400).send(htmlResponse('Falta información', 'Falta el código de autorización. Intenta de nuevo desde Medios del sitio.'))
      return
    }

    const stateRef = db.doc(`oauthStates/${state}`)
    const stateDoc = await stateRef.get()
    if (!stateDoc.exists) {
      res.status(400).send(htmlResponse('Solicitud expirada', 'Esta solicitud ya no es válida. Intenta de nuevo desde Medios del sitio.'))
      return
    }
    const { uid } = stateDoc.data() as { uid: string }
    await stateRef.delete()

    try {
      const redirectUri = callbackUrl('facebookAuthCallback')

      const tokenRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?` +
          new URLSearchParams({
            client_id: FACEBOOK_APP_ID,
            redirect_uri: redirectUri,
            client_secret: facebookAppSecret.value(),
            code,
          }),
      )
      const tokenData = (await tokenRes.json()) as { access_token?: string; error?: { message: string } }
      if (!tokenData.access_token) throw new Error(tokenData.error?.message ?? 'No se pudo obtener el token de acceso.')

      const longLivedRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?` +
          new URLSearchParams({
            grant_type: 'fb_exchange_token',
            client_id: FACEBOOK_APP_ID,
            client_secret: facebookAppSecret.value(),
            fb_exchange_token: tokenData.access_token,
          }),
      )
      const longLivedData = (await longLivedRes.json()) as { access_token?: string }
      const userAccessToken = longLivedData.access_token ?? tokenData.access_token

      const pagesRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?access_token=${userAccessToken}`)
      const pagesData = (await pagesRes.json()) as { data?: { id: string; name: string; access_token: string }[] }
      const page = (pagesData.data ?? []).find((p) => p.id === FACEBOOK_PAGE_ID)

      if (!page) {
        res.status(400).send(
          htmlResponse(
            'No se encontró la página',
            'Tu cuenta de Facebook no administra la página de la iglesia. Pide que un administrador de la página te dé acceso, o inicia sesión con la cuenta correcta.',
          ),
        )
        return
      }

      // Page access token — never exposed to the client. socialTokens has
      // allow read, write: if false in firestore.rules, so only this
      // Admin SDK context (which bypasses security rules entirely) can
      // ever touch it.
      await db.doc('socialTokens/facebook').set({
        pageAccessToken: page.access_token,
        pageId: page.id,
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Non-secret status the admin UI reads directly.
      await db.doc('socialConnections/facebook').set({
        provider: 'facebook',
        connected: true,
        accountName: page.name,
        connectedBy: uid,
        connectedAt: FieldValue.serverTimestamp(),
      })

      res.status(200).send(htmlResponse('¡Conectado!', `Facebook está conectado como "${page.name}". Puedes cerrar esta pestaña y volver a Medios del sitio.`))
    } catch (err) {
      res
        .status(500)
        .send(htmlResponse('Error', `No se pudo completar la conexión: ${err instanceof Error ? err.message : 'Error desconocido'}`))
    }
  },
)

const FACEBOOK_PHOTOS_PAGE_SIZE = 24

// Browses the connected Page's own photos using the stored Page access
// token — called from the picker modals when an admin fills a photo slot
// (see src/lib/facebookPhotos.ts). The token itself never reaches the
// client (socialTokens has allow read, write: if false), so this
// server-side call is the only way to use it.
export const fetchFacebookPhotos = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  await assertStaffRole(request.auth.uid)

  const tokenDoc = await db.doc('socialTokens/facebook').get()
  const pageAccessToken = tokenDoc.data()?.pageAccessToken as string | undefined
  if (!pageAccessToken) throw new HttpsError('failed-precondition', 'Facebook no está conectado todavía.')

  const after = typeof request.data?.after === 'string' ? request.data.after : undefined
  const params = new URLSearchParams({
    type: 'uploaded',
    fields: 'id,name,images',
    limit: String(FACEBOOK_PHOTOS_PAGE_SIZE),
    access_token: pageAccessToken,
  })
  if (after) params.set('after', after)

  const photosRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${FACEBOOK_PAGE_ID}/photos?${params.toString()}`)
  const photosData = (await photosRes.json()) as {
    data?: { id: string; name?: string; images?: { source: string }[] }[]
    paging?: { cursors?: { after?: string }; next?: string }
    error?: { message: string }
  }
  if (photosData.error) throw new HttpsError('internal', photosData.error.message)

  return {
    items: (photosData.data ?? []).map((p) => ({
      id: p.id,
      url: p.images?.[0]?.source ?? '',
      caption: p.name ?? '',
    })),
    nextPageToken: photosData.paging?.next ? (photosData.paging?.cursors?.after ?? null) : null,
  }
})

// Downloads image bytes server-side and re-hosts them in this project's
// own Storage bucket (site-media/, same path prefix uploadSiteMedia
// uses for a direct admin upload) — the resulting URL is what actually
// gets stored as a siteMedia doc's permanent `url`. Constructed directly
// rather than via the client SDK's getDownloadURL (no client-readable
// token needed: storage.rules already makes site-media/** publicly
// readable, so this plain REST-shaped URL works with no token at all).
async function rehostImage(sourceUrl: string, pathSuffix: string): Promise<{ storagePath: string; url: string }> {
  const imageRes = await fetch(sourceUrl)
  if (!imageRes.ok) throw new HttpsError('internal', 'No se pudo descargar la imagen original.')
  const contentType = imageRes.headers.get('content-type') ?? 'image/jpeg'
  const buffer = Buffer.from(await imageRes.arrayBuffer())

  const storagePath = `site-media/${Date.now()}-${pathSuffix}`
  await bucket.file(storagePath).save(buffer, { metadata: { contentType } })
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`
  return { storagePath, url }
}

// Facebook's own /photos `images[].source` URLs are signed and expire
// (see the `oe=` hex-timestamp query param on every one) — they're fine
// for the live Facebook-tab preview (fetchFacebookPhotos above, always
// freshly fetched right before display), but importFacebookPhoto
// previously stored that same ephemeral URL directly as a siteMedia
// doc's permanent `url`, which is exactly why every Facebook-sourced
// library photo eventually 403s (confirmed: every stored one already
// does, days after import — expiry is on the order of a day or two, not
// weeks). Re-fetching this one photo's own node right before download
// (rather than trusting whatever URL the client already has, which may
// itself be minutes-to-hours stale by the time an admin clicks "guardar")
// guarantees the signed URL is as fresh as possible at download time.
export const importFacebookPhoto = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  await assertStaffRole(request.auth.uid)

  const photoId = typeof request.data?.photoId === 'string' ? request.data.photoId : undefined
  if (!photoId) throw new HttpsError('invalid-argument', 'Falta el id de la foto.')

  const existing = await db.collection('siteMedia').where('facebookPhotoId', '==', photoId).limit(1).get()
  if (!existing.empty) return { id: existing.docs[0].id }

  const tokenDoc = await db.doc('socialTokens/facebook').get()
  const pageAccessToken = tokenDoc.data()?.pageAccessToken as string | undefined
  if (!pageAccessToken) throw new HttpsError('failed-precondition', 'Facebook no está conectado todavía.')

  const photoRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${photoId}?fields=id,name,images&access_token=${pageAccessToken}`,
  )
  const photoData = (await photoRes.json()) as {
    name?: string
    images?: { source: string }[]
    error?: { message: string }
  }
  if (photoData.error) throw new HttpsError('internal', photoData.error.message)
  const sourceUrl = photoData.images?.[0]?.source
  if (!sourceUrl) throw new HttpsError('internal', 'Facebook no devolvió una imagen para esta foto.')

  const { storagePath, url } = await rehostImage(sourceUrl, `facebook-${photoId}.jpg`)

  const docRef = await db.collection('siteMedia').add({
    type: 'image',
    source: 'facebook',
    storagePath,
    url,
    youtubeId: null,
    youtubeKind: null,
    facebookPhotoId: photoId,
    instagramMediaId: null,
    caption: photoData.name ?? '',
    createdBy: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
  })
  return { id: docRef.id, url }
})

// Same "kick off the OAuth redirect" role as startFacebookAuth, just
// pointed at the Instagram-scoped configuration and callback — Instagram
// via Facebook Login for Business authenticates through this same
// Facebook app, so client_id and the App Secret are unchanged.
export const startInstagramAuth = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  await assertStaffRole(request.auth.uid)

  const state = randomUUID()
  await db.doc(`oauthStates/${state}`).set({
    uid: request.auth.uid,
    provider: 'instagram',
    createdAt: FieldValue.serverTimestamp(),
  })

  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: callbackUrl('instagramAuthCallback'),
    state,
    config_id: INSTAGRAM_LOGIN_CONFIG_ID,
    response_type: 'code',
  })

  return { url: `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}` }
})

// Same token-exchange shape as facebookAuthCallback, plus one extra
// step: the Page's own instagram_business_account field gives the linked
// Instagram professional account's id, which is what every subsequent
// Instagram Graph API call (fetchInstagramPhotos) needs — reading it
// still goes through graph.facebook.com using the Page access token,
// not a separate Instagram token.
export const instagramAuthCallback = onRequest(
  { region: REGION, secrets: [facebookAppSecret] },
  async (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code : undefined
    const state = typeof req.query.state === 'string' ? req.query.state : undefined

    if (!code || !state) {
      res.status(400).send(htmlResponse('Falta información', 'Falta el código de autorización. Intenta de nuevo desde Medios del sitio.'))
      return
    }

    const stateRef = db.doc(`oauthStates/${state}`)
    const stateDoc = await stateRef.get()
    if (!stateDoc.exists) {
      res.status(400).send(htmlResponse('Solicitud expirada', 'Esta solicitud ya no es válida. Intenta de nuevo desde Medios del sitio.'))
      return
    }
    const { uid } = stateDoc.data() as { uid: string }
    await stateRef.delete()

    try {
      const redirectUri = callbackUrl('instagramAuthCallback')

      const tokenRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?` +
          new URLSearchParams({
            client_id: FACEBOOK_APP_ID,
            redirect_uri: redirectUri,
            client_secret: facebookAppSecret.value(),
            code,
          }),
      )
      const tokenData = (await tokenRes.json()) as { access_token?: string; error?: { message: string } }
      if (!tokenData.access_token) throw new Error(tokenData.error?.message ?? 'No se pudo obtener el token de acceso.')

      const longLivedRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?` +
          new URLSearchParams({
            grant_type: 'fb_exchange_token',
            client_id: FACEBOOK_APP_ID,
            client_secret: facebookAppSecret.value(),
            fb_exchange_token: tokenData.access_token,
          }),
      )
      const longLivedData = (await longLivedRes.json()) as { access_token?: string }
      const userAccessToken = longLivedData.access_token ?? tokenData.access_token

      const pagesRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?access_token=${userAccessToken}`)
      const pagesData = (await pagesRes.json()) as { data?: { id: string; name: string; access_token: string }[] }
      const page = (pagesData.data ?? []).find((p) => p.id === FACEBOOK_PAGE_ID)

      if (!page) {
        res.status(400).send(
          htmlResponse(
            'No se encontró la página',
            'Tu cuenta de Facebook no administra la página de la iglesia. Pide que un administrador de la página te dé acceso, o inicia sesión con la cuenta correcta.',
          ),
        )
        return
      }

      const igLinkRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
      )
      const igLinkData = (await igLinkRes.json()) as { instagram_business_account?: { id: string } }
      const instagramAccountId = igLinkData.instagram_business_account?.id

      if (!instagramAccountId) {
        res.status(400).send(
          htmlResponse(
            'No se encontró una cuenta de Instagram',
            'La página de la iglesia no tiene una cuenta de Instagram profesional vinculada todavía. Vincúlala desde la app de Instagram (Configuración → Cuenta) o desde la configuración de la página de Facebook, y vuelve a intentarlo.',
          ),
        )
        return
      }

      const igAccountRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${instagramAccountId}?fields=username&access_token=${page.access_token}`,
      )
      const igAccountData = (await igAccountRes.json()) as { username?: string }

      // Page access token — never exposed to the client. socialTokens has
      // allow read, write: if false in firestore.rules, so only this
      // Admin SDK context (which bypasses security rules entirely) can
      // ever touch it.
      await db.doc('socialTokens/instagram').set({
        pageAccessToken: page.access_token,
        instagramAccountId,
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Non-secret status the admin UI reads directly.
      await db.doc('socialConnections/instagram').set({
        provider: 'instagram',
        connected: true,
        accountName: igAccountData.username ? `@${igAccountData.username}` : 'Instagram',
        connectedBy: uid,
        connectedAt: FieldValue.serverTimestamp(),
      })

      res.status(200).send(
        htmlResponse(
          '¡Conectado!',
          `Instagram está conectado como "${igAccountData.username ? `@${igAccountData.username}` : 'la cuenta vinculada'}". Puedes cerrar esta pestaña y volver a Medios del sitio.`,
        ),
      )
    } catch (err) {
      res
        .status(500)
        .send(htmlResponse('Error', `No se pudo completar la conexión: ${err instanceof Error ? err.message : 'Error desconocido'}`))
    }
  },
)

const INSTAGRAM_PHOTOS_PAGE_SIZE = 24

// Browses the connected Instagram account's own media — same role as
// fetchFacebookPhotos, reading through the stored Page access token
// (Instagram Graph API calls made this way still go through
// graph.facebook.com, not a separate Instagram API host). Video/Reels
// posts are skipped entirely — this only ever feeds a photo picker.
export const fetchInstagramPhotos = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  await assertStaffRole(request.auth.uid)

  const tokenDoc = await db.doc('socialTokens/instagram').get()
  const pageAccessToken = tokenDoc.data()?.pageAccessToken as string | undefined
  const instagramAccountId = tokenDoc.data()?.instagramAccountId as string | undefined
  if (!pageAccessToken || !instagramAccountId) throw new HttpsError('failed-precondition', 'Instagram no está conectado todavía.')

  const after = typeof request.data?.after === 'string' ? request.data.after : undefined
  const params = new URLSearchParams({
    fields: 'id,caption,media_type,media_url',
    limit: String(INSTAGRAM_PHOTOS_PAGE_SIZE),
    access_token: pageAccessToken,
  })
  if (after) params.set('after', after)

  const mediaRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${instagramAccountId}/media?${params.toString()}`)
  const mediaData = (await mediaRes.json()) as {
    data?: { id: string; caption?: string; media_type?: string; media_url?: string }[]
    paging?: { cursors?: { after?: string }; next?: string }
    error?: { message: string }
  }
  if (mediaData.error) throw new HttpsError('internal', mediaData.error.message)

  return {
    items: (mediaData.data ?? [])
      .filter((m) => (m.media_type === 'IMAGE' || m.media_type === 'CAROUSEL_ALBUM') && m.media_url)
      .map((m) => ({
        id: m.id,
        url: m.media_url ?? '',
        caption: m.caption ?? '',
      })),
    nextPageToken: mediaData.paging?.next ? (mediaData.paging?.cursors?.after ?? null) : null,
  }
})

// Same fix as importFacebookPhoto, same root cause — Instagram's own
// `media_url` is just as signed/ephemeral as Facebook's photo CDN links,
// so it gets re-hosted here too instead of stored directly.
export const importInstagramPhoto = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  await assertStaffRole(request.auth.uid)

  const mediaId = typeof request.data?.mediaId === 'string' ? request.data.mediaId : undefined
  if (!mediaId) throw new HttpsError('invalid-argument', 'Falta el id de la publicación.')

  const existing = await db.collection('siteMedia').where('instagramMediaId', '==', mediaId).limit(1).get()
  if (!existing.empty) return { id: existing.docs[0].id }

  const tokenDoc = await db.doc('socialTokens/instagram').get()
  const pageAccessToken = tokenDoc.data()?.pageAccessToken as string | undefined
  if (!pageAccessToken) throw new HttpsError('failed-precondition', 'Instagram no está conectado todavía.')

  const mediaRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}?fields=caption,media_url&access_token=${pageAccessToken}`,
  )
  const mediaData = (await mediaRes.json()) as { caption?: string; media_url?: string; error?: { message: string } }
  if (mediaData.error) throw new HttpsError('internal', mediaData.error.message)
  if (!mediaData.media_url) throw new HttpsError('internal', 'Instagram no devolvió una imagen para esta publicación.')

  const { storagePath, url } = await rehostImage(mediaData.media_url, `instagram-${mediaId}.jpg`)

  const docRef = await db.collection('siteMedia').add({
    type: 'image',
    source: 'instagram',
    storagePath,
    url,
    youtubeId: null,
    youtubeKind: null,
    facebookPhotoId: null,
    instagramMediaId: mediaId,
    caption: mediaData.caption ?? '',
    createdBy: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
  })
  return { id: docRef.id, url }
})

// One-time repair for every siteMedia doc imported before
// importFacebookPhoto/importInstagramPhoto re-hosted images themselves —
// those stored Facebook/Instagram's own signed CDN url directly, which
// has since expired (confirmed: every one of them now 403s). This
// re-fetches a fresh signed url for the SAME photo/media id, re-hosts it,
// and updates the existing doc in place (same doc id, so nothing
// referencing it needs to change) — then also patches every
// sitePlacement that already denormalized the old (now-dead) url onto
// itself, since a slot doesn't re-read siteMedia after being assigned.
// Not idempotent-by-design like the import functions above — this is
// meant to be run once per already-broken doc, not on every pick.
export const repairSiteMediaImage = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  await assertStaffRole(request.auth.uid)

  const mediaDocId = typeof request.data?.mediaDocId === 'string' ? request.data.mediaDocId : undefined
  if (!mediaDocId) throw new HttpsError('invalid-argument', 'Falta el id.')

  const mediaRef = db.doc(`siteMedia/${mediaDocId}`)
  const mediaDoc = await mediaRef.get()
  if (!mediaDoc.exists) throw new HttpsError('not-found', 'No existe ese elemento.')
  const data = mediaDoc.data() as {
    source: string
    storagePath: string | null
    facebookPhotoId: string | null
    instagramMediaId: string | null
  }

  let sourceUrl: string | undefined
  let pathSuffix: string

  if (data.source === 'facebook') {
    if (!data.facebookPhotoId) throw new HttpsError('failed-precondition', 'A este elemento le falta el id de Facebook.')
    const tokenDoc = await db.doc('socialTokens/facebook').get()
    const pageAccessToken = tokenDoc.data()?.pageAccessToken as string | undefined
    if (!pageAccessToken) throw new HttpsError('failed-precondition', 'Facebook no está conectado todavía.')
    const photoRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${data.facebookPhotoId}?fields=images&access_token=${pageAccessToken}`,
    )
    const photoData = (await photoRes.json()) as { images?: { source: string }[]; error?: { message: string } }
    if (photoData.error) throw new HttpsError('internal', photoData.error.message)
    sourceUrl = photoData.images?.[0]?.source
    pathSuffix = `facebook-${data.facebookPhotoId}-repair-${Date.now()}.jpg`
  } else if (data.source === 'instagram') {
    if (!data.instagramMediaId) throw new HttpsError('failed-precondition', 'A este elemento le falta el id de Instagram.')
    const tokenDoc = await db.doc('socialTokens/instagram').get()
    const pageAccessToken = tokenDoc.data()?.pageAccessToken as string | undefined
    if (!pageAccessToken) throw new HttpsError('failed-precondition', 'Instagram no está conectado todavía.')
    const igMediaRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${data.instagramMediaId}?fields=media_url&access_token=${pageAccessToken}`,
    )
    const igMediaData = (await igMediaRes.json()) as { media_url?: string; error?: { message: string } }
    if (igMediaData.error) throw new HttpsError('internal', igMediaData.error.message)
    sourceUrl = igMediaData.media_url
    pathSuffix = `instagram-${data.instagramMediaId}-repair-${Date.now()}.jpg`
  } else {
    throw new HttpsError('failed-precondition', 'Este elemento no viene de Facebook ni de Instagram.')
  }

  if (!sourceUrl) throw new HttpsError('internal', 'No se pudo obtener una imagen nueva para este elemento.')

  const oldStoragePath = data.storagePath
  const { storagePath, url } = await rehostImage(sourceUrl, pathSuffix)
  await mediaRef.update({ url, storagePath })

  // Old re-hosted file (if any — docs from before this whole fix existed
  // have storagePath: null) is now orphaned; safe to remove.
  if (oldStoragePath) {
    await bucket
      .file(oldStoragePath)
      .delete({ ignoreNotFound: true })
      .catch(() => {})
  }

  const placementsSnap = await db.collection('sitePlacements').where('mediaId', '==', mediaDocId).get()
  await Promise.all(placementsSnap.docs.map((d) => d.ref.update({ imageUrl: url })))

  return { url, updatedPlacements: placementsSnap.size }
})

// Event-cancellation push notifications ------------------------------
//
// Two broadcast topics rather than per-device bookkeeping — FCM handles
// the fan-out to every subscribed device on its own. 'public-events'
// mirrors an event's viewableForPublic flag (no sign-in needed to
// receive these); 'ministry-events' mirrors viewableForMinistry, and is
// only ever subscribed to by an account with ministry-calendar access
// (see canViewMinistryCalendar in firestore.rules) — a plain 'member'
// only ever gets subscribed to the public topic. See
// src/lib/pushNotifications.ts for the client side of this.
async function hasMinistryAccess(uid: string): Promise<boolean> {
  const userDoc = await db.doc(`users/${uid}`).get()
  return userDoc.data()?.role !== 'member'
}

export const subscribeToEventNotifications = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  const token = typeof request.data?.token === 'string' ? request.data.token : undefined
  if (!token) throw new HttpsError('invalid-argument', 'Falta el token de notificaciones.')

  await messaging.subscribeToTopic(token, 'public-events')
  if (await hasMinistryAccess(request.auth.uid)) {
    await messaging.subscribeToTopic(token, 'ministry-events')
  }
  return { ok: true }
})

// Reads the token off the caller's own doc rather than trusting one
// passed from the client — by the time someone disables this, the
// client's local copy and Firestore's should already agree anyway (see
// disablePushNotifications), but there's no reason to trust the client
// over the record this whole system is built on.
export const unsubscribeFromEventNotifications = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  const userDoc = await db.doc(`users/${request.auth.uid}`).get()
  const token = userDoc.data()?.fcmToken as string | undefined
  if (token) {
    await messaging.unsubscribeFromTopic(token, 'public-events').catch(() => {})
    await messaging.unsubscribeFromTopic(token, 'ministry-events').catch(() => {})
  }
  return { ok: true }
})

// Runs server-side (admin SDK) rather than as a client-side
// deleteUser() call specifically so it works the same way regardless of
// how someone signed in — Firebase's client SDK requires a "recent
// login" to delete a user, which would mean building a full re-auth flow
// for password accounts AND a separate one for Google accounts (a fresh
// popup/native sign-in to get a new credential). None of that applies to
// an admin-SDK deletion, which only trusts the caller's own (always
// fresh) ID token — so this is both simpler and covers every sign-in
// method for free.
export const deleteAccount = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
  const uid = request.auth.uid

  // RSVPs live under each event ('events/{eventId}/rsvps/{uid}'), not
  // under the user's own doc, so they need their own query — the 'uid'
  // field mirrors the doc's own id (see rsvp.ts), letting this collection
  // group query find every one of this user's RSVPs across every event.
  const rsvpDocs = await db.collectionGroup('rsvps').where('uid', '==', uid).get()
  const batch = db.batch()
  rsvpDocs.forEach((rsvpDoc) => batch.delete(rsvpDoc.ref))
  batch.delete(db.doc(`users/${uid}/private/profile`))
  batch.delete(db.doc(`users/${uid}`))
  await batch.commit()

  // Last, since it's the one step that can't be retried once the Firestore
  // data above is already gone.
  await auth.deleteUser(uid)
  return { ok: true }
})

// Deliberately onDocumentDeleted only — an edited/modified event sends
// nothing, per the explicit call that only a cancellation (deletion)
// should notify anyone. The deleted document's last-known data is still
// available on the trigger's snapshot even though it no longer exists.
// Matches web/src/lib/dateTime.ts's own formatting conventions
// (Spanish, long weekday/month, 12-hour time) so a notification reads
// the same way the calendar UI would show it — just re-declared here
// since functions/ is a separate package from web/ with no shared
// import between them. `timeZone` has to be explicit and fixed: unlike
// the browser-side formatters (which implicitly use each visitor's own
// local time, fine for a page they're looking at), this runs on Google's
// servers wherever the runtime happens to be (not necessarily US
// Eastern), so leaving it out would show times in the wrong zone.
const EVENT_TIME_ZONE = 'America/New_York'
const notificationWeekdayFormatter = new Intl.DateTimeFormat('es', { weekday: 'long', timeZone: EVENT_TIME_ZONE })
const notificationDayFormatter = new Intl.DateTimeFormat('es', { day: 'numeric', timeZone: EVENT_TIME_ZONE })
const notificationMonthFormatter = new Intl.DateTimeFormat('es', { month: 'long', timeZone: EVENT_TIME_ZONE })

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Builds the time manually (rather than relying on Intl's own 'es'
// AM/PM strings, which render as "a. m."/"p. m.") — English's own AM/PM
// parts come back as the plain "AM"/"PM" this reads as after
// lowercasing, no periods or extra formatting to strip.
function formatTime12h(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: EVENT_TIME_ZONE,
  }).formatToParts(date)
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('hour')}:${part('minute')}${part('dayPeriod').toLowerCase()}`
}

// Weekday and month are capitalized separately (Spanish's own weekday/
// month names are lowercase by default) — capitalizing only the leading
// word of a combined string would leave the month lowercase.
function formatEventDateTime(date: Date): string {
  const weekday = capitalizeFirst(notificationWeekdayFormatter.format(date))
  const month = capitalizeFirst(notificationMonthFormatter.format(date))
  return `${weekday}, ${notificationDayFormatter.format(date)} de ${month}, ${formatTime12h(date)}`
}

export const notifyOnEventCancellation = onDocumentDeleted(
  { document: 'events/{eventId}', region: REGION },
  async (event) => {
    const data = event.data?.data() as
      | {
          title?: string
          startDateTime?: Timestamp
          viewableForPublic?: boolean
          viewableForMinistry?: boolean
        }
      | undefined
    if (!data) return

    const topics: string[] = []
    if (data.viewableForPublic) topics.push('public-events')
    if (data.viewableForMinistry) topics.push('ministry-events')
    if (topics.length === 0) return

    const when = data.startDateTime ? formatEventDateTime(data.startDateTime.toDate()) : null
    const notification = {
      title: 'Evento cancelado',
      body: data.title
        ? `"${data.title}"${when ? ` — ${when}` : ''} ha sido cancelado.`
        : 'Un evento ha sido cancelado.',
    }
    await Promise.all(topics.map((topic) => messaging.send({ topic, notification })))
  },
)
