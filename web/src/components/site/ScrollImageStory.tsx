import { animate, onScroll, type JSAnimation } from 'animejs';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EditablePhotoSlot } from '@/components/site/EditablePhotoSlot';
import { useSitePlacements } from '@/hooks/useSitePlacements';
import { smoothScrollTo } from '@/lib/smoothScroll';

export interface ScrollStorySection {
  text: ReactNode;
  // Admin-editable photo for this section (click-to-fill in edit mode,
  // same pattern as every other photo slot on the site). Optional so
  // this component still works with a plain static placeholder for any
  // caller that doesn't want per-section photo editing.
  photoSlotKey?: string;
}

// How many equal-duration scroll segments each section's photo spends
// just holding still (fully visible, fully in focus), versus the single
// segment spent crossfading into the next one — i.e. how much longer it
// lingers on screen once it's landed.
const HOLD_SEGMENTS = 3;
// One section's worth of points in the shared step arrays below: this
// many points, all equal to that section's own value, gives exactly
// HOLD_SEGMENTS internal segments of dead-flat "hold", and the value
// change from one section's last point to the next section's first
// point is what creates the single-segment crossfade in between — no
// per-section timing needs to be hand-tuned, it falls out of the array
// shape alone.
const POINTS_PER_SECTION = HOLD_SEGMENTS + 1;

function buildSteppedArray(sectionCount: number, valueAt: (section: number) => number): number[] {
  const points: number[] = [];
  for (let i = 0; i < sectionCount; i++) {
    for (let r = 0; r < POINTS_PER_SECTION; r++) points.push(valueAt(i));
  }
  return points;
}

// A section's caption ramps in only across the middle portion of its
// single crossfade segment (staying at 0 for the first REVEAL_INSET
// share, 1 for the last REVEAL_INSET share) rather than the full
// segment — so it fades in once the new photo has mostly resolved, and
// finishes fading out before the next photo arrives, instead of reading
// as pasted on top of a still-blending crossfade.
const REVEAL_INSET = 0.35;

// Subtle vertical "pop" that rides along with the same reveal/hide ramp as
// opacity — the paragraph rests 0 at full visibility and offset by this many
// pixels when fully hidden, so it rises into place as it fades in and settles
// back down as it fades out. Driven by the exact same ramp value as opacity
// (see the shared `t` in the effect below), so it's automatically in lockstep
// and just as reversible scrolling backward — never a separate animation.
const POP_DISTANCE = 16;

// Constant dimming applied over the full-bleed photo behind every
// caption (0 = no dimming, 1 = fully black) — a fixed scrim rather than
// one that animates with scroll, so it never flickers/flashes as
// sections crossfade; only the photo layers themselves change opacity.
const OVERLAY_MAX_OPACITY = 0.5;

function insetRamp(t: number): number {
  if (t <= REVEAL_INSET) return 0;
  if (t >= 1 - REVEAL_INSET) return 1;
  const linear = (t - REVEAL_INSET) / (1 - 2 * REVEAL_INSET);
  // Smoothstep: eases the reveal/hide (and the pop/dim it drives) in and
  // out instead of moving through the window at a constant rate, so the
  // motion reads as smooth rather than snapping straight from 0 to 1.
  return linear * linear * (3 - 2 * linear);
}

// Section i's caption opacity (and, via the same value, its overlay-dim
// contribution) at a given fractional point position — 1 throughout its
// own hold, ramping (via insetRamp) across the single segment where the
// photo is crossfading in or out, 0 elsewhere. The first/last sections
// have no entry/exit ramp at all (nothing to transition from/to), so
// their hold just extends to the edge of the whole range instead.
function textOpacityAt(sectionIndex: number, sectionCount: number, pointPosition: number): number {
  const entryStart = sectionIndex * POINTS_PER_SECTION - 1;
  const entryEnd = sectionIndex * POINTS_PER_SECTION;
  const exitStart = sectionIndex * POINTS_PER_SECTION + HOLD_SEGMENTS - 1;
  const exitEnd = sectionIndex * POINTS_PER_SECTION + HOLD_SEGMENTS;

  if (sectionIndex > 0 && pointPosition < entryEnd) {
    if (pointPosition <= entryStart) return 0;
    return insetRamp(pointPosition - entryStart);
  }
  if (sectionIndex < sectionCount - 1 && pointPosition > exitStart) {
    if (pointPosition >= exitEnd) return 0;
    return 1 - insetRamp(pointPosition - exitStart);
  }
  return 1;
}

// Full-bleed scroll-driven photo story: one full-screen photo layer per
// section, crossfading into the next as the user scrolls, with that
// section's caption overlaid on top (savor.it-style) over a constant
// dark scrim (see OVERLAY_MAX_OPACITY) for contrast. Nothing here
// scrolls with the page — the whole thing is pinned (position: sticky)
// for the entire scroll range; the tall wrapper below exists purely to
// give the page enough scroll distance to drive that progress value,
// not because anything moves through it.
//
// The scrub math: for N sections, each layer's opacity is expressed as a
// value array with POINTS_PER_SECTION points per section (see
// buildSteppedArray) — repeating a section's target value that many
// times creates its "hold" (HOLD_SEGMENTS segments long), and the
// differing value between one section's last point and the next
// section's first point creates the single-segment crossfade in
// between. Each layer's own array is handed straight to animate()
// (anime.js interpolates it natively); each caption's opacity is instead
// computed by hand every scroll tick against that same segment math,
// with the inset ramp layered on top — see textOpacityAt.
//
// Only rendered on sm+ — mobile gets a plain stacked photo-then-text
// list instead (see the sm:hidden block below), no scroll-linked
// animation; a full-bleed pinned photo doesn't leave room for a
// comfortably-sized caption on a narrow phone screen.
export function ScrollImageStory({ sections }: { sections: ScrollStorySection[] }) {
  const placements = useSitePlacements();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || viewportWidth === 0) return;

    const n = sections.length;
    const segmentCount = n * HOLD_SEGMENTS + (n - 1);
    const scrollOpts = {
      target: wrapper,
      sync: true,
      enter: 'top top',
      leave: 'bottom bottom',
    } as const;

    const animations: JSAnimation[] = [];

    layerRefs.current.forEach((layer, i) => {
      if (!layer) return;
      animations.push(
        animate(layer, {
          opacity: buildSteppedArray(n, (j) => (j === i ? 1 : 0)),
          ease: 'linear',
          autoplay: onScroll(scrollOpts),
          // Every layer stacks in the same spot (only opacity picks the
          // visible one), so a hidden layer's own EditablePhotoSlot edit
          // buttons would otherwise sit on top of and block clicks meant
          // for whichever layer is actually showing — same class of bug
          // as the text wrappers below, fixed the same way.
          onUpdate: () => {
            layer.style.pointerEvents =
              parseFloat(layer.style.opacity || '0') > 0.5 ? 'auto' : 'none';
          },
        }),
      );
    });

    const progressTracker = { value: 0 };
    animations.push(
      animate(progressTracker, {
        value: 1,
        ease: 'linear',
        autoplay: onScroll(scrollOpts),
        onUpdate: () => {
          const pointPosition = progressTracker.value * segmentCount;
          textRefs.current.forEach((text, i) => {
            if (!text) return;
            const t = textOpacityAt(i, n, pointPosition);
            text.style.opacity = String(t);
            text.style.transform = `translateY(${(1 - t) * POP_DISTANCE}px)`;
            // Every section's full-screen wrapper div stacks on top of
            // every other one (only opacity picks the visible one), so a
            // hidden section sitting later in the DOM would otherwise
            // intercept clicks meant for whichever section is actually
            // visible — harmless while this text was inert, but it
            // blocks real interaction now that it's admin-editable.
            text.style.pointerEvents = t > 0.5 ? 'auto' : 'none';
          });
        },
      }),
    );

    return () => {
      animations.forEach((a) => a.revert());
    };
  }, [sections.length, viewportWidth]);

  // Once the user stops scrolling inside the wrapper's active range, ease the
  // page the rest of the way to whichever section's hold is nearest — so a
  // scroll gesture that only gets partway through a crossfade still completes
  // it, instead of leaving the photo/caption stopped mid-transition. Only
  // ever fires after scrolling has settled (a debounce, not a mid-scroll
  // hijack), and does nothing outside the wrapper's own range or on the
  // mobile stacked layout (whose wrapper is display:none, so its rect
  // collapses to 0).
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || viewportWidth === 0) return;

    const n = sections.length;
    const segmentCount = n * HOLD_SEGMENTS + (n - 1);

    function holdCenterScrollY(sectionIndex: number): number {
      const rect = wrapper!.getBoundingClientRect();
      const wrapperTop = window.scrollY + rect.top;
      const scrollableRange = wrapper!.offsetHeight - window.innerHeight;
      const holdCenterPoint = sectionIndex * POINTS_PER_SECTION + HOLD_SEGMENTS / 2;
      return wrapperTop + (holdCenterPoint / segmentCount) * scrollableRange;
    }

    let settleTimer: ReturnType<typeof setTimeout>;
    function handleScroll() {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        const rect = wrapper!.getBoundingClientRect();
        if (rect.top > 0 || rect.bottom < window.innerHeight) return;

        const current = window.scrollY;
        let nearest = holdCenterScrollY(0);
        for (let i = 1; i < n; i++) {
          const target = holdCenterScrollY(i);
          if (Math.abs(target - current) < Math.abs(nearest - current)) nearest = target;
        }
        if (Math.abs(nearest - current) > 4) {
          smoothScrollTo(nearest);
        }
      }, 140);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(settleTimer);
    };
  }, [sections.length, viewportWidth]);

  return (
    <>
      <div
        ref={wrapperRef}
        className='relative hidden sm:block '
        style={{ height: `${sections.length * 160}vh` }}
      >
        <div className='sticky top-0 h-screen w-full overflow-hidden '>
          {sections.map((section, i) => (
            <div
              key={i}
              ref={(el) => {
                layerRefs.current[i] = el;
              }}
              className='absolute inset-0 h-full w-full'
              style={{ opacity: i === 0 ? 1 : 0, pointerEvents: i === 0 ? 'auto' : 'none' }}
            >
              {section.photoSlotKey ? (
                <EditablePhotoSlot
                  slotKey={section.photoSlotKey}
                  placement={placements.get(section.photoSlotKey)}
                  className='h-full w-full'
                />
              ) : (
                <div className='flex h-full w-full items-center justify-center bg-(--site-placeholder) text-(--site-text-muted)'>
                  <span className='text-sm font-medium'>Imagen {i + 1}</span>
                </div>
              )}
            </div>
          ))}

          <div
            className='pointer-events-none absolute inset-0 z-10 bg-black'
            style={{ opacity: OVERLAY_MAX_OPACITY }}
          />

          {sections.map((section, i) => (
            <div
              key={i}
              className='pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-12 sm:px-20'
            >
              <div
                ref={(el) => {
                  textRefs.current[i] = el;
                }}
                className='max-w-xl text-lg text-white sm:text-xl'
                style={{
                  opacity: i === 0 ? 1 : 0,
                  transform: `translateY(${i === 0 ? 0 : POP_DISTANCE}px)`,
                  pointerEvents: i === 0 ? 'auto' : 'none',
                }}
              >
                {section.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='mx-auto mb-16 flex max-w-md flex-col gap-10 px-4 sm:hidden'>
        {sections.map((section, i) => (
          <div key={i} className='flex flex-col gap-4'>
            {section.photoSlotKey ? (
              <EditablePhotoSlot
                slotKey={section.photoSlotKey}
                placement={placements.get(section.photoSlotKey)}
                className='aspect-video rounded-2xl'
              />
            ) : (
              <div className='flex aspect-video items-center justify-center rounded-2xl bg-(--site-placeholder) text-(--site-text-muted)'>
                <span className='text-sm font-medium'>Imagen {i + 1}</span>
              </div>
            )}
            <div className='text-(--site-text)'>{section.text}</div>
          </div>
        ))}
      </div>
    </>
  );
}
