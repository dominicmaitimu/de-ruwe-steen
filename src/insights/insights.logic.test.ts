import { describe, expect, it } from 'vitest'
import {
  getActivityEnergyPattern,
  getHabitInsights,
  getMetricChange,
  getPeriodRange,
  getPreviousRange,
  getTimelineBuckets,
  isInRange,
} from './insights.logic'
import type { InsightCheckIn, InsightsSnapshot } from './insights.types'
import type { Habit } from '../habits/habit.types'

function createHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'walk',
    name: 'Wandelen',
    description: '',
    frequencyType: 'weekdays',
    targetCount: 2,
    periodDays: 7,
    weekdays: [1, 3],
    desiredDurationMinutes: null,
    startDate: '2024-01-01',
    endDate: null,
    status: 'active',
    pillarIds: [],
    statusPeriods: [],
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    ...overrides,
  }
}

function createSnapshot(overrides: Partial<InsightsSnapshot> = {}): InsightsSnapshot {
  return {
    pillars: [],
    checkIns: [],
    habits: [],
    habitEntries: [],
    goals: [],
    activities: [],
    reflections: [],
    statusPeriodsByHabit: new Map(),
    ...overrides,
  }
}

function checkIn(date: string, energy = 5): InsightCheckIn {
  return { date, mood: energy, energy, mentalCalm: energy, satisfaction: energy }
}

describe('insights logic', () => {
  it('creates inclusive period boundaries and an equally sized prior period', () => {
    const current = getPeriodRange('7', '2024-03-01')
    const previous = getPreviousRange(current)

    expect(current).toEqual({ start: '2024-02-24', end: '2024-03-01' })
    expect(previous).toEqual({ start: '2024-02-17', end: '2024-02-23' })
    expect(isInRange('2024-02-24', current)).toBe(true)
    expect(isInRange('2024-02-23', current)).toBe(false)
  })

  it('uses the earliest saved date for all-time and falls back without inventing records', () => {
    const snapshot = createSnapshot({
      checkIns: [checkIn('2024-03-01'), checkIn('2024-02-20')],
      activities: [{ id: 'a', date: '2024-02-01', durationMinutes: null, pillarIds: [] }],
    })

    expect(getPeriodRange('all', '2024-03-10', snapshot)).toEqual({ start: '2024-02-01', end: '2024-03-10' })
    expect(getPeriodRange('all', '2024-03-10', createSnapshot())).toEqual({ start: '2024-03-10', end: '2024-03-10' })
  })

  it('averages only recorded check-ins and keeps missing dates out of the comparison', () => {
    const snapshot = createSnapshot({ checkIns: [checkIn('2024-02-24', 3), checkIn('2024-02-26', 7), checkIn('2024-02-17', 5)] })
    const current = { start: '2024-02-24', end: '2024-03-01' }
    const previous = { start: '2024-02-17', end: '2024-02-23' }

    expect(getMetricChange(snapshot, 'energy', current, previous)).toEqual({
      currentAverage: 5,
      previousAverage: 5,
      currentCount: 2,
      previousCount: 1,
    })
  })

  it('separates performed, explicitly missed, unrecorded, and irrelevant habit days', () => {
    const snapshot = createSnapshot({
      habits: [createHabit()],
      habitEntries: [
        { id: 1, habitId: 'walk', date: '2024-01-01', completed: true, durationMinutes: 20, note: '', createdAt: '', updatedAt: '' },
        { id: 2, habitId: 'walk', date: '2024-01-03', completed: false, durationMinutes: null, note: '', createdAt: '', updatedAt: '' },
      ],
    })
    const [result] = getHabitInsights(snapshot, { start: '2024-01-01', end: '2024-01-08' })

    expect(result).toMatchObject({
      completed: 1,
      notCompleted: 1,
      notRecorded: 1,
      notApplicable: 5,
      activeDays: 8,
      totalMinutes: 20,
      averagePerWeek: 0.9,
    })
  })

  it('preserves empty days in timeline buckets', () => {
    const buckets = getTimelineBuckets(createSnapshot({
      activities: [{ id: 'a', date: '2024-01-02', durationMinutes: null, pillarIds: [] }],
      habitEntries: [{ id: 1, habitId: 'walk', date: '2024-01-02', completed: true, durationMinutes: null, note: '', createdAt: '', updatedAt: '' }],
    }), { start: '2024-01-01', end: '2024-01-03' }, '7')

    expect(buckets.map(({ activities, habitRegistrations }) => [activities, habitRegistrations])).toEqual([[0, 0], [1, 1], [0, 0]])
  })

  it('requires at least three check-ins in both activity groups for a pattern', () => {
    const checkIns = [
      checkIn('2024-02-01', 8),
      checkIn('2024-02-02', 7),
      checkIn('2024-02-03', 9),
      checkIn('2024-02-04', 4),
      checkIn('2024-02-05', 5),
      checkIn('2024-02-06', 6),
    ]
    const snapshot = createSnapshot({
      checkIns,
      activities: [1, 2, 3].map((day) => ({ id: String(day), date: `2024-02-0${day}`, durationMinutes: null, pillarIds: [] })),
    })

    expect(getActivityEnergyPattern(snapshot, { start: '2024-02-01', end: '2024-02-06' })).toMatchObject({
      withActivity: { average: 8, checkIns: 3, days: 3 },
      withoutActivity: { average: 5, checkIns: 3, days: 3 },
    })
    expect(getActivityEnergyPattern(snapshot, { start: '2024-02-01', end: '2024-02-05' })).toBeNull()
  })
})
