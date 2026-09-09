import { Timestamp } from 'firebase/firestore'
import { addDays, addMonths, addWeeks, addYears, endOfDay, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns'
import type { RecurrenceFrequency } from '@/types/models'

export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}`)
}

export function toTimestamp(dateStr: string, timeStr: string): Timestamp {
  return Timestamp.fromDate(combineDateAndTime(dateStr, timeStr))
}

export function toDateInputValue(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function toTimeInputValue(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${min}`
}

export function timeStringToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesToTimeString(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

// Wraps around midnight in both directions — a 11:30pm start plus 2 hours
// is 1:30am, and a 12:15am start minus 30 minutes is 11:45pm the day
// before (the date itself is tracked separately by the caller).
export function addMinutesToTimeString(time: string, minutesToAdd: number): string {
  return minutesToTimeString(timeStringToMinutes(time) + minutesToAdd)
}

// CSS `capitalize` capitalizes every word (turning "24 de agosto" into
// "24 De Agosto") — Spanish date/month names should only capitalize the
// first letter of the whole string.
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const eventWeekdayFormatter = new Intl.DateTimeFormat('es', { weekday: 'long' })
const eventDayFormatter = new Intl.DateTimeFormat('es', { day: 'numeric' })
const eventMonthFormatter = new Intl.DateTimeFormat('es', { month: 'long' })

// Weekday and month are capitalized separately (Spanish's own weekday/
// month names are lowercase by default) rather than capitalizeFirst-ing
// the whole combined string, which only ever fixed the first of the two
// — "lunes, 24 de Agosto" needs both, not just the leading word.
function formatEventDatePart(date: Date): string {
  const weekday = capitalizeFirst(eventWeekdayFormatter.format(date))
  const month = capitalizeFirst(eventMonthFormatter.format(date))
  return `${weekday}, ${eventDayFormatter.format(date)} de ${month}`
}

// Date and time are shown on separate rows (each with its own icon) in the
// event details view, so they're formatted separately rather than as one
// combined string. A same-day event reads as just "Lunes, 24 de Agosto";
// a multi-day event (a retreat spanning several days, say) spells out
// both dates so it doesn't read as ending the same day it starts.
export function formatEventDateRange(start: Date, end: Date): string {
  const sameDay = toDateInputValue(start) === toDateInputValue(end)
  return sameDay
    ? formatEventDatePart(start)
    : `${formatEventDatePart(start)} – ${formatEventDatePart(end)}`
}

// Builds the time manually (rather than relying on Intl's own 'es' AM/PM
// strings, which render as "a. m."/"p. m.") — English's own AM/PM parts
// come back as the plain "AM"/"PM" this reads as after lowercasing, no
// periods or extra formatting to strip.
export function formatTime12h(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(
    date,
  )
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('hour')}:${part('minute')}${part('dayPeriod').toLowerCase()}`
}

export function formatEventTimeRange(start: Date, end: Date): string {
  return `${formatTime12h(start)} – ${formatTime12h(end)}`
}

const monthAbbrFormatter = new Intl.DateTimeFormat('es', { month: 'short' })
const weekdayFormatter = new Intl.DateTimeFormat('es', { weekday: 'long' })
const weekdayAbbrFormatter = new Intl.DateTimeFormat('es', { weekday: 'short' })

// "AGO", "SEP" — for the home page's calendar-style date badge (month
// abbreviation over the day number). Spanish short-month formatting
// includes a trailing period ("ago."); stripped since a badge reads
// cleaner without it.
export function formatEventMonthAbbr(date: Date): string {
  return monthAbbrFormatter.format(date).replace('.', '').toUpperCase()
}

// "Domingo" — the day name alone, for a badge/list row that already
// shows the actual date next to it and doesn't need eventDateFormatter's
// full "domingo, 24 de agosto".
export function formatEventWeekday(date: Date): string {
  return capitalizeFirst(weekdayFormatter.format(date))
}

// "DOM", "LUN" — a short weekday marker off to the side of a list row
// (see the home page's events list), separate from formatEventWeekday's
// full spelled-out name used in the row's own text. Spanish short-weekday
// formatting includes a trailing period ("dom."); stripped for the same
// reason as formatEventMonthAbbr.
export function formatEventWeekdayAbbr(date: Date): string {
  return weekdayAbbrFormatter.format(date).replace('.', '').toUpperCase()
}

// A compact, English-style start time for the home page's event card
// ("11am", "11:30am") — deliberately not using eventTimeFormatter, which
// matches the (Spanish, space/period-separated "11:00 a. m.") format
// used everywhere else an event's time is shown. Minutes are only
// spelled out when they're not zero, so an on-the-hour event reads as
// "11am" rather than "11:00am".
export function formatEventStartTimeCompact(start: Date): string {
  const hours24 = start.getHours()
  const minutes = start.getMinutes()
  const period = hours24 < 12 ? 'am' : 'pm'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return minutes === 0 ? `${hours12}${period}` : `${hours12}:${String(minutes).padStart(2, '0')}${period}`
}

// A recurring series can't be told to run further out than this from its
// first occurrence — a sane ceiling so a stray "until" date doesn't
// generate hundreds of event documents.
export function maxRecurrenceUntil(firstOccurrence: Date): Date {
  return addYears(firstOccurrence, 1)
}

// A monthly-recurring event is anchored to "the Nth <weekday> of the
// month" (e.g. "the 1st Friday"), not to a fixed day-of-month number — a
// meeting held "the first week of the month on Fridays" should always
// land on a Friday, not drift onto whatever weekday the 1st/2nd/etc.
// happens to fall on that month. `position` is 1-4 for the 1st-4th
// occurrence of that weekday in the month, or -1 for "the last one" — a
// date that's the 5th occurrence of its weekday always is the last one
// too (5×7=35 days always overflows into the next month), so it's caught
// by the same "next week rolls into a new month" check below and never
// needs its own case.
function ordinalWeekdayPosition(date: Date): number {
  const nextWeek = addDays(date, 7)
  if (nextWeek.getMonth() !== date.getMonth()) return -1
  return Math.ceil(date.getDate() / 7)
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, position: number): Date {
  if (position === -1) {
    const last = endOfMonth(new Date(year, month, 1))
    const offsetFromLast = (last.getDay() - weekday + 7) % 7
    return addDays(last, -offsetFromLast)
  }
  const first = new Date(year, month, 1)
  const offsetFromFirst = (weekday - first.getDay() + 7) % 7
  return addDays(first, offsetFromFirst + (position - 1) * 7)
}

// Advances `date` to the same weekday + ordinal-in-month position, one
// month later — e.g. "the 1st Friday of January" -> "the 1st Friday of
// February". Preserves the original time-of-day.
export function addMonthlyRecurrence(date: Date): Date {
  const weekday = date.getDay()
  const position = ordinalWeekdayPosition(date)
  const targetMonth = addMonths(date, 1)
  const targetDay = nthWeekdayOfMonth(targetMonth.getFullYear(), targetMonth.getMonth(), weekday, position)
  targetDay.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds())
  return targetDay
}

// Every start date in the series, from the first occurrence through
// whichever calendar day `until` falls on — inclusive of that whole day
// regardless of `until`'s own time-of-day, so "repeat until Dec 31" always
// includes a same-day occurrence rather than depending on what time the
// caller happened to put on the until Date. Each entry pairs with the same
// duration as the first occurrence — callers add that duration themselves
// to get the matching end time.
export function generateOccurrenceStarts(
  firstOccurrence: Date,
  frequency: RecurrenceFrequency,
  until: Date,
): Date[] {
  const untilInclusive = endOfDay(until)
  const starts: Date[] = []
  let current = firstOccurrence
  while (current <= untilInclusive) {
    starts.push(current)
    current = frequency === 'weekly' ? addWeeks(current, 1) : addMonthlyRecurrence(current)
  }
  return starts
}

// react-big-calendar's month-view single-day slot click returns
// { start: dayMidnight, end: nextDayMidnight } — a 24h exclusive-end
// boundary meaning "this one day cell", not "an event actually spanning
// midnight to midnight the next day". Left as-is, that shape defaults a
// new event's end date to the day AFTER its start. Collapse that specific
// shape back to a sensible same-day range; a genuine multi-day drag
// selection (any other duration) passes through untouched.
export function normalizeSlotRange(range: { start: Date; end: Date }): { start: Date; end: Date } {
  const isWholeDayClick =
    range.end.getTime() - range.start.getTime() === 24 * 60 * 60 * 1000 &&
    range.start.getHours() === 0 &&
    range.start.getMinutes() === 0
  if (!isWholeDayClick) return range

  const start = new Date(range.start)
  start.setHours(9, 0, 0, 0)
  const end = new Date(range.start)
  end.setHours(11, 0, 0, 0)
  return { start, end }
}

// Full weeks (Sunday-start) covering `monthAnchor`'s month — the standard
// 5-6 row grid a calendar month view needs, including the leading/trailing
// days from adjacent months that fill out the first/last week.
export function buildMonthGrid(monthAnchor: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 0 })
  const gridEnd = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 0 })
  const days: Date[] = []
  let day = gridStart
  while (day <= gridEnd) {
    days.push(day)
    day = addDays(day, 1)
  }
  return days
}
