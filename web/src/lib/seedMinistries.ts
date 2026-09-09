import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'

// Starter ministries from PROJECT_SPEC.md section 30. Ministries are meant
// to be data, not code — this is a one-time convenience seed for a brand
// new project, not a permanent list. Once a Pastor ministry-management
// screen exists, this can be removed.
const STARTER_MINISTRIES: { id: string; name: string }[] = [
  { id: 'jovenes', name: 'Jóvenes' },
  { id: 'alabanza', name: 'Alabanza' },
  { id: 'ninos', name: 'Niños' },
  { id: 'evangelismo', name: 'Evangelismo' },
]

// Only succeeds when called by a signed-in Pastor — firestore.rules
// restricts writes to the `ministries` collection to role == 'admin'.
export async function seedMinistriesIfEmpty(): Promise<void> {
  const existing = await getDocs(collection(db, 'ministries'))
  if (!existing.empty) return

  await Promise.all(
    STARTER_MINISTRIES.map((ministry) =>
      setDoc(doc(db, 'ministries', ministry.id), {
        id: ministry.id,
        name: ministry.name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ),
  )
}
