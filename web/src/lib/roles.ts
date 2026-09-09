import type { UserRole } from '@/types/models'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Pastor',
  coAdmin: 'Co-admin',
  leader: 'Encargado',
  ministryMember: 'Ministerio de Ayuda',
  member: 'Miembro',
}
