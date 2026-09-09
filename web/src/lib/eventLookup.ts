import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { CalendarEvent } from '@/types/models'

// A direct doc lookup for one specific event by id — used when
// deep-linking into the calendar from elsewhere (the home page's events
// list) with the event already known, rather than needing a list query.
// A plain `get` like this is evaluated against firestore.rules using the
// document's own fields directly (unlike a `list` query, which must be
// provably compliant from its filters alone) — viewableForPublic is
// enough on its own here. Returns null if the event doesn't exist
// (deleted since the link was generated) or isn't public.
export async function fetchEventById(eventId: string): Promise<CalendarEvent | null> {
  const snapshot = await getDoc(doc(db, 'events', eventId))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() } as CalendarEvent
}
