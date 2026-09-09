import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Cropper, CropperCropArea, CropperDescription, CropperImage } from '@/components/ui/cropper'
import { useModalScrollLock } from '@/hooks/useModalScrollLock'
import type { ImageFocalPoint } from '@/types/models'

// Deliberately > 1, not 1 — at the library's literal zoom=1 baseline, a
// photo whose natural aspect ratio already closely matches the slot's
// own box has zero pannable slack (the crop frame already shows the
// entire image, nothing left to reveal by dragging). Starting slightly
// zoomed in guarantees there's always some room to pan immediately,
// rather than requiring the admin to discover "zoom in first, then you
// can drag" — confirmed empirically: at exactly 1.0, dragging silently
// did nothing for a photo whose aspect ratio matched its box.
const MIN_ZOOM = 1.08
const MAX_ZOOM = 3

interface PixelArea {
  x: number
  y: number
  width: number
  height: number
}

// Guarantees the saved rectangle is always a valid sub-rectangle of the
// natural image (0 <= x, x+size <= 1) — without this, a crop pushed
// right up against an edge at high zoom (rounding in either the cropper
// library or this conversion) can end up asking for a sliver of image
// that doesn't exist, which EditablePhotoSlot's transform then renders
// as a gap showing the slot's own placeholder background instead of any
// photo pixels there.
function clampFraction(pos: number, size: number): { pos: number; size: number } {
  const clampedSize = Math.min(Math.max(size, 0), 1)
  const clampedPos = Math.min(Math.max(pos, 0), 1 - clampedSize)
  return { pos: clampedPos, size: clampedSize }
}

// Lets an admin reposition/zoom a placed photo within its slot's own
// shape (see EditablePhotoSlot's crop button) — purely cosmetic, see
// ImageFocalPoint's own doc comment (src/types/models.ts) for why this
// saves the literal visible rectangle (as a fraction of the natural
// image) instead of a zoom-multiplier or an exported cropped file.
//
// The installed @origin-space/image-cropper only exposes a *controlled
// zoom* (zoom/onZoomChange props) — there's no equivalent controlled pan
// position — so re-opening an already-adjusted photo restores roughly
// its prior zoom level (estimated from the saved rectangle's width) but
// always re-centers the pan; the admin can just re-drag if the exact
// prior framing matters. This estimate is a UI-only starting point for
// the slider — it plays no part in what actually gets saved.
export function ImageFocalPointModal({
  imageUrl,
  aspectRatio,
  initial,
  onSave,
  onClose,
}: {
  imageUrl: string
  aspectRatio: number
  initial: ImageFocalPoint | null
  onSave: (focalPoint: ImageFocalPoint) => void | Promise<void>
  onClose: () => void
}) {
  const [zoom, setZoom] = useState(initial ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, 1 / initial.width)) : MIN_ZOOM)
  const [saving, setSaving] = useState(false)
  const areaRef = useRef<PixelArea | null>(null)
  const naturalSizeRef = useRef<{ width: number; height: number } | null>(null)

  useModalScrollLock()

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      naturalSizeRef.current = { width: img.naturalWidth, height: img.naturalHeight }
    }
    img.src = imageUrl
  }, [imageUrl])

  async function handleSave() {
    const area = areaRef.current
    const natural = naturalSizeRef.current
    if (!area || !natural) return
    setSaving(true)
    try {
      // A direct fraction of the natural image, plus the image's own
      // aspect ratio (needed at render time to work out how much a plain
      // object-fit:cover would already crop before this rectangle is
      // applied on top — see EditablePhotoSlot). No assumption about
      // what the cropper library's own "zoom=1" baseline means, since
      // that assumption (see ImageFocalPoint's doc comment) was wrong.
      const xFraction = clampFraction(area.x / natural.width, area.width / natural.width)
      const yFraction = clampFraction(area.y / natural.height, area.height / natural.height)
      await onSave({
        x: xFraction.pos,
        y: yFraction.pos,
        width: xFraction.size,
        height: yFraction.size,
        imageAspectRatio: natural.width / natural.height,
      })
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        data-lenis-prevent
        className="w-full max-w-lg rounded-lg bg-(--site-bg) p-4 sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-(--site-text)">Ajustar foto</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="cursor-pointer rounded-full p-1 text-(--site-text-muted) hover:bg-(--site-placeholder)/10"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 h-80 overflow-hidden rounded-md bg-black">
          <Cropper
            image={imageUrl}
            aspectRatio={aspectRatio}
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            onZoomChange={setZoom}
            onCropChange={(pixels) => {
              areaRef.current = pixels
            }}
            className="h-full"
          >
            <CropperDescription>Arrastra para reposicionar la foto; usa el control de zoom para acercar o alejar.</CropperDescription>
            <CropperImage />
            <CropperCropArea />
          </Cropper>
        </div>

        <label className="mt-4 flex items-center gap-3 text-sm text-(--site-text)">
          Zoom
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="flex-1"
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md px-4 py-2 text-sm font-medium text-(--site-text-muted) hover:bg-(--site-placeholder)/10"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="cursor-pointer rounded-md bg-(--site-maroon) px-4 py-2 text-sm font-medium text-(--site-maroon-contrast) hover:bg-(--site-maroon-dark) disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
