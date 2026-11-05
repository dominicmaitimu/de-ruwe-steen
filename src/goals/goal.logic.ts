import { toDateKey } from '../check-in/check-in.logic'
import { formatDateDisplay } from '../utils/format-date'
import type { Goal, GoalDraft, GoalStepDraft } from './goal.types'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isGoalDateValid(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) && toDateKey(date) === value
}

export function isGoalDraftValid(draft: GoalDraft, hasSteps = false): boolean {
  return Boolean(
    draft.title.trim()
    && draft.title.trim().length <= 120
    && draft.description.length <= 2000
    && ['result', 'development'].includes(draft.type)
    && draft.pillarIds.length > 0
    && new Set(draft.pillarIds).size === draft.pillarIds.length
    && isGoalDateValid(draft.startDate)
    && (!draft.targetDate || (isGoalDateValid(draft.targetDate) && draft.targetDate >= draft.startDate))
    && Number.isInteger(draft.manualProgress)
    && draft.manualProgress >= 0
    && draft.manualProgress <= 100
    && (!hasSteps || draft.manualProgress === 0)
    && draft.initialSteps.every((step) => step.trim().length > 0 && step.trim().length <= 160)
  )
}

export function calculateGoalProgress(manualProgress: number, steps: GoalStepDraft[]): number {
  if (!steps.length) return manualProgress
  return Math.round((steps.filter((step) => step.completed).length / steps.length) * 100)
}

export function getGoalProgress(goal: Pick<Goal, 'manualProgress' | 'steps'>): number {
  return calculateGoalProgress(goal.manualProgress, goal.steps)
}

export function getGoalStatusLabel(status: Goal['status']): string {
  return {
    active: 'Actief',
    paused: 'Gepauzeerd',
    completed: 'Afgerond',
    cancelled: 'Geannuleerd',
  }[status]
}

export function getGoalTypeLabel(type: Goal['type']): string {
  return type === 'result' ? 'Resultaatdoel' : 'Ontwikkeldoel'
}

export function formatGoalDate(value: string | null): string {
  if (!value) return 'Geen streefdatum'
  return formatDateDisplay(new Date(`${value}T12:00:00`), { day: 'numeric', month: 'short', year: 'numeric' })
}

export function reorderGoalSteps<T>(steps: T[], from: number, to: number): T[] {
  if (from < 0 || from >= steps.length || to < 0 || to >= steps.length || from === to) return steps
  const reordered = [...steps]
  const [step] = reordered.splice(from, 1)
  if (step === undefined) return steps
  reordered.splice(to, 0, step)
  return reordered
}

export function createGoalDraft(today: string): GoalDraft {
  return {
    title: '',
    description: '',
    type: 'result',
    pillarIds: [],
    startDate: today,
    targetDate: '',
    manualProgress: 0,
    initialSteps: [],
  }
}

export function draftFromGoal(goal: Goal): GoalDraft {
  return {
    title: goal.title,
    description: goal.description,
    type: goal.type,
    pillarIds: [...goal.pillars],
    startDate: goal.startDate,
    targetDate: goal.targetDate ?? '',
    manualProgress: goal.manualProgress,
    initialSteps: [],
  }
}
