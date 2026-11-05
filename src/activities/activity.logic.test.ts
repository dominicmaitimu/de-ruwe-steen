import { describe, expect, it } from 'vitest'
import {
  createActivityDraft,
  filterActivities,
  formatActivityDuration,
  getActivityDateRange,
  getActivityStats,
  isActivityDateValid,
  isActivityDraftValid,
} from './activity.logic'
import type { Activity, ActivityDraft } from './activity.types'

function draft(): ActivityDraft {
  return { ...createActivityDraft('2026-10-30'), title: 'Een wandeling', pillarIds: ['physical', 'mental'] }
}

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'walk',
    title: 'Een wandeling',
    description: 'In het park',
    date: '2026-10-30',
    durationMinutes: 45,
    rating: null,
    note: '',
    pillarIds: ['physical'],
    createdAt: '2026-10-30T10:00:00Z',
    updatedAt: '2026-10-30T10:00:00Z',
    ...overrides,
  }
}

describe('activity logic', () => {
  it('validates required titles, dates, duration, and optional rating', () => {
    expect(isActivityDraftValid(draft())).toBe(true)
    expect(isActivityDraftValid({ ...draft(), title: '  ' })).toBe(false)
    expect(isActivityDateValid('2024-02-29')).toBe(true)
    expect(isActivityDateValid('2025-02-29')).toBe(false)
    expect(isActivityDraftValid({ ...draft(), durationMinutes: 1441 })).toBe(false)
    expect(isActivityDraftValid({ ...draft(), rating: 6 })).toBe(false)
  })

  it('includes the selected number of calendar days in date ranges', () => {
    expect(getActivityDateRange('7', '2026-10-30')).toEqual({ start: '2026-10-24', end: '2026-10-30' })
    expect(getActivityDateRange('all', '2026-10-30')).toEqual({ start: null, end: '2026-10-30' })
  })

  it('filters by date, multiple pillar links, and private text search then sorts chronologically', () => {
    const items = [
      activity({ id: 'old', date: '2026-10-20', pillarIds: ['mental'] }),
      activity({ id: 'later', date: '2026-10-29', title: 'Tekenen', pillarIds: ['creativity'] }),
      activity({ id: 'today', pillarIds: ['physical', 'mental'] }),
    ]
    expect(filterActivities(items, { period: '7', today: '2026-10-30', pillarId: 'mental', search: 'park', direction: 'newest' }).map((item) => item.id)).toEqual(['today'])
    expect(filterActivities(items, { period: 'all', today: '2026-10-30', pillarId: '', search: '', direction: 'oldest' }).map((item) => item.id)).toEqual(['old', 'later', 'today'])
  })

  it('summarizes volume and duration without deriving a score', () => {
    const stats = getActivityStats([activity(), activity({ id: 'second', durationMinutes: null, pillarIds: ['mental'] })])
    expect(stats.count).toBe(2)
    expect(stats.totalMinutes).toBe(45)
    expect(stats.byPillar.get('physical')).toBe(1)
    expect(stats.byPillar.get('mental')).toBe(1)
    expect(formatActivityDuration(90)).toBe('1 uur 30 min')
  })
})
