import { useState } from 'react'
import type { View } from 'react-big-calendar'
import { Link } from 'react-router-dom'
import type { CalendarToolbarState } from '@/components/calendar/ToolbarBridge'
import { AppLogoLink } from '@/components/layout/AppLogoLink'
import { HeaderProfileMenu } from '@/components/layout/HeaderProfileMenu'
import { ThemeModal } from '@/components/layout/ThemeModal'
import { ChevronLeftIcon, ChevronRightIcon, HamburgerIcon, MoonIcon } from '@/components/ui/icons'
import { useAuth } from '@/contexts/AuthContext'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { capitalizeFirst } from '@/lib/dateTime'

export const VIEW_LABELS: Record<View, string> = {
  month: 'Mes',
  week: 'Semana',
  work_week: 'Semana laboral',
  day: 'Día',
  agenda: 'Agenda',
}

const todayButtonClasses =
  'shrink-0 cursor-pointer rounded-full border border-(--border) px-4 py-1.5 text-sm font-medium text-(--text) hover:bg-(--surface-hover)'
const viewSelectClasses =
  'w-fit shrink-0 rounded-full border border-(--border) bg-(--surface) px-3 py-1.5 text-sm font-medium text-(--text) hover:bg-(--surface-hover) focus:outline-none'

// The calendar page's own header — replaces the generic app header on
// this one route with a single Google Calendar-style line: Hoy,
// prev/next, and the current month/week/day label on the left; the
// view switcher, display (theme) picker, and account menu on the right.
// On desktop the church logo (AppLogoLink) sits centered across the
// whole header, same fixed h-20 height as SiteHeader's own header on the
// public pages so the bar itself doesn't jump when navigating to/from
// this route — not on mobile, where the logo lives instead at the top of
// the hamburger's ministry-filter drawer (see CalendarSidebar's
// CalendarSidebarMobile).
// The "Pantalla" display picker lives here rather than in the shared
// profile menu since it's really only meaningful on the app's own pages,
// not the public site. Everything else here comes from ToolbarBridge
// (see CalendarView) rather than owning any navigation logic itself.
export function CalendarPageHeader({
  toolbarState,
  onToggleSidebar,
}: {
  toolbarState: CalendarToolbarState | null
  onToggleSidebar: () => void
}) {
  const isDesktop = useIsDesktop()
  const { firebaseUser } = useAuth()
  const [showTheme, setShowTheme] = useState(false)

  const hamburgerButton = (
    <button
      onClick={onToggleSidebar}
      aria-label="Filtrar ministerios"
      title="Filtrar ministerios"
      className="shrink-0 cursor-pointer rounded-full p-2 text-(--text-muted) hover:bg-(--surface-hover)"
    >
      <HamburgerIcon />
    </button>
  )

  const themeButton = firebaseUser && (
    <button
      onClick={() => setShowTheme(true)}
      aria-label="Pantalla"
      title="Pantalla"
      className="shrink-0 cursor-pointer rounded-full p-2 text-(--text-muted) hover:bg-(--surface-hover)"
    >
      <MoonIcon />
    </button>
  )

  const accountArea = firebaseUser ? (
    <HeaderProfileMenu />
  ) : (
    <Link
      to="/iniciar-sesion"
      className="shrink-0 rounded-md bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-contrast) hover:bg-(--accent-hover)"
    >
      Iniciar sesión
    </Link>
  )

  const viewList = toolbarState?.views ?? []
  const viewSwitcher = toolbarState && (
    <select
      value={toolbarState.view}
      onChange={(e) => toolbarState.onView(e.target.value as View)}
      aria-label="Vista del calendario"
      className={viewSelectClasses}
    >
      {viewList.map((v) => (
        <option key={v} value={v}>
          {VIEW_LABELS[v]}
        </option>
      ))}
    </select>
  )

  if (!isDesktop) {
    // No brand text, no prev/next arrows — swiping the grid left/right
    // handles navigation on mobile, freeing up room for the label. The
    // logo lives in the hamburger drawer instead of here (see
    // CalendarSidebarMobile) — there's no room for it in this tight a
    // row, and the drawer is where "get back to the site" naturally
    // belongs alongside the ministry filters.
    return (
      <header className="flex items-center justify-between gap-2 border-b border-(--border) bg-(--surface) px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {hamburgerButton}
          <span className="truncate text-base font-medium text-(--text)">
            {toolbarState ? capitalizeFirst(toolbarState.label) : ''}
          </span>
          {toolbarState && (
            <button onClick={() => toolbarState.onNavigate('TODAY')} className={todayButtonClasses}>
              Hoy
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {themeButton}
          {accountArea}
        </div>
        {showTheme && <ThemeModal onClose={() => setShowTheme(false)} />}
      </header>
    )
  }

  return (
    <header className="relative flex h-20 items-center justify-between gap-4 border-b border-(--border) bg-(--surface) px-4 sm:px-6">
      <AppLogoLink className="absolute left-1/2 -translate-x-1/2" />
      <div className="flex items-center gap-4">
        {hamburgerButton}
        {toolbarState && (
          <>
            <button onClick={() => toolbarState.onNavigate('TODAY')} className={todayButtonClasses}>
              Hoy
            </button>
            <button
              onClick={() => toolbarState.onNavigate('PREV')}
              aria-label="Anterior"
              className="cursor-pointer rounded-full p-1.5 text-(--text-muted) hover:bg-(--surface-hover)"
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={() => toolbarState.onNavigate('NEXT')}
              aria-label="Siguiente"
              className="cursor-pointer rounded-full p-1.5 text-(--text-muted) hover:bg-(--surface-hover)"
            >
              <ChevronRightIcon />
            </button>
            <span className="text-lg font-medium text-(--text)">{capitalizeFirst(toolbarState.label)}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {viewSwitcher}
        {themeButton}
        {accountArea}
      </div>
      {showTheme && <ThemeModal onClose={() => setShowTheme(false)} />}
    </header>
  )
}
