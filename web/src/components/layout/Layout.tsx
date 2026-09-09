import { Outlet } from 'react-router-dom'
import { SiteHeader } from '@/components/layout/SiteHeader'

// Wraps Login/Perfil/Administración/Medios — the same public SiteHeader
// used everywhere else, so the nav bar looks and behaves identically
// whether someone's on the public site or in these app-shell pages
// (see lastSitePage.ts's APP_SHELL_PATHS for the one behavioral tweak
// this requires). The calendar page renders its own separate header
// (CalendarPageHeader) folded into the same line as its Hoy/prev/next/
// view controls, so it isn't wrapped in this Layout at all.
export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-(--site-bg)">
      <SiteHeader />
      <Outlet />
    </div>
  )
}
