import { useState } from 'react'
import type { Timestamp } from 'firebase/firestore'
import { approveMinistryAccess, rejectMinistryAccess, revokeMinistryAccess } from '@/lib/ministryAccess'
import type { AppUser } from '@/types/models'

function formatRequestedDate(timestamp: Timestamp | null): string {
  if (!timestamp) return ''
  return timestamp.toDate().toLocaleDateString('es', { day: 'numeric', month: 'long' })
}

// Visible to both the Pastor and Co-admins (see RoleManagementPage) —
// unlike the Ministerios/Usuarios sections on that same page, granting or
// revoking ministry-calendar access is a deliberately narrow exception to
// "only the Pastor changes roles" (see firestore.rules' isStaffAccessToggle
// and PROJECT_SPEC.md's "Ministry Calendar Access" section).
// `emails` is fetched separately by the parent (see usePrivateEmails) —
// email isn't part of AppUser itself, see firestore.rules'
// users/{uid}/private/{docId}.
export function MinistryAccessRequestsSection({ users, emails }: { users: AppUser[]; emails: Map<string, string> }) {
  const [actingUid, setActingUid] = useState<string | null>(null)

  const pending = users.filter((user) => user.role === 'member' && user.ministryAccessRequestStatus === 'pending')
  // Only accounts actually granted access through this flow — a Leader/
  // Co-admin/Pastor already has ministry-calendar access from their role
  // itself, and firestore.rules' narrow toggle only ever moves someone
  // between exactly 'member' and 'ministryMember' anyway.
  const approved = users.filter((user) => user.role === 'ministryMember')

  async function handleApprove(uid: string) {
    setActingUid(uid)
    try {
      await approveMinistryAccess(uid)
    } finally {
      setActingUid(null)
    }
  }

  async function handleReject(uid: string) {
    setActingUid(uid)
    try {
      await rejectMinistryAccess(uid)
    } finally {
      setActingUid(null)
    }
  }

  async function handleRevoke(uid: string) {
    setActingUid(uid)
    try {
      await revokeMinistryAccess(uid)
    } finally {
      setActingUid(null)
    }
  }

  return (
    <section className="mt-6 rounded-xl bg-(--surface) p-5 shadow-sm ring-1 ring-(--border)">
      <h2 className="text-sm font-semibold text-(--text)">Solicitudes de acceso al calendario de ministerios</h2>

      {pending.length === 0 ? (
        <p className="mt-3 text-sm text-(--text-faint)">No hay solicitudes pendientes.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {pending.map((user) => (
            <div
              key={user.uid}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-(--surface-alt) p-3"
            >
              <div>
                <p className="text-sm font-medium text-(--text)">{user.name}</p>
                <p className="text-xs text-(--text-muted)">{emails.get(user.uid) ?? ''}</p>
                <p className="mt-0.5 text-xs text-(--text-faint)">
                  Solicitud enviada: {formatRequestedDate(user.ministryAccessRequestedAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleReject(user.uid)}
                  disabled={actingUid === user.uid}
                  className="cursor-pointer rounded-md border border-(--border) px-3 py-1.5 text-xs font-medium text-(--text) hover:bg-(--surface-hover) disabled:opacity-60"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(user.uid)}
                  disabled={actingUid === user.uid}
                  className="cursor-pointer rounded-md bg-(--accent) px-3 py-1.5 text-xs font-medium text-(--accent-contrast) hover:bg-(--accent-hover) disabled:opacity-60"
                >
                  Aprobar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {approved.length > 0 && (
        <>
          <h3 className="mt-5 text-xs font-semibold tracking-wide text-(--text-muted) uppercase">Acceso activo</h3>
          <div className="mt-2 space-y-2">
            {approved.map((user) => (
              <div
                key={user.uid}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-(--surface-alt) p-3"
              >
                <div>
                  <p className="text-sm font-medium text-(--text)">{user.name}</p>
                  <p className="text-xs text-(--text-muted)">{emails.get(user.uid) ?? ''}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(user.uid)}
                  disabled={actingUid === user.uid}
                  className="cursor-pointer rounded-md border border-(--danger) px-3 py-1.5 text-xs font-medium text-(--danger) hover:bg-(--danger)/10 disabled:opacity-60"
                >
                  Revocar acceso
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
