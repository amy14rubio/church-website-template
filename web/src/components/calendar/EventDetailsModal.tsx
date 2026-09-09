import { useEffect, useState, type ReactNode } from 'react'
import { AnchoredPopover, type AnchorRect } from '@/components/ui/AnchoredPopover'
import { CalendarIcon, ClockIcon, DescriptionIcon, EditIcon, LocationIcon, TrashIcon } from '@/components/ui/icons'
import { useAuth } from '@/contexts/AuthContext'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { usePermissions } from '@/hooks/usePermissions'
import { useRsvpState } from '@/hooks/useRsvpState'
import { formatEventDateRange, formatEventTimeRange } from '@/lib/dateTime'
import { deleteEntireSeries, deleteEventOccurrence, fetchSeriesEvents, keepOnlyOccurrence } from '@/lib/eventSeries'
import type { CalendarEvent } from '@/types/models'
import { AttendanceSummary, RsvpButtons } from './RsvpSection'

function InfoRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-1.5 flex items-start gap-2 text-sm text-(--text-muted)">
      <span className="mt-0.5 shrink-0 text-(--text-faint)">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

export function EventDetailsModal({
  event,
  anchorRect,
  onClose,
  onEdit,
}: {
  event: CalendarEvent
  anchorRect: AnchorRect | null
  onClose: () => void
  onEdit: (event: CalendarEvent) => void
}) {
  const { appUser } = useAuth()
  const { canManageEvent } = usePermissions()
  const isDesktop = useIsDesktop()
  const rsvpState = useRsvpState(event.id)
  // Only meaningful for a series — a standalone event's trash icon deletes
  // straight away instead of offering a choice of one.
  const [showDeleteChoices, setShowDeleteChoices] = useState(false)
  const [seriesCount, setSeriesCount] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = event.startDateTime.toDate()
  const end = event.endDateTime.toDate()
  const canManage = canManageEvent(event)
  // Boolean(...), not `!== null` — an event created before this field
  // existed has it `undefined`, not `null`, and `undefined !== null` is
  // true, which would wrongly treat every old event as part of a series.
  const isSeries = Boolean(event.recurrenceFrequency)

  useEffect(() => {
    if (!isSeries) return
    let cancelled = false
    fetchSeriesEvents(event.seriesId)
      .then((events) => {
        if (!cancelled) setSeriesCount(events.length)
      })
      .catch((err) => console.error('Failed to load series count', err))
    return () => {
      cancelled = true
    }
  }, [isSeries, event.seriesId])

  function handleTrashClick() {
    if (isSeries) {
      setShowDeleteChoices(true)
    } else {
      runDelete('one')
    }
  }

  async function runDelete(action: 'one' | 'all' | 'keep') {
    if (!appUser) return
    setSubmitting(true)
    setError(null)
    try {
      if (action === 'one') {
        await deleteEventOccurrence(event.id)
      } else if (action === 'all') {
        await deleteEntireSeries(event.seriesId)
      } else {
        await keepOnlyOccurrence(event.seriesId, event.id, appUser.uid)
      }
      onClose()
    } catch (err) {
      console.error('Failed to delete event/series', err)
      setError('No se pudo completar la acción. Intenta de nuevo.')
      setSubmitting(false)
    }
  }

  const otherOccurrencesCount = seriesCount !== null ? seriesCount - 1 : null

  return (
    <AnchoredPopover anchorRect={anchorRect} onClose={onClose}>
      <div
        className={[
          'flex max-h-[90vh] w-full flex-col bg-(--surface) shadow-lg',
          isDesktop ? 'rounded-xl' : 'rounded-t-xl',
        ].join(' ')}
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold text-(--text)">{event.title}</h2>
            <div className="flex shrink-0 items-center gap-1">
              {canManage && (
                <>
                  <button
                    onClick={() => onEdit(event)}
                    aria-label="Editar evento"
                    title="Editar evento"
                    className="cursor-pointer rounded p-1.5 text-(--text-faint) hover:bg-(--surface-hover) hover:text-(--text)"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={handleTrashClick}
                    aria-label="Eliminar evento"
                    title="Eliminar evento"
                    className="cursor-pointer rounded p-1.5 text-(--text-faint) hover:bg-(--danger-soft) hover:text-(--danger)"
                  >
                    <TrashIcon />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="cursor-pointer rounded p-1.5 text-(--text-faint) hover:bg-(--surface-hover) hover:text-(--text)"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="mt-2">
            <InfoRow icon={<CalendarIcon />}>{formatEventDateRange(start, end)}</InfoRow>
            <InfoRow icon={<ClockIcon />}>{formatEventTimeRange(start, end)}</InfoRow>
            {event.location && <InfoRow icon={<LocationIcon />}>{event.location}</InfoRow>}
            {event.description && <InfoRow icon={<DescriptionIcon />}>{event.description}</InfoRow>}
          </div>

          {event.ministryId !== null && <AttendanceSummary state={rsvpState} />}

          {error && <p className="mt-4 text-sm text-(--danger)">{error}</p>}
        </div>

        {event.ministryId !== null && rsvpState.appUser && (
          <div
            className={[
              'shrink-0 border-t border-(--border) bg-(--surface-alt) px-6 py-3',
              isDesktop ? 'rounded-b-xl' : '',
            ].join(' ')}
          >
            <RsvpButtons state={rsvpState} />
          </div>
        )}
      </div>

      {showDeleteChoices && (
        <AnchoredPopover anchorRect={null} onClose={() => !submitting && setShowDeleteChoices(false)}>
          <div className="w-full max-w-sm rounded-xl bg-(--surface) p-6 shadow-lg">
            <p className="text-sm font-medium text-(--text)">¿Cómo quieres eliminar este evento recurrente?</p>
            <p className="mt-1 text-xs text-(--text-muted)">Esta acción no se puede deshacer.</p>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => runDelete('one')}
                disabled={submitting}
                className="cursor-pointer rounded-md bg-(--danger-soft) px-3 py-2 text-left text-sm font-medium text-(--danger) hover:bg-(--danger-hover) hover:text-(--danger-contrast) disabled:opacity-60"
              >
                Eliminar esta fecha
              </button>
              <button
                onClick={() => runDelete('keep')}
                disabled={submitting}
                className="cursor-pointer rounded-md bg-(--danger-soft) px-3 py-2 text-left text-sm font-medium text-(--danger) hover:bg-(--danger-hover) hover:text-(--danger-contrast) disabled:opacity-60"
              >
                Mantener solo esta fecha
                {otherOccurrencesCount !== null && ` (elimina las otras ${otherOccurrencesCount})`}
              </button>
              <button
                onClick={() => runDelete('all')}
                disabled={submitting}
                className="cursor-pointer rounded-md bg-(--danger-soft) px-3 py-2 text-left text-sm font-medium text-(--danger) hover:bg-(--danger-hover) hover:text-(--danger-contrast) disabled:opacity-60"
              >
                Eliminar toda la serie{seriesCount !== null && ` (${seriesCount} fechas)`}
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowDeleteChoices(false)}
                disabled={submitting}
                className="cursor-pointer rounded-md bg-(--surface-alt) px-3 py-2 text-sm font-medium text-(--text) hover:bg-(--surface-hover) disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        </AnchoredPopover>
      )}
    </AnchoredPopover>
  )
}
