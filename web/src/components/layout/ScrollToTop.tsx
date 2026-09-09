import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { resetScrollForNavigation } from '@/lib/smoothScroll'

// React Router doesn't reset scroll position on navigation by itself — a
// page switch used to leave the visitor wherever they'd scrolled to on
// the PREVIOUS page, however far down that was. Keyed on pathname only
// (not search/hash), so query-param changes on the same page (e.g. the
// calendar's own ?eventId=) don't yank the scroll position back to the
// top out from under something already open.
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    resetScrollForNavigation()
  }, [pathname])

  return null
}
