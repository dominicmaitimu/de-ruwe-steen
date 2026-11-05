import { toDateKey } from '../check-in/check-in.logic'
import type { Activity, ActivityDraft, ActivityPeriod } from './activity.types'
import { formatDateDisplay } from '../utils/format-date'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isActivityDateValid(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) && toDateKey(date) === value
}

export function isActivityDraftValid(draft: ActivityDraft): boolean {
  return Boolean(
    draft.title.trim()
    && draft.title.trim().length <= 120
    && draft.description.length <= 2000
    && isActivityDateValid(draft.date)
    && (draft.durationMinutes === null || (Number.isInteger(draft.durationMinutes) && draft.durationMinutes >= 1 && draft.durationMinutes <= 1440))
    && (draft.rating === null || (Number.isInteger(draft.rating) && draft.rating >= 1 && draft.rating <= 5))
    && draft.note.length <= 5000
    && new Set(draft.pillarIds).size === draft.pillarIds.length
  )
}

export function getActivityDateRange(period: ActivityPeriod, today: string): { start: string | null; end: string } {
  if (period === 'all') return { start: null, end: today }
  const endDate = new Date(`${today}T12:00:00`)
  endDate.setDate(endDate.getDate() - Number(period) + 1)
  return { start: toDateKey(endDate), end: today }
}

export function filterActivities(
  activities: Activity[],
  options: { period: ActivityPeriod; today: string; pillarId: string; search: string; direction: 'newest' | 'oldest' },
): Activity[] {
  const range = getActivityDateRange(options.period, options.today)
  const search = options.search.trim().toLocaleLowerCase()
  return activities.filter((activity) =>
    (!range.start || activity.date >= range.start)
    && activity.date <= range.end
    && (!options.pillarId || activity.pillarIds.includes(options.pillarId))
    && (!search || `${activity.title} ${activity.description} ${activity.note}`.toLocaleLowerCase().includes(search)))
    .sort((a, b) => options.direction === 'newest'
      ? b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
      : a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
}

export function getActivityStats(activities: Activity[]): { count: number; totalMinutes: number; byPillar: Map<string, number> } {
  const byPillar = new Map<string, number>()
  for (const activity of activities) {
    for (const pillarId of activity.pillarIds) {
      byPillar.set(pillarId, (byPillar.get(pillarId) ?? 0) + 1)
    }
  }
  return {
    count: activities.length,
    totalMinutes: activities.reduce((total, activity) => total + (activity.durationMinutes ?? 0), 0),
    byPillar,
  }
}

export function createActivityDraft(today: string): ActivityDraft {
  return { title: '', description: '', date: today, durationMinutes: null, rating: null, note: '', pillarIds: [] }
}

export function draftFromActivity(activity: Activity): ActivityDraft {
  return { ...activity, pillarIds: [...activity.pillarIds] }
}

export function formatActivityDuration(minutes: number | null): string {
  if (minutes === null) return 'Geen duur opgegeven'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `${hours} uur ${remaining} min` : `${hours} uur`
}

export function formatActivityDate(value: string): string {
  return formatDateDisplay(new Date(`${value}T12:00:00`), { day: 'numeric', month: 'short' })
}
