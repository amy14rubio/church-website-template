import { describe, expect, it } from 'vitest'
import {
  canCreateAnyEvent,
  canManageEvent,
  canManageRoles,
  canViewEvent,
  isVisibilityValid,
} from './permissions'

const pastor = { role: 'admin' as const, ministryIds: [] }
const coAdmin = { role: 'coAdmin' as const, ministryIds: [] }
const jovenesLeader = { role: 'leader' as const, ministryIds: ['jovenes'] }
const ministryMember = { role: 'ministryMember' as const, ministryIds: [] }

const churchWideEvent = { ministryId: null }
const jovenesEvent = { ministryId: 'jovenes' }
const alabanzaEvent = { ministryId: 'alabanza' }

describe('canManageEvent', () => {
  it('lets the Pastor manage any event', () => {
    expect(canManageEvent(pastor, churchWideEvent)).toBe(true)
    expect(canManageEvent(pastor, jovenesEvent)).toBe(true)
  })

  it('lets a Co-admin manage any event, church-wide or ministry-specific', () => {
    expect(canManageEvent(coAdmin, churchWideEvent)).toBe(true)
    expect(canManageEvent(coAdmin, jovenesEvent)).toBe(true)
  })

  it('lets an Encargado manage only their assigned ministry', () => {
    expect(canManageEvent(jovenesLeader, jovenesEvent)).toBe(true)
    expect(canManageEvent(jovenesLeader, alabanzaEvent)).toBe(false)
    expect(canManageEvent(jovenesLeader, churchWideEvent)).toBe(false)
  })

  it('never lets Ministerio de Ayuda manage events', () => {
    expect(canManageEvent(ministryMember, jovenesEvent)).toBe(false)
    expect(canManageEvent(ministryMember, churchWideEvent)).toBe(false)
  })

  it('never lets the public manage events', () => {
    expect(canManageEvent(null, churchWideEvent)).toBe(false)
  })
})

describe('canViewEvent', () => {
  it('lets everyone see public events, even unauthenticated', () => {
    expect(canViewEvent(null, { viewableForPublic: true, viewableForMinistry: false })).toBe(true)
  })

  it('hides ministry-only events from the public', () => {
    expect(canViewEvent(null, { viewableForPublic: false, viewableForMinistry: true })).toBe(false)
  })

  it('shows ministry-visible events to every authenticated role, not just the owning ministry', () => {
    const event = { viewableForPublic: false, viewableForMinistry: true }
    expect(canViewEvent(jovenesLeader, event)).toBe(true)
    expect(canViewEvent(ministryMember, event)).toBe(true)
    expect(canViewEvent(coAdmin, event)).toBe(true)
  })
})

describe('isVisibilityValid', () => {
  it('rejects an event visible to no one', () => {
    expect(isVisibilityValid({ viewableForPublic: false, viewableForMinistry: false })).toBe(false)
  })

  it('accepts an event visible to at least one audience', () => {
    expect(isVisibilityValid({ viewableForPublic: true, viewableForMinistry: false })).toBe(true)
  })
})

describe('canCreateAnyEvent', () => {
  it('is true for Pastor and Co-admin regardless of ministry assignment', () => {
    expect(canCreateAnyEvent(pastor)).toBe(true)
    expect(canCreateAnyEvent(coAdmin)).toBe(true)
  })

  it('is true for an Encargado only once they have a ministry assignment', () => {
    expect(canCreateAnyEvent(jovenesLeader)).toBe(true)
    expect(canCreateAnyEvent({ role: 'leader', ministryIds: [] })).toBe(false)
  })

  it('is false for Ministerio de Ayuda and the public', () => {
    expect(canCreateAnyEvent(ministryMember)).toBe(false)
    expect(canCreateAnyEvent(null)).toBe(false)
  })
})

describe('canManageRoles', () => {
  it('is Pastor-only', () => {
    expect(canManageRoles(pastor)).toBe(true)
    expect(canManageRoles(coAdmin)).toBe(false)
    expect(canManageRoles(jovenesLeader)).toBe(false)
    expect(canManageRoles(null)).toBe(false)
  })
})
