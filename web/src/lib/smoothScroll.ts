import Lenis from 'lenis';

// Site-wide inertia-smoothed scrolling: Lenis intercepts wheel/touch input and
// eases the *actual* window scroll position toward the target over time
// (via repeated native scrollTo calls, not a CSS transform trick), so normal
// `scroll` events keep firing and anything reading `window.scrollY` — like
// ScrollImageStory's anime.js `onScroll` tweens — keeps working unmodified.
let lenis: Lenis | null = null;

export function initSmoothScroll(): () => void {
  if (lenis) return () => {};

  lenis = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });

  let frameId: number;
  function raf(time: number) {
    lenis?.raf(time);
    frameId = requestAnimationFrame(raf);
  }
  frameId = requestAnimationFrame(raf);

  return () => {
    cancelAnimationFrame(frameId);
    lenis?.destroy();
    lenis = null;
  };
}

// Pause/resume Lenis's own wheel/touch handling — needed whenever something
// else (a modal) needs the page to stop scrolling entirely. A plain CSS
// `overflow: hidden` on body/html doesn't stop Lenis, since it drives scroll
// itself via wheel/touch listeners + programmatic scrollTo calls, not native
// overflow — so background content would otherwise keep scrolling right
// through an "open" modal. Safe to call with no Lenis instance mounted yet.
export function stopSmoothScroll(): void {
  lenis?.stop();
}

export function startSmoothScroll(): void {
  lenis?.start();
}

// Any programmatic scroll elsewhere in the app (e.g. ScrollImageStory's
// settle-snap) must go through this instead of window.scrollTo — Lenis
// tracks its own internal target/velocity state, and a raw window.scrollTo
// call bypasses that state, so the next wheel tick fights against a target
// Lenis doesn't know was moved.
export function smoothScrollTo(target: number, options?: { duration?: number }): void {
  if (lenis) {
    lenis.scrollTo(target, { duration: options?.duration ?? 1, easing: (t: number) => 1 - Math.pow(1 - t, 3) });
  } else {
    window.scrollTo({ top: target, behavior: 'smooth' });
  }
}

// Same reasoning as smoothScrollTo — a raw window.scrollTo(0, 0) on route
// change would fight Lenis's own tracked position on the very next wheel
// tick — but an instant jump, not an animated one: landing on a new page
// already mid-scroll-animation reads as broken, not smooth. See
// ScrollToTop, which calls this on every route change.
export function resetScrollForNavigation(): void {
  if (lenis) {
    lenis.scrollTo(0, { immediate: true });
  } else {
    window.scrollTo(0, 0);
  }
}
