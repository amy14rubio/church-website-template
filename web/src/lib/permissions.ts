import type { AppUser, CalendarEvent } from '@/types/models'

// Client-side mirror of firestore.rules, used only to decide what the UI
// shows (hide a button someone can't use). It is NOT the security
// boundary — the backend re-checks every one of these conditions
// independently in firestore.rules. Keep the two in sync.

type Actor = Pick<AppUser, 'role' | 'ministryIds'> | null

type VisibilityFields = Pick<CalendarEvent, 'viewableForPublic' | 'viewableForMinistry'>
type OwnershipFields = Pick<CalendarEvent, 'ministryId'>

// A plain 'member' (the default for every new signup — see AuthContext)
// has not been approved for ministry-calendar access yet. Every other
// role either already carries staff privileges or was promoted here via
// an approved request (see src/lib/ministryAccess.ts).
export function canViewMinistryCalendar(actor: Actor): boolean {
  return actor !== null && actor.role !== 'member'
}

export function canViewEvent(actor: Actor, event: VisibilityFields): boolean {
  if (event.viewableForPublic) return true
  return canViewMinistryCalendar(actor) && event.viewableForMinistry
}

export function canManageEvent(actor: Actor, event: OwnershipFields): boolean {
  if (!actor) return false
  if (actor.role === 'admin' || actor.role === 'coAdmin') return true
  if (actor.role === 'leader') return event.ministryId !== null && actor.ministryIds.includes(event.ministryId)
  return false
}

export function canCreateEventForMinistry(actor: Actor, ministryId: string | null): boolean {
  return canManageEvent(actor, { ministryId })
}

// Whether this actor has ANY valid target to create an event for — used to
// decide whether to show the "Crear evento" button at all. A leader with no
// ministry assignment yet has nothing valid to create for.
export function canCreateAnyEvent(actor: Actor): boolean {
  if (!actor) return false
  if (actor.role === 'admin' || actor.role === 'coAdmin') return true
  if (actor.role === 'leader') return actor.ministryIds.length > 0
  return false
}

export function isVisibilityValid(event: VisibilityFields): boolean {
  return event.viewableForPublic || event.viewableForMinistry
}

export function canRsvp(actor: Actor): boolean {
  return actor !== null
}

export function canManageRoles(actor: Actor): boolean {
  return actor?.role === 'admin'
}
