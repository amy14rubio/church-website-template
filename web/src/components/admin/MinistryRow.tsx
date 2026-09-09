import { useState } from 'react'
import { TrashIcon } from '@/components/ui/icons'
import { deleteMinistryIfUnused } from '@/lib/ministryManagement'
import type { Ministry } from '@/types/models'

// Fully controlled by RoleManagementPage, same pattern as UserRow: the
// Ministerios section edits every visible row at once and saves the
// changed names with a single top-of-card "Listo" button, so this row has
// no local edit-mode state or save button of its own. Delete stays
// independent — it's destructive and immediate, not part of the pending
// rename batch.
export function MinistryRow({
  ministry,
  editing,
  pendingName,
  onNameChange,
}: {
  ministry: Ministry
  editing: boolean
  pendingName: string
  onNameChange: (name: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar el ministerio "${ministry.name}"? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    setError(null)
    try {
      const result = await deleteMinistryIfUnused(ministry.id)
      if (!result.deleted) {
        setError(
          `No se puede eliminar: ${result.eventCount} evento(s) y ${result.userCount} usuario(s) todavía usan este ministerio.`,
        )
      }
    } catch {
      setError('No se pudo eliminar el ministerio.')
    } finally {
      setDeleting(false)
    }
  }

  if (!editing) {
    return (
      <div className="border-b border-(--border) py-2 last:border-none">
        <p className="text-sm text-(--text)">{ministry.name}</p>
      </div>
    )
  }

  return (
    <div className="border-b border-(--border) py-2 last:border-none">
      <div className="flex items-center gap-2">
        <input
          value={pendingName}
          onChange={(e) => onNameChange(e.target.value)}
          disabled={deleting}
          className="flex-1 rounded-md border border-(--border) px-2 py-1 text-sm focus:border-(--accent) focus:outline-none"
        />
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="cursor-pointer rounded-md p-1.5 text-(--danger) hover:bg-(--danger-soft) disabled:opacity-60"
          aria-label="Eliminar ministerio"
        >
          <TrashIcon />
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-(--danger)">{error}</p>}
    </div>
  )
}
