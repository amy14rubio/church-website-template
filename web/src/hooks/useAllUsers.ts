import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { AppUser } from '@/types/models'

export function useAllUsers() {
  const [users, setUsers] = useState<AppUser[]>([])

  useEffect(() => {
    return onSnapshot(query(collection(db, 'users'), orderBy('name')), (snapshot) => {
      setUsers(snapshot.docs.map((docSnap) => docSnap.data() as AppUser))
    })
  }, [])

  return users
}
