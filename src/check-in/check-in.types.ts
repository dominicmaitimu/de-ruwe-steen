export type CheckInScore = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
export type CheckInScoreField = 'mood' | 'energy' | 'mentalCalm' | 'satisfaction'

export interface CheckIn {
  id: number
  date: string
  mood: CheckInScore
  energy: CheckInScore
  mentalCalm: CheckInScore
  satisfaction: CheckInScore
  didSomethingForSelf: boolean
  reflection: string | null
  createdAt: string
  updatedAt: string
}

export interface CheckInDraft {
  date: string
  mood: number
  energy: number
  mentalCalm: number
  satisfaction: number
  didSomethingForSelf: boolean | null
  reflection: string
}

export interface Pillar {
  id: string
  name: string
  color: string
  icon: string
  sortOrder: number
}

export interface DailyCheckInPoint {
  date: string
  checkIn: CheckIn | null
}
