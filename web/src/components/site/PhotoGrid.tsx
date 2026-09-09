import { EditablePhotoSlot } from '@/components/site/EditablePhotoSlot'
import { useSitePlacements } from '@/hooks/useSitePlacements'

// A grid of photo tiles, each independently click-to-fill from the
// connected Facebook Page (see EditablePhotoSlot) — slotPrefix namespaces
// this grid's tiles from any other PhotoGrid on the site (e.g. Fotos'
// main gallery vs. Ministerios' section photos), since a tile's slot key
// is just `${slotPrefix}-${index}`.
export function PhotoGrid({ slotPrefix, count }: { slotPrefix: string; count: number }) {
  const placements = useSitePlacements()

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => {
        const slotKey = `${slotPrefix}-${i}`
        return <EditablePhotoSlot key={slotKey} slotKey={slotKey} placement={placements.get(slotKey)} />
      })}
    </div>
  )
}
