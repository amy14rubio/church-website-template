import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { Ministry } from '@/types/models'

export function useMinistries() {
  const [ministries, setMinistries] = useState<Ministry[]>([])

  useEffect(() => {
    const ministriesQuery = query(collection(db, 'ministries'), orderBy('name'))

    return onSnapshot(ministriesQuery, (snapshot) => {
      setMinistries(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Ministry))
    })
  }, [])

  return ministries
}
