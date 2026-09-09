import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { ImageFocalPointModal } from '@/components/site/ImageFocalPointModal'
import { PhotoPickerModal } from '@/components/site/PhotoPickerModal'
import { CropIcon, PlusIcon, RepeatIcon, TrashIcon } from '@/components/ui/icons'
import { useAuth } from '@/contexts/AuthContext'
import { useSiteEditMode } from '@/contexts/SiteEditModeContext'
import { computeFocalPointStyle } from '@/lib/imageFocalPoint'
import { assignMediaSlot, clearPlacement, setImageFocalPoint, type MediaSelection } from '@/lib/sitePlacements'
import type { ImageFocalPoint, SitePlacement } from '@/types/models'

// A single photo spot anywhere on the site — a plain placeholder for a
// visitor, and for a signed-in Pastor/Co-admin in edit mode, a
// click-to-fill photo picker over the connected Facebook Page (or their
// saved library). Same pattern as EditableYoutubeSlot, just for a still
// image instead of a video embed. `className` sets the box's own shape
// (aspect ratio, rounding, sizing) since this gets reused for very
// different shapes — grid tiles, a hero banner, a circular avatar, a
// full-bleed section background. The edit trigger is a small corner
// button (same spot whether empty or filled) rather than a full-box
// overlay — a full-box button would sit centered behind any content a
// full-bleed slot has layered on top of it (e.g. Home's donate section
// text), making it unreachable there even though it's fine for a plain
// empty grid tile. Defaults to the top-right corner; pass
// `editButtonPosition="bottom-right"` for a slot that sits directly
// under a page's floating/transparent nav, where top-right would
// otherwise collide with it (see HomeHeroCarousel).
//
// `className` must NOT include a position utility (absolute/fixed) — the
// wrapper below is hardcoded `relative`, and Tailwind classes fight over
// the same `position` property with no warning, silently collapsing the
// box to 0×0 (inset-* only works on a positioned element) and putting
// its edit button nowhere near where it visually appears to be. For a
// full-bleed background usage, wrap this in your own `absolute inset-0`
// div instead and pass `className="h-full w-full"` here (see Home's
// donate section).
export function EditablePhotoSlot({
  slotKey,
  placement,
  className = 'aspect-square rounded-md',
  editButtonPosition = 'top-right',
  ignoreFocalPoint = false,
}: {
  slotKey: string
  placement: SitePlacement | undefined
  className?: string
  editButtonPosition?: 'top-right' | 'bottom-right'
  // For a caller that reuses the SAME slot key inside a box shaped
  // nothing like the one the focal point was cropped for (see
  // MinisterioAlabanzaPage's mobile carousel, which shows PhotoCollage's
  // own oddly-shaped tile photos inside a uniform aspect-5/3 box) —
  // computeFocalPointStyle always covers without distorting regardless of
  // the box's shape, but it'll still frame around whatever focal
  // point/zoom was chosen for the OTHER context, which isn't necessarily
  // a good crop for this one. Setting this renders a plain, uncropped
  // object-cover fit instead and hides the crop button here, since
  // "crop" would silently overwrite the other context's focal point
  // instead of doing anything useful for this one.
  ignoreFocalPoint?: boolean
}) {
  const cornerClasses = editButtonPosition === 'top-right' ? 'top-1 right-1' : 'bottom-1 right-1'
  const { appUser } = useAuth()
  const { editMode } = useSiteEditMode()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const isEditor = (appUser?.role === 'admin' || appUser?.role === 'coAdmin') && editMode
  // Guards against malformed data (e.g. an old shape from before a
  // format change, or width/height missing/zero) producing NaN/Infinity
  // in the transform below — falls back to the plain centered render,
  // same as no focalPoint at all, rather than a broken one.
  const rawFocalPoint = placement?.focalPoint
  const focalPoint =
    !ignoreFocalPoint &&
    rawFocalPoint &&
    rawFocalPoint.width > 0 &&
    rawFocalPoint.height > 0 &&
    rawFocalPoint.imageAspectRatio > 0 &&
    Number.isFinite(rawFocalPoint.x) &&
    Number.isFinite(rawFocalPoint.y)
      ? rawFocalPoint
      : undefined

  async function handleSelect(selection: MediaSelection) {
    if (!appUser) return
    await assignMediaSlot(slotKey, selection, appUser.uid)
    setPickerOpen(false)
  }

  async function handleClear(event: MouseEvent) {
    event.stopPropagation()
    await clearPlacement(slotKey)
  }

  async function handleSaveFocalPoint(next: ImageFocalPoint) {
    await setImageFocalPoint(slotKey, next)
    setCropOpen(false)
  }

  // clientWidth/clientHeight of the actual rendered box — more robust
  // than parsing this slot's own `className` string (fragile) or
  // assuming one fixed ratio, since callers pass very different shapes
  // here (grid tiles, a hero banner, a circular avatar, a full-bleed
  // section, or — for some callers — no explicit aspect ratio at all,
  // relying on an image's own intrinsic size to set the box's height).
  // Used both for ImageFocalPointModal's own crop-frame shape AND, now,
  // for the placed photo's own render (see computeFocalPointStyle) — the
  // shown crop has to adapt to whatever shape THIS box actually is, not
  // the shape it happened to be cropped in. Safe to measure directly
  // with no self-reference risk, since nothing here ever writes an
  // aspect-ratio back onto the wrapper (see the spacer note below for
  // why that's not necessary). The layout effect alone isn't enough for
  // the no-explicit-class case: it runs synchronously right after
  // mount, but the box's height there only becomes real once the <img>
  // has actually finished loading and the browser knows its intrinsic
  // size — before that, clientHeight is 0 and never gets re-measured
  // afterward. The <img>'s own onLoad re-measures once real dimensions
  // are known.
  const [boxAspectRatio, setBoxAspectRatio] = useState(1)
  function measureBoxAspectRatio() {
    const el = wrapperRef.current
    if (!el || el.clientHeight === 0) return
    setBoxAspectRatio(el.clientWidth / el.clientHeight)
  }
  useLayoutEffect(measureBoxAspectRatio, [placement?.imageUrl])

  return (
    <div ref={wrapperRef} className={`relative overflow-hidden bg-(--site-placeholder) ${className}`}>
      {placement?.imageUrl && (
        <>
          {focalPoint && (
            // An invisible copy of the same photo, in completely normal
            // flow (no focal-point styling at all) — its only job is to
            // reproduce exactly the sizing the wrapper would have had
            // with no crop applied, so a caller with no explicit
            // aspect-ratio class still gets its height from the image's
            // own intrinsic ratio, same as always. Without this, the
            // *visible* image below — position: absolute, needed to
            // center on an arbitrary focal point regardless of the
            // box's own aspect ratio — would be the only thing in flow,
            // and being absolutely positioned, contributes nothing to
            // layout, collapsing such a wrapper to zero height.
            <img src={placement.imageUrl} alt="" aria-hidden="true" className="invisible h-auto w-full" />
          )}
          <img
            src={placement.imageUrl}
            alt={placement.title}
            className={focalPoint ? undefined : 'h-full w-full object-cover'}
            style={focalPoint ? computeFocalPointStyle(focalPoint, boxAspectRatio) : undefined}
            onLoad={measureBoxAspectRatio}
          />
        </>
      )}

      {isEditor && !placement?.imageUrl && (
        <>
          <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-white/50" />
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            title="Agregar foto"
            aria-label="Agregar foto"
            className={`absolute ${cornerClasses} z-10 cursor-pointer rounded bg-black/70 p-1 text-white hover:bg-black/85`}
          >
            <PlusIcon />
          </button>
        </>
      )}

      {isEditor && placement?.imageUrl && (
        <div className={`absolute ${cornerClasses} z-10 flex gap-1`}>
          {!ignoreFocalPoint && (
            <button
              type="button"
              onClick={() => setCropOpen(true)}
              title="Ajustar foto"
              aria-label="Ajustar foto"
              className="cursor-pointer rounded bg-black/70 p-1 text-white hover:bg-black/85"
            >
              <CropIcon />
            </button>
          )}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            title="Cambiar foto"
            aria-label="Cambiar foto"
            className="cursor-pointer rounded bg-black/70 p-1 text-white hover:bg-black/85"
          >
            <RepeatIcon />
          </button>
          <button
            type="button"
            onClick={handleClear}
            title="Quitar foto"
            aria-label="Quitar foto"
            className="cursor-pointer rounded bg-black/70 p-1 text-white hover:bg-black/85"
          >
            <TrashIcon />
          </button>
        </div>
      )}

      {pickerOpen && <PhotoPickerModal onSelect={handleSelect} onClose={() => setPickerOpen(false)} />}

      {cropOpen && placement?.imageUrl && (
        <ImageFocalPointModal
          imageUrl={placement.imageUrl}
          aspectRatio={boxAspectRatio}
          initial={focalPoint ?? null}
          onSave={handleSaveFocalPoint}
          onClose={() => setCropOpen(false)}
        />
      )}
    </div>
  )
}
