import { addDoc, collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, where } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import { db, functions, storage } from '@/firebase/config'
import type { FacebookPhoto } from '@/lib/facebookPhotos'
import type { InstagramPhoto } from '@/lib/instagramPhotos'
import type { YoutubeSelection } from '@/lib/youtube'

// Raised from 15MB once video uploads started including things like a
// hero background clip — a usable few-second video at decent quality
// rarely fits in 15MB, even though that was plenty for photos alone.
const MAX_FILE_BYTES = 50 * 1024 * 1024

export function assertUploadableFile(file: File): void {
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    throw new Error('Solo se permiten imágenes o videos.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('El archivo no puede pesar más de 50 MB.')
  }
}

// Uploads straight from the client — no Cloud Function needed for a plain
// admin upload, storage.rules alone enforces who can write here. Path is
// timestamp-prefixed so two admins uploading a same-named file at once
// can't collide. Returns the new doc's id/url so a caller can place it
// into a slot immediately (see PhotoPickerModal's "Subir" tab) without a
// separate read.
export async function uploadSiteMedia(file: File, caption: string, uid: string): Promise<{ id: string; url: string }> {
  assertUploadableFile(file)

  const storagePath = `site-media/${Date.now()}-${file.name}`
  const storageRef = ref(storage, storagePath)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)

  const docRef = await addDoc(collection(db, 'siteMedia'), {
    type: file.type.startsWith('video/') ? 'video' : 'image',
    source: 'upload',
    storagePath,
    url,
    youtubeId: null,
    youtubeKind: null,
    facebookPhotoId: null,
    instagramMediaId: null,
    caption: caption.trim(),
    createdBy: uid,
    createdAt: serverTimestamp(),
  })
  return { id: docRef.id, url }
}

// The video/playlist itself stays on YouTube — this only stores the id/
// metadata needed to embed it, matching the "don't re-host video files"
// call made when this feature was planned. Idempotent (returns the
// existing doc's id if this same video/playlist was already imported)
// since a slot assignment (src/lib/sitePlacements.ts) needs a single
// stable mediaId to point at, not a fresh duplicate every time the same
// content gets placed somewhere.
export async function importYoutubeContent(selection: YoutubeSelection, uid: string): Promise<string> {
  const youtubeId = selection.kind === 'video' ? selection.video.videoId : selection.playlist.playlistId
  const title = selection.kind === 'video' ? selection.video.title : selection.playlist.title
  const thumbnailUrl = selection.kind === 'video' ? selection.video.thumbnailUrl : selection.playlist.thumbnailUrl

  const existing = await getDocs(query(collection(db, 'siteMedia'), where('youtubeId', '==', youtubeId), limit(1)))
  if (!existing.empty) return existing.docs[0].id

  const docRef = await addDoc(collection(db, 'siteMedia'), {
    type: 'video',
    source: 'youtube',
    storagePath: null,
    url: thumbnailUrl,
    youtubeId,
    youtubeKind: selection.kind,
    facebookPhotoId: null,
    instagramMediaId: null,
    caption: title,
    createdBy: uid,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

// Facebook's /photos `images[].source` links are signed and expire
// (every stored one eventually starts 403ing, usually within a day or
// two) — unlike importYoutubeContent's stable video id, there's no
// permanent reference to fall back on here, so the Cloud Function
// downloads the actual bytes and re-hosts them in this project's own
// Storage bucket instead of storing Facebook's ephemeral URL directly.
// Idempotent via facebookPhotoId (checked server-side) so re-placing the
// same photo in another slot reuses the existing library entry rather
// than re-downloading it.
// Returns the re-hosted `url` too, not just the id — a caller that
// immediately places this photo into a slot (see PhotoPickerModal) needs
// THIS url, not the FacebookPhoto's own original one: that's the exact
// same ephemeral Facebook link this whole function exists to stop
// storing anywhere permanent.
const importFacebookPhotoFn = httpsCallable<{ photoId: string }, { id: string; url: string }>(
  functions,
  'importFacebookPhoto',
)
export async function importFacebookPhoto(photo: FacebookPhoto): Promise<{ id: string; url: string }> {
  const result = await importFacebookPhotoFn({ photoId: photo.id })
  return result.data
}

// Same fix, same reason — Instagram's media_url is just as ephemeral.
const importInstagramPhotoFn = httpsCallable<{ mediaId: string }, { id: string; url: string }>(
  functions,
  'importInstagramPhoto',
)
export async function importInstagramPhoto(photo: InstagramPhoto): Promise<{ id: string; url: string }> {
  const result = await importInstagramPhotoFn({ mediaId: photo.id })
  return result.data
}

// Deleting a library item also clears any sitePlacements pointing at it —
// otherwise the slot would keep showing the photo/video via its own
// denormalized imageUrl/youtubeId even after the library entry (and its
// storage file) is gone. The caller is responsible for warning the admin
// about this cascade before calling (see SiteMediaPage's confirm).
export async function deleteSiteMedia(id: string, storagePath: string | null): Promise<void> {
  const placementDocs = await getDocs(query(collection(db, 'sitePlacements'), where('mediaId', '==', id)))
  await Promise.all(placementDocs.docs.map((placementDoc) => deleteDoc(placementDoc.ref)))

  await deleteDoc(doc(db, 'siteMedia', id))
  if (storagePath) {
    await deleteObject(ref(storage, storagePath))
  }
}
