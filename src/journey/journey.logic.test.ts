import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCurrentDay, getJourneyProgress } from './journey.logic'
import type { JourneySnapshot } from './journey.repository'

describe('journey progress', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses local calendar days and keeps the journey within days 1 to 365', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 30, 12))

    expect(getCurrentDay(new Date(2026, 9, 30, 20).toISOString())).toBe(1)
    expect(getCurrentDay(new Date(2026, 9, 29, 20).toISOString())).toBe(2)
    expect(getCurrentDay(new Date(2026, 10, 1, 0).toISOString())).toBe(1)
    expect(getCurrentDay(new Date(2025, 9, 30, 12).toISOString())).toBe(365)
  })

  it('calculates completed-day percentage and week from unique saved days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 30, 12))
    const snapshot: JourneySnapshot = {
      answers: { 1: 'Een antwoord', 2: 'Nog een antwoord' },
      completedDays: [1, 2, 3, 4, 5, 6, 7],
      reflections: [],
      startedAt: new Date(2026, 9, 30).toISOString(),
    }

    expect(getJourneyProgress(snapshot)).toEqual({
      completedCount: 7,
      currentDay: 1,
      percentage: 1.92,
      week: 2,
    })
  })

  it('rejects invalid journey start dates', () => {
    expect(() => getCurrentDay('not-a-date')).toThrow('startdatum')
  })
})
