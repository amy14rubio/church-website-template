import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase/config'

export interface InstagramPhoto {
  id: string
  url: string
  caption: string
}

interface InstagramPhotosPage {
  items: InstagramPhoto[]
  nextPageToken: string | null
}

const fetchPhotos = httpsCallable<{ after?: string }, InstagramPhotosPage>(functions, 'fetchInstagramPhotos')

// Same { items, nextPageToken } shape as YoutubePage<T>/FacebookPhoto's
// page, so this plugs straight into useYoutubePage too.
export async function fetchInstagramAccountPhotos(pageToken?: string): Promise<InstagramPhotosPage> {
  const result = await fetchPhotos(pageToken ? { after: pageToken } : {})
  return result.data
}
