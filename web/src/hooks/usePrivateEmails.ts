import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'

// Email lives in its own doc, one per user (users/{uid}/private/profile
// — see firestore.rules and types/models.ts's UserPrivateProfile), not
// on the AppUser doc useAllUsers already fetches — unlike name/photo/
// role, it isn't readable by just any signed-in member, so RoleManagementPage
// (the only place besides ProfilePage that needs someone else's email)
// fetches it as its own step. A plain fetch-once per uid list rather than
// a live listener — email changes are rare, and this is an admin screen,
// not something that needs to reflect another tab's edit instantly.
export function usePrivateEmails(uids: string[]): Map<string, string> {
  const [emails, setEmails] = useState<Map<string, string>>(new Map())
  const key = uids.join(',')

  useEffect(() => {
    if (uids.length === 0) {
      setEmails(new Map())
      return
    }
    let cancelled = false
    void Promise.all(
      uids.map(async (uid) => {
        const snap = await getDoc(doc(db, 'users', uid, 'private', 'profile'))
        return [uid, (snap.data()?.email as string | undefined) ?? ''] as const
      }),
    ).then((entries) => {
      if (!cancelled) setEmails(new Map(entries))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return emails
}
