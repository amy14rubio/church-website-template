import { useState, type MouseEvent } from 'react'
import { VideoPickerModal } from '@/components/site/VideoPickerModal'
import { useAuth } from '@/contexts/AuthContext'
import { useSiteEditMode } from '@/contexts/SiteEditModeContext'
import { assignMediaSlot, clearPlacement, type MediaSelection } from '@/lib/sitePlacements'
import type { SitePlacement } from '@/types/models'

// A full-bleed autoplaying, muted, looping background video — the hero's
// video (replacing the old rotating-photos HeroCarousel). Same
// click-to-fill pattern as EditablePhotoSlot, reusing its `imageUrl`
// placement field generically as "the media URL" rather than adding a
// separate video-specific field. Caller must position/size this itself
// (see Home's hero, which wraps it in its own `absolute inset-0` div —
// never pass a position utility directly in `className`, same gotcha as
// EditablePhotoSlot's own note).
//
// `renderVideo=false` skips rendering the `<video>` tag here and only
// renders the edit controls — for a parallax hero, the video itself
// needs to live in its own oversized, separately-transformed layer (see
// Home's HeroSection) so scrolling it doesn't reveal gaps; if the edit
// buttons lived inside that same oversized layer, they'd anchor to its
// overshoot area instead of the actually-visible hero — clipped away by
// the hero's own overflow-hidden, silently unclickable despite reporting
// as "visible" to a naive check. The controls sit bottom-right rather
// than top-right specifically because the hero is full-screen with a
// floating nav overlaid on its top ~80px (see SiteHeader's `floating`
// prop) — a top-right anchor would land underneath that header.
export function EditableVideoBackground({
  slotKey,
  placement,
  className = 'h-full w-full',
  renderVideo = true,
}: {
  slotKey: string
  placement: SitePlacement | undefined
  className?: string
  renderVideo?: boolean
}) {
  const { appUser } = useAuth()
  const { editMode } = useSiteEditMode()
  const [pickerOpen, setPickerOpen] = useState(false)
  const isEditor = (appUser?.role === 'admin' || appUser?.role === 'coAdmin') && editMode

  async function handleSelect(selection: MediaSelection) {
    if (!appUser) return
    await assignMediaSlot(slotKey, selection, appUser.uid)
    setPickerOpen(false)
  }

  async function handleClear(event: MouseEvent) {
    event.stopPropagation()
    await clearPlacement(slotKey)
  }

  return (
    <div className={`relative overflow-hidden ${renderVideo ? 'bg-(--site-placeholder)' : ''} ${className}`}>
      {renderVideo && placement?.imageUrl && (
        <video src={placement.imageUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" />
      )}

      {isEditor && !placement?.imageUrl && (
        <>
          <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-white/50" />
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="absolute right-4 bottom-4 z-10 cursor-pointer rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-black/85"
          >
            + Agregar video
          </button>
        </>
      )}

      {isEditor && placement?.imageUrl && (
        <div className="absolute right-4 bottom-4 z-10 flex gap-1">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="cursor-pointer rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-black/85"
          >
            Cambiar
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="cursor-pointer rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-black/85"
          >
            Quitar
          </button>
        </div>
      )}

      {pickerOpen && <VideoPickerModal onSelect={handleSelect} onClose={() => setPickerOpen(false)} />}
    </div>
  )
}
