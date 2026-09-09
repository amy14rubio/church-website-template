import { EditablePhotoSlot } from '@/components/site/EditablePhotoSlot';
import { useSitePlacements } from '@/hooks/useSitePlacements';

const MARQUEE_COUNT = 8;

// An auto-scrolling strip of photos ("like an old video tape") — the
// slot list is rendered twice back-to-back and slid via the `marquee`
// keyframe (index.css) exactly -50% of its own width, so the duplicated
// half takes over seamlessly as the first half scrolls out of view.
export function PhotoMarquee({ slotPrefix }: { slotPrefix: string }) {
  const placements = useSitePlacements();
  const slots = Array.from({ length: MARQUEE_COUNT }, (_, i) => `${slotPrefix}-${i}`);

  return (
    <div className='relative mx-auto max-w-4xl overflow-hidden'>
      <div className='flex w-max animate-[marquee_40s_linear_infinite] gap-2'>
        {[...slots, ...slots].map((slotKey, i) => (
          <div key={i} className='h-36 w-56 shrink-0 sm:h-44 sm:w-64'>
            <EditablePhotoSlot
              slotKey={slotKey}
              placement={placements.get(slotKey)}
              className='h-full w-full'
            />
          </div>
        ))}
      </div>

      {/* Fades the strip into the page's own dark background at both
          edges instead of hard-cutting the photos off — pointer-events
          none so they never block the photos' own edit controls
          underneath. */}
      <div className='pointer-events-none absolute inset-y-0 left-0 w-1/10 bg-linear-to-r from-(--site-dark-bg) to-transparent' />
      <div className='pointer-events-none absolute inset-y-0 right-0 w-1/10 bg-linear-to-l from-(--site-dark-bg) to-transparent' />
    </div>
  );
}
