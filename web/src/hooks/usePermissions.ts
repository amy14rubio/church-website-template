import { useAuth } from '@/contexts/AuthContext'
import * as permissions from '@/lib/permissions'
import type { CalendarEvent } from '@/types/models'

export function usePermissions() {
  const { appUser } = useAuth()

  return {
    appUser,
    canViewEvent: (event: Pick<CalendarEvent, 'viewableForPublic' | 'viewableForMinistry'>) =>
      permissions.canViewEvent(appUser, event),
    canViewMinistryCalendar: () => permissions.canViewMinistryCalendar(appUser),
    canManageEvent: (event: Pick<CalendarEvent, 'ministryId'>) => permissions.canManageEvent(appUser, event),
    canCreateEventForMinistry: (ministryId: string | null) =>
      permissions.canCreateEventForMinistry(appUser, ministryId),
    canCreateAnyEvent: () => permissions.canCreateAnyEvent(appUser),
    canRsvp: () => permissions.canRsvp(appUser),
    canManageRoles: () => permissions.canManageRoles(appUser),
  }
}
