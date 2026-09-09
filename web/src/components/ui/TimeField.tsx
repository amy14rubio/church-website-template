import type { KeyboardEvent } from 'react'
import { Time } from '@internationalized/date'
import { DateInput, DateSegment, TimeField as AriaTimeField } from 'react-aria-components'

interface TimeFieldProps {
  id?: string
  value: string
  onChange: (value: string) => void
  'aria-label'?: string
  /** Fires right after the dayPeriod (AM/PM) segment receives a keystroke
   *  that sets it — used to auto-advance focus to the next field (e.g.
   *  from "Hora de inicio" to "Hora de fin") once this one is done. */
  onLastSegmentComplete?: () => void
}

function parseTimeValue(value: string): Time | null {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  return new Time(hours, minutes)
}

// Segmented 12-hour input (hour, minute, AM/PM) — matches the 12-hour
// format the rest of the app displays times in (see dateTime.ts's
// eventTimeFormatter), so the input and the read-only views never disagree
// on whether "5" means 5am or 5pm.
export function TimeField({ id, value, onChange, 'aria-label': ariaLabel, onLastSegmentComplete }: TimeFieldProps) {
  function handleKeyDown(event: KeyboardEvent) {
    if (!onLastSegmentComplete) return
    const target = event.target as HTMLElement
    if (target.dataset.type !== 'dayPeriod') return
    if (event.key === 'Tab') return
    // Any key that could set AM/PM (a letter, or an arrow to cycle it) —
    // let react-aria process it first, then move on.
    if (event.key.length === 1 || event.key.startsWith('Arrow')) {
      setTimeout(onLastSegmentComplete, 0)
    }
  }

  return (
    <AriaTimeField
      id={id}
      aria-label={ariaLabel}
      hourCycle={12}
      granularity="minute"
      value={parseTimeValue(value)}
      onChange={(time) => {
        if (!time) return
        onChange(`${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`)
      }}
    >
      <div onKeyDown={handleKeyDown}>
        <DateInput className="inline-flex items-center gap-0.5 border-b border-(--border) px-0 py-1 text-sm hover:border-(--text-faint) focus-within:border-(--accent)">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="rounded px-0.5 tabular-nums text-(--text) caret-transparent outline-none data-placeholder:text-(--text-faint) data-focused:bg-(--accent) data-focused:text-(--accent-contrast)"
            />
          )}
        </DateInput>
      </div>
    </AriaTimeField>
  )
}
