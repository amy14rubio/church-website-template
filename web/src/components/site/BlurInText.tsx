import { animate } from 'animejs'
import { useEffect, useRef, type CSSProperties } from 'react'

// A "blurs into focus" reveal, adapted from a continuous cross-fade/morph
// technique (the reference cycles between several strings forever,
// recomputing blur every frame via requestAnimationFrame). With only one
// string to show for now, morphing it into itself on a loop would just
// read as a glitch — instead this replays a single reveal/hide pair via
// anime.js every time it crosses into or out of view (IntersectionObserver
// keeps watching rather than disconnecting after the first hit), so
// scrolling back down to the footer shows the animation again instead of
// it just sitting there already-revealed.
//
// Pulled out as a hook (rather than only living inside BlurInText below)
// so the same reveal can attach directly to any element — the footer's
// copyright line, each social icon — without an extra wrapper `<span>`
// that could fight with that element's own layout (e.g. a flex row of
// icons). `delay` staggers when each element's own reveal starts once
// it's in view, for a cascading rather than all-at-once entrance.
export function useBlurInReveal<T extends HTMLElement>(delay = 0) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate(el, {
            opacity: [0, 1],
            filter: ['blur(14px)', 'blur(0px)'],
            duration: 1200,
            delay,
            ease: 'outQuad',
          })
        } else {
          animate(el, { opacity: [1, 0], filter: ['blur(0px)', 'blur(14px)'], duration: 400, ease: 'outQuad' })
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return ref
}

// A per-letter "gooey" variant (SVG feColorMatrix filter, scaleX + blur
// stagger) was tried here and reverted per explicit feedback — the
// per-character animation didn't read right; this plain whole-string
// blur/opacity crossfade is the one to keep.
export function BlurInText({
  text,
  className,
  style,
  delay = 0,
}: {
  text: string
  className?: string
  style?: CSSProperties
  delay?: number
}) {
  const ref = useBlurInReveal<HTMLSpanElement>(delay)

  return (
    <span ref={ref} className={className} style={{ ...style, opacity: 0, filter: 'blur(14px)' }}>
      {text}
    </span>
  )
}
