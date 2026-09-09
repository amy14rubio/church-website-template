import { useLayoutEffect, useRef, useState } from 'react'
import { addMonths, subMonths } from 'date-fns'
import { buildMonthGrid, capitalizeFirst, combineDateAndTime, toDateInputValue } from '@/lib/dateTime'

const WEEKDAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const GAP = 4
const MARGIN = 8
const PANEL_WIDTH = 272 // matches w-68

const triggerLabelFormatter = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })
const monthHeaderFormatter = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' })

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 3.5 5.5 8l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 3.5 10.5 8 6 12.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface DatePickerPopoverProps {
  id?: string
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  /** When set, days between this date and the value/hovered day are
   *  highlighted as a range preview — for picking an end date anchored to
   *  an already-fixed start (e.g. "repeat until"), not a two-click range. */
  rangeStart?: string
  placeholder?: string
}

export function DatePickerPopover({ id, value, onChange, min, max, rangeStart, placeholder }: DatePickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoverDay, setHoverDay] = useState<string | null>(null)
  const [visibleMonth, setVisibleMonth] = useState(() =>
    combineDateAndTime(value || rangeStart || toDateInputValue(new Date()), '00:00'),
  )
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  // Anchored to the trigger's own bottom edge rather than centered in the
  // viewport — keeps the panel's top edge fixed in place regardless of how
  // many rows a given month's grid needs (a short month no longer makes
  // the whole panel jump upward), and puts it directly below the field
  // it belongs to instead of floating in the middle of the screen.
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!isOpen) return

    function recompute() {
      const trigger = triggerRef.current
      const panel = panelRef.current
      if (!trigger || !panel) return
      const triggerRect = trigger.getBoundingClientRect()
      const panelHeight = panel.offsetHeight

      const spaceBelow = window.innerHeight - triggerRect.bottom
      const opensUpward = spaceBelow < panelHeight + GAP && triggerRect.top > panelHeight + GAP
      const top = opensUpward ? triggerRect.top - panelHeight - GAP : triggerRect.bottom + GAP

      let left = triggerRect.left
      left = Math.min(Math.max(left, MARGIN), window.innerWidth - PANEL_WIDTH - MARGIN)

      setPosition({ top, left })
    }

    recompute()
    window.addEventListener('resize', recompute)
    window.addEventListener('scroll', recompute, true)
    return () => {
      window.removeEventListener('resize', recompute)
      window.removeEventListener('scroll', recompute, true)
    }
  }, [isOpen, visibleMonth])

  function openPopover() {
    setVisibleMonth(combineDateAndTime(value || rangeStart || toDateInputValue(new Date()), '00:00'))
    setPosition(null)
    setIsOpen(true)
  }

  function selectDay(dayStr: string) {
    onChange(dayStr)
    setIsOpen(false)
    setHoverDay(null)
  }

  const previewEnd = hoverDay ?? (value || null)
  const days = buildMonthGrid(visibleMonth)

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openPopover())}
        className={[
          'inline-flex cursor-pointer items-center border-b px-0 py-1 text-left text-sm outline-none',
          isOpen ? 'border-(--accent)' : 'border-(--border) hover:border-(--text-faint)',
          value ? 'text-(--text)' : 'text-(--text-faint)',
        ].join(' ')}
      >
        {value ? triggerLabelFormatter.format(combineDateAndTime(value, '00:00')) : placeholder ?? 'Selecciona una fecha'}
      </button>

      {isOpen && (
        // A transparent full-screen layer behind the panel doubles as the
        // click-outside-to-close target — the panel itself is anchored
        // directly below (or above, if there's no room) the trigger.
        <div className="fixed inset-0 z-50" onClick={() => setIsOpen(false)}>
          <div
            ref={panelRef}
            onClick={(event) => event.stopPropagation()}
            className="fixed w-68 max-w-full rounded-lg border border-(--border) bg-(--surface) p-3 shadow-lg"
            style={{
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              visibility: position ? 'visible' : 'hidden',
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
                aria-label="Mes anterior"
                className="cursor-pointer rounded p-1 text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text)"
              >
                <ChevronLeftIcon />
              </button>
              <span className="text-sm font-medium text-(--text)">
                {capitalizeFirst(monthHeaderFormatter.format(visibleMonth))}
              </span>
              <button
                type="button"
                onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
                aria-label="Mes siguiente"
                className="cursor-pointer rounded p-1 text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text)"
              >
                <ChevronRightIcon />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-xs uppercase text-(--text-faint)">
              {WEEKDAY_LABELS.map((label, index) => (
                <div key={index}>{label}</div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-y-1">
              {days.map((day) => {
                const dayStr = toDateInputValue(day)
                const isCurrentMonth = day.getMonth() === visibleMonth.getMonth()
                const isDisabled = Boolean((min && dayStr < min) || (max && dayStr > max))
                const isSelected = dayStr === value
                const isRangeAnchor = rangeStart !== undefined && dayStr === rangeStart
                const isInRange =
                  rangeStart !== undefined && previewEnd !== null && dayStr > rangeStart && dayStr < previewEnd
                const isRangeEndPreview = rangeStart !== undefined && previewEnd !== null && dayStr === previewEnd

                return (
                  <div key={dayStr} className="flex items-center justify-center">
                    <button
                      type="button"
                      disabled={isDisabled}
                      onMouseEnter={() => rangeStart !== undefined && setHoverDay(dayStr)}
                      onMouseLeave={() => setHoverDay(null)}
                      onClick={() => selectDay(dayStr)}
                      className={[
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm transition',
                        !isDisabled && 'cursor-pointer',
                        !isCurrentMonth && 'text-(--text-faint)',
                        isCurrentMonth && !isDisabled && 'text-(--text)',
                        isDisabled && 'cursor-not-allowed text-(--text-faint)',
                        !isDisabled && !isSelected && !isRangeAnchor && !isRangeEndPreview && 'hover:bg-(--surface-hover)',
                        (isSelected || isRangeAnchor || isRangeEndPreview) && !isDisabled && 'bg-(--accent) text-(--accent-contrast)',
                        isInRange && !isDisabled && 'rounded-none bg-(--surface-hover)',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {day.getDate()}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
