import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { Rsvp, RsvpStatus } from '@/types/models'

export async function setMyRsvp(eventId: string, uid: string, name: string, status: RsvpStatus): Promise<void> {
  await setDoc(doc(collection(db, 'events', eventId, 'rsvps'), uid), {
    uid,
    name,
    status,
    updatedAt: serverTimestamp(),
  })
}

export interface GroupedRsvps {
  attending: Rsvp[]
  notAttending: Rsvp[]
  maybe: Rsvp[]
}

export function groupRsvpsByStatus(rsvps: Rsvp[]): GroupedRsvps {
  const grouped: GroupedRsvps = { attending: [], notAttending: [], maybe: [] }
  for (const rsvp of rsvps) {
    if (rsvp.status === 'attending') grouped.attending.push(rsvp)
    else if (rsvp.status === 'not_attending') grouped.notAttending.push(rsvp)
    else grouped.maybe.push(rsvp)
  }
  return grouped
}
