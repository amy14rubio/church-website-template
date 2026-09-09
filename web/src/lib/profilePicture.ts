import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '@/firebase/config'
import type { ImageFocalPoint } from '@/types/models'

const MAX_FILE_BYTES = 5 * 1024 * 1024

export function assertUploadableImage(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('Solo se permiten imágenes.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('La imagen no puede pesar más de 5 MB.')
  }
}

// The storage path is just the uid, not timestamp-prefixed like site
// media — a user only ever has one profile picture, so re-uploading
// should overwrite it rather than leave the old one orphaned in Storage.
// `focalPoint` comes from ProfilePage's own crop step (ImageFocalPointModal,
// shown right after picking a file and before it actually becomes the
// profile picture) — there's no separate "adjust later" flow the way
// site photos have; a new upload always carries its own crop from that
// same step, chosen together as one action.
export async function uploadProfilePicture(
  file: File,
  uid: string,
  focalPoint: ImageFocalPoint | null,
): Promise<string> {
  assertUploadableImage(file)

  const storageRef = ref(storage, `profile-pictures/${uid}`)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)

  await updateDoc(doc(db, 'users', uid), { photoURL: url, photoFocalPoint: focalPoint, updatedAt: serverTimestamp() })
  return url
}

export async function removeProfilePicture(uid: string): Promise<void> {
  await deleteObject(ref(storage, `profile-pictures/${uid}`)).catch(() => {})
  // photoRemovedByUser stays true from here on — see AuthContext's own
  // note on why this is what keeps a later Google login from silently
  // restoring the photo this just removed.
  await updateDoc(doc(db, 'users', uid), {
    photoURL: null,
    photoFocalPoint: null,
    photoRemovedByUser: true,
    updatedAt: serverTimestamp(),
  })
}
