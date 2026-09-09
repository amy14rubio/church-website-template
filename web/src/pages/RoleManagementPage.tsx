import { useMemo, useState, type FormEvent } from 'react'
import { MinistryAccessRequestsSection } from '@/components/admin/MinistryAccessRequestsSection'
import { MinistryRow } from '@/components/admin/MinistryRow'
import { UserRow } from '@/components/admin/UserRow'
import { EditIcon } from '@/components/ui/icons'
import { useAuth } from '@/contexts/AuthContext'
import { useAllUsers } from '@/hooks/useAllUsers'
import { useMinistries } from '@/hooks/useMinistries'
import { usePrivateEmails } from '@/hooks/usePrivateEmails'
import { addMinistry, renameMinistry } from '@/lib/ministryManagement'
import { ROLE_LABELS } from '@/lib/roles'
import { updateMultipleUserRolesAndMinistries, type PendingUserChange } from '@/lib/userManagement'
import type { UserRole } from '@/types/models'

interface PendingUser {
  role: UserRole
  ministryIds: string[]
}

export function RoleManagementPage() {
  const { appUser } = useAuth()
  const ministries = useMinistries()
  const users = useAllUsers()
  const emails = usePrivateEmails(useMemo(() => users.map((user) => user.uid), [users]))

  const [ministriesEditing, setMinistriesEditing] = useState(false)
  const [pendingMinistryNames, setPendingMinistryNames] = useState<Record<string, string>>({})
  const [savingMinistries, setSavingMinistries] = useState(false)
  const [ministriesSaveError, setMinistriesSaveError] = useState<string | null>(null)
  const [newMinistryName, setNewMinistryName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [usersEditing, setUsersEditing] = useState(false)
  const [pendingUsers, setPendingUsers] = useState<Record<string, PendingUser>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter(
      (user) => user.name.toLowerCase().includes(query) || ROLE_LABELS[user.role].toLowerCase().includes(query),
    )
  }, [users, search])

  async function handleAddMinistry(event: FormEvent) {
    event.preventDefault()
    if (!newMinistryName.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      await addMinistry(newMinistryName)
      setNewMinistryName('')
    } catch {
      setAddError('No se pudo agregar el ministerio.')
    } finally {
      setAdding(false)
    }
  }

  function handleStartMinistriesEdit() {
    const initial: Record<string, string> = {}
    ministries.forEach((ministry) => {
      initial[ministry.id] = ministry.name
    })
    setPendingMinistryNames(initial)
    setMinistriesSaveError(null)
    setMinistriesEditing(true)
  }

  function handleCancelMinistriesEdit() {
    setMinistriesEditing(false)
    setPendingMinistryNames({})
    setMinistriesSaveError(null)
  }

  async function handleSaveMinistries() {
    const changed = ministries.filter((ministry) => {
      const pendingName = pendingMinistryNames[ministry.id]?.trim()
      return pendingName && pendingName !== ministry.name
    })

    setSavingMinistries(true)
    setMinistriesSaveError(null)
    try {
      await Promise.all(changed.map((ministry) => renameMinistry(ministry.id, pendingMinistryNames[ministry.id])))
      setMinistriesEditing(false)
      setPendingMinistryNames({})
    } catch {
      setMinistriesSaveError('No se pudieron guardar los cambios.')
    } finally {
      setSavingMinistries(false)
    }
  }

  function handleStartUsersEdit() {
    const initial: Record<string, PendingUser> = {}
    users.forEach((user) => {
      initial[user.uid] = { role: user.role, ministryIds: user.ministryIds }
    })
    setPendingUsers(initial)
    setSaveError(null)
    setUsersEditing(true)
  }

  function handleCancelUsersEdit() {
    setUsersEditing(false)
    setPendingUsers({})
    setSaveError(null)
  }

  function handleRoleChange(uid: string, role: UserRole) {
    setPendingUsers((current) => ({
      ...current,
      [uid]: { role, ministryIds: role === 'leader' ? current[uid].ministryIds : [] },
    }))
  }

  function handleMinistrySelect(uid: string, ministryId: string) {
    setPendingUsers((current) => ({
      ...current,
      [uid]: { ...current[uid], ministryIds: ministryId ? [ministryId] : [] },
    }))
  }

  async function handleSaveUsers() {
    const changes: PendingUserChange[] = users
      .filter((user) => {
        const pending = pendingUsers[user.uid]
        if (!pending) return false
        return (
          pending.role !== user.role ||
          pending.ministryIds.length !== user.ministryIds.length ||
          pending.ministryIds.some((id) => !user.ministryIds.includes(id))
        )
      })
      .map((user) => ({ uid: user.uid, ...pendingUsers[user.uid] }))

    setSaving(true)
    setSaveError(null)
    try {
      await updateMultipleUserRolesAndMinistries(changes)
      setUsersEditing(false)
      setPendingUsers({})
    } catch {
      setSaveError('No se pudieron guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  // This page is reachable by the Pastor and Co-admins alike (see
  // StaffRoute), but Ministerios/Usuarios below reassign roles freely
  // (including promoting to Encargado/Co-admin/Pastor and reassigning
  // ministries) — that stays Pastor-only per PROJECT_SPEC.md's Critical
  // rule. Only the new Solicitudes section is shared: approving/rejecting/
  // revoking ministry-calendar access is a deliberately narrow exception
  // (see firestore.rules' isStaffAccessToggle).
  const isPastor = appUser?.role === 'admin'

  return (
    <div className="mx-auto max-w-2xl flex-1 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-(--text)">Administración</h1>
      <p className="mt-1 text-sm text-(--text-muted)">
        {isPastor
          ? 'Gestiona los ministerios de la iglesia y los roles y asignaciones de cada usuario.'
          : 'Revisa las solicitudes de acceso al calendario de ministerios.'}
      </p>

      <MinistryAccessRequestsSection users={users} emails={emails} />

      {isPastor && (
        <>
          <section className="mt-6 rounded-xl bg-(--surface) p-5 shadow-sm ring-1 ring-(--border)">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-(--text)">Ministerios</h2>
              <div className="flex items-center gap-2">
                {ministriesEditing && (
                  <button
                    onClick={handleCancelMinistriesEdit}
                    disabled={savingMinistries}
                    className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-(--text-muted) hover:bg-(--surface-hover) disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={ministriesEditing ? handleSaveMinistries : handleStartMinistriesEdit}
                  disabled={savingMinistries}
                  className={
                    ministriesEditing
                      ? 'cursor-pointer rounded-md bg-(--accent) px-3 py-1 text-xs font-medium text-(--accent-contrast) hover:bg-(--accent-hover) disabled:opacity-60'
                      : 'flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text)'
                  }
                >
                  {ministriesEditing ? (
                    'Listo'
                  ) : (
                    <>
                      <EditIcon /> Editar
                    </>
                  )}
                </button>
              </div>
            </div>
            {ministriesSaveError && <p className="mt-2 text-xs text-(--danger)">{ministriesSaveError}</p>}

            {ministriesEditing && (
              <form onSubmit={handleAddMinistry} className="mt-3 flex gap-2">
                <input
                  value={newMinistryName}
                  onChange={(e) => setNewMinistryName(e.target.value)}
                  placeholder="Nombre del nuevo ministerio"
                  disabled={adding}
                  className="flex-1 rounded-md border border-(--border) px-2 py-1.5 text-sm focus:border-(--accent) focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={adding}
                  className="cursor-pointer rounded-md bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-contrast) hover:bg-(--accent-hover) disabled:opacity-60"
                >
                  Agregar
                </button>
              </form>
            )}
            {addError && <p className="mt-2 text-xs text-(--danger)">{addError}</p>}

            <div className="mt-3">
              {ministries.map((ministry) => (
                <MinistryRow
                  key={ministry.id}
                  ministry={ministry}
                  editing={ministriesEditing}
                  pendingName={pendingMinistryNames[ministry.id] ?? ministry.name}
                  onNameChange={(name) => setPendingMinistryNames((current) => ({ ...current, [ministry.id]: name }))}
                />
              ))}
              {ministries.length === 0 && <p className="text-sm text-(--text-faint)">No hay ministerios todavía.</p>}
            </div>
          </section>

          <section className="mt-6 rounded-xl bg-(--surface) p-5 shadow-sm ring-1 ring-(--border)">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-(--text)">Usuarios</h2>
              <div className="flex items-center gap-2">
                {usersEditing && (
                  <button
                    onClick={handleCancelUsersEdit}
                    disabled={saving}
                    className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-(--text-muted) hover:bg-(--surface-hover) disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={usersEditing ? handleSaveUsers : handleStartUsersEdit}
                  disabled={saving}
                  className={
                    usersEditing
                      ? 'cursor-pointer rounded-md bg-(--accent) px-3 py-1 text-xs font-medium text-(--accent-contrast) hover:bg-(--accent-hover) disabled:opacity-60'
                      : 'flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text)'
                  }
                >
                  {usersEditing ? (
                    'Guardar'
                  ) : (
                    <>
                      <EditIcon /> Editar
                    </>
                  )}
                </button>
              </div>
            </div>
            {saveError && <p className="mt-2 text-xs text-(--danger)">{saveError}</p>}

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o rol..."
              className="mt-3 w-full rounded-md border border-(--border) px-2 py-1.5 text-sm focus:border-(--accent) focus:outline-none"
            />

            <div className="mt-3">
              {filteredUsers.map((user) => (
                <UserRow
                  key={user.uid}
                  user={user}
                  email={emails.get(user.uid) ?? ''}
                  ministries={ministries}
                  isSelf={user.uid === appUser?.uid}
                  editing={usersEditing}
                  pendingRole={pendingUsers[user.uid]?.role ?? user.role}
                  pendingMinistryIds={pendingUsers[user.uid]?.ministryIds ?? user.ministryIds}
                  onRoleChange={(role) => handleRoleChange(user.uid, role)}
                  onMinistrySelect={(ministryId) => handleMinistrySelect(user.uid, ministryId)}
                />
              ))}
              {filteredUsers.length === 0 && <p className="text-sm text-(--text-faint)">No se encontraron usuarios.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
