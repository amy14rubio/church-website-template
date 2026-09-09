import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarPageHeader } from '@/components/calendar/CalendarPageHeader';
import {
  CalendarSidebarDesktop,
  CalendarSidebarMobile,
} from '@/components/calendar/CalendarSidebar';
import { CalendarView } from '@/components/calendar/CalendarView';
import { EventDetailsModal } from '@/components/calendar/EventDetailsModal';
import { EventFormModal } from '@/components/calendar/EventFormModal';
import type { CalendarToolbarState } from '@/components/calendar/ToolbarBridge';
import type { AnchorRect } from '@/components/ui/AnchoredPopover';
import { PlusIcon } from '@/components/ui/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useApplyCalendarTheme, useTheme } from '@/contexts/ThemeContext';
import { CHURCH_WIDE_FILTER_KEY, useCalendarFilters } from '@/hooks/useCalendarFilters';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useMinistries } from '@/hooks/useMinistries';
import { usePermissions } from '@/hooks/usePermissions';
import { fetchEventById } from '@/lib/eventLookup';
import { seedMinistriesIfEmpty } from '@/lib/seedMinistries';
import type { CalendarEvent } from '@/types/models';

type FormState = (
  | { mode: 'create'; initialRange?: { start: Date; end: Date } }
  | { mode: 'edit'; event: CalendarEvent }
) & { anchorRect: AnchorRect | null };

export function CalendarPage() {
  const { appUser } = useAuth();
  const { canCreateAnyEvent, canViewMinistryCalendar } = usePermissions();
  const isDesktop = useIsDesktop();
  const { theme } = useTheme();
  useApplyCalendarTheme(theme);
  const ministries = useMinistries();
  const {
    hiddenKeys,
    toggle: toggleMinistryFilter,
    showOnly,
    isVisible,
    eventTypeFilter: eventTypeFilterValue,
    setEventTypeFilter,
    isEventTypeVisible,
  } = useCalendarFilters();
  // Desktop's sidebar carries the "Crear" button now (see below), so it
  // needs to start open for that to be reachable without first finding the
  // hamburger menu — mobile's is a full-screen overlay, so it still starts
  // closed.
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);
  const [selectedEvent, setSelectedEvent] = useState<{
    event: CalendarEvent;
    anchorRect: AnchorRect | null;
  } | null>(null);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [toolbarState, setToolbarState] = useState<CalendarToolbarState | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (appUser?.role === 'admin') {
      void seedMinistriesIfEmpty();
    }
  }, [appUser]);

  // Deep-linked from elsewhere (the home page's events list) with one
  // specific event already known — fetch just that doc and open its
  // details modal with no anchor (EventDetailsModal/AnchoredPopover
  // already support anchorRect: null for a non-click-triggered open, see
  // the recurring-delete-choices dialog in EventDetailsModal itself).
  // The param is stripped only once the fetch has actually resolved
  // (not eagerly alongside it) — clearing it eagerly changes
  // `searchParams`, which re-runs this same effect on the next render
  // and cancels the in-flight fetch via its own cleanup before the modal
  // ever gets to open.
  useEffect(() => {
    const eventId = searchParams.get('eventId');
    if (!eventId) return;
    let cancelled = false;
    void fetchEventById(eventId).then((event) => {
      if (cancelled) return;
      if (event) setSelectedEvent({ event, anchorRect: null });
      setSearchParams(
        (params) => {
          params.delete('eventId');
          return params;
        },
        { replace: true },
      );
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const canCreate = canCreateAnyEvent();
  const hasMinistryAccess = canViewMinistryCalendar();
  // A stored/default preference of 'ministry' (see useCalendarFilters'
  // own default) is meaningless for someone without ministry-calendar
  // access — force the public view for them regardless of what's stored,
  // rather than showing an empty calendar (CalendarView's own query
  // already only ever fetches public events for this person anyway).
  const isEventVisible = useCallback(
    (event: CalendarEvent) =>
      isVisible(event.ministryId) && (hasMinistryAccess ? isEventTypeVisible(event) : event.viewableForPublic),
    [isVisible, isEventTypeVisible, hasMinistryAccess],
  );
  // Only shown once ministry-calendar access has actually been granted —
  // a plain member has no "Calendario de ministerio" option to switch to
  // at all, rather than a visible-but-locked one; the offer to request
  // access lives in ProfilePage and the one-time sign-in prompt instead
  // (see MinistryAccessPromptModal), not in the calendar itself.
  const eventTypeFilter = hasMinistryAccess
    ? { value: eventTypeFilterValue, onChange: setEventTypeFilter }
    : undefined;
  const showOnlyMinistry = useCallback(
    (key: string) => showOnly(key, [CHURCH_WIDE_FILTER_KEY, ...ministries.map((m) => m.id)]),
    [showOnly, ministries],
  );

  return (
    <div className='flex min-h-screen flex-col bg-(--bg)'>
      <CalendarPageHeader
        toolbarState={toolbarState}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      {canCreate && !isDesktop && (
        <button
          onClick={() => setFormState({ mode: 'create', anchorRect: null })}
          aria-label='Crear evento'
          title='Crear evento'
          className='fixed right-6 bottom-6 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-[30%] bg-(--accent) text-(--accent-contrast) shadow-lg hover:bg-(--accent-hover)'
        >
          <PlusIcon />
        </button>
      )}

      <div className='flex min-h-0 flex-1'>
        {isDesktop && (
          <CalendarSidebarDesktop
            open={sidebarOpen}
            ministries={ministries}
            hiddenKeys={hiddenKeys}
            onToggle={toggleMinistryFilter}
            onShowOnly={showOnlyMinistry}
            eventTypeFilter={eventTypeFilter}
            onCreate={
              canCreate ? () => setFormState({ mode: 'create', anchorRect: null }) : undefined
            }
          />
        )}

        <div className='min-w-0 flex-1'>
          <CalendarView
            ministries={ministries}
            isEventVisible={isEventVisible}
            onSelectEvent={(event, anchorRect) => setSelectedEvent({ event, anchorRect })}
            onSelectRange={
              canCreate
                ? (range, anchorRect) =>
                    setFormState({ mode: 'create', initialRange: range, anchorRect })
                : undefined
            }
            onToolbarStateChange={setToolbarState}
          />
        </div>
      </div>

      {!isDesktop && (
        <CalendarSidebarMobile
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          ministries={ministries}
          hiddenKeys={hiddenKeys}
          onToggle={toggleMinistryFilter}
          onShowOnly={showOnlyMinistry}
          eventTypeFilter={eventTypeFilter}
          toolbarState={toolbarState}
        />
      )}

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent.event}
          anchorRect={selectedEvent.anchorRect}
          onClose={() => setSelectedEvent(null)}
          onEdit={(event) => {
            const anchorRect = selectedEvent.anchorRect;
            setSelectedEvent(null);
            setFormState({ mode: 'edit', event, anchorRect });
          }}
        />
      )}

      {formState && (
        <EventFormModal
          mode={formState.mode}
          event={formState.mode === 'edit' ? formState.event : undefined}
          initialRange={formState.mode === 'create' ? formState.initialRange : undefined}
          anchorRect={formState.anchorRect}
          onClose={() => setFormState(null)}
        />
      )}
    </div>
  );
}
