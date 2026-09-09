import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export const THEMES = [
  'default',
  'google-light',
  'google-dark',
  'apple-light',
  'apple-dark',
  'outlook-light',
  'outlook-dark',
  'minimalism',
] as const

export type Theme = (typeof THEMES)[number]

export const THEME_LABELS: Record<Theme, string> = {
  default: 'Predeterminado',
  'google-light': 'Google Calendar (claro)',
  'google-dark': 'Google Calendar (oscuro)',
  'apple-light': 'Apple Calendar (claro)',
  'apple-dark': 'Apple Calendar (oscuro)',
  'outlook-light': 'Outlook Calendar (claro)',
  'outlook-dark': 'Outlook Calendar (oscuro)',
  minimalism: 'Minimalismo',
}

const STORAGE_KEY = 'theme'

function isTheme(value: string | null): value is Theme {
  return value !== null && (THEMES as readonly string[]).includes(value)
}

function loadStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  return isTheme(stored) ? stored : 'default'
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'default',
  setTheme: () => {},
})

// A purely client-side display preference — persisted to localStorage
// rather than the user's Firestore doc, so it stays per-device (like an
// OS appearance setting) instead of round-tripping through the network
// just to change how the UI looks. Only tracks/persists the choice —
// applying it to the document is deliberately NOT done here anymore (see
// useApplyCalendarTheme) since this provider wraps the whole app, and the
// [data-theme] system's own vars (--bg/--surface/--text) are shared by
// every signed-in app-shell page (Perfil, Administración, Medios), not
// just the calendar. Applying it unconditionally here would re-skin
// those pages too every time the calendar's own display picker changed.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(loadStoredTheme)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}

// Applies the chosen theme to the document for as long as the calling
// component stays mounted, then removes it — meant to be called once,
// from CalendarPage itself. Modals the calendar portals to <body>
// (ThemeModal, EventDetailsModal, etc.) are only ever rendered while
// CalendarPage is mounted anyway, so setting this on <html> — rather
// than some DOM subtree the portals would escape — still reaches them
// for exactly as long as it should, and reverts the instant the calendar
// page unmounts (e.g. navigating to Perfil).
export function useApplyCalendarTheme(theme: Theme) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    return () => {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [theme])
}
