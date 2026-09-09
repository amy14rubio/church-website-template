// Remembers a few fields from the last event a user created, so the next
// "Crear evento" starts partially filled in — the same organizer often
// creates similar events repeatedly (e.g. the weekly Jóvenes meeting).
// Per-browser (localStorage), not per-account — good enough for this
// convenience; it's never the source of truth for anything.
export interface EventDraftDefaults {
  location: string
  ministryId: string | null
  viewableForPublic: boolean
}

function storageKey(uid: string): string {
  return `lastEventDefaults:${uid}`
}

export function saveLastEventDefaults(uid: string, defaults: EventDraftDefaults): void {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(defaults))
  } catch {
    // Storage can be unavailable (private browsing, quota) — this is a
    // convenience feature, never worth failing the actual save over.
  }
}

export function loadLastEventDefaults(uid: string): EventDraftDefaults | null {
  try {
    const raw = localStorage.getItem(storageKey(uid))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.location !== 'string' || typeof parsed?.viewableForPublic !== 'boolean') return null
    return parsed as EventDraftDefaults
  } catch {
    return null
  }
}
