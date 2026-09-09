import { doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { UserRole } from '@/types/models'

// A ministry assignment only means anything for an Encargado — clearing it
// when the role changes to anything else keeps the data model honest
// instead of leaving a stale assignment nobody can see or use.
export async function updateUserRoleAndMinistries(uid: string, role: UserRole, ministryIds: string[]): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    role,
    ministryIds: role === 'leader' ? ministryIds : [],
    updatedAt: serverTimestamp(),
  })
}

export interface PendingUserChange {
  uid: string
  role: UserRole
  ministryIds: string[]
}

// The Usuarios section edits every row at once and saves them all with a
// single button, rather than a save per row — one atomic batch write
// instead of N separate updateDoc calls.
export async function updateMultipleUserRolesAndMinistries(changes: PendingUserChange[]): Promise<void> {
  if (changes.length === 0) return
  const batch = writeBatch(db)
  changes.forEach(({ uid, role, ministryIds }) => {
    batch.update(doc(db, 'users', uid), {
      role,
      ministryIds: role === 'leader' ? ministryIds : [],
      updatedAt: serverTimestamp(),
    })
  })
  await batch.commit()
}
