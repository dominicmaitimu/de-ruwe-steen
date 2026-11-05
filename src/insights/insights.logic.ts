import { isHabitRelevantOnDate } from '../habits/habit.logic'
import type { Habit } from '../habits/habit.types'
import type { InsightMetric, InsightsPeriod, InsightsSnapshot } from './insights.types'
import { formatDateDisplay } from '../utils/format-date'

export interface DateRange {
  start: string
  end: string
}

export interface InsightBucket {
  key: string
  label: string
  activities: number
  habitRegistrations: number
  reflections: number
  checkIns: number
}

export interface HabitInsight {
  habit: Habit
  completed: number
  notCompleted: number
  notRecorded: number
  notApplicable: number
  activeDays: number
  averagePerWeek: number | null
  totalMinutes: number
}

export const insightMeasures: { key: InsightMetric; label: string; color: string }[] = [
  { key: 'mood', label: 'Stemming', color: '#80956c' },
  { key: 'energy', label: 'Energie', color: '#738fa1' },
  { key: 'mentalCalm', label: 'Mentale rust', color: '#b28b5b' },
  { key: 'satisfaction', label: 'Tevredenheid', color: '#a27aa2' },
]

export const insightPeriodLabels: Record<InsightsPeriod, string> = {
  '7': 'Laatste 7 dagen',
  '30': 'Laatste 30 dagen',
  '90': 'Laatste 90 dagen',
  '12m': 'Laatste 12 maanden',
  all: 'Alles',
}

const DAY_MS = 86_400_000

export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return localDateKey(value)
}

function localDateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

export function daysBetween(start: string, end: string): number {
  const [startYear, startMonth, startDay] = start.split('-').map(Number)
  const [endYear, endMonth, endDay] = end.split('-').map(Number)
  return Math.floor((Date.UTC(endYear, endMonth - 1, endDay) - Date.UTC(startYear, startMonth - 1, startDay)) / DAY_MS) + 1
}

export function getPeriodDays(period: InsightsPeriod): number | null {
  if (period === 'all') return null
  if (period === '12m') return 365
  return Number(period)
}

export function getPeriodRange(period: InsightsPeriod, today: string, snapshot?: InsightsSnapshot): DateRange {
  if (period !== 'all') return { start: shiftDate(today, -(getPeriodDays(period) ?? 1) + 1), end: today }
  const dates = [
    ...(snapshot?.checkIns.map((item) => item.date) ?? []),
    ...(snapshot?.habitEntries.map((item) => item.date) ?? []),
    ...(snapshot?.activities.map((item) => item.date) ?? []),
    ...(snapshot?.reflections.map((item) => item.date) ?? []),
    ...(snapshot?.habits.map((item) => item.startDate) ?? []),
    ...(snapshot?.goals.map((item) => item.createdAt.slice(0, 10)) ?? []),
  ].filter((date) => date <= today)
  return { start: dates.sort()[0] ?? today, end: today }
}

export function getPreviousRange(current: DateRange): DateRange {
  const length = daysBetween(current.start, current.end)
  const end = shiftDate(current.start, -1)
  return { start: shiftDate(end, -length + 1), end }
}

export function isInRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end
}

export function averageCheckInScore(
  checkIns: InsightsSnapshot['checkIns'],
  metric: InsightMetric,
  range: DateRange,
): number | null {
  const values = checkIns.filter((item) => isInRange(item.date, range)).map((item) => item[metric])
  if (!values.length) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

function activeOnDate(habit: Habit, date: string): boolean {
  if (date < habit.startDate || (habit.endDate && date > habit.endDate)) return false
  if (!habit.statusPeriods.length) return habit.status === 'active'
  return habit.statusPeriods.some((period) =>
    period.status === 'active' && date >= period.startDate && (!period.endDate || date <= period.endDate))
}

export function getHabitInsights(snapshot: InsightsSnapshot, range: DateRange): HabitInsight[] {
  const entriesByHabit = new Map<string, Map<string, (typeof snapshot.habitEntries)[number]>>()
  for (const entry of snapshot.habitEntries) {
    const byDate = entriesByHabit.get(entry.habitId) ?? new Map()
    byDate.set(entry.date, entry)
    entriesByHabit.set(entry.habitId, byDate)
  }
  const numberOfDays = daysBetween(range.start, range.end)
  const results: HabitInsight[] = []
  for (const habit of snapshot.habits) {
    let completed = 0
    let notCompleted = 0
    let notRecorded = 0
    let notApplicable = 0
    let activeDays = 0
    let totalMinutes = 0
    const entries = entriesByHabit.get(habit.id) ?? new Map()
    for (let offset = 0; offset < numberOfDays; offset += 1) {
      const date = shiftDate(range.start, offset)
      const entry = entries.get(date)
      if (activeOnDate(habit, date)) {
        activeDays += 1
        if (entry) {
          if (entry.completed) {
            completed += 1
            totalMinutes += entry.durationMinutes ?? 0
          } else {
            notCompleted += 1
          }
        } else if (isHabitRelevantOnDate(habit, date)) {
          notRecorded += 1
        } else {
          notApplicable += 1
        }
      } else if (entry?.completed) {
        completed += 1
        totalMinutes += entry.durationMinutes ?? 0
      } else if (entry) {
        notCompleted += 1
      } else {
        notApplicable += 1
      }
    }
    results.push({
      habit,
      completed,
      notCompleted,
      notRecorded,
      notApplicable,
      activeDays,
      averagePerWeek: activeDays ? Math.round((completed / (activeDays / 7)) * 10) / 10 : null,
      totalMinutes,
    })
  }
  return results
}

function bucketStart(date: string, days: number, anchor: string): string {
  const offset = daysBetween(anchor, date) - 1
  return shiftDate(anchor, Math.floor(offset / days) * days)
}

function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`
}

export function getTimelineBuckets(snapshot: InsightsSnapshot, range: DateRange, period: InsightsPeriod): InsightBucket[] {
  const groupByMonth = period === '12m' || period === 'all'
  const groupDays = period === '90' ? 7 : 1
  const keys: string[] = []
  if (groupByMonth) {
    const start = new Date(`${monthStart(range.start)}T12:00:00`)
    const end = new Date(`${monthStart(range.end)}T12:00:00`)
    while (start <= end) {
      keys.push(localDateKey(start))
      start.setMonth(start.getMonth() + 1)
    }
  } else {
    for (let date = range.start; date <= range.end;) {
      keys.push(groupDays > 1 ? bucketStart(date, groupDays, range.start) : date)
      date = shiftDate(date, groupDays)
    }
  }
  const buckets = new Map(keys.map((key) => [key, { key, label: '', activities: 0, habitRegistrations: 0, reflections: 0, checkIns: 0 } satisfies InsightBucket]))
  const keyForDate = (date: string) => groupByMonth ? monthStart(date) : groupDays > 1 ? bucketStart(date, groupDays, range.start) : date
  for (const activity of snapshot.activities) {
    const bucket = buckets.get(keyForDate(activity.date))
    if (bucket) bucket.activities += 1
  }
  for (const entry of snapshot.habitEntries) {
    const bucket = buckets.get(keyForDate(entry.date))
    if (bucket) bucket.habitRegistrations += 1
  }
  for (const reflection of snapshot.reflections) {
    const bucket = buckets.get(keyForDate(reflection.date))
    if (bucket) bucket.reflections += 1
  }
  for (const checkIn of snapshot.checkIns) {
    const bucket = buckets.get(keyForDate(checkIn.date))
    if (bucket) bucket.checkIns += 1
  }
  return [...buckets.values()].map((bucket) => ({
    ...bucket,
    label: formatDateDisplay(new Date(`${bucket.key}T12:00:00`), groupByMonth ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' }),
  }))
}

export function getMetricChange(
  snapshot: InsightsSnapshot,
  metric: InsightMetric,
  current: DateRange,
  previous: DateRange | null,
): { currentAverage: number | null; previousAverage: number | null; currentCount: number; previousCount: number } {
  const currentCheckIns = snapshot.checkIns.filter((item) => isInRange(item.date, current))
  const previousCheckIns = previous ? snapshot.checkIns.filter((item) => isInRange(item.date, previous)) : []
  return {
    currentAverage: averageCheckInScore(snapshot.checkIns, metric, current),
    previousAverage: previous ? averageCheckInScore(snapshot.checkIns, metric, previous) : null,
    currentCount: currentCheckIns.length,
    previousCount: previousCheckIns.length,
  }
}

export function getActivityEnergyPattern(snapshot: InsightsSnapshot, range: DateRange): {
  withActivity: { average: number; checkIns: number; days: number }
  withoutActivity: { average: number; checkIns: number; days: number }
} | null {
  const activityDates = new Set(snapshot.activities.filter((item) => isInRange(item.date, range)).map((item) => item.date))
  const withActivity: number[] = []
  const withoutActivity: number[] = []
  const withDates = new Set<string>()
  const withoutDates = new Set<string>()
  for (const checkIn of snapshot.checkIns) {
    if (!isInRange(checkIn.date, range)) continue
    if (activityDates.has(checkIn.date)) {
      withActivity.push(checkIn.energy)
      withDates.add(checkIn.date)
    } else {
      withoutActivity.push(checkIn.energy)
      withoutDates.add(checkIn.date)
    }
  }
  if (withActivity.length < 3 || withoutActivity.length < 3) return null
  const avg = (values: number[]) => Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
  return {
    withActivity: { average: avg(withActivity), checkIns: withActivity.length, days: withDates.size },
    withoutActivity: { average: avg(withoutActivity), checkIns: withoutActivity.length, days: withoutDates.size },
  }
}

export function formatAbsoluteDifference(value: number, suffix = ''): string {
  const rounded = Math.round(value * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}${suffix}`
}
