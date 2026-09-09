import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'siteEditMode'

interface SiteEditModeContextValue {
  editMode: boolean
  toggleEditMode: () => void
}

const SiteEditModeContext = createContext<SiteEditModeContextValue>({
  editMode: false,
  toggleEditMode: () => {},
})

// A purely client-side toggle (persisted to localStorage, like
// ThemeContext) that decides whether a Pastor/Co-admin sees the public
// site's edit affordances (EditableYoutubeSlot's "+ Agregar video",
// etc.) or the plain page every visitor sees. Off by default so opening
// the site normally always shows what's actually live.
export function SiteEditModeProvider({ children }: { children: ReactNode }) {
  const [editMode, setEditMode] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(editMode))
  }, [editMode])

  return (
    <SiteEditModeContext.Provider value={{ editMode, toggleEditMode: () => setEditMode((v) => !v) }}>
      {children}
    </SiteEditModeContext.Provider>
  )
}

export function useSiteEditMode() {
  return useContext(SiteEditModeContext)
}
