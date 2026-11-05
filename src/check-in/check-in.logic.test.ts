import { describe, expect, it } from 'vitest'
import {
  createDailySeries,
  createLineSegments,
  getDailyQuestion,
  getGreeting,
  isCheckInDraftValid,
  toDateKey,
} from './check-in.logic'
import type { CheckIn, CheckInDraft } from './check-in.types'

function createCheckIn(date: string): CheckIn {
  return {
    id: 1,
    date,
    mood: 8,
    energy: 7,
    mentalCalm: 6,
    satisfaction: 8,
    didSomethingForSelf: true,
    reflection: null,
    createdAt: `${date}T08:00:00Z`,
    updatedAt: `${date}T08:00:00Z`,
  }
}

function createDraft(): CheckInDraft {
  return {
    date: '2026-10-30',
    mood: 6,
    energy: 5,
    mentalCalm: 7,
    satisfaction: 8,
    didSomethingForSelf: false,
    reflection: '',
  }
}

describe('check-in logic', () => {
  it('formats the local date key without shifting across UTC', () => {
    expect(toDateKey(new Date(2026, 9, 30, 23, 45))).toBe('2026-10-30')
  })

  it('uses the requested greeting time boundaries', () => {
    expect(getGreeting(11)).toBe('Goedemorgen')
    expect(getGreeting(12)).toBe('Goedemiddag')
    expect(getGreeting(17)).toBe('Goedemiddag')
    expect(getGreeting(18)).toBe('Goedenavond')
  })

  it('returns a stable daily question for the same calendar day', () => {
    expect(getDailyQuestion(new Date(2026, 9, 30, 8))).toBe(getDailyQuestion(new Date(2026, 9, 30, 22)))
    expect(new Set(Array.from({ length: 5 }, (_, day) => getDailyQuestion(new Date(2026, 9, 1 + day)))).size).toBe(5)
  })

  it('validates four integer scores and an optional bounded reflection', () => {
    const draft = createDraft()
    expect(isCheckInDraftValid(draft)).toBe(true)
    expect(isCheckInDraftValid({ ...draft, mood: 11 })).toBe(false)
    expect(isCheckInDraftValid({ ...draft, energy: 2.5 })).toBe(false)
    expect(isCheckInDraftValid({ ...draft, reflection: 'x'.repeat(2001) })).toBe(false)
    expect(isCheckInDraftValid({ ...draft, date: 'not-a-date' })).toBe(false)
    expect(isCheckInDraftValid({ ...draft, date: '2026-02-31' })).toBe(false)
  })

  it('creates a daily series with missing days left empty', () => {
    const series = createDailySeries(
      new Date(2026, 9, 30),
      7,
      [createCheckIn('2026-10-28'), createCheckIn('2026-10-30')],
    )

    expect(series).toHaveLength(7)
    expect(series[0]?.date).toBe('2026-10-24')
    expect(series[3]?.checkIn).toBeNull()
    expect(series[4]?.checkIn?.mood).toBe(8)
    expect(series[6]?.checkIn?.mood).toBe(8)
  })

  it('breaks chart lines at missing days instead of plotting them as zero', () => {
    const series = createDailySeries(
      new Date(2026, 9, 30),
      7,
      [createCheckIn('2026-10-28'), createCheckIn('2026-10-30')],
    )
    const segments = createLineSegments(series, 'mood')

    expect(segments).toHaveLength(2)
    expect(segments.map((segment) => segment[0]?.value)).toEqual([8, 8])
    expect(segments.flat().every((point) => point.y > 0)).toBe(true)
  })
})
