import { format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import type { HeaderProps } from 'react-big-calendar'

// Week/day view's column header — react-big-calendar's default is a
// single line of text (e.g. "25 mar"). This instead splits it into the
// weekday abbreviation on top and a big date number below, circling
// today's number, matching Google Calendar's week view. Week view's
// several narrow columns read best centered; day view's one column spans
// the full width, so it's left-aligned instead (see CalendarView, which
// passes `align` based on the current view).
export function CalendarTimeGridHeader({ date, align = 'center' }: HeaderProps & { align?: 'left' | 'center' }) {
  const isToday = isSameDay(date, new Date())

  return (
    <div className={['flex flex-col gap-1 py-1', align === 'left' ? 'items-start pl-4' : 'items-center'].join(' ')}>
      <span className="text-xs font-medium tracking-wide text-(--text-muted) uppercase">
        {format(date, 'EEE', { locale: es })}
      </span>
      <span
        className={[
          'flex h-8 w-8 items-center justify-center rounded-full text-lg font-medium',
          isToday ? 'bg-(--accent) text-(--accent-contrast)' : 'text-(--text)',
        ].join(' ')}
      >
        {format(date, 'd')}
      </span>
    </div>
  )
}
