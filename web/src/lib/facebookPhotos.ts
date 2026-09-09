import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase/config'

export interface FacebookPhoto {
  id: string
  url: string
  caption: string
}

interface FacebookPhotosPage {
  items: FacebookPhoto[]
  nextPageToken: string | null
}

const fetchPhotos = httpsCallable<{ after?: string }, FacebookPhotosPage>(functions, 'fetchFacebookPhotos')

// Same { items, nextPageToken } shape as YoutubePage<T> so this plugs
// straight into useYoutubePage (see PhotoPickerModal) without needing a
// separate pagination hook.
export async function fetchFacebookPagePhotos(pageToken?: string): Promise<FacebookPhotosPage> {
  const result = await fetchPhotos(pageToken ? { after: pageToken } : {})
  return result.data
}
