import { toDateKey } from '../check-in/check-in.logic'
import type { Habit, HabitDraft, HabitEntry, HabitFrequencyType, HabitStatusPeriod } from './habit.types'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isValidDateKey(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) && toDateKey(date) === value
}

export function isHabitDraftValid(draft: HabitDraft): boolean {
  if (!draft.name.trim() || draft.name.trim().length > 100) return false
  if (draft.description.length > 1000 || !isValidDateKey(draft.startDate)) return false
  if (draft.endDate && (!isValidDateKey(draft.endDate) || draft.endDate < draft.startDate)) return false
  if (!draft.pillarIds.length || new Set(draft.pillarIds).size !== draft.pillarIds.length) return false
  if (!Number.isInteger(draft.targetCount) || draft.targetCount < 1 || draft.targetCount > 31) return false
  if (!Number.isInteger(draft.periodDays) || draft.periodDays < 1 || draft.periodDays > 90) return false
  if (draft.desiredDurationMinutes !== null && (!Number.isInteger(draft.desiredDurationMinutes) || draft.desiredDurationMinutes < 1 || draft.desiredDurationMinutes > 1440)) return false
  switch (draft.frequencyType) {
    case 'daily':
      return draft.targetCount === 1 && draft.periodDays === 1
    case 'weekly':
      return draft.periodDays === 7 && draft.targetCount <= 7
    case 'weekdays':
      return draft.weekdays.length > 0 && draft.weekdays.every((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    case 'period':
      return draft.targetCount <= draft.periodDays
  }
}

function dayIndex(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00`).getDay()
}

function isWithinActiveDates(habit: Habit, date: string): boolean {
  return date >= habit.startDate && (!habit.endDate || date <= habit.endDate)
}

function dayOrdinal(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
}

function scheduledInPeriod(date: string, periodDays: number, targetCount: number, anchorDate: string): boolean {
  const offset = ((dayOrdinal(date) - dayOrdinal(anchorDate)) % periodDays + periodDays) % periodDays
  return Math.ceil(((offset + 1) * targetCount) / periodDays) > Math.ceil((offset * targetCount) / periodDays)
}

function mondayOfWeek(date: string): string {
  const monday = new Date(`${date}T12:00:00`)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return toDateKey(monday)
}

export function isHabitRelevantOnDate(habit: Habit, date: string): boolean {
  if (!isValidDateKey(date) || !isWithinActiveDates(habit, date)) return false
  if (habit.statusPeriods.length) {
    const activePeriod = habit.statusPeriods.some((period) =>
      period.status === 'active' && date >= period.startDate && (!period.endDate || date <= period.endDate))
    if (!activePeriod) return false
  }
  switch (habit.frequencyType) {
    case 'daily':
      return true
    case 'weekdays':
      return habit.weekdays.includes(dayIndex(date) || 7)
    case 'weekly':
      return scheduledInPeriod(date, 7, habit.targetCount, mondayOfWeek(date))
    case 'period':
      return scheduledInPeriod(date, habit.periodDays, habit.targetCount, habit.startDate)
  }
}

export function formatHabitFrequency(habit: Pick<Habit, 'frequencyType' | 'targetCount' | 'periodDays' | 'weekdays'>): string {
  switch (habit.frequencyType) {
    case 'daily':
      return 'Dagelijks'
    case 'weekly':
      return `${habit.targetCount} ${habit.targetCount === 1 ? 'keer' : 'keer'} per week`
    case 'weekdays': {
      const labels = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
      return labels.filter((_, index) => habit.weekdays.includes(index + 1)).join(', ')
    }
    case 'period':
      return `${habit.targetCount}× per ${habit.periodDays} dagen`
  }
}

export function getFrequencyTypeLabel(type: HabitFrequencyType): string {
  return {
    daily: 'Dagelijks',
    weekly: 'Meerdere keren per week',
    weekdays: 'Specifieke weekdagen',
    period: 'Aantal keer per periode',
  }[type]
}

export type HabitDayStatus = 'completed' | 'not-completed' | 'not-recorded' | 'not-applicable'

export function getHabitDayStatus(habit: Habit, date: string, entry: HabitEntry | null): HabitDayStatus {
  if (entry) return entry.completed ? 'completed' : 'not-completed'
  return isHabitRelevantOnDate(habit, date) ? 'not-recorded' : 'not-applicable'
}

export function getDateRange(today: string, filter: '7' | '30' | '90' | 'all', startDate: string): { start: string; end: string } {
  if (filter === 'all') return { start: startDate > today ? today : startDate, end: today }
  const days = Number(filter)
  const end = new Date(`${today}T12:00:00`)
  const start = new Date(end)
  start.setDate(start.getDate() - days + 1)
  return { start: toDateKey(start), end: today }
}

export function getHabitFrequencyStats(entries: HabitEntry[], today: string, habitStartDate?: string, statusPeriods: HabitStatusPeriod[] = []): {
  thisWeek: number
  thisMonth: number
  averagePerWeek: number
  totalMinutes: number
} {
  const done = entries.filter((entry) => entry.completed)
  const currentDate = new Date(`${today}T12:00:00`)
  const monday = new Date(currentDate)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const monthStart = `${today.slice(0, 7)}-01`
  const firstTrackedDate = habitStartDate ?? done.reduce((value, entry) => entry.date < value ? entry.date : value, today)
  const activeDays = statusPeriods.length
    ? statusPeriods.reduce((total, period) => {
        if (period.status !== 'active') return total
        const start = habitStartDate && habitStartDate > period.startDate ? habitStartDate : period.startDate
        const end = period.endDate && period.endDate < today ? period.endDate : today
        return end < start ? total : total + dayOrdinal(end) - dayOrdinal(start) + 1
      }, 0)
    : today < firstTrackedDate ? 0 : dayOrdinal(today) - dayOrdinal(firstTrackedDate) + 1
  const elapsedWeeks = Math.max(1, Math.ceil(activeDays / 7))
  return {
    thisWeek: done.filter((entry) => entry.date >= toDateKey(monday) && entry.date <= today).length,
    thisMonth: done.filter((entry) => entry.date >= monthStart && entry.date <= today).length,
    averagePerWeek: activeDays ? Math.round((done.length / elapsedWeeks) * 10) / 10 : 0,
    totalMinutes: done.reduce((total, entry) => total + (entry.durationMinutes ?? 0), 0),
  }
}

export function createEmptyHabitDraft(today: string): HabitDraft {
  return {
    name: '',
    description: '',
    frequencyType: 'daily',
    targetCount: 1,
    periodDays: 1,
    weekdays: [],
    desiredDurationMinutes: null,
    startDate: today,
    endDate: '',
    pillarIds: [],
  }
}

export function draftFromHabit(habit: Habit): HabitDraft {
  return {
    name: habit.name,
    description: habit.description,
    frequencyType: habit.frequencyType,
    targetCount: habit.targetCount,
    periodDays: habit.periodDays,
    weekdays: [...habit.weekdays],
    desiredDurationMinutes: habit.desiredDurationMinutes,
    startDate: habit.startDate,
    endDate: habit.endDate ?? '',
    pillarIds: [...habit.pillarIds],
  }
}
