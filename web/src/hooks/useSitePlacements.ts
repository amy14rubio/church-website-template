import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { SitePlacement } from '@/types/models'

// The whole collection is small (one doc per slot across the whole
// site), so pages just read it all and look up their own slot keys
// rather than querying per-slot.
export function useSitePlacements() {
  const [placements, setPlacements] = useState<Map<string, SitePlacement>>(new Map())

  useEffect(() => {
    return onSnapshot(collection(db, 'sitePlacements'), (snapshot) => {
      const next = new Map<string, SitePlacement>()
      snapshot.docs.forEach((docSnap) => next.set(docSnap.id, docSnap.data() as SitePlacement))
      setPlacements(next)
    })
  }, [])

  return placements
}
