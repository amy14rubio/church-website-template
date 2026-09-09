import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type SyntheticEvent,
  type TouchEvent,
} from 'react'
import {
  Calendar,
  dateFnsLocalizer,
  type DateLocalizer,
  type NavigateAction,
  type SlotInfo,
  type View,
} from 'react-big-calendar'
import { animate } from 'animejs'
import { format, getDay, isBefore, parse, startOfDay, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { collection, onSnapshot, or, query, where } from 'firebase/firestore'
import { CalendarTimeGridHeader } from '@/components/calendar/CalendarTimeGridHeader'
import { ToolbarBridge, type CalendarToolbarState } from '@/components/calendar/ToolbarBridge'
import type { AnchorRect } from '@/components/ui/AnchoredPopover'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { useMyRsvpStatuses } from '@/hooks/useMyRsvpStatuses'
import { buildMinistryColorMap, getEventColor } from '@/lib/ministryColors'
import { canViewMinistryCalendar } from '@/lib/permissions'
import type { CalendarEvent, Ministry, RsvpStatus } from '@/types/models'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './calendarTheme.css'

// Finds the actual calendar day cell under a point, so the popover can
// anchor to the date being previewed instead of the exact pixel that was
// clicked — a recurring/multi-day event renders as one continuous bar
// spanning several date columns, and anchoring to the click point (or
// worse, the whole bar's rect) either drifts off the date it's showing or
// degrades toward the middle of the screen. Month view's day-cell
// backgrounds (.rbc-day-bg) tile the grid exactly, one per date, full
// row height — so whichever one contains the point *is* that date's cell.
function findDayCellRect(clientX: number, clientY: number): AnchorRect | null {
  const dayBackgrounds = document.querySelectorAll('.rbc-day-bg')
  for (const el of dayBackgrounds) {
    const rect = el.getBoundingClientRect()
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }
    }
  }
  return null
}

// Builds an AnchorRect from wherever the click actually landed. Prefers
// the clicked date's own day-cell (see findDayCellRect) so the popover
// never covers the date it's previewing; falls back to the drag-selection
// bounds for a range-select, or a zero-size rect at the exact click point
// when neither applies (e.g. week/day view, which has no day-cell grid).
function slotInfoToAnchorRect(slotInfo: SlotInfo): AnchorRect | null {
  if (slotInfo.box) {
    const { clientX, clientY } = slotInfo.box
    return findDayCellRect(clientX, clientY) ?? { top: clientY, bottom: clientY, left: clientX, right: clientX }
  }
  if (slotInfo.bounds) {
    const { top, bottom, left, right } = slotInfo.bounds
    return { top, bottom, left, right }
  }
  return null
}

function eventClickToAnchorRect(e: SyntheticEvent<HTMLElement>): AnchorRect {
  const { clientX, clientY } = e as unknown as MouseEvent<HTMLElement>
  // A keyboard-triggered selection (e.g. pressing Enter on a focused
  // event) has no meaningful clientX/clientY — fall back to the chip's
  // own rect center instead of anchoring to the top-left corner.
  if (!clientX && !clientY) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (rect.left + rect.right) / 2
    const y = (rect.top + rect.bottom) / 2
    return findDayCellRect(x, y) ?? { top: y, bottom: y, left: x, right: x }
  }
  return findDayCellRect(clientX, clientY) ?? { top: clientY, bottom: clientY, left: clientX, right: clientX }
}

// Builds the eventPropGetter passed to <Calendar>. Combines three
// independent visual treatments:
//  - Every event carries its own ministry's color (see
//    lib/ministryColors) as a --event-color custom property, which
//    calendarTheme.css's dot/fill/outline rules all read from instead of
//    a single hardcoded accent — a church-wide event (ministryId null)
//    uses the theme's plain accent instead, same as "Toda la iglesia" in
//    the sidebar.
//  - Fades an event's own dot/fill/outline (opacity, not a color swap —
//    the ministry color should stay visible, just dimmed) once its day
//    has fully passed. Only same-day events fade — a multi-day span
//    reads as a single still-relevant entry the whole time it's on the
//    calendar, the same way Google Calendar never dims its highlighted
//    multi-day bars.
//  - Marks an event "unconfirmed" (see calendarTheme.css — only visually
//    distinct in week/day view and mobile month view, as an outline
//    instead of a filled block) unless the signed-in user has actually
//    RSVPed attending. Only applies to ministry-specific events — a
//    church-wide event has no RSVP concept at all — and never once the
//    event is past: whether anyone confirmed stops mattering once it's
//    over, so a past event always renders as a (faded) filled block.
function buildEventPropGetter(
  myRsvpStatuses: Map<string, RsvpStatus>,
  isSignedIn: boolean,
  colorMap: Map<string, string>,
) {
  return function eventPropGetter(event: RbcEvent) {
    const classes: string[] = []

    const isSameDay = startOfDay(event.start).getTime() === startOfDay(event.end).getTime()
    const isPast = isSameDay && isBefore(event.end, startOfDay(new Date()))
    if (isPast) classes.push('rbc-event-past')

    const ministryId = event.resource.ministryId
    if (!isPast && ministryId !== null && isSignedIn && myRsvpStatuses.get(event.resource.id) !== 'attending') {
      classes.push('rbc-event-unconfirmed')
    }

    return {
      className: classes.join(' '),
      style: { '--event-color': getEventColor(ministryId, colorMap) } as CSSProperties,
    }
  }
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  // Sunday-first, Saturday-last — overrides date-fns' es locale, which
  // otherwise defaults to a Monday-first week.
  startOfWeek: () => startOfWeek(new Date(), { locale: es, weekStartsOn: 0 }),
  getDay,
  locales: { es },
})

// react-big-calendar's own defaults for these four keys use the locale's
// long-time format token ('p'), and date-fns' Spanish locale defines that
// as 24-hour ("HH:mm") — this app never shows military time anywhere
// else, so these are pinned to an explicit 12-hour pattern instead. The
// other time-range formats (event chips, the drag-to-select tooltip)
// already use an explicit 'h:mma'-style pattern in react-big-calendar's
// own defaults, which is locale-independent and already correct.
const timeRangeFormat = (
  { start, end }: { start: Date; end: Date },
  culture: string | undefined,
  calendarLocalizer: DateLocalizer | undefined,
) => `${calendarLocalizer?.format(start, 'h:mm a', culture)} – ${calendarLocalizer?.format(end, 'h:mm a', culture)}`

const calendarFormats = {
  // react-big-calendar's default is 'dd' (zero-padded, e.g. "01") — this
  // app never pads single-digit days anywhere.
  dateFormat: 'd',
  agendaDateFormat: 'ccc MMM d',
  timeGutterFormat: 'h a',
  agendaTimeFormat: 'h:mm a',
  selectRangeFormat: timeRangeFormat,
  agendaTimeRangeFormat: timeRangeFormat,
}

const messages = {
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  allDay: 'Todo el día',
  week: 'Semana',
  work_week: 'Semana laboral',
  day: 'Día',
  month: 'Mes',
  previous: 'Anterior',
  next: 'Siguiente',
  yesterday: 'Ayer',
  tomorrow: 'Mañana',
  today: 'Hoy',
  agenda: 'Agenda',
  noEventsInRange: 'No hay eventos en este rango de fechas.',
  showMore: (total: number) => `+${total} más`,
}

interface RbcEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: CalendarEvent
}

// Fetches events straight from Firestore. The query itself mirrors
// firestore.rules: an unauthenticated visitor only queries for
// viewableForPublic events, and an authenticated user queries for
// viewableForPublic OR viewableForMinistry — so the same component works
// for both the public calendar and the ministry calendar (PROJECT_SPEC.md
// section 16).
interface CalendarViewProps {
  ministries: Ministry[]
  isEventVisible?: (event: CalendarEvent) => boolean
  onSelectEvent?: (event: CalendarEvent, anchorRect: AnchorRect | null) => void
  onSelectRange?: (range: { start: Date; end: Date }, anchorRect: AnchorRect | null) => void
  onToolbarStateChange?: (state: CalendarToolbarState) => void
}

// A left/right swipe needs to travel at least this far, and stay mostly
// horizontal, before it's treated as "change month/week/day" rather than
// an incidental touch (a tap, or a mostly-vertical scroll gesture).
const SWIPE_DISTANCE_THRESHOLD = 60
const SWIPE_DIRECTION_RATIO = 1.5

export function CalendarView({
  ministries,
  isEventVisible,
  onSelectEvent,
  onSelectRange,
  onToolbarStateChange,
}: CalendarViewProps) {
  const { firebaseUser, appUser } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())
  const myRsvpStatuses = useMyRsvpStatuses()

  // Which side the newly-navigated-to month/week/day should slide in
  // from — set the instant navigation happens (see handleNavigate below,
  // which both the swipe gesture and the header's prev/next/Hoy buttons
  // funnel through, same as react-big-calendar's own internal navigate
  // logic does), read back once the effect below fires after `date`
  // actually changes and the new grid has rendered. 'TODAY'/an agenda
  // date-click has no swipe-like direction of its own, so those fall
  // back to comparing the new date against the one being left — still
  // slides from whichever side makes chronological sense, just not from
  // a literal swipe.
  const pendingSlideRef = useRef<'left' | 'right' | null>(null)
  const calendarWrapRef = useRef<HTMLDivElement>(null)
  const isFirstRenderRef = useRef(true)

  function handleNavigate(newDate: Date, _view: View, action: NavigateAction) {
    if (action === 'PREV') pendingSlideRef.current = 'right'
    else if (action === 'NEXT') pendingSlideRef.current = 'left'
    else pendingSlideRef.current = newDate.getTime() >= date.getTime() ? 'left' : 'right'
    setDate(newDate)
  }

  // Slides the freshly-rendered grid in from the tracked side rather than
  // it just appearing — a lightweight approximation of Google Calendar's
  // own swipe transition (which slides the outgoing month out too; doing
  // that here would mean keeping two full <Calendar> instances mounted
  // and choreographed together, a lot more machinery for what's meant to
  // read as a quick, subtle page-turn rather than a showpiece animation).
  // Keyed on `date` alone, not `view` — switching between Month/Week/Day
  // via the view tabs isn't a "navigation" and shouldn't slide using
  // whatever direction happened to be left over from the last actual one.
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      return
    }
    const el = calendarWrapRef.current
    const direction = pendingSlideRef.current
    pendingSlideRef.current = null
    if (!el || !direction) return
    const offsetX = direction === 'left' ? 28 : -28
    animate(el, {
      translateX: [offsetX, 0],
      opacity: [0, 1],
      duration: 280,
      ease: 'outQuad',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])
  const ministryColorMap = useMemo(() => buildMinistryColorMap(ministries), [ministries])
  const eventPropGetter = useMemo(
    () => buildEventPropGetter(myRsvpStatuses, Boolean(firebaseUser), ministryColorMap),
    [myRsvpStatuses, firebaseUser, ministryColorMap],
  )

  // Populated by ToolbarBridge with react-big-calendar's own, correctly
  // per-view-computed onNavigate — kept in a ref (not state) purely so the
  // swipe handler below can call the latest version without re-binding
  // its touch listeners on every navigation.
  const toolbarStateRef = useRef<CalendarToolbarState | null>(null)
  const handleToolbarStateChange = useCallback(
    (state: CalendarToolbarState) => {
      toolbarStateRef.current = state
      onToolbarStateChange?.(state)
    },
    [onToolbarStateChange],
  )
  const toolbarComponent = useCallback(
    (props: import('react-big-calendar').ToolbarProps<RbcEvent>) => (
      <ToolbarBridge {...props} onStateChange={handleToolbarStateChange} />
    ),
    [handleToolbarStateChange],
  )

  // react-big-calendar has exactly one header-component slot (see
  // TimeGridHeader.js — it always reads components.header, regardless of
  // view), shared between month view's plain weekday-name row and week/
  // day view's per-column date headers. Giving it a custom component
  // unconditionally replaced month's row too, so this reads the current
  // view from closure to render CalendarTimeGridHeader's bigger stacked
  // date only outside month view, and month's original plain label
  // otherwise.
  const headerComponent = useCallback(
    (props: import('react-big-calendar').HeaderProps) =>
      view === 'month' ? (
        <>{props.label}</>
      ) : (
        <CalendarTimeGridHeader {...props} align={view === 'day' ? 'left' : 'center'} />
      ),
    [view],
  )

  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }
  function handleTouchEnd(e: TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start) return
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    const isHorizontalSwipe =
      Math.abs(deltaX) > SWIPE_DISTANCE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * SWIPE_DIRECTION_RATIO
    if (isHorizontalSwipe) {
      toolbarStateRef.current?.onNavigate(deltaX > 0 ? 'PREV' : 'NEXT')
    }
  }

  useEffect(() => {
    const eventsRef = collection(db, 'events')

    // A 'member' (no ministry-calendar access yet) must be queried the
    // same as a signed-out visitor — including viewableForMinistry in the
    // query's own OR-filter for them would make firestore.rules reject
    // the whole query outright, since it could never prove every possible
    // match satisfies canViewMinistryCalendar() for that requester.
    const visibilityFilter = canViewMinistryCalendar(appUser)
      ? or(where('viewableForPublic', '==', true), where('viewableForMinistry', '==', true))
      : or(where('viewableForPublic', '==', true))

    return onSnapshot(query(eventsRef, visibilityFilter), (snapshot) => {
      setEvents(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as CalendarEvent))
    })
  }, [appUser])

  const calendarEvents = useMemo<RbcEvent[]>(
    () =>
      events
        .filter((event) => isEventVisible?.(event) ?? true)
        .map((event) => ({
          id: event.id,
          title: event.title,
          start: event.startDateTime.toDate(),
          end: event.endDateTime.toDate(),
          resource: event,
        })),
    [events, isEventVisible],
  )

  return (
    <div
      // overflow-x-hidden clips the slide-in navigation animation below
      // (±28px translateX on calendarWrapRef) to this container's own
      // width — without it, the grid briefly extends past the real
      // viewport edge on every month/week/day change, a small but real
      // horizontal overflow during the ~280ms transition.
      className="min-h-[calc(100vh-64px)] flex-1 overflow-x-hidden px-2 pb-2 sm:px-4 sm:pb-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div ref={calendarWrapRef}>
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          culture="es"
          messages={messages}
          view={view}
          date={date}
          onView={setView}
          onNavigate={handleNavigate}
          views={['month', 'week', 'day', 'agenda']}
          formats={calendarFormats}
          components={{ toolbar: toolbarComponent, header: headerComponent }}
          eventPropGetter={eventPropGetter}
          onSelectEvent={(event, e) => onSelectEvent?.(event.resource, eventClickToAnchorRect(e))}
          selectable={Boolean(onSelectRange)}
          onSelectSlot={(slotInfo) =>
            onSelectRange?.({ start: slotInfo.start, end: slotInfo.end }, slotInfoToAnchorRect(slotInfo))
          }
          style={{ height: 'calc(100vh - 80px)' }}
        />
      </div>
    </div>
  )
}
