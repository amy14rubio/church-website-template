import type { CSSProperties } from 'react'
import type { ImageFocalPoint } from '@/types/models'

// Guarantees a rectangle never asks for image content outside the
// natural image's own bounds (0 <= pos, pos+size <= 1) — a corrupted or
// edge-case-rounded saved value here would otherwise try to display a
// sliver of image that doesn't exist, which renders as a gap showing
// whatever's behind it instead of photo pixels (see ImageFocalPointModal's
// own clampFraction, which prevents this at save time; this is the
// render-time backstop for anything saved before that existed).
function clampFraction(pos: number, size: number): { pos: number; size: number } {
  const clampedSize = Math.min(Math.max(size, 0), 1)
  const clampedPos = Math.min(Math.max(pos, 0), 1 - clampedSize)
  return { pos: clampedPos, size: clampedSize }
}

// A prior version of this function used object-position + transform:
// scale (with transform-origin matching the object-position value) to
// lean on the browser's own object-fit:cover math instead of computing
// width/height/left/top by hand. That turned out to rest on a wrong
// assumption: transform-origin only keeps whatever point is CURRENTLY
// at that spot fixed in place — it does not move the focal point to the
// center of the frame first. Since object-position places content-point
// P at box-point P (the same P for both, by definition — it can't place
// an arbitrary content point at box-center unless P is itself 50%),
// scaling around that same P only zooms in around wherever the focal
// point already happened to land, not around the center of the crop
// box. In practice that meant a photo repositioned in the crop tool
// visibly undershot the reposition once saved — confirmed with a
// minimal reproduction (plain object-position + transform, no React
// involved) before rewriting this.
//
// This version goes back to plain position:absolute + width/height/
// left/top (which centers on an arbitrary point correctly, since left/
// top aren't tied to object-position's "same percentage for both ends"
// rule) — but unlike the ORIGINAL such version (before the object-
// position rewrite), it recomputes the shown width/height fractions
// against the box's OWN current aspect ratio instead of reusing the
// fractions saved at crop time verbatim. That's what makes it adapt
// correctly to a box shaped differently than the one it was cropped in
// (e.g. a full-bleed hero that's a different shape on mobile vs.
// desktop) without distorting: `zoom` (how much tighter than a plain
// cover the crop is) is a pure scale factor independent of any
// particular aspect ratio, so it can be reapplied against whatever the
// live box's own cover-baseline fractions are.
function coverBaselineFractions(imageAspectRatio: number, containerAspectRatio: number) {
  if (imageAspectRatio > containerAspectRatio) {
    return { width: containerAspectRatio / imageAspectRatio, height: 1 }
  }
  return { width: 1, height: imageAspectRatio / containerAspectRatio }
}

// Shared between EditablePhotoSlot (site photos) and Avatar (profile
// pictures) — same non-destructive crop model, same math, just applied
// to two different kinds of image. `containerAspectRatio` is the live
// box's own width/height ratio at render time — EditablePhotoSlot
// measures this the same way it already does for the crop modal's own
// aspect ratio; Avatar's box is always a fixed circle, so it just passes
// 1.
export function computeFocalPointStyle(
  focalPoint: ImageFocalPoint,
  containerAspectRatio: number,
): CSSProperties {
  const zoom = 1 / Math.max(focalPoint.width, focalPoint.height)
  const baseline = coverBaselineFractions(focalPoint.imageAspectRatio, containerAspectRatio)
  const width = baseline.width / zoom
  const height = baseline.height / zoom

  const centerX = focalPoint.x + focalPoint.width / 2
  const centerY = focalPoint.y + focalPoint.height / 2
  const x = clampFraction(centerX - width / 2, width)
  const y = clampFraction(centerY - height / 2, height)

  return {
    position: 'absolute',
    width: `${(1 / x.size) * 100}%`,
    height: `${(1 / y.size) * 100}%`,
    left: `${(-x.pos / x.size) * 100}%`,
    top: `${(-y.pos / y.size) * 100}%`,
    maxWidth: 'none',
    maxHeight: 'none',
  }
}
