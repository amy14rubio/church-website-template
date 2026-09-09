import { useEffect, useState } from 'react'
import { collectionGroup, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import type { RsvpStatus } from '@/types/models'

// This user's own RSVP status across every event, keyed by event id — a
// collection-group query over every events/{id}/rsvps subcollection,
// filtered to just this uid. firestore.rules allows any signed-in user to
// read any rsvps doc unconditionally, so no visibility filter is needed
// here the way CalendarView's events query needs one.
export function useMyRsvpStatuses(): Map<string, RsvpStatus> {
  const { firebaseUser } = useAuth()
  const [statuses, setStatuses] = useState<Map<string, RsvpStatus>>(new Map())

  useEffect(() => {
    if (!firebaseUser) {
      setStatuses(new Map())
      return
    }

    const rsvpsQuery = query(collectionGroup(db, 'rsvps'), where('uid', '==', firebaseUser.uid))
    return onSnapshot(rsvpsQuery, (snapshot) => {
      const next = new Map<string, RsvpStatus>()
      snapshot.docs.forEach((docSnap) => {
        const eventId = docSnap.ref.parent.parent?.id
        if (eventId) next.set(eventId, docSnap.data().status as RsvpStatus)
      })
      setStatuses(next)
    })
  }, [firebaseUser])

  return statuses
}
