import { describe, expect, it } from 'vitest'
import {
  formatHabitFrequency,
  getDateRange,
  getHabitDayStatus,
  getHabitFrequencyStats,
  isHabitDraftValid,
  isHabitRelevantOnDate,
} from './habit.logic'
import type { Habit, HabitDraft, HabitEntry } from './habit.types'

function createDraft(): HabitDraft {
  return {
    name: 'Wandelen',
    description: '',
    frequencyType: 'weekly',
    targetCount: 3,
    periodDays: 7,
    weekdays: [],
    desiredDurationMinutes: 20,
    startDate: '2026-10-01',
    endDate: '',
    pillarIds: ['physical'],
  }
}

function createHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'walk',
    name: 'Wandelen',
    description: '',
    frequencyType: 'weekly',
    targetCount: 3,
    periodDays: 7,
    weekdays: [],
    desiredDurationMinutes: 20,
    startDate: '2026-10-01',
    endDate: null,
    status: 'active',
    pillarIds: ['physical'],
    statusPeriods: [],
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    ...overrides,
  }
}

function createEntry(date: string, durationMinutes: number | null = null, completed = true): HabitEntry {
  return {
    id: 1,
    habitId: 'walk',
    date,
    completed,
    durationMinutes,
    note: '',
    createdAt: `${date}T10:00:00Z`,
    updatedAt: `${date}T10:00:00Z`,
  }
}

describe('habit logic', () => {
  it('validates required fields, frequency bounds, dates, and pillar links', () => {
    const draft = createDraft()
    expect(isHabitDraftValid(draft)).toBe(true)
    expect(isHabitDraftValid({ ...draft, name: '  ' })).toBe(false)
    expect(isHabitDraftValid({ ...draft, pillarIds: [] })).toBe(false)
    expect(isHabitDraftValid({ ...draft, targetCount: 8 })).toBe(false)
    expect(isHabitDraftValid({ ...draft, endDate: '2026-09-30' })).toBe(false)
  })

  it('spreads three-times-weekly frequency across selected days, not every day', () => {
    const habit = createHabit()
    const relevant = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(2026, 9, 26 + index, 12)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }).filter((date) => isHabitRelevantOnDate(habit, date))
    expect(relevant).toHaveLength(3)
  })

  it('supports selected weekdays and custom period counts', () => {
    expect(isHabitRelevantOnDate(createHabit({ frequencyType: 'weekdays', weekdays: [1, 3, 5] }), '2026-10-30')).toBe(true)
    expect(isHabitRelevantOnDate(createHabit({ frequencyType: 'weekdays', weekdays: [1, 3, 5] }), '2026-10-31')).toBe(false)
    const periodHabit = createHabit({ frequencyType: 'period', targetCount: 2, periodDays: 5 })
    expect(Array.from({ length: 5 }, (_, index) => isHabitRelevantOnDate(periodHabit, `2026-11-0${index + 1}`)).filter(Boolean)).toHaveLength(2)
  })

  it('respects start/end dates and distinguishes registration states', () => {
    const habit = createHabit({ endDate: '2026-10-30' })
    expect(isHabitRelevantOnDate(habit, '2026-09-30')).toBe(false)
    expect(isHabitRelevantOnDate(habit, '2026-10-31')).toBe(false)
    const relevantDate = ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']
      .find((date) => isHabitRelevantOnDate(habit, date))
    const notRelevantDate = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']
      .find((date) => !isHabitRelevantOnDate(habit, date))
    expect(relevantDate).toBeDefined()
    expect(notRelevantDate).toBeDefined()
    expect(getHabitDayStatus(habit, relevantDate!, null)).toBe('not-recorded')
    expect(getHabitDayStatus(habit, relevantDate!, createEntry(relevantDate!, null, false))).toBe('not-completed')
    expect(getHabitDayStatus(habit, notRelevantDate!, null)).toBe('not-applicable')
  })

  it('marks paused and ended dates as not applicable but preserves existing records', () => {
    const habit = createHabit({
      status: 'paused',
      statusPeriods: [
        { status: 'active', startDate: '2026-10-01', endDate: '2026-10-28' },
        { status: 'paused', startDate: '2026-10-29', endDate: null },
      ],
    })
    expect(isHabitRelevantOnDate(habit, '2026-10-28')).toBe(true)
    expect(isHabitRelevantOnDate(habit, '2026-10-29')).toBe(false)
    expect(getHabitDayStatus(habit, '2026-10-29', null)).toBe('not-applicable')
    expect(getHabitDayStatus(habit, '2026-10-29', createEntry('2026-10-29'))).toBe('completed')
  })

  it('formats frequencies and date filters for history', () => {
    expect(formatHabitFrequency(createHabit())).toBe('3 keer per week')
    expect(getDateRange('2026-10-30', '7', '2026-10-01')).toEqual({ start: '2026-10-24', end: '2026-10-30' })
    expect(getDateRange('2026-10-30', 'all', '2026-10-01')).toEqual({ start: '2026-10-01', end: '2026-10-30' })
  })

  it('calculates real entry counts and recorded time without streak scoring', () => {
    const stats = getHabitFrequencyStats([
      createEntry('2026-10-26', 20),
      { ...createEntry('2026-10-28', 30), id: 2 },
      { ...createEntry('2026-10-29', 10, false), id: 3 },
    ], '2026-10-30')
    expect(stats.thisWeek).toBe(2)
    expect(stats.thisMonth).toBe(2)
    expect(stats.totalMinutes).toBe(50)
    expect(stats.averagePerWeek).toBeGreaterThan(0)
  })
})
