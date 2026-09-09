import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRsvps } from '@/hooks/useRsvps'
import { groupRsvpsByStatus, setMyRsvp } from '@/lib/rsvp'
import type { RsvpStatus } from '@/types/models'

// Shared by AttendanceSummary and RsvpButtons so they read from one
// subscription instead of each opening their own.
export function useRsvpState(eventId: string) {
  const { appUser } = useAuth()
  const rsvps = useRsvps(eventId)
  const [submittingStatus, setSubmittingStatus] = useState<RsvpStatus | null>(null)

  const grouped = groupRsvpsByStatus(rsvps)
  const myStatus = appUser ? rsvps.find((r) => r.uid === appUser.uid)?.status ?? null : null

  async function respond(status: RsvpStatus) {
    if (!appUser) return
    setSubmittingStatus(status)
    try {
      await setMyRsvp(eventId, appUser.uid, appUser.name, status)
    } finally {
      setSubmittingStatus(null)
    }
  }

  return { appUser, rsvps, grouped, myStatus, submittingStatus, respond }
}
