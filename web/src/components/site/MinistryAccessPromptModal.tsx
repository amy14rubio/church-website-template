import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useModalScrollLock } from '@/hooks/useModalScrollLock'
import { markMinistryAccessPromptShown, requestMinistryAccess } from '@/lib/ministryAccess'

// Shown at most once per account — the very first time a brand-new
// 'member' account (see AuthContext's self-provisioning default) is
// signed in with no ministry-access history yet. Dismissing OR
// requesting both mark ministryAccessPromptShown, so it never appears
// again on a later sign-in; ProfilePage is the only other place this
// offer lives afterward. Mounted once at the app root (see App.tsx) so
// it catches the very next render after sign-in/sign-up regardless of
// which page that lands on, not just the pages under the app shell
// (Layout) — the public marketing pages (HomePage, etc.) are outside it.
//
// This outer component itself is always mounted for the whole session —
// it only decides WHETHER to show anything. The actual dialog (below) is
// a separate component that's conditionally rendered, since
// useModalScrollLock locks scroll on mount and only unlocks on unmount:
// calling it unconditionally here (an always-mounted component) would
// freeze scrolling site-wide the instant the app loads, never releasing
// it, regardless of whether the dialog was ever actually visible.
export function MinistryAccessPromptModal() {
  const { appUser } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  const shouldShow =
    !dismissed &&
    appUser?.role === 'member' &&
    appUser.ministryAccessRequestStatus === 'none' &&
    !appUser.ministryAccessPromptShown

  if (!shouldShow) return null

  return <MinistryAccessPromptDialog uid={appUser.uid} onClose={() => setDismissed(true)} />
}

function MinistryAccessPromptDialog({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false)

  useModalScrollLock()

  async function handleDismiss() {
    onClose()
    await markMinistryAccessPromptShown(uid)
  }

  async function handleRequest() {
    setSubmitting(true)
    try {
      await requestMinistryAccess(uid)
      await markMinistryAccessPromptShown(uid)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleDismiss}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-xl bg-(--surface) p-5 shadow-lg ring-1 ring-(--border)"
      >
        <h2 className="text-base font-semibold text-(--text)">¿Sirves en algún ministerio?</h2>
        <p className="mt-2 text-sm text-(--text-muted)">
          Si colaboras en algún ministerio de la iglesia, puedes solicitar acceso al calendario interno para
          mantenerte al tanto de las actividades y evitar conflictos de horario. Un administrador revisará tu
          solicitud.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-(--text-muted) hover:bg-(--surface-hover)"
          >
            Ahora no
          </button>
          <button
            type="button"
            onClick={handleRequest}
            disabled={submitting}
            className="cursor-pointer rounded-md bg-(--accent) px-3 py-2 text-sm font-medium text-(--accent-contrast) hover:bg-(--accent-hover) disabled:opacity-60"
          >
            {submitting ? 'Enviando…' : 'Solicitar acceso'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
