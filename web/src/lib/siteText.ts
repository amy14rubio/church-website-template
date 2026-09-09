import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'

export async function setSiteText(slotKey: string, value: string, uid: string): Promise<void> {
  await setDoc(doc(db, 'siteText', slotKey), {
    value: value.trim(),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  })
}
