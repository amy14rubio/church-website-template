import { describe, expect, it } from 'vitest'
import {
  addMinutesToTimeString,
  addMonthlyRecurrence,
  buildMonthGrid,
  capitalizeFirst,
  formatEventDateRange,
  formatEventTimeRange,
  generateOccurrenceStarts,
  maxRecurrenceUntil,
  minutesToTimeString,
  normalizeSlotRange,
  timeStringToMinutes,
  toDateInputValue,
} from './dateTime'

describe('generateOccurrenceStarts', () => {
  it('generates one entry per week up to and including the until date', () => {
    const first = new Date('2026-01-02T19:00:00')
    const until = new Date('2026-01-23T00:00:00')
    const starts = generateOccurrenceStarts(first, 'weekly', until)

    expect(starts).toHaveLength(4)
    expect(starts[0]).toEqual(first)
    expect(starts[1].getDate()).toBe(9)
    expect(starts[3].getDate()).toBe(23)
  })

  it('generates one entry per month up to and including the until date', () => {
    // Monthly recurrence is anchored to the same ordinal weekday each
    // month (see the dedicated describe block below), not a fixed
    // day-of-month — Jan 15 2026 is the 3rd Thursday, which lands on the
    // 19th in Feb/Mar and the 16th in April, not the 15th.
    const first = new Date('2026-01-15T19:00:00')
    const until = new Date('2026-04-20T00:00:00')
    const starts = generateOccurrenceStarts(first, 'monthly', until)

    expect(starts).toHaveLength(4)
    expect(starts.map((d) => d.getMonth())).toEqual([0, 1, 2, 3])
    expect(starts.every((d) => d.getDay() === 4)).toBe(true) // every occurrence stays a Thursday
  })

  it('returns just the first occurrence when until is before the next one would land', () => {
    const first = new Date('2026-01-02T19:00:00')
    const until = new Date('2026-01-05T00:00:00')
    expect(generateOccurrenceStarts(first, 'weekly', until)).toHaveLength(1)
  })
})

describe('addMonthlyRecurrence', () => {
  it('advances to the same ordinal weekday in the next month (1st Friday -> 1st Friday)', () => {
    const first = new Date('2026-08-07T19:00:00') // 1st Friday of August 2026
    const next = addMonthlyRecurrence(first)
    expect(next.getDay()).toBe(5) // Friday
    expect(toDateInputValue(next)).toBe('2026-09-04') // 1st Friday of September
    expect(next.getHours()).toBe(19) // time-of-day preserved
  })

  it('advances to the last occurrence of the weekday when the anchor was the last one in its month', () => {
    const first = new Date('2026-07-31T09:00:00') // last Friday of July 2026 (also happens to be the 5th)
    const next = addMonthlyRecurrence(first)
    expect(next.getDay()).toBe(5)
    expect(toDateInputValue(next)).toBe('2026-08-28') // last Friday of August, not the 5th (there isn't one)

    const nextAgain = addMonthlyRecurrence(next)
    expect(toDateInputValue(nextAgain)).toBe('2026-09-25') // last Friday of September
  })
})

describe('generateOccurrenceStarts monthly weekday anchoring', () => {
  it('keeps every occurrence on the same weekday, not a fixed day-of-month', () => {
    const first = new Date('2026-08-07T19:00:00') // 1st Friday of August
    const until = new Date('2026-11-30T00:00:00')
    const starts = generateOccurrenceStarts(first, 'monthly', until)

    expect(starts.every((d) => d.getDay() === 5)).toBe(true)
    expect(starts.map(toDateInputValue)).toEqual(['2026-08-07', '2026-09-04', '2026-10-02', '2026-11-06'])
  })
})

describe('buildMonthGrid', () => {
  it('starts on a Sunday and ends on a Saturday', () => {
    const grid = buildMonthGrid(new Date('2026-09-15'))
    expect(grid[0].getDay()).toBe(0)
    expect(grid[grid.length - 1].getDay()).toBe(6)
  })

  it('is always a whole number of weeks', () => {
    const grid = buildMonthGrid(new Date('2026-09-15'))
    expect(grid.length % 7).toBe(0)
  })

  it('includes every day of the target month', () => {
    const grid = buildMonthGrid(new Date('2026-02-15'))
    const februaryDays = grid.filter((d) => d.getMonth() === 1) // February = 1
    expect(februaryDays).toHaveLength(28) // 2026 is not a leap year
  })
})

describe('maxRecurrenceUntil', () => {
  it('is exactly one year after the first occurrence', () => {
    const first = new Date('2026-01-02T19:00:00')
    expect(maxRecurrenceUntil(first)).toEqual(new Date('2027-01-02T19:00:00'))
  })
})

describe('normalizeSlotRange', () => {
  it('collapses a month-view single-day click (24h, midnight-to-midnight) to a same-day range', () => {
    const range = { start: new Date('2026-08-24T00:00:00'), end: new Date('2026-08-25T00:00:00') }
    const result = normalizeSlotRange(range)
    expect(toDateInputValue(result.start)).toBe('2026-08-24')
    expect(toDateInputValue(result.end)).toBe('2026-08-24')
    expect(result.end.getTime()).toBeGreaterThan(result.start.getTime())
  })

  it('leaves a genuine multi-day drag selection untouched', () => {
    const range = { start: new Date('2026-08-24T00:00:00'), end: new Date('2026-08-27T00:00:00') }
    expect(normalizeSlotRange(range)).toEqual(range)
  })

  it('leaves a same-day time-range selection (week/day view) untouched', () => {
    const range = { start: new Date('2026-08-24T09:00:00'), end: new Date('2026-08-24T10:00:00') }
    expect(normalizeSlotRange(range)).toEqual(range)
  })
})

describe('time-string math', () => {
  it('converts a time string to minutes since midnight', () => {
    expect(timeStringToMinutes('00:00')).toBe(0)
    expect(timeStringToMinutes('17:30')).toBe(17 * 60 + 30)
  })

  it('converts minutes since midnight back to a time string, wrapping past 24h', () => {
    expect(minutesToTimeString(90)).toBe('01:30')
    expect(minutesToTimeString(24 * 60 + 30)).toBe('00:30')
    expect(minutesToTimeString(-30)).toBe('23:30')
  })

  it('adds minutes to a time string, wrapping around midnight in both directions', () => {
    expect(addMinutesToTimeString('17:30', 120)).toBe('19:30')
    expect(addMinutesToTimeString('23:00', 120)).toBe('01:00')
    expect(addMinutesToTimeString('00:15', -30)).toBe('23:45')
  })
})

describe('capitalizeFirst', () => {
  it('capitalizes only the first letter, leaving the rest untouched', () => {
    expect(capitalizeFirst('lunes, 24 de agosto')).toBe('Lunes, 24 de agosto')
  })
})

describe('formatEventDateRange', () => {
  it('formats a same-day event as just the one date, weekday and month both capitalized', () => {
    const start = new Date('2026-08-24T09:00:00')
    const end = new Date('2026-08-24T10:00:00')
    const result = formatEventDateRange(start, end)
    expect(result.match(/Lunes/g)).toHaveLength(1)
    expect(result.match(/Agosto/g)).toHaveLength(1)
  })

  it('formats a multi-day event with both dates spelled out', () => {
    const start = new Date('2026-08-24T09:00:00')
    const end = new Date('2026-08-28T17:00:00')
    const result = formatEventDateRange(start, end)
    expect(result.match(/Agosto/g)).toHaveLength(2)
  })
})

describe('formatEventTimeRange', () => {
  it('formats the start and end time, 12-hour with plain lowercase am/pm', () => {
    const start = new Date('2026-08-24T09:00:00')
    const end = new Date('2026-08-24T17:00:00')
    const result = formatEventTimeRange(start, end)
    expect(result).toContain('9:00am')
    expect(result).toContain('5:00pm')
  })
})
