import type { Ministry } from '@/types/models'

// Each theme defines --ministry-1 through --ministry-10 (see index.css) —
// cycles back to the 1st color past the 10th ministry rather than
// growing the palette indefinitely. Shared between the sidebar's
// checkboxes and the calendar's own event colors, so a ministry always
// reads as the same color in both places.
const MINISTRY_COLOR_COUNT = 10

export function ministryColorVar(index: number): string {
  return `var(--ministry-${(index % MINISTRY_COLOR_COUNT) + 1})`
}

// A church-wide event (ministryId === null) isn't really "a ministry" —
// it stays tied to the theme's own accent color, matching "Toda la
// iglesia" in the sidebar, rather than taking a slot in the palette.
export function buildMinistryColorMap(ministries: Ministry[]): Map<string, string> {
  const map = new Map<string, string>()
  ministries.forEach((ministry, index) => map.set(ministry.id, ministryColorVar(index)))
  return map
}

export function getEventColor(ministryId: string | null, colorMap: Map<string, string>): string {
  if (ministryId === null) return 'var(--accent)'
  return colorMap.get(ministryId) ?? 'var(--accent)'
}
