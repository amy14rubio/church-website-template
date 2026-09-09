import { useEffect, useState } from 'react'
import { EditablePhotoSlot } from '@/components/site/EditablePhotoSlot'
import { useSitePlacements } from '@/hooks/useSitePlacements'

const ADVANCE_MS = 5000
const CROSSFADE_MS = 800

// An auto-advancing, crossfading photo carousel with no manual controls
// — same technique as HomeHeroCarousel, generalized for any slot prefix
// and slide count. Slide 0 reuses `slotPrefix` bare (no suffix) so a
// single photo already placed at that key (from before this spot became
// a carousel) shows up as the first slide automatically, with no data
// migration; slides 1.. use `${slotPrefix}-{i}`.
//
// Pass `slotKeys` instead of `slotPrefix`/`count` to point the carousel
// at an explicit, pre-existing set of keys — e.g. MinisterioAlabanzaPage
// reuses PhotoCollage's own `${prefix}-0..6` tile keys for its mobile
// carousel, so the exact same admin-placed photos show up in both
// layouts instead of the carousel needing its own separately-filled set.
export function AutoPhotoCarousel({
  slotPrefix,
  count = 5,
  slotKeys: explicitSlotKeys,
  className = 'aspect-5/3 rounded-md',
  ignoreFocalPoint = false,
}: {
  slotPrefix?: string
  count?: number
  slotKeys?: string[]
  className?: string
  // See EditablePhotoSlot's own doc comment — pass this when the slides
  // are borrowed from somewhere shaped completely differently (e.g.
  // PhotoCollage's tiles), so a focal point cropped for that other shape
  // doesn't stretch/squish here instead of just cropping.
  ignoreFocalPoint?: boolean
}) {
  const placements = useSitePlacements()
  const [activeIndex, setActiveIndex] = useState(0)
  if (!explicitSlotKeys && !slotPrefix) {
    throw new Error('AutoPhotoCarousel needs either slotPrefix or slotKeys')
  }
  const slotKeys =
    explicitSlotKeys ??
    Array.from({ length: count }, (_, i) => (i === 0 ? slotPrefix! : `${slotPrefix}-${i}`))
  const slideCount = slotKeys.length

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % slideCount)
    }, ADVANCE_MS)
    return () => clearInterval(timer)
  }, [slideCount])

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {slotKeys.map((slotKey, i) => (
        <div
          key={slotKey}
          className="absolute inset-0 transition-opacity ease-linear"
          style={{
            opacity: i === activeIndex ? 1 : 0,
            transitionDuration: `${CROSSFADE_MS}ms`,
            // Every slide stacks in the same spot, so a hidden slide's
            // own EditablePhotoSlot edit buttons would otherwise sit on
            // top of and block clicks meant for the active one — same
            // fix used everywhere else this stacked-opacity pattern
            // appears (HomeHeroCarousel, ScrollImageStory).
            pointerEvents: i === activeIndex ? 'auto' : 'none',
          }}
        >
          <EditablePhotoSlot
            slotKey={slotKey}
            placement={placements.get(slotKey)}
            className="h-full w-full"
            ignoreFocalPoint={ignoreFocalPoint}
          />
        </div>
      ))}
    </div>
  )
}
