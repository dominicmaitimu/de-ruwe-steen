import type { Pillar } from '../check-in/check-in.types'
import type { GoalStatus, GoalType } from '../goals/goal.types'
import type { Habit, HabitEntry, HabitFrequencyType, HabitStatus, HabitStatusPeriod } from '../habits/habit.types'
import type { ReflectionType } from '../reflections/reflection.types'
import { DATABASE_NAME } from '../services/database.service'
import { sqliteQuery } from '../services/sqlite'
import type { InsightActivity, InsightCheckIn, InsightGoal, InsightReflection, InsightsSnapshot } from './insights.types'

type Row = Record<string, unknown>

function row(value: unknown): Row {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Database returned an invalid insights row')
  return value as Row
}

function string(value: Row, key: string): string {
  const result = value[key]
  if (typeof result !== 'string') throw new Error(`Database returned an invalid insights ${key}`)
  return result
}

function numeric(value: Row, key: string): number {
  const result = Number(value[key])
  if (!Number.isFinite(result)) throw new Error(`Database returned an invalid insights ${key}`)
  return result
}

function nullableNumeric(value: Row, key: string): number | null {
  return value[key] === null || value[key] === undefined ? null : numeric(value, key)
}

async function query(statement: string, values: (string | null)[] = []) {
  const result = await sqliteQuery({ database: DATABASE_NAME, statement, values })
  return result.values ?? []
}

function dateClause(column: string, startDate: string | null, endDate: string): { sql: string; values: string[] } {
  if (!startDate) return { sql: `${column} <= ?`, values: [endDate] }
  return { sql: `${column} >= ? AND ${column} <= ?`, values: [startDate, endDate] }
}

function collectPillars(rows: unknown[], key: string, valueKey: string): Map<string, string[]> {
  const result = new Map<string, string[]>()
  for (const item of rows) {
    const itemRow = row(item)
    const id = string(itemRow, key)
    result.set(id, [...(result.get(id) ?? []), string(itemRow, valueKey)])
  }
  return result
}

function parsePillar(value: unknown): Pillar {
  const item = row(value)
  return {
    id: string(item, 'id'),
    name: string(item, 'name'),
    color: string(item, 'color'),
    icon: string(item, 'icon'),
    sortOrder: numeric(item, 'sort_order'),
  }
}

function parseHabit(value: unknown, pillarIds: string[], statusPeriods: HabitStatusPeriod[]): Habit {
  const item = row(value)
  const duration = item.desired_duration_minutes
  const endDate = item.end_date
  const weekdays = string(item, 'weekdays')
  return {
    id: string(item, 'id'),
    name: string(item, 'name'),
    description: '',
    frequencyType: string(item, 'frequency_type') as HabitFrequencyType,
    targetCount: numeric(item, 'target_count'),
    periodDays: numeric(item, 'period_days'),
    weekdays: weekdays ? weekdays.split(',').map(Number) : [],
    desiredDurationMinutes: duration === null || duration === undefined ? null : numeric(item, 'desired_duration_minutes'),
    startDate: string(item, 'start_date'),
    endDate: typeof endDate === 'string' ? endDate : null,
    status: string(item, 'status') as HabitStatus,
    pillarIds,
    statusPeriods,
    createdAt: string(item, 'created_at'),
    updatedAt: string(item, 'updated_at'),
  }
}

function parseEntry(value: unknown): HabitEntry {
  const item = row(value)
  return {
    id: numeric(item, 'id'),
    habitId: string(item, 'habit_id'),
    date: string(item, 'entry_date'),
    completed: numeric(item, 'completed') === 1,
    durationMinutes: nullableNumeric(item, 'duration_minutes'),
    note: '',
    createdAt: string(item, 'created_at'),
    updatedAt: string(item, 'updated_at'),
  }
}

export const insightsRepository = {
  async loadSnapshot(startDate: string | null, endDate: string): Promise<InsightsSnapshot> {
    const checkInDate = dateClause('check_in_date', startDate, endDate)
    const entryDate = dateClause('entry_date', startDate, endDate)
    const activityDate = dateClause('activity_date', startDate, endDate)
    const reflectionDate = dateClause('reflection_date', startDate, endDate)
    const [
      pillarRows,
      checkInRows,
      habitRows,
      habitEntryRows,
      statusRows,
      habitPillarRows,
      goalRows,
      goalStepRows,
      goalPillarRows,
      activityRows,
      activityPillarRows,
      reflectionRows,
      reflectionPillarRows,
    ] = await Promise.all([
      query('SELECT id, name, color, icon, sort_order FROM pillars ORDER BY sort_order'),
      query(`SELECT check_in_date, mood, energy, mental_calm, satisfaction FROM daily_check_ins WHERE ${checkInDate.sql} ORDER BY check_in_date`, checkInDate.values),
      query(`SELECT id, name, frequency_type, target_count, period_days, weekdays, desired_duration_minutes, start_date, end_date, status, created_at, updated_at FROM habits WHERE start_date <= ? ORDER BY name COLLATE NOCASE`, [endDate]),
      query(`SELECT id, habit_id, entry_date, completed, duration_minutes, created_at, updated_at FROM habit_entries WHERE ${entryDate.sql} ORDER BY entry_date`, entryDate.values),
      query('SELECT habit_id, status, starts_on, ends_on FROM habit_status_periods ORDER BY starts_on'),
      query('SELECT habit_id, pillar_id FROM habit_pillars'),
      query('SELECT id, title, goal_type, status, manual_progress, created_at, updated_at FROM goals ORDER BY created_at DESC'),
      query('SELECT goal_id, completed FROM goal_steps'),
      query('SELECT goal_id, pillar_id FROM goal_pillars'),
      query(`SELECT id, activity_date, duration_minutes FROM activities WHERE ${activityDate.sql} ORDER BY activity_date DESC`, activityDate.values),
      query('SELECT activity_id, pillar_id FROM activity_pillars'),
      query(`SELECT id, title, reflection_date, reflection_type FROM reflections WHERE ${reflectionDate.sql} ORDER BY reflection_date DESC`, reflectionDate.values),
      query('SELECT reflection_id, pillar_id FROM reflection_pillars'),
    ])

    const habitPillars = collectPillars(habitPillarRows, 'habit_id', 'pillar_id')
    const goalPillars = collectPillars(goalPillarRows, 'goal_id', 'pillar_id')
    const activityPillars = collectPillars(activityPillarRows, 'activity_id', 'pillar_id')
    const reflectionPillars = collectPillars(reflectionPillarRows, 'reflection_id', 'pillar_id')
    const statuses = new Map<string, HabitStatusPeriod[]>()
    for (const item of statusRows) {
      const status = row(item)
      const id = string(status, 'habit_id')
      statuses.set(id, [...(statuses.get(id) ?? []), {
        status: string(status, 'status') as HabitStatus,
        startDate: string(status, 'starts_on'),
        endDate: typeof status.ends_on === 'string' ? status.ends_on : null,
      }])
    }

    const stepStats = new Map<string, { count: number; completed: number }>()
    for (const item of goalStepRows) {
      const step = row(item)
      const id = string(step, 'goal_id')
      const current = stepStats.get(id) ?? { count: 0, completed: 0 }
      current.count += 1
      if (numeric(step, 'completed') === 1) current.completed += 1
      stepStats.set(id, current)
    }

    const goals: InsightGoal[] = goalRows.map((item) => {
      const goal = row(item)
      const id = string(goal, 'id')
      const stepStatsForGoal = stepStats.get(id) ?? { count: 0, completed: 0 }
      const manualProgress = numeric(goal, 'manual_progress')
      return {
        id,
        title: string(goal, 'title'),
        type: string(goal, 'goal_type') as GoalType,
        status: string(goal, 'status') as GoalStatus,
        manualProgress,
        progress: stepStatsForGoal.count
          ? Math.round((stepStatsForGoal.completed / stepStatsForGoal.count) * 100)
          : manualProgress,
        createdAt: string(goal, 'created_at'),
        updatedAt: string(goal, 'updated_at'),
        pillarIds: goalPillars.get(id) ?? [],
        stepCount: stepStatsForGoal.count,
        completedStepCount: stepStatsForGoal.completed,
      }
    })

    return {
      pillars: pillarRows.map(parsePillar),
      checkIns: checkInRows.map((item): InsightCheckIn => {
        const checkIn = row(item)
        return {
          date: string(checkIn, 'check_in_date'),
          mood: numeric(checkIn, 'mood'),
          energy: numeric(checkIn, 'energy'),
          mentalCalm: numeric(checkIn, 'mental_calm'),
          satisfaction: numeric(checkIn, 'satisfaction'),
        }
      }),
      habits: habitRows.map((item) => {
        const habit = row(item)
        const id = string(habit, 'id')
        return parseHabit(item, habitPillars.get(id) ?? [], statuses.get(id) ?? [])
      }),
      habitEntries: habitEntryRows.map(parseEntry),
      goals,
      activities: activityRows.map((item): InsightActivity => {
        const activity = row(item)
        const id = string(activity, 'id')
        return { id, date: string(activity, 'activity_date'), durationMinutes: nullableNumeric(activity, 'duration_minutes'), pillarIds: activityPillars.get(id) ?? [] }
      }),
      reflections: reflectionRows.map((item): InsightReflection => {
        const reflection = row(item)
        const id = string(reflection, 'id')
        return {
          id,
          title: string(reflection, 'title'),
          date: string(reflection, 'reflection_date'),
          type: string(reflection, 'reflection_type') as ReflectionType,
          pillarIds: reflectionPillars.get(id) ?? [],
        }
      }),
      statusPeriodsByHabit: statuses,
    }
  },
}
