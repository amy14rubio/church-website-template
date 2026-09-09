import { useEffect, useState } from 'react'

const DESKTOP_QUERY = '(min-width: 768px)'

// Anchored popovers only make sense once there's room beside the clicked
// event; below this width they'd just get clamped back to full-screen, so
// mobile gets the bottom-drawer treatment instead.
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY)
    const handleChange = () => setIsDesktop(mql.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return isDesktop
}
