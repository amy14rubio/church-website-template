import { useState } from 'react';
import type { useRsvpState } from '@/hooks/useRsvpState';
import type { RsvpStatus } from '@/types/models';

type RsvpState = ReturnType<typeof useRsvpState>;

const STATUS_OPTIONS: { status: RsvpStatus; label: string }[] = [
  { status: 'attending', label: 'Sí' },
  { status: 'maybe', label: 'Tal vez' },
  { status: 'not_attending', label: 'No' },
];

// Above this many responses, the full name lists start collapsed behind a
// "Ver todos" toggle — a long list otherwise dominates the rest of the
// event's details.
const COLLAPSE_THRESHOLD = 10;

// The "who's coming" list — lives in the modal's normal scrolling content,
// alongside the rest of the event's details.
export function AttendanceSummary({ state }: { state: RsvpState }) {
  const [expanded, setExpanded] = useState(false);

  if (!state.appUser) return null;
  const { grouped, rsvps } = state;
  // Nothing to summarize yet — the section only earns its place once
  // someone has actually responded.
  if (rsvps.length === 0) return null;

  const isLong = rsvps.length > COLLAPSE_THRESHOLD;
  const showList = !isLong || expanded;

  return (
    <div className='mt-3'>
      <p className='text-xs font-semibold tracking-wide text-(--text-muted) uppercase'>Asistencia</p>
      {showList ? (
        <div className='mt-1 space-y-1 text-sm text-(--text)'>
          {grouped.attending.length > 0 && <p>✓ {grouped.attending.map((r) => r.name).join(', ')}</p>}
          {grouped.maybe.length > 0 && <p>? {grouped.maybe.map((r) => r.name).join(', ')}</p>}
          {grouped.notAttending.length > 0 && (
            <p>✗ {grouped.notAttending.map((r) => r.name).join(', ')}</p>
          )}
        </div>
      ) : (
        <p className='mt-1 text-sm text-(--text)'>
          {grouped.attending.length > 0 && `${grouped.attending.length} sí`}
          {grouped.maybe.length > 0 && `, ${grouped.maybe.length} tal vez`}
          {grouped.notAttending.length > 0 && `, ${grouped.notAttending.length} no`}
        </p>
      )}
      {isLong && (
        <button
          type='button'
          onClick={() => setExpanded((v) => !v)}
          className='mt-1 cursor-pointer text-sm font-medium text-(--accent) hover:underline'
        >
          {expanded ? 'Mostrar menos' : `Ver todos (${rsvps.length})`}
        </button>
      )}
    </div>
  );
}

// The "¿Vas a asistir?" Yes/Maybe/No buttons — rendered in a sticky footer
// bar (Google Calendar-style "Going?"), separate from the scrolling
// content above it.
export function RsvpButtons({ state }: { state: RsvpState }) {
  if (!state.appUser) return null;
  const { myStatus, submittingStatus, respond } = state;

  return (
    <div className='flex flex-wrap items-center gap-3'>
      <span className='text-sm font-medium text-(--text-muted)'>¿Vas a asistir?</span>
      <div className='flex flex-wrap gap-2'>
        {STATUS_OPTIONS.map(({ status, label }) => {
          const isActive = myStatus === status;
          return (
            <button
              key={status}
              type='button'
              disabled={submittingStatus !== null}
              onClick={() => respond(status)}
              className={[
                'cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium disabled:opacity-60',
                isActive
                  ? 'border-(--accent) bg-(--accent) text-(--accent-contrast)'
                  : 'border-(--border) bg-(--surface) text-(--text) hover:bg-(--surface-hover)',
              ].join(' ')}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
