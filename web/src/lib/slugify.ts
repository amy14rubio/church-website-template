// Turns a ministry name into a short, readable Firestore doc id — matches
// the style of the starter ministries (jovenes, alabanza, ninos,
// evangelismo): lowercase, no accents, hyphens instead of spaces.
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
