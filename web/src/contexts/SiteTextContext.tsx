import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/config'

interface SiteTextDoc {
  value: string
}

// App-wide (not per-page, unlike useSitePlacements) since EditableText
// can appear dozens of times per page, often deeply nested — a shared
// context means each instance just reads a slot key instead of every
// page threading a Map down through props.
const SiteTextContext = createContext<Map<string, string>>(new Map())

export function SiteTextProvider({ children }: { children: ReactNode }) {
  const [texts, setTexts] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    return onSnapshot(collection(db, 'siteText'), (snapshot) => {
      const next = new Map<string, string>()
      snapshot.docs.forEach((docSnap) => next.set(docSnap.id, (docSnap.data() as SiteTextDoc).value))
      setTexts(next)
    })
  }, [])

  return <SiteTextContext.Provider value={texts}>{children}</SiteTextContext.Provider>
}

export function useSiteTextValue(slotKey: string, fallback: string): string {
  const texts = useContext(SiteTextContext)
  const value = texts.get(slotKey)
  return value && value.length > 0 ? value : fallback
}
