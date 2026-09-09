import { useCallback, useEffect, useState } from 'react'
import type { CalendarEvent } from '@/types/models'

// A sentinel key for "Toda la iglesia" (church-wide, ministryId === null)
// alongside real ministry ids in the same hidden-set — there's no real id
// for "no ministry" to key off of otherwise.
export const CHURCH_WIDE_FILTER_KEY = '__church_wide__'

const STORAGE_KEY = 'calendarHiddenMinistries'

// Which of an event's two visibility flags (see CalendarEvent) the
// signed-in user currently wants to browse — a calendar is conceptually
// either the public one or the ministry one, never a blend of both, so
// this is an exclusive toggle rather than two independent checkboxes.
export type EventTypeFilterValue = 'public' | 'ministry'
const EVENT_TYPE_STORAGE_KEY = 'calendarEventTypeFilter'

// Defaults to 'ministry' — the common case is someone who already has
// ministry-calendar access opening the calendar wanting to see it, not
// the public view they could get anyway without signing in. A user with
// no ministry-calendar access never sees this preference matter at all:
// CalendarPage forces the effective value back to 'public' for them
// regardless of what's stored here (see canViewMinistryCalendar there).
function loadEventTypeFilter(): EventTypeFilterValue {
  return localStorage.getItem(EVENT_TYPE_STORAGE_KEY) === 'public' ? 'public' : 'ministry'
}

function loadHidden(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((v): v is string => typeof v === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

// Which ministries (plus "Toda la iglesia") the signed-in user has
// unchecked in the calendar sidebar — a personal display preference, so
// it's persisted to localStorage the same way the theme is, rather than
// synced through Firestore.
export function useCalendarFilters() {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => loadHidden(STORAGE_KEY))
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilterValue>(loadEventTypeFilter)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...hiddenKeys]))
  }, [hiddenKeys])

  useEffect(() => {
    localStorage.setItem(EVENT_TYPE_STORAGE_KEY, eventTypeFilter)
  }, [eventTypeFilter])

  const toggle = useCallback((key: string) => {
    setHiddenKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  // "Display this only" — hides every other key at once instead of
  // unchecking them one by one.
  const showOnly = useCallback((key: string, allKeys: string[]) => {
    setHiddenKeys(new Set(allKeys.filter((k) => k !== key)))
  }, [])

  const isVisible = useCallback(
    (ministryId: string | null) => !hiddenKeys.has(ministryId ?? CHURCH_WIDE_FILTER_KEY),
    [hiddenKeys],
  )

  const isEventTypeVisible = useCallback(
    (event: Pick<CalendarEvent, 'viewableForPublic' | 'viewableForMinistry'>) =>
      eventTypeFilter === 'public' ? event.viewableForPublic : event.viewableForMinistry,
    [eventTypeFilter],
  )

  return {
    hiddenKeys,
    toggle,
    showOnly,
    isVisible,
    eventTypeFilter,
    setEventTypeFilter,
    isEventTypeVisible,
  }
}
