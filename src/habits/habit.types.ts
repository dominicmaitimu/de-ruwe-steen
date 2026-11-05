export type HabitStatus = 'active' | 'paused' | 'ended'
export type HabitFrequencyType = 'daily' | 'weekly' | 'weekdays' | 'period'

export interface Habit {
  id: string
  name: string
  description: string
  frequencyType: HabitFrequencyType
  targetCount: number
  periodDays: number
  weekdays: number[]
  desiredDurationMinutes: number | null
  startDate: string
  endDate: string | null
  status: HabitStatus
  pillarIds: string[]
  statusPeriods: HabitStatusPeriod[]
  createdAt: string
  updatedAt: string
}

export interface HabitStatusPeriod {
  status: HabitStatus
  startDate: string
  endDate: string | null
}

export interface HabitDraft {
  name: string
  description: string
  frequencyType: HabitFrequencyType
  targetCount: number
  periodDays: number
  weekdays: number[]
  desiredDurationMinutes: number | null
  startDate: string
  endDate: string
  pillarIds: string[]
}

export interface HabitEntry {
  id: number
  habitId: string
  date: string
  completed: boolean
  durationMinutes: number | null
  note: string
  createdAt: string
  updatedAt: string
}

export interface HabitEntryDraft {
  completed: boolean
  durationMinutes: number | null
  note: string
}

export interface HabitForDate {
  habit: Habit
  entry: HabitEntry | null
}
