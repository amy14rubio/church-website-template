import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'

// Ministry-calendar access piggybacks on the existing role field (see
// UserRole's doc comment in src/types/models.ts) rather than a separate
// boolean flag — approving a request just promotes 'member' straight to
// 'ministryMember', and revoking demotes it back. firestore.rules
// independently enforces exactly which of these transitions each caller
// is allowed to make; these are just the client-side writes.

// Self-service: a plain member asks to be considered. Blocked while
// already pending (see ProfilePage/MinistryAccessPromptModal, which both
// hide the button in that state) and enforced again server-side.
export async function requestMinistryAccess(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ministryAccessRequestStatus: 'pending',
    ministryAccessRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// Marks the one-time sign-in prompt as seen, whether the user requested
// access or just dismissed it — either way it should never appear again.
export async function markMinistryAccessPromptShown(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ministryAccessPromptShown: true,
    updatedAt: serverTimestamp(),
  })
}

// Admin/co-admin actions below — firestore.rules only allows these to
// move a user between exactly 'member' and 'ministryMember', never touch
// ministryIds, and never target the caller's own account.

export async function approveMinistryAccess(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    role: 'ministryMember',
    ministryAccessRequestStatus: 'none',
    updatedAt: serverTimestamp(),
  })
}

// Leaves the door open to request again later (see PROJECT_SPEC.md) —
// role stays 'member', only the status changes.
export async function rejectMinistryAccess(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    role: 'member',
    ministryAccessRequestStatus: 'rejected',
    updatedAt: serverTimestamp(),
  })
}

export async function revokeMinistryAccess(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    role: 'member',
    ministryAccessRequestStatus: 'none',
    updatedAt: serverTimestamp(),
  })
}
