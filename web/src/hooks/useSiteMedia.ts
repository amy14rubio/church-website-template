import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { SiteMedia } from '@/types/models'

export function useSiteMedia() {
  const [media, setMedia] = useState<SiteMedia[]>([])

  useEffect(() => {
    const mediaQuery = query(collection(db, 'siteMedia'), orderBy('createdAt', 'desc'))

    return onSnapshot(mediaQuery, (snapshot) => {
      setMedia(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as SiteMedia))
    })
  }, [])

  return media
}
