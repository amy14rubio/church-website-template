import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { doc, onSnapshot, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { auth, db } from '@/firebase/config'
import type { AppUser } from '@/types/models'

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  appUser: AppUser | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  appUser: null,
  loading: true,
})

// firebaseUser.displayName/photoURL (the aggregated top-level fields) can
// come back empty right after the native Google sign-in path bridges its
// ID token into the JS SDK via signInWithCredential — unlike an
// interactive signInWithPopup/signInWithRedirect, that bridge doesn't
// reliably sync Google's profile info onto those two fields. Each
// linked provider's own entry in providerData carries its own
// displayName/photoURL straight from that provider though, populated
// synchronously and independent of that aggregation step, so it's a
// reliable fallback regardless of which sign-in path was used.
function googleProviderInfo(firebaseUser: FirebaseUser) {
  return firebaseUser.providerData.find((info) => info.providerId === 'google.com') ?? null
}

function bestDisplayName(firebaseUser: FirebaseUser): string | null {
  return firebaseUser.displayName ?? googleProviderInfo(firebaseUser)?.displayName ?? null
}

function bestPhotoURL(firebaseUser: FirebaseUser): string | null {
  return firebaseUser.photoURL ?? googleProviderInfo(firebaseUser)?.photoURL ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user)
      if (!user) {
        setAppUser(null)
        setLoading(false)
      }
    })
  }, [])

  useEffect(() => {
    if (!firebaseUser) return

    const userRef = doc(db, 'users', firebaseUser.uid)

    return onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppUser
        setAppUser(data)
        setLoading(false)

        // Picks up a signed-in provider's photo (e.g. Google's) any time
        // this account has none yet — not just at creation, since Google
        // sign-in can happen on an account that already exists (created
        // earlier via email/password, or simply hadn't signed in with
        // Google before). Skipped once photoRemovedByUser is set, so a
        // deliberate removal (see profilePicture.ts) never gets silently
        // undone by the next login.
        const photoURL = bestPhotoURL(firebaseUser)
        if (!data.photoURL && !data.photoRemovedByUser && photoURL) {
          void updateDoc(userRef, { photoURL, updatedAt: serverTimestamp() })
        }
        return
      }

      // First login: self-provision a minimal profile. Role always starts
      // at the lowest privilege ('member' — a plain church member with no
      // ministry-calendar access) — only the Pastor/Co-admins can promote
      // it later (see src/lib/ministryAccess.ts for the approval path).
      // firestore.rules enforces that this document can only be created
      // with role "member" and no ministry assignment.
      //
      // Email lives in a separate, more tightly-scoped doc
      // (users/{uid}/private/profile) rather than on this one — unlike
      // name/photo/role, any signed-in member being able to read it would
      // mean anyone who bothers to sign up at all (no approval needed to
      // become a plain 'member') could scrape every real member's email
      // address in one query. Written in the same batch so an account
      // never briefly exists with no email doc at all.
      const batch = writeBatch(db)
      batch.set(userRef, {
        uid: firebaseUser.uid,
        name: bestDisplayName(firebaseUser) ?? firebaseUser.email ?? 'Miembro',
        role: 'member',
        ministryIds: [],
        photoURL: bestPhotoURL(firebaseUser),
        photoRemovedByUser: false,
        ministryAccessRequestStatus: 'none',
        ministryAccessRequestedAt: null,
        ministryAccessPromptShown: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      batch.set(doc(db, 'users', firebaseUser.uid, 'private', 'profile'), {
        email: firebaseUser.email ?? '',
      })
      void batch.commit()
    })
  }, [firebaseUser])

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
