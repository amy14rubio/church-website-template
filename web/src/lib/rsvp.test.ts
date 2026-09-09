import { describe, expect, it } from 'vitest'
import { groupRsvpsByStatus } from './rsvp'
import type { Rsvp } from '@/types/models'

function rsvp(uid: string, status: Rsvp['status']): Rsvp {
  return { uid, name: uid, status, updatedAt: null as unknown as Rsvp['updatedAt'] }
}

describe('groupRsvpsByStatus', () => {
  it('sorts each rsvp into its matching bucket', () => {
    const rsvps = [rsvp('juan', 'attending'), rsvp('carlos', 'not_attending'), rsvp('maria', 'maybe')]
    const grouped = groupRsvpsByStatus(rsvps)

    expect(grouped.attending.map((r) => r.uid)).toEqual(['juan'])
    expect(grouped.notAttending.map((r) => r.uid)).toEqual(['carlos'])
    expect(grouped.maybe.map((r) => r.uid)).toEqual(['maria'])
  })

  it('returns empty buckets for an empty list', () => {
    expect(groupRsvpsByStatus([])).toEqual({ attending: [], notAttending: [], maybe: [] })
  })
})
