import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { VIEW_LABELS } from '@/components/calendar/CalendarPageHeader';
import type { CalendarToolbarState } from '@/components/calendar/ToolbarBridge';
import { CHURCH_WIDE_FILTER_KEY, type EventTypeFilterValue } from '@/hooks/useCalendarFilters';
import { getLastSitePage } from '@/lib/lastSitePage';
import { ministryColorVar } from '@/lib/ministryColors';
import { ChevronLeftIcon, MoreVerticalIcon, PlusIcon } from '@/components/ui/icons';
import { Switch } from '@/components/ui/Switch';
import type { Ministry } from '@/types/models';

// The Mes/Semana/Día/Agenda switcher, Google Calendar-drawer style — only
// used by the mobile drawer (see CalendarSidebarMobile). Desktop keeps its
// own compact <select> in the header instead: it never had a truncation
// problem in the first place, and a docked sidebar isn't fighting the
// header for space the way mobile's single tight row was (the header's
// month/week/day label was getting cut off to "Agost…" to make room for
// the dropdown next to it).
function ViewSwitcherList({ toolbarState, onClose }: { toolbarState: CalendarToolbarState; onClose: () => void }) {
  return (
    <div className='mb-2 border-b border-(--border) pb-2'>
      {toolbarState.views.map((v) => (
        <button
          key={v}
          type='button'
          onClick={() => {
            toolbarState.onView(v);
            onClose();
          }}
          className={[
            'flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-left text-sm',
            v === toolbarState.view
              ? 'bg-(--surface-hover) font-medium text-(--text)'
              : 'text-(--text-muted) hover:bg-(--surface-hover)',
          ].join(' ')}
        >
          {VIEW_LABELS[v]}
        </button>
      ))}
    </div>
  );
}

// Matches the menu's own w-44 class below — used to clamp its position
// on-screen rather than always anchoring flush to the button's left edge.
const MENU_WIDTH = 176;
const VIEWPORT_MARGIN = 8;

// A custom checkbox instead of the native one — the browser picks the
// checkmark's own color automatically from `accent-color`, and doesn't
// reliably pick white for every color in the palette (a light pastel, for
// instance). Rendering the check mark ourselves guarantees it's always
// white, regardless of the box's color. The real <input> stays in the DOM
// (just visually hidden) so this is still a genuine, accessible checkbox.
function CheckboxRow({
  label,
  checked,
  onChange,
  onShowOnly,
  color,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  onShowOnly?: () => void;
  color: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // The sidebar's own width-transition wrapper is `overflow-hidden`, which
  // would clip a menu opening rightward off the button (it starts right at
  // the sidebar's edge). Portaling to <body> and positioning against the
  // button's own screen coordinates lets it float over the calendar
  // instead, same as it would in Google Calendar.
  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      // Anchored to the button's own RIGHT edge (menu opens leftward,
      // hugging the button) rather than its left edge — on a narrow
      // mobile drawer the kebab button sits close to the screen's right
      // edge, so anchoring from the left pushed most of the menu (w-44,
      // see below) off-screen. Clamping against the full viewport width
      // instead of the button's own position fixed the clipping but left
      // the menu floating far from the button it belongs to; this stays
      // right next to it while still never running off either edge.
      const left = Math.max(VIEWPORT_MARGIN, rect.right - MENU_WIDTH);
      setMenuPosition({ top: rect.bottom + 4, left });
    }
    setMenuOpen(true);
  }

  return (
    <div className='flex items-center rounded-md hover:bg-(--surface-hover)'>
      <label className='flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 px-2 py-1.5 text-sm text-(--text)'>
        <span
          className='relative flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border-[1.5px]'
          style={{ backgroundColor: checked ? color : 'transparent', borderColor: color }}
        >
          {checked && (
            <svg
              viewBox='0 0 12 12'
              width='12'
              height='12'
              fill='none'
              stroke='white'
              strokeWidth='2'
            >
              <path d='M2.2 6.2 5 9l5-6.5' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          )}
          <input
            type='checkbox'
            checked={checked}
            onChange={onChange}
            className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
          />
        </span>
        <span className='truncate'>{label}</span>
      </label>

      {onShowOnly && (
        <button
          ref={buttonRef}
          type='button'
          onClick={openMenu}
          aria-label={`Más opciones para ${label}`}
          className='shrink-0 cursor-pointer rounded-full p-1.5 text-(--text-faint) hover:bg-(--surface-alt) hover:text-(--text)'
        >
          <MoreVerticalIcon />
        </button>
      )}

      {menuOpen &&
        menuPosition &&
        onShowOnly &&
        createPortal(
          <>
            <div className='fixed inset-0 z-40' onClick={() => setMenuOpen(false)} />
            <div
              className='fixed z-50 w-44 rounded-lg bg-(--surface) p-1 shadow-lg ring-1 ring-(--border)'
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              <button
                type='button'
                onClick={() => {
                  onShowOnly();
                  setMenuOpen(false);
                }}
                className='w-full cursor-pointer rounded-md px-2.5 py-1.5 text-left text-sm text-(--text) hover:bg-(--surface-hover)'
              >
                Mostrar solo esto
              </button>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

interface CalendarSidebarProps {
  ministries: Ministry[];
  hiddenKeys: Set<string>;
  onToggle: (key: string) => void;
  onShowOnly: (key: string) => void;
  // Only shown to a signed-in user — an anonymous visitor can only ever
  // see public events anyway (see permissions.canViewEvent), so switching
  // to "Calendario del ministerio" would have nothing to show them.
  eventTypeFilter?: {
    value: EventTypeFilterValue;
    onChange: (value: EventTypeFilterValue) => void;
  };
}

// The filter list itself — shared between the desktop docked column and
// the mobile full-screen overlay below, which just wrap this in different
// layout chrome.
function MinistryFilterList({
  ministries,
  hiddenKeys,
  onToggle,
  onShowOnly,
}: CalendarSidebarProps) {
  return (
    <div>
      <p className='px-2 text-xs font-semibold tracking-wide text-(--text-muted) uppercase'>
        Ministerios
      </p>
      <div className='mt-1 flex flex-col'>
        <CheckboxRow
          label='Toda la iglesia'
          checked={!hiddenKeys.has(CHURCH_WIDE_FILTER_KEY)}
          onChange={() => onToggle(CHURCH_WIDE_FILTER_KEY)}
          onShowOnly={() => onShowOnly(CHURCH_WIDE_FILTER_KEY)}
          color='var(--accent)'
        />
        {ministries.map((ministry, index) => (
          <CheckboxRow
            key={ministry.id}
            label={ministry.name}
            checked={!hiddenKeys.has(ministry.id)}
            onChange={() => onToggle(ministry.id)}
            onShowOnly={() => onShowOnly(ministry.id)}
            color={ministryColorVar(index)}
          />
        ))}
      </div>
    </div>
  );
}

// A second, independent filter — by an event's own public/ministry
// visibility flag rather than which ministry it belongs to. An event is
// conceptually one or the other, never both at once, so this is a plain
// on/off Switch (same reusable component as the visibility toggle on
// event creation) rather than a pair of checkboxes — "on" means showing
// the ministry calendar, "off" means the public one. Same as that same
// event-creation Switch, the label names whichever option is currently
// selected rather than staying fixed.
function EventTypeToggle({
  value,
  onChange,
}: {
  value: EventTypeFilterValue;
  onChange: (value: EventTypeFilterValue) => void;
}) {
  return (
    <div className='mt-4 px-2'>
      <Switch
        checked={value === 'ministry'}
        onChange={(checked) => onChange(checked ? 'ministry' : 'public')}
        label={value === 'ministry' ? 'Calendario de ministerio' : 'Calendario público'}
      />
    </div>
  );
}

// Desktop: a real layout column next to the calendar, not an overlay —
// toggling it changes the calendar's own width. Always rendered so the
// width itself can transition smoothly; collapsed it's just 0-wide with
// its content clipped, rather than unmounting (which can't animate).
export function CalendarSidebarDesktop({
  open,
  ministries,
  hiddenKeys,
  onToggle,
  onShowOnly,
  eventTypeFilter,
  onCreate,
}: CalendarSidebarProps & { open: boolean; onCreate?: () => void }) {
  const navigate = useNavigate();

  return (
    <div
      className={[
        'shrink-0 overflow-hidden border-r border-(--border) bg-(--surface) transition-[width] duration-200',
        open ? 'w-64' : 'w-0',
      ].join(' ')}
    >
      <div className='w-64 p-3'>
        {/* The logo up in CalendarPageHeader already navigates back to the
            public site on click, but nothing about an image says "this is
            a back button" — this is the same plaintext link the mobile
            drawer already has (see CalendarSidebarMobile below), just
            docked here instead since desktop has no drawer to put it in. */}
        <button
          type='button'
          onClick={() => navigate(getLastSitePage())}
          className='mb-4 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text)'
        >
          <ChevronLeftIcon />
          Regresar
        </button>
        {onCreate && (
          <button
            type='button'
            onClick={onCreate}
            className='mb-4 flex cursor-pointer items-center gap-3 rounded-md bg-(--surface-alt) py-2.5 pr-5 pl-3.5 text-sm font-medium text-(--text) shadow-sm hover:shadow-md'
          >
            <PlusIcon />
            Crear
          </button>
        )}
        <MinistryFilterList
          ministries={ministries}
          hiddenKeys={hiddenKeys}
          onToggle={onToggle}
          onShowOnly={onShowOnly}
        />
        {eventTypeFilter && (
          <EventTypeToggle value={eventTypeFilter.value} onChange={eventTypeFilter.onChange} />
        )}
      </div>
    </div>
  );
}

// Mobile: a full-screen overlay covering the calendar entirely, sliding
// in from the left — matches how a hamburger menu behaves in most mobile
// apps, as opposed to desktop's docked column. A plain "< Regresar" link
// sits at the top (not the logo — that felt out of place here, and space
// is tight) doubling as this drawer's only way back out to the public
// site, same idea as the old "Inicio" link it replaces.
export function CalendarSidebarMobile({
  open,
  onClose,
  ministries,
  hiddenKeys,
  onToggle,
  onShowOnly,
  eventTypeFilter,
  toolbarState,
}: CalendarSidebarProps & { open: boolean; onClose: () => void; toolbarState: CalendarToolbarState | null }) {
  const navigate = useNavigate();

  if (!open) return null;

  function handleBackClick() {
    navigate(getLastSitePage());
    onClose();
  }

  return (
    <div className='fixed inset-0 z-40 bg-black/40' onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className='h-full w-72 max-w-[85vw] overflow-y-auto bg-(--surface) p-3 shadow-lg'
      >
        <button
          type='button'
          onClick={handleBackClick}
          className='mb-4 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text)'
        >
          <ChevronLeftIcon />
          Regresar
        </button>
        {toolbarState && <ViewSwitcherList toolbarState={toolbarState} onClose={onClose} />}
        <MinistryFilterList
          ministries={ministries}
          hiddenKeys={hiddenKeys}
          onToggle={onToggle}
          onShowOnly={onShowOnly}
        />
        {eventTypeFilter && (
          <EventTypeToggle value={eventTypeFilter.value} onChange={eventTypeFilter.onChange} />
        )}
      </div>
    </div>
  );
}
