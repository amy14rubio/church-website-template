import { animate, onScroll } from 'animejs'
import { useEffect, useRef } from 'react'

// Reusable "lag" parallax: the returned layer element scrolls slightly
// slower than the page as its container passes through the viewport —
// same technique originally used for the home hero's background video
// (charlesalexandertv.com-style), generalized here for any
// container/layer pair, e.g. a plain text heading drifting subtly as its
// section scrolls by.
//
// anime.js's own onScroll threshold strings are
// "<viewport-edge> <element-edge>" (the reverse of what it reads like at
// a glance) — e.g. 'top bottom' means "when the VIEWPORT's top aligns
// with the ELEMENT's bottom". Getting this backwards silently produces
// an inverted (negative-length) scroll range, which anime.js clamps to
// zero distance — the animation freezes at a static offset instead of
// scrubbing, with no error. Worth re-checking this comment against
// anime's source (search onScroll's threshold parsing) before touching
// these strings again.
//
// By default the layer travels [0, maxPx] — a one-directional lag that
// only ever drifts down, timed to the container's top edge crossing the
// viewport ('top top' to 'top bottom': progress 0 when the container's
// top reaches the viewport's top, progress 1 once the container's
// bottom has scrolled past the viewport's top). Pass `centered: true`
// for [-maxPx/2, maxPx/2] instead, timed to the container's entire time
// on-screen ('bottom top' — viewport-bottom meets the container's top,
// i.e. the container just peeking in from below — to 'top bottom' —
// viewport-top meets the container's bottom, i.e. the container just
// fully leaving above): the layer starts above its resting position,
// passes through it (translateY 0) exactly when the container is
// vertically centered in the viewport, and ends below it — a single
// up-then-down sweep centered on screen-center instead of a one-way
// drift keyed to the top edge (see EscuelaDominicalPage's rows).
// Default stays as it was so existing callers, e.g. HomePage's text
// sections, don't change.
//
// A phone's much shorter scroll-per-pixel-of-content ratio made every
// caller's own maxPx read as a noticeably bigger, more aggressive drift
// on mobile than the same value was tuned to look like on desktop —
// toned down here, once, for every caller at once, rather than
// separately re-tuning each page's own constant for a second breakpoint.
// Matches this codebase's `sm:` breakpoint (640px), same cutoff its
// callers' own responsive classes already use.
const MOBILE_QUERY = '(max-width: 639px)'
const MOBILE_SCALE = 0.1

// Exported for the couple of places (HomeTeachingsCarousel,
// HomeEventsCarousel) that scroll-link their own foreground parallax
// directly with anime.js instead of going through this hook — same
// mobile toning-down, without duplicating the query/scale constants.
export function getMobileParallaxScale(): number {
  return window.matchMedia(MOBILE_QUERY).matches ? MOBILE_SCALE : 1
}

// `secondLayerMaxPx` drives an optional second element (e.g. a row's
// text block alongside its image) off the same container/thresholds —
// pass it and attach `secondLayerRef` to make that element drift too.
export function useScrollLag<C extends HTMLElement, L extends HTMLElement, L2 extends HTMLElement = L>(
  maxPx: number,
  { centered = false, secondLayerMaxPx }: { centered?: boolean; secondLayerMaxPx?: number } = {},
) {
  const containerRef = useRef<C>(null)
  const layerRef = useRef<L>(null)
  const secondLayerRef = useRef<L2>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scale = getMobileParallaxScale()
    const scaledMaxPx = maxPx * scale
    const scaledSecondLayerMaxPx = secondLayerMaxPx === undefined ? undefined : secondLayerMaxPx * scale

    const enter = centered ? 'bottom top' : 'top top'
    // Both modes end the same way — 'top bottom': progress 1 once the
    // container's bottom has scrolled past the viewport's top, i.e. it's
    // fully exited above. Only `enter` differs between the two modes.
    const leave = 'top bottom'
    const rangeFor = (px: number) => (centered ? [-px / 2, px / 2] : [0, px])
    const anims: ReturnType<typeof animate>[] = []

    if (layerRef.current) {
      anims.push(
        animate(layerRef.current, {
          translateY: rangeFor(scaledMaxPx),
          ease: 'linear',
          autoplay: onScroll({ target: container, sync: true, enter, leave }),
        }),
      )
    }
    if (secondLayerRef.current && scaledSecondLayerMaxPx !== undefined) {
      anims.push(
        animate(secondLayerRef.current, {
          translateY: rangeFor(scaledSecondLayerMaxPx),
          ease: 'linear',
          autoplay: onScroll({ target: container, sync: true, enter, leave }),
        }),
      )
    }

    return () => {
      anims.forEach((anim) => anim.revert())
    }
  }, [maxPx, centered, secondLayerMaxPx])

  return { containerRef, layerRef, secondLayerRef }
}
