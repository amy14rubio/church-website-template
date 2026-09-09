import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { SocialConnection, SocialProvider } from '@/types/models'

// Always empty until the real OAuth flow (Cloud Functions) exists to
// ever write a doc here — see socialConnections' rules for why nothing
// client-side can mark itself "connected."
export function useSocialConnections(): Map<SocialProvider, SocialConnection> {
  const [connections, setConnections] = useState<Map<SocialProvider, SocialConnection>>(new Map())

  useEffect(() => {
    return onSnapshot(collection(db, 'socialConnections'), (snapshot) => {
      const next = new Map<SocialProvider, SocialConnection>()
      snapshot.docs.forEach((docSnap) => next.set(docSnap.id as SocialProvider, docSnap.data() as SocialConnection))
      setConnections(next)
    })
  }, [])

  return connections
}
