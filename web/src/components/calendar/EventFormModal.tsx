import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { AnchoredPopover, type AnchorRect } from '@/components/ui/AnchoredPopover';
import { DatePickerPopover } from '@/components/ui/DatePickerPopover';
import { CalendarIcon, ClockIcon, EyeIcon, LocationIcon, RepeatIcon, UsersIcon } from '@/components/ui/icons';
import { Switch } from '@/components/ui/Switch';
import { TimeField } from '@/components/ui/TimeField';
import { useAuth } from '@/contexts/AuthContext';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useMinistries } from '@/hooks/useMinistries';
import {
  addMinutesToTimeString,
  combineDateAndTime,
  generateOccurrenceStarts,
  maxRecurrenceUntil,
  normalizeSlotRange,
  timeStringToMinutes,
  toDateInputValue,
  toTimeInputValue,
  toTimestamp,
} from '@/lib/dateTime';
import { loadLastEventDefaults, saveLastEventDefaults } from '@/lib/eventDraftDefaults';
import { convertToRecurringSeries, extendSeriesUntil, updateRecurringEvent, type SeriesEditScope } from '@/lib/eventSeries';
import type { CalendarEvent, RecurrenceFrequency } from '@/types/models';

const CHURCH_WIDE_VALUE = '__church_wide__';

const FREQUENCY_LABEL: Record<string, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
};

function FormRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className='flex items-start gap-4'>
      <span title={label} className='flex w-8 shrink-0 items-center justify-center pt-1.5 text-(--text-faint)'>
        {icon}
        <span className='sr-only'>{label}</span>
      </span>
      <div className='flex-1'>{children}</div>
    </div>
  );
}

const bareInputClasses =
  'w-full border-b border-(--border) bg-transparent px-0 py-1 text-sm text-(--text) placeholder:text-(--text-faint) hover:border-(--text-faint) focus:border-(--accent) focus:outline-none';

interface EventFormModalProps {
  mode: 'create' | 'edit';
  event?: CalendarEvent;
  initialRange?: { start: Date; end: Date };
  anchorRect: AnchorRect | null;
  onClose: () => void;
}

export function EventFormModal({ mode, event, initialRange, anchorRect, onClose }: EventFormModalProps) {
  const { appUser } = useAuth();
  const ministries = useMinistries();
  const isDesktop = useIsDesktop();

  const normalizedRange = initialRange ? normalizeSlotRange(initialRange) : undefined;
  const initialStart = event?.startDateTime.toDate() ?? normalizedRange?.start ?? new Date();
  const initialEnd =
    event?.endDateTime.toDate() ??
    normalizedRange?.end ??
    new Date(initialStart.getTime() + 2 * 60 * 60 * 1000);

  // Carries over a few fields from the last event this user created, so a
  // new "Crear evento" starts partially filled in. Only for a brand-new
  // event — editing an existing one always shows that event's real data.
  const carriedDefaults = mode === 'create' ? loadLastEventDefaults(appUser?.uid ?? '') : null;

  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [startDateStr, setStartDateStr] = useState(toDateInputValue(initialStart));
  const [endDateStr, setEndDateStr] = useState(toDateInputValue(initialEnd));
  const [startTime, setStartTime] = useState(toTimeInputValue(initialStart));
  const [endTime, setEndTime] = useState(toTimeInputValue(initialEnd));
  // Once the organizer touches the end time directly, stop silently
  // resetting it to a flat 2h-after-start default — an existing event's
  // duration is always considered intentional from the start.
  const [endTimeTouched, setEndTimeTouched] = useState(mode === 'edit');
  const endTimeContainerRef = useRef<HTMLDivElement>(null);

  // Keep the end date from ever landing before the start date — if the
  // organizer moves the start past the current end, follow it. Doesn't
  // touch the end date otherwise, so an intentionally multi-day span (e.g.
  // a retreat) survives editing the start time/date.
  function handleStartDateChange(value: string) {
    setStartDateStr(value);
    if (endDateStr < value) setEndDateStr(value);
  }

  // Before touched: the end time always defaults to exactly 2h after
  // start. After touched: nudging the start time shifts the end time by
  // the same amount instead, preserving whatever custom duration was set.
  function handleStartTimeChange(newStartTime: string) {
    if (!endTimeTouched) {
      setStartTime(newStartTime);
      setEndTime(addMinutesToTimeString(newStartTime, 120));
      return;
    }
    const deltaMinutes = timeStringToMinutes(newStartTime) - timeStringToMinutes(startTime);
    setStartTime(newStartTime);
    setEndTime((prevEnd) => addMinutesToTimeString(prevEnd, deltaMinutes));
  }

  function handleEndTimeChange(newEndTime: string) {
    setEndTimeTouched(true);
    setEndTime(newEndTime);
  }

  function focusEndTimeField() {
    endTimeContainerRef.current
      ?.querySelector<HTMLElement>('[data-type]:not([data-type="literal"])')
      ?.focus();
  }

  const [location, setLocation] = useState(event?.location ?? carriedDefaults?.location ?? '');
  const [ministryId, setMinistryId] = useState<string>(() => {
    if (event) return event.ministryId ?? CHURCH_WIDE_VALUE;
    if (appUser?.role === 'leader') {
      const carried = carriedDefaults?.ministryId;
      if (carried && appUser.ministryIds.includes(carried)) return carried;
      return appUser.ministryIds.length === 1 ? appUser.ministryIds[0] : '';
    }
    if (carriedDefaults) return carriedDefaults.ministryId ?? CHURCH_WIDE_VALUE;
    return CHURCH_WIDE_VALUE;
  });
  // viewableForMinistry is always true now — every event is at least
  // ministry-visible; the only choice left to the organizer is whether
  // it's ALSO public. (Ministry members can already see public events
  // regardless per firestore.rules, so this loses no real distinction.)
  const [viewableForPublic, setViewableForPublic] = useState(
    event?.viewableForPublic ?? carriedDefaults?.viewableForPublic ?? false,
  );
  // An event being edited that's already part of a series only allows
  // extending "Repetir hasta" further out — not changing the pattern
  // itself. A standalone event being edited can still become a brand new
  // series, same as create mode.
  const isEventSeries = mode === 'edit' && Boolean(event?.recurrenceFrequency);
  // 'none' folds "is this recurring at all" into the frequency choice
  // itself — Recurrencia's own dropdown, not a separate checkbox.
  const [frequency, setFrequency] = useState<'none' | RecurrenceFrequency>(
    event?.recurrenceFrequency ?? 'none',
  );
  const [recurrenceUntil, setRecurrenceUntil] = useState(
    event?.recurrenceUntil ? toDateInputValue(event.recurrenceUntil.toDate()) : '',
  );
  // Used as both the extend-date lower bound and to detect whether the
  // organizer actually changed anything for an existing series.
  const originalRecurrenceUntilStr = event?.recurrenceUntil
    ? toDateInputValue(event.recurrenceUntil.toDate())
    : null;
  const isRecurring = frequency !== 'none';

  function handleFrequencyChange(value: 'none' | RecurrenceFrequency) {
    setFrequency(value);
    if (value === 'none') setRecurrenceUntil('');
  }
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Editing an existing series occurrence doesn't save immediately — it
  // asks which occurrences the edit should apply to first, same as
  // Google Calendar's "this event / this and following / all events".
  const [pendingScopeChoice, setPendingScopeChoice] = useState(false);

  if (!appUser) return null;
  const currentUser = appUser;

  const assignedMinistries = ministries.filter((ministry) =>
    appUser.ministryIds.includes(ministry.id),
  );
  const isCoAdmin = appUser.role === 'coAdmin';
  const isLeader = appUser.role === 'leader';
  const isPastor = appUser.role === 'admin';
  // Mirrors Co-admin's locked church-wide selector: with only one ministry
  // to choose from, there's nothing to actually choose — don't make them
  // operate a dropdown with a single option.
  const hasSingleAssignedMinistry = isLeader && appUser.ministryIds.length === 1;
  const soleAssignedMinistryName =
    hasSingleAssignedMinistry &&
    (assignedMinistries.find((ministry) => ministry.id === appUser.ministryIds[0])?.name ??
      appUser.ministryIds[0]);
  // For an existing series, cap 1 year out from this occurrence's own
  // original start rather than the true first occurrence — a small
  // simplification (the two rarely land far apart) that avoids fetching
  // the whole series just to compute a cap.
  const maxUntilDate = toDateInputValue(
    maxRecurrenceUntil(isEventSeries && event ? event.startDateTime.toDate() : combineDateAndTime(startDateStr, startTime)),
  );

  function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('El título es obligatorio.');
      return;
    }

    if (isLeader && !ministryId) {
      setError('Selecciona un ministerio.');
      return;
    }

    const startDate = combineDateAndTime(startDateStr, startTime);
    const endDate = combineDateAndTime(endDateStr, endTime);
    if (endDate <= startDate) {
      setError('La fecha y hora de fin deben ser posteriores a las de inicio.');
      return;
    }

    // Converting a standalone event (create, or edit of a non-series event)
    // into a brand new series — validate the full "repeats until" range.
    if (isRecurring && !isEventSeries) {
      if (!recurrenceUntil) {
        setError('Selecciona hasta cuándo se repite el evento.');
        return;
      }
      // Compared as plain ISO date strings (both already 'YYYY-MM-DD') to
      // avoid the event's own start/end time-of-day skewing a same-day
      // comparison against the chosen until-date.
      if (recurrenceUntil < startDateStr) {
        setError(
          'La fecha final de la repetición debe ser igual o posterior a la fecha de inicio del evento.',
        );
        return;
      }
      if (recurrenceUntil > maxUntilDate) {
        setError('Un evento recurrente no puede repetirse por más de un año.');
        return;
      }
    }

    // Editing an existing series only allows extending "Repetir hasta"
    // further out — validate that here if it actually changed.
    const isExtendingSeries = isEventSeries && recurrenceUntil !== originalRecurrenceUntilStr;
    if (isExtendingSeries) {
      if (!recurrenceUntil) {
        setError('Selecciona hasta cuándo se repite el evento.');
        return;
      }
      if (originalRecurrenceUntilStr && recurrenceUntil <= originalRecurrenceUntilStr) {
        setError('La nueva fecha final debe ser posterior a la fecha actual de la serie.');
        return;
      }
      if (recurrenceUntil > maxUntilDate) {
        setError('Un evento recurrente no puede repetirse por más de un año.');
        return;
      }
    }

    // Editing an occurrence that's already part of a series doesn't save
    // right away — ask which occurrences the edit should apply to first.
    if (mode === 'edit' && event && isEventSeries) {
      setPendingScopeChoice(true);
      return;
    }

    void performSave();
  }

  async function performSave(scope?: SeriesEditScope) {
    const resolvedMinistryId = ministryId === CHURCH_WIDE_VALUE ? null : ministryId;
    const startDate = combineDateAndTime(startDateStr, startTime);
    const endDate = combineDateAndTime(endDateStr, endTime);
    const confirmedFrequency: RecurrenceFrequency | null = isRecurring ? (frequency as RecurrenceFrequency) : null;
    const untilDate = recurrenceUntil ? combineDateAndTime(recurrenceUntil, '00:00') : null;
    const isExtendingSeries = isEventSeries && recurrenceUntil !== originalRecurrenceUntilStr;

    setSubmitting(true);
    setError(null);
    try {
      const durationMs = endDate.getTime() - startDate.getTime();
      const basePayload = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        ministryId: resolvedMinistryId,
        viewableForMinistry: true,
        viewableForPublic,
        updatedBy: currentUser.uid,
        updatedAt: serverTimestamp(),
      };

      if (mode === 'edit' && event && isRecurring && !isEventSeries && untilDate && confirmedFrequency) {
        // A standalone event just got a recurrence pattern — turn it into
        // occurrence #1 of a brand new series.
        await convertToRecurringSeries(
          event.id,
          {
            title: title.trim(),
            description: description.trim(),
            location: location.trim(),
            ministryId: resolvedMinistryId,
            viewableForPublic,
            startDateTime: startDate,
            endDateTime: endDate,
          },
          confirmedFrequency,
          untilDate,
          currentUser.uid,
        );
      } else if (mode === 'edit' && event) {
        if (isEventSeries && (scope === 'following' || scope === 'all')) {
          await updateRecurringEvent(
            event,
            scope,
            {
              title: title.trim(),
              description: description.trim(),
              location: location.trim(),
              ministryId: resolvedMinistryId,
              viewableForPublic,
              startDateTime: startDate,
              endDateTime: endDate,
            },
            currentUser.uid,
          );
        } else {
          await updateDoc(doc(db, 'events', event.id), {
            ...basePayload,
            startDateTime: toTimestamp(startDateStr, startTime),
            endDateTime: toTimestamp(endDateStr, endTime),
          });
        }
        if (isExtendingSeries && untilDate && confirmedFrequency) {
          await extendSeriesUntil(
            event.seriesId,
            confirmedFrequency,
            untilDate,
            {
              title: title.trim(),
              description: description.trim(),
              location: location.trim(),
              ministryId: resolvedMinistryId,
              viewableForPublic,
              startDateTime: startDate,
              endDateTime: endDate,
            },
            currentUser.uid,
          );
        }
      } else if (untilDate && confirmedFrequency) {
        const occurrenceStarts = generateOccurrenceStarts(startDate, confirmedFrequency, untilDate);
        const seriesId = doc(collection(db, 'events')).id;
        const batch = writeBatch(db);
        occurrenceStarts.forEach((occurrenceStart) => {
          const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);
          batch.set(doc(collection(db, 'events')), {
            ...basePayload,
            startDateTime: Timestamp.fromDate(occurrenceStart),
            endDateTime: Timestamp.fromDate(occurrenceEnd),
            seriesId,
            recurrenceFrequency: confirmedFrequency,
            recurrenceUntil: Timestamp.fromDate(untilDate),
            createdBy: currentUser.uid,
            createdAt: serverTimestamp(),
          });
        });
        await batch.commit();
      } else {
        const ref = doc(collection(db, 'events'));
        await setDoc(ref, {
          ...basePayload,
          startDateTime: toTimestamp(startDateStr, startTime),
          endDateTime: toTimestamp(endDateStr, endTime),
          seriesId: ref.id,
          recurrenceFrequency: null,
          recurrenceUntil: null,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
        });
      }

      if (mode === 'create') {
        saveLastEventDefaults(currentUser.uid, {
          location: location.trim(),
          ministryId: resolvedMinistryId,
          viewableForPublic,
        });
      }
      onClose();
    } catch {
      setError('No se pudo guardar el evento. Verifica los datos e intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnchoredPopover anchorRect={anchorRect} onClose={onClose} panelWidth={420}>
      <div
        className={[
          'w-full overflow-y-auto bg-(--surface) p-6 shadow-lg md:w-[420px]',
          isDesktop ? 'rounded-xl' : 'rounded-t-xl',
        ].join(' ')}
        style={{ maxHeight: '90vh' }}
      >
        <div className='flex justify-end'>
          <button
            onClick={onClose}
            aria-label='Cerrar'
            className='shrink-0 cursor-pointer text-(--text-faint) hover:text-(--text-muted)'
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className='mt-2'>

          <input
            id='title'
            type='text'
            required
            placeholder='Evento sin título'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className='w-full border-none bg-transparent p-0 text-2xl font-bold text-(--text) placeholder:text-(--text-faint) focus:outline-none'
          />

          <div className='mt-5 space-y-3'>
            <FormRow icon={<CalendarIcon />} label='Fecha'>
              <div className='flex items-center gap-2'>
                <DatePickerPopover
                  id='startDate'
                  value={startDateStr}
                  onChange={handleStartDateChange}
                />
                <span className='text-(--text-faint)'>–</span>
                <DatePickerPopover
                  id='endDate'
                  value={endDateStr}
                  onChange={setEndDateStr}
                  min={startDateStr}
                  rangeStart={startDateStr}
                />
              </div>
            </FormRow>

            <FormRow icon={<ClockIcon />} label='Hora'>
              <div className='flex items-center gap-2'>
                <TimeField
                  id='startTime'
                  aria-label='Hora de inicio'
                  value={startTime}
                  onChange={handleStartTimeChange}
                  onLastSegmentComplete={focusEndTimeField}
                />
                <span className='text-(--text-faint)'>–</span>
                <div ref={endTimeContainerRef}>
                  <TimeField
                    id='endTime'
                    aria-label='Hora de fin'
                    value={endTime}
                    onChange={handleEndTimeChange}
                  />
                </div>
              </div>
            </FormRow>

            <FormRow icon={<LocationIcon />} label='Ubicación'>
              <input
                id='location'
                type='text'
                placeholder='Salón, dirección, enlace…'
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={bareInputClasses}
              />
            </FormRow>

            {!(isLeader && hasSingleAssignedMinistry) && (
              <FormRow icon={<UsersIcon />} label='Ministerio'>
                {(isPastor || isCoAdmin) && (
                  <select
                    value={ministryId}
                    onChange={(e) => setMinistryId(e.target.value)}
                    className='w-fit border-b border-(--border) bg-transparent py-1 text-sm text-(--text) hover:border-(--text-faint) focus:border-(--accent) focus:outline-none'
                  >
                    <option value={CHURCH_WIDE_VALUE}>Toda la iglesia (evento general)</option>
                    {ministries.map((ministry) => (
                      <option key={ministry.id} value={ministry.id}>
                        {ministry.name}
                      </option>
                    ))}
                  </select>
                )}
                {isLeader && (
                  <select
                    value={ministryId}
                    required
                    onChange={(e) => setMinistryId(e.target.value)}
                    className='w-fit border-b border-(--border) bg-transparent py-1 text-sm text-(--text) hover:border-(--text-faint) focus:border-(--accent) focus:outline-none'
                  >
                    <option value='' disabled>
                      Selecciona un ministerio
                    </option>
                    {assignedMinistries.map((ministry) => (
                      <option key={ministry.id} value={ministry.id}>
                        {ministry.name}
                      </option>
                    ))}
                  </select>
                )}
              </FormRow>
            )}

            <FormRow icon={<EyeIcon />} label='Visibilidad'>
              <Switch
                checked={viewableForPublic}
                onChange={setViewableForPublic}
                label={
                  viewableForPublic
                    ? 'Público'
                    : isLeader && hasSingleAssignedMinistry
                      ? soleAssignedMinistryName || 'Ministerio'
                      : 'Ministerio'
                }
              />
            </FormRow>

            <FormRow icon={<RepeatIcon />} label='Recurrencia'>
              <div className='flex flex-wrap items-center gap-2'>
                {mode === 'create' || !isEventSeries ? (
                  <select
                    id='frequency'
                    value={frequency}
                    onChange={(e) => handleFrequencyChange(e.target.value as 'none' | RecurrenceFrequency)}
                    className='w-fit border-b border-(--border) bg-transparent py-1 text-sm text-(--text) hover:border-(--text-faint) focus:border-(--accent) focus:outline-none'
                  >
                    <option value='none'>No es recurrente</option>
                    <option value='weekly'>Semanal</option>
                    <option value='monthly'>Mensual</option>
                  </select>
                ) : (
                  <span className='py-1 text-sm text-(--text)'>{FREQUENCY_LABEL[frequency]}</span>
                )}
                {isRecurring && (
                  <>
                    <span className='text-sm text-(--text-muted)'>hasta</span>
                    <DatePickerPopover
                      id='recurrenceUntil'
                      value={recurrenceUntil}
                      onChange={setRecurrenceUntil}
                      min={isEventSeries && originalRecurrenceUntilStr ? originalRecurrenceUntilStr : startDateStr}
                      max={maxUntilDate}
                      rangeStart={startDateStr}
                    />
                  </>
                )}
              </div>
              {isEventSeries && (
                <p className='mt-1 text-xs text-(--text-muted)'>Solo puedes extender la fecha.</p>
              )}
            </FormRow>
          </div>

          <hr className='mt-5 border-(--border)' />

          <textarea
            id='description'
            rows={3}
            placeholder='Cuéntale a la congregación de qué se trata este evento…'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className='mt-4 w-full resize-none border-none bg-transparent p-0 text-sm text-(--text) placeholder:text-(--text-faint) focus:outline-none'
          />

          {error && <p className='mt-4 text-sm text-(--danger)'>{error}</p>}

          <div className='mt-5 flex justify-end gap-2'>
            <button
              type='button'
              onClick={onClose}
              className='cursor-pointer rounded-md bg-(--surface-alt) px-3 py-2 text-sm font-medium text-(--text) hover:bg-(--surface-hover)'
            >
              Cancelar
            </button>
            <button
              type='submit'
              disabled={submitting}
              className='cursor-pointer rounded-md bg-(--accent) px-3 py-2 text-sm font-medium text-(--accent-contrast) hover:bg-(--accent-hover) disabled:opacity-60'
            >
              {mode === 'create' ? 'Crear evento' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>

      {pendingScopeChoice && (
        <AnchoredPopover anchorRect={null} onClose={() => !submitting && setPendingScopeChoice(false)}>
          <div className='w-full max-w-sm rounded-xl bg-(--surface) p-6 shadow-lg'>
            <p className='text-sm font-medium text-(--text)'>¿Editar qué eventos?</p>
            <p className='mt-1 text-xs text-(--text-muted)'>Este evento es parte de una serie recurrente.</p>

            <div className='mt-4 flex flex-col gap-2'>
              <button
                onClick={() => performSave('one')}
                disabled={submitting}
                className='cursor-pointer rounded-md border border-(--border) px-3 py-2 text-left text-sm font-medium text-(--text) hover:bg-(--surface-hover) disabled:opacity-60'
              >
                Este evento
              </button>
              <button
                onClick={() => performSave('following')}
                disabled={submitting}
                className='cursor-pointer rounded-md border border-(--border) px-3 py-2 text-left text-sm font-medium text-(--text) hover:bg-(--surface-hover) disabled:opacity-60'
              >
                Este y los siguientes eventos
              </button>
              <button
                onClick={() => performSave('all')}
                disabled={submitting}
                className='cursor-pointer rounded-md border border-(--border) px-3 py-2 text-left text-sm font-medium text-(--text) hover:bg-(--surface-hover) disabled:opacity-60'
              >
                Todos los eventos
              </button>
            </div>

            {error && <p className='mt-3 text-sm text-(--danger)'>{error}</p>}

            <div className='mt-4 flex justify-end'>
              <button
                onClick={() => setPendingScopeChoice(false)}
                disabled={submitting}
                className='cursor-pointer rounded-md bg-(--surface-alt) px-3 py-2 text-sm font-medium text-(--text) hover:bg-(--surface-hover) disabled:opacity-60'
              >
                Cancelar
              </button>
            </div>
          </div>
        </AnchoredPopover>
      )}
    </AnchoredPopover>
  );
}
