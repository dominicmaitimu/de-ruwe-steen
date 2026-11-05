export type GoalType = 'result' | 'development'
export type GoalStatus = 'active' | 'paused' | 'completed' | 'cancelled'

export interface GoalStep {
  id: number
  goalId: string
  title: string
  sortOrder: number
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface Goal {
  id: string
  title: string
  description: string
  type: GoalType
  status: GoalStatus
  startDate: string
  targetDate: string | null
  manualProgress: number
  progress: number
  pillars: string[]
  steps: GoalStep[]
  createdAt: string
  updatedAt: string
}

export interface GoalDraft {
  title: string
  description: string
  type: GoalType
  pillarIds: string[]
  startDate: string
  targetDate: string
  manualProgress: number
  initialSteps: string[]
}

export interface GoalStepDraft {
  title: string
  completed: boolean
}
