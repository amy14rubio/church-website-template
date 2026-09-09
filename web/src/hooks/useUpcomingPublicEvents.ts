import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { CalendarEvent } from '@/types/models'

// Fetches more than MAX_EVENTS since a recurring series can occupy
// several of the raw results in a row — the client-side dedup below
// needs enough headroom to still find MAX_EVENTS distinct series.
const FETCH_LIMIT = 30
const MAX_EVENTS = 10

// Powers the home page's "Nuestros próximos eventos" carousel. Always
// public-only (mirrors CalendarView's viewableForPublic branch, minus
// the signed-in viewableForMinistry half — this never needs to show a
// private ministry event to an anonymous home page visitor). A
// recurring event's next 5 occurrences would otherwise crowd out
// everything else, so this keeps only the earliest occurrence per
// seriesId.
export function useUpcomingPublicEvents(): CalendarEvent[] {
  const [events, setEvents] = useState<CalendarEvent[]>([])

  useEffect(() => {
    const eventsQuery = query(
      collection(db, 'events'),
      where('viewableForPublic', '==', true),
      where('startDateTime', '>=', Timestamp.now()),
      orderBy('startDateTime', 'asc'),
      limit(FETCH_LIMIT),
    )

    return onSnapshot(eventsQuery, (snapshot) => {
      const all = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as CalendarEvent)

      const seenSeries = new Set<string>()
      const deduped: CalendarEvent[] = []
      for (const event of all) {
        if (seenSeries.has(event.seriesId)) continue
        seenSeries.add(event.seriesId)
        deduped.push(event)
        if (deduped.length === MAX_EVENTS) break
      }
      setEvents(deduped)
    })
  }, [])

  return events
}
