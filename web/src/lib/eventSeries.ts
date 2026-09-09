import { addWeeks } from 'date-fns'
import {
  and,
  collection,
  doc,
  getDocs,
  or,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { addMonthlyRecurrence, generateOccurrenceStarts } from '@/lib/dateTime'
import type { CalendarEvent, RecurrenceFrequency } from '@/types/models'

export interface RecurringTemplateFields {
  title: string
  description: string
  location: string
  ministryId: string | null
  viewableForPublic: boolean
  startDateTime: Date
  endDateTime: Date
}

function occurrencePayload(
  fields: RecurringTemplateFields,
  start: Date,
  end: Date,
  seriesId: string,
  frequency: RecurrenceFrequency,
  until: Date,
  actorUid: string,
) {
  return {
    title: fields.title,
    description: fields.description,
    location: fields.location,
    ministryId: fields.ministryId,
    viewableForMinistry: true,
    viewableForPublic: fields.viewableForPublic,
    startDateTime: Timestamp.fromDate(start),
    endDateTime: Timestamp.fromDate(end),
    seriesId,
    recurrenceFrequency: frequency,
    recurrenceUntil: Timestamp.fromDate(until),
    createdBy: actorUid,
    createdAt: serverTimestamp(),
    updatedBy: actorUid,
    updatedAt: serverTimestamp(),
  }
}

export async function fetchSeriesEvents(seriesId: string): Promise<CalendarEvent[]> {
  // Firestore rejects a list query outright unless it can prove, from the
  // query's own filters, that every possible result satisfies
  // firestore.rules' read rule — it won't evaluate actual documents first.
  // `where('seriesId', '==', ...)` alone doesn't constrain visibility, so
  // the visibility OR is repeated here (same shape as CalendarView's
  // query) purely to make the query provably compliant. Safe because every
  // event in this app always has at least one visibility flag true (see
  // isVisibilityValid) — this filter can never exclude a real sibling.
  const visibilityFilter = or(where('viewableForPublic', '==', true), where('viewableForMinistry', '==', true))
  const snapshot = await getDocs(
    query(collection(db, 'events'), and(where('seriesId', '==', seriesId), visibilityFilter)),
  )
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as CalendarEvent)
}

// Deletes each event doc plus any RSVP docs under it. No past/future
// filtering — mirrors the reference implementation this was modeled on:
// deletion always acts on exactly the event ids passed in, whether that's
// one occurrence or an entire series, upcoming or already past.
async function batchDeleteEvents(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return

  const rsvpSnapshots = await Promise.all(eventIds.map((id) => getDocs(collection(db, 'events', id, 'rsvps'))))

  const batch = writeBatch(db)
  eventIds.forEach((id, index) => {
    rsvpSnapshots[index].forEach((rsvpDoc) => batch.delete(rsvpDoc.ref))
    batch.delete(doc(db, 'events', id))
  })
  await batch.commit()
}

export async function deleteEventOccurrence(eventId: string): Promise<void> {
  await batchDeleteEvents([eventId])
}

export async function deleteEntireSeries(seriesId: string): Promise<void> {
  const events = await fetchSeriesEvents(seriesId)
  await batchDeleteEvents(events.map((e) => e.id))
}

// Deletes every other occurrence in the series and turns the kept one back
// into a standalone event — its own seriesId, no recurrence pattern.
export async function keepOnlyOccurrence(seriesId: string, keepEventId: string, actorUid: string): Promise<void> {
  const events = await fetchSeriesEvents(seriesId)
  const otherIds = events.filter((e) => e.id !== keepEventId).map((e) => e.id)
  await batchDeleteEvents(otherIds)
  await updateDoc(doc(db, 'events', keepEventId), {
    seriesId: keepEventId,
    recurrenceFrequency: null,
    recurrenceUntil: null,
    updatedBy: actorUid,
    updatedAt: serverTimestamp(),
  })
}

// Turns a standalone event (being edited) into occurrence #1 of a brand
// new recurring series — updates it in place (own doc id, new seriesId)
// and batch-creates the remaining future occurrences from `fields`, which
// reflects whatever the organizer just edited, not stale prop data.
export async function convertToRecurringSeries(
  eventId: string,
  fields: RecurringTemplateFields,
  frequency: RecurrenceFrequency,
  until: Date,
  actorUid: string,
): Promise<void> {
  const durationMs = fields.endDateTime.getTime() - fields.startDateTime.getTime()
  const [, ...futureStarts] = generateOccurrenceStarts(fields.startDateTime, frequency, until)
  const newSeriesId = doc(collection(db, 'events')).id

  const batch = writeBatch(db)
  batch.update(doc(db, 'events', eventId), {
    title: fields.title,
    description: fields.description,
    location: fields.location,
    ministryId: fields.ministryId,
    viewableForMinistry: true,
    viewableForPublic: fields.viewableForPublic,
    startDateTime: Timestamp.fromDate(fields.startDateTime),
    endDateTime: Timestamp.fromDate(fields.endDateTime),
    seriesId: newSeriesId,
    recurrenceFrequency: frequency,
    recurrenceUntil: Timestamp.fromDate(until),
    updatedBy: actorUid,
    updatedAt: serverTimestamp(),
  })
  futureStarts.forEach((start) => {
    const end = new Date(start.getTime() + durationMs)
    batch.set(
      doc(collection(db, 'events')),
      occurrencePayload(fields, start, end, newSeriesId, frequency, until, actorUid),
    )
  })
  await batch.commit()
}

export type SeriesEditScope = 'one' | 'following' | 'all'

// Applies an edit (title/description/location/ministry/visibility, plus a
// new time-of-day and duration) to more than just the one occurrence being
// edited — "this and following" (from `editedEvent`'s own original start
// onward) or "all" (every occurrence in the series). Each target keeps its
// own date; only the time-of-day and duration shift, taken from `fields`.
// A plain single-occurrence edit doesn't need this — the caller just
// updates that one doc directly with `fields`' start/end as-is.
export async function updateRecurringEvent(
  editedEvent: CalendarEvent,
  scope: Extract<SeriesEditScope, 'following' | 'all'>,
  fields: RecurringTemplateFields,
  actorUid: string,
): Promise<void> {
  const durationMs = fields.endDateTime.getTime() - fields.startDateTime.getTime()
  const newHours = fields.startDateTime.getHours()
  const newMinutes = fields.startDateTime.getMinutes()

  const allEvents = await fetchSeriesEvents(editedEvent.seriesId)
  const originalStart = editedEvent.startDateTime.toDate()
  const targets =
    scope === 'all' ? allEvents : allEvents.filter((e) => e.startDateTime.toDate() >= originalStart)

  const batch = writeBatch(db)
  targets.forEach((occurrence) => {
    const newStart = new Date(occurrence.startDateTime.toDate())
    newStart.setHours(newHours, newMinutes, 0, 0)
    const newEnd = new Date(newStart.getTime() + durationMs)
    batch.update(doc(db, 'events', occurrence.id), {
      title: fields.title,
      description: fields.description,
      location: fields.location,
      ministryId: fields.ministryId,
      viewableForMinistry: true,
      viewableForPublic: fields.viewableForPublic,
      startDateTime: Timestamp.fromDate(newStart),
      endDateTime: Timestamp.fromDate(newEnd),
      updatedBy: actorUid,
      updatedAt: serverTimestamp(),
    })
  })
  await batch.commit()
}

// Extends an existing series further out — generates the additional future
// occurrences beyond the current last one, and updates recurrenceUntil on
// every existing occurrence so the whole series stays consistent (every
// occurrence in a series always carries the same recurrenceUntil). Can
// only extend, never shrink — the caller is expected to have already
// validated that `newUntil` is later than the series' current until.
export async function extendSeriesUntil(
  seriesId: string,
  frequency: RecurrenceFrequency,
  newUntil: Date,
  fields: RecurringTemplateFields,
  actorUid: string,
): Promise<void> {
  const existing = await fetchSeriesEvents(seriesId)
  if (existing.length === 0) return

  const lastOccurrence = existing.reduce(
    (latest, occurrence) => {
      const occurrenceStart = occurrence.startDateTime.toDate()
      return occurrenceStart > latest ? occurrenceStart : latest
    },
    new Date(0),
  )
  const durationMs = fields.endDateTime.getTime() - fields.startDateTime.getTime()
  const nextStart = frequency === 'weekly' ? addWeeks(lastOccurrence, 1) : addMonthlyRecurrence(lastOccurrence)
  const newStarts = nextStart <= newUntil ? generateOccurrenceStarts(nextStart, frequency, newUntil) : []

  const batch = writeBatch(db)
  newStarts.forEach((start) => {
    const end = new Date(start.getTime() + durationMs)
    batch.set(
      doc(collection(db, 'events')),
      occurrencePayload(fields, start, end, seriesId, frequency, newUntil, actorUid),
    )
  })
  existing.forEach((occurrence) => {
    batch.update(doc(db, 'events', occurrence.id), {
      recurrenceUntil: Timestamp.fromDate(newUntil),
      updatedBy: actorUid,
      updatedAt: serverTimestamp(),
    })
  })
  await batch.commit()
}
