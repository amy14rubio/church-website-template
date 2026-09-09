import { useState, type MouseEvent } from 'react'
import { EditableText } from '@/components/site/EditableText'
import { YoutubeVideoPickerModal } from '@/components/site/YoutubeVideoPickerModal'
import { useAuth } from '@/contexts/AuthContext'
import { useSiteEditMode } from '@/contexts/SiteEditModeContext'
import { useSiteTextValue } from '@/contexts/SiteTextContext'
import { assignYoutubeSlot, clearPlacement } from '@/lib/sitePlacements'
import type { YoutubeSelection } from '@/lib/youtube'
import type { SitePlacement } from '@/types/models'

function embedSrc(placement: SitePlacement): string {
  return placement.youtubeKind === 'playlist'
    ? `https://www.youtube.com/embed/videoseries?list=${placement.youtubeId}`
    : `https://www.youtube.com/embed/${placement.youtubeId}`
}

function watchUrl(placement: SitePlacement): string {
  return placement.youtubeKind === 'playlist'
    ? `https://www.youtube.com/playlist?list=${placement.youtubeId}`
    : `https://www.youtube.com/watch?v=${placement.youtubeId}`
}

// A video slot on a public page that's also, for a signed-in Pastor/
// Co-admin in edit mode (see SiteEditModeContext), a click-to-fill
// editor — picking a video or playlist both imports it into the media
// library and places it here in one step (see src/lib/sitePlacements.ts).
// Falls back to the original static title/description (from the ported
// GoDaddy copy) until real content is placed. The title/description
// stay editable afterward too (EditableText) — YouTube's own title
// pre-fills it, but an admin can override it, e.g. a new teaching's
// playlist title isn't always what they want shown on the site.
export function EditableYoutubeSlot({
  slotKey,
  fallbackTitle,
  fallbackDescription,
  placement,
  showTitle = true,
  boxClassName = 'mt-4 aspect-video rounded-md',
  mobileWatchLink = false,
}: {
  slotKey: string
  fallbackTitle: string
  fallbackDescription?: string
  placement: SitePlacement | undefined
  // Opt-in, defaults unchanged — a caller rendering this full-bleed with
  // no title overlay passes showTitle={false} and its own boxClassName
  // (e.g. "h-screen w-full rounded-none") instead of the usual title +
  // aspect-video box.
  showTitle?: boolean
  boxClassName?: string
  // The embedded iframe wasn't reliably tappable on mobile (reported on
  // EscuelaDominicalPage/MinisterioTeatroPage specifically) — rather than
  // chase an unreproducible mobile-browser/YouTube-embed quirk, below sm
  // this puts an invisible link over the (still-visible, still showing
  // its normal preview frame) iframe that sends the tap to the real
  // YouTube watch page instead of the embed trying to handle it. Opt-in
  // since it changes the interaction (leaves the site) — only wired up
  // where it was actually reported broken, not every EditableYoutubeSlot
  // call site.
  mobileWatchLink?: boolean
}) {
  const { appUser } = useAuth()
  const { editMode } = useSiteEditMode()
  const [pickerOpen, setPickerOpen] = useState(false)
  const isEditor = (appUser?.role === 'admin' || appUser?.role === 'coAdmin') && editMode
  const descriptionValue = useSiteTextValue(`${slotKey}-description`, fallbackDescription ?? '')

  async function handleSelect(selection: YoutubeSelection) {
    if (!appUser) return
    await assignYoutubeSlot(slotKey, selection, appUser.uid)
    setPickerOpen(false)
  }

  async function handleClear(event: MouseEvent) {
    event.stopPropagation()
    await clearPlacement(slotKey)
  }

  return (
    <div className="text-center">
      {showTitle && (
        <EditableText
          slotKey={`${slotKey}-title`}
          fallback={placement?.title ?? fallbackTitle}
          as="h3"
          className="text-2xl font-bold text-(--site-dark-text) uppercase"
        />
      )}

      <div className={`relative overflow-hidden bg-(--site-placeholder) ${boxClassName}`}>
        {placement && <iframe src={embedSrc(placement)} title={placement.title} className="h-full w-full" allowFullScreen />}

        {mobileWatchLink && placement && !isEditor && (
          <a
            href={watchUrl(placement)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ver "${placement.title}" en YouTube`}
            className="absolute inset-0 sm:hidden"
          />
        )}

        {isEditor && !placement && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="absolute inset-0 flex cursor-pointer items-center justify-center border-2 border-dashed border-white/50 text-sm font-medium text-white hover:bg-black/20"
          >
            + Agregar video
          </button>
        )}

        {isEditor && placement && (
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="cursor-pointer rounded bg-black/70 px-2 py-1 text-xs font-medium text-white hover:bg-black/85"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="cursor-pointer rounded bg-black/70 px-2 py-1 text-xs font-medium text-white hover:bg-black/85"
            >
              Quitar
            </button>
          </div>
        )}
      </div>

      {(descriptionValue || isEditor) && (
        <EditableText
          slotKey={`${slotKey}-description`}
          fallback={fallbackDescription ?? ''}
          as="p"
          multiline
          className="mt-4 text-sm text-(--site-dark-text-muted)"
        />
      )}

      {pickerOpen && <YoutubeVideoPickerModal onSelect={handleSelect} onClose={() => setPickerOpen(false)} />}
    </div>
  )
}
