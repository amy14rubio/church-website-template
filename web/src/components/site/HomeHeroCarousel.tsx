import { useEffect, useState } from 'react';
import { EditablePhotoSlot } from '@/components/site/EditablePhotoSlot';
import { useSitePlacements } from '@/hooks/useSitePlacements';

const SLOT_COUNT = 8;
const SLOT_KEYS = Array.from({ length: SLOT_COUNT }, (_, i) => `home-hero-${i}`);
const ADVANCE_MS = 5000;
const CROSSFADE_MS = 800;

// The hero's background: SLOT_COUNT admin-editable photos, auto-advancing
// on a fixed timer and crossfading into each other — no manual controls
// (arrows/dots) at all, purely automatic. All slots stack in the exact
// same spot (absolute inset-0); only opacity ever picks which one shows,
// same crossfade technique used elsewhere on this site (ScrollImageStory,
// HomeTeachingsCarousel), just plain CSS transitions here since there's
// no scroll-linkage or media-loading state to coordinate like video has.
export function HomeHeroCarousel() {
  const placements = useSitePlacements();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % SLOT_COUNT);
    }, ADVANCE_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className='absolute inset-0 overflow-hidden'>
      {SLOT_KEYS.map((slotKey, i) => (
        <div
          key={slotKey}
          className='absolute inset-0 transition-opacity ease-linear'
          style={{
            opacity: i === activeIndex ? 1 : 0,
            transitionDuration: `${CROSSFADE_MS}ms`,
            // Every slot stacks in the same spot, so a hidden slot's own
            // EditablePhotoSlot edit buttons would otherwise sit on top of
            // and block clicks meant for the active one — same fix used
            // everywhere else this stacked-opacity pattern appears.
            pointerEvents: i === activeIndex ? 'auto' : 'none',
          }}
        >
          <EditablePhotoSlot
            slotKey={slotKey}
            placement={placements.get(slotKey)}
            className='h-full w-full'
            editButtonPosition='bottom-right'
          />
        </div>
      ))}
    </div>
  );
}
