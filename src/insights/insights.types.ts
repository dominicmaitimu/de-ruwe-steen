import type { Pillar } from '../check-in/check-in.types'
import type { GoalStatus, GoalType } from '../goals/goal.types'
import type { Habit, HabitEntry, HabitStatusPeriod } from '../habits/habit.types'
import type { ReflectionType } from '../reflections/reflection.types'

export type InsightsPeriod = '7' | '30' | '90' | '12m' | 'all'
export type InsightMetric = 'mood' | 'energy' | 'mentalCalm' | 'satisfaction'

export interface InsightCheckIn {
  date: string
  mood: number
  energy: number
  mentalCalm: number
  satisfaction: number
}

export interface InsightGoal {
  id: string
  title: string
  type: GoalType
  status: GoalStatus
  manualProgress: number
  progress: number
  createdAt: string
  updatedAt: string
  pillarIds: string[]
  stepCount: number
  completedStepCount: number
}

export interface InsightActivity {
  id: string
  date: string
  durationMinutes: number | null
  pillarIds: string[]
}

export interface InsightReflection {
  id: string
  title: string
  date: string
  type: ReflectionType
  pillarIds: string[]
}

export interface InsightsSnapshot {
  pillars: Pillar[]
  checkIns: InsightCheckIn[]
  habits: Habit[]
  habitEntries: HabitEntry[]
  goals: InsightGoal[]
  activities: InsightActivity[]
  reflections: InsightReflection[]
  statusPeriodsByHabit: Map<string, HabitStatusPeriod[]>
}
