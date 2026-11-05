import { describe, expect, it } from 'vitest'
import {
  calculateGoalProgress,
  createGoalDraft,
  formatGoalDate,
  getGoalStatusLabel,
  getGoalTypeLabel,
  isGoalDateValid,
  isGoalDraftValid,
  reorderGoalSteps,
} from './goal.logic'
import type { GoalDraft, GoalStepDraft } from './goal.types'

function createDraft(): GoalDraft {
  return {
    ...createGoalDraft('2026-10-01'),
    title: 'Meer rust ervaren',
    pillarIds: ['mental'],
  }
}

describe('goal logic', () => {
  it('validates goal dates, required fields, pillars, and optional deadlines', () => {
    const draft = createDraft()
    expect(isGoalDraftValid(draft)).toBe(true)
    expect(isGoalDateValid('2024-02-29')).toBe(true)
    expect(isGoalDateValid('2025-02-29')).toBe(false)
    expect(isGoalDraftValid({ ...draft, title: '  ' })).toBe(false)
    expect(isGoalDraftValid({ ...draft, pillarIds: [] })).toBe(false)
    expect(isGoalDraftValid({ ...draft, targetDate: '2026-09-30' })).toBe(false)
  })

  it('validates initial steps and requires step-based goals to start without manual progress', () => {
    const draft = { ...createDraft(), initialSteps: ['Een rustmoment plannen'] }
    expect(isGoalDraftValid(draft)).toBe(true)
    expect(isGoalDraftValid({ ...draft, initialSteps: ['   '] })).toBe(false)
    expect(isGoalDraftValid(draft, true)).toBe(true)
    expect(isGoalDraftValid({ ...draft, manualProgress: 10 }, true)).toBe(false)
  })

  it('uses step completion when steps exist and manual progress otherwise', () => {
    const steps: GoalStepDraft[] = [
      { title: 'Stap 1', completed: true },
      { title: 'Stap 2', completed: false },
      { title: 'Stap 3', completed: false },
    ]
    expect(calculateGoalProgress(35, [])).toBe(35)
    expect(calculateGoalProgress(35, steps)).toBe(33)
    expect(calculateGoalProgress(0, [{ title: 'Klaar', completed: true }])).toBe(100)
  })

  it('reorders steps without mutating input and ignores invalid positions', () => {
    const steps = ['a', 'b', 'c']
    expect(reorderGoalSteps(steps, 0, 2)).toEqual(['b', 'c', 'a'])
    expect(steps).toEqual(['a', 'b', 'c'])
    expect(reorderGoalSteps(steps, -1, 1)).toBe(steps)
  })

  it('provides Dutch labels for goal type, status, and dates', () => {
    expect(getGoalTypeLabel('development')).toBe('Ontwikkeldoel')
    expect(getGoalStatusLabel('paused')).toBe('Gepauzeerd')
    expect(formatGoalDate(null)).toBe('Geen streefdatum')
    expect(formatGoalDate('2026-10-01')).toContain('2026')
  })
})
