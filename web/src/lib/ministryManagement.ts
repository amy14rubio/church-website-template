import {
  and,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  or,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { slugify } from './slugify'

// Picks a doc id from the ministry's name, matching the starter ministries'
// style (jovenes, alabanza, ...). Appends -2, -3, ... only in the unlikely
// case two ministries slugify to the same id.
async function pickMinistryId(name: string): Promise<string> {
  const base = slugify(name) || 'ministerio'
  let candidate = base
  let suffix = 2
  while ((await getDoc(doc(db, 'ministries', candidate))).exists()) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }
  return candidate
}

export async function addMinistry(name: string): Promise<void> {
  const id = await pickMinistryId(name)
  await setDoc(doc(db, 'ministries', id), {
    id,
    name: name.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function renameMinistry(id: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'ministries', id), {
    name: name.trim(),
    updatedAt: serverTimestamp(),
  })
}

export interface DeleteMinistryResult {
  deleted: boolean
  eventCount: number
  userCount: number
}

// Refuses to delete a ministry that's still in use — by an event or by a
// user's assignment — rather than silently orphaning those references.
export async function deleteMinistryIfUnused(id: string): Promise<DeleteMinistryResult> {
  const visibilityFilter = or(where('viewableForPublic', '==', true), where('viewableForMinistry', '==', true))
  const [eventsSnapshot, usersSnapshot] = await Promise.all([
    getCountFromServer(query(collection(db, 'events'), and(where('ministryId', '==', id), visibilityFilter))),
    getDocs(query(collection(db, 'users'), where('ministryIds', 'array-contains', id))),
  ])

  const eventCount = eventsSnapshot.data().count
  const userCount = usersSnapshot.size

  if (eventCount > 0 || userCount > 0) {
    return { deleted: false, eventCount, userCount }
  }

  await deleteDoc(doc(db, 'ministries', id))
  return { deleted: true, eventCount: 0, userCount: 0 }
}
