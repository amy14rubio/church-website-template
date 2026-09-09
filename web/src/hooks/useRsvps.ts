import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { Rsvp } from '@/types/models'

export function useRsvps(eventId: string) {
  const [rsvps, setRsvps] = useState<Rsvp[]>([])

  useEffect(() => {
    return onSnapshot(collection(db, 'events', eventId, 'rsvps'), (snapshot) => {
      setRsvps(snapshot.docs.map((docSnap) => docSnap.data() as Rsvp))
    })
  }, [eventId])

  return rsvps
}
