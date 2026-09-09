import { EditablePhotoSlot } from '@/components/site/EditablePhotoSlot';
import { useSitePlacements } from '@/hooks/useSitePlacements';

// Percentage-based position/size for each tile, in DOM order — traced
// directly from a "moodboard collage" reference image the user pasted
// (a scattered photo grid, ignoring that image's own caption text),
// converted from its pixel layout to percentages so this scales with
// the container regardless of its own size.
const TILE_LAYOUT = [
  { top: 5.6, left: 17.2, width: 12.2, height: 19 },
  { top: 27.7, left: 8.6, width: 20.8, height: 49.8 },
  { top: 5.6, left: 31.1, width: 14.2, height: 37.6 },
  { top: 45.1, left: 31.1, width: 14.2, height: 17.9 },
  { top: 25.4, left: 47.2, width: 45.1, height: 37.6 },
  { top: 65.3, left: 31.1, width: 19.8, height: 26.3 },
  { top: 65.3, left: 53, width: 33.6, height: 30.6 },
];

// A mixed/scattered photo collage — a fixed number of admin-editable
// tiles at varying sizes and offsets instead of a uniform grid. Height
// is a plain aspect ratio (no scroll listener, no sticky positioning);
// this is meant to just sit inline in a page like any other section.
export function PhotoCollage({ slotPrefix }: { slotPrefix: string }) {
  const placements = useSitePlacements();

  return (
    <div className='relative aspect-16/10 w-full'>
      {TILE_LAYOUT.map((tile, i) => {
        const slotKey = `${slotPrefix}-${i}`;
        return (
          <div
            key={slotKey}
            className='absolute'
            style={{
              top: `${tile.top}%`,
              left: `${tile.left}%`,
              width: `${tile.width}%`,
              height: `${tile.height}%`,
            }}
          >
            <EditablePhotoSlot
              slotKey={slotKey}
              placement={placements.get(slotKey)}
              className='h-full w-full rounded-md'
            />
          </div>
        );
      })}
    </div>
  );
}
