import { ROLE_LABELS } from '@/lib/roles'
import type { AppUser, Ministry, UserRole } from '@/types/models'

// Fully controlled by RoleManagementPage: the Usuarios section edits every
// visible row at once and saves them all with a single top-of-card button,
// so this row has no local state or save button of its own — it just
// reports changes upward.
export function UserRow({
  user,
  email,
  ministries,
  isSelf,
  editing,
  pendingRole,
  pendingMinistryIds,
  onRoleChange,
  onMinistrySelect,
}: {
  user: AppUser
  // Fetched separately by the parent (see usePrivateEmails) — email isn't
  // part of AppUser itself, see firestore.rules' users/{uid}/private/{docId}.
  email: string
  ministries: Ministry[]
  isSelf: boolean
  editing: boolean
  pendingRole: UserRole
  pendingMinistryIds: string[]
  onRoleChange: (role: UserRole) => void
  onMinistrySelect: (ministryId: string) => void
}) {
  const showMinistryPicker = editing && !isSelf && pendingRole === 'leader'

  return (
    <div className="border-b border-(--border) py-3 last:border-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-(--text)">{user.name}</p>
          <p className="text-xs text-(--text-muted)">{email}</p>
        </div>

        {editing && !isSelf ? (
          <select
            value={pendingRole}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="w-fit rounded-md border border-(--border) px-2 py-1 text-sm focus:border-(--accent) focus:outline-none"
          >
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <option key={role} value={role}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <span className="rounded-md bg-(--surface-alt) px-2 py-1 text-xs text-(--text-muted)">
            {ROLE_LABELS[user.role]}
            {isSelf ? ' (tú)' : ''}
          </span>
        )}
      </div>

      {showMinistryPicker && (
        <div className="mt-2 pl-1">
          <select
            value={pendingMinistryIds[0] ?? ''}
            onChange={(e) => onMinistrySelect(e.target.value)}
            className="w-fit rounded-md border border-(--border) px-2 py-1 text-xs focus:border-(--accent) focus:outline-none"
          >
            <option value="">Sin asignar</option>
            {ministries.map((ministry) => (
              <option key={ministry.id} value={ministry.id}>
                {ministry.name}
              </option>
            ))}
          </select>
          {ministries.length === 0 && <p className="mt-1 text-xs text-(--text-faint)">No hay ministerios todavía.</p>}
        </div>
      )}
    </div>
  )
}
