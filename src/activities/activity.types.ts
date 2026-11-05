export interface Activity {
  id: string
  title: string
  description: string
  date: string
  durationMinutes: number | null
  rating: number | null
  note: string
  pillarIds: string[]
  createdAt: string
  updatedAt: string
}

export interface ActivityDraft {
  title: string
  description: string
  date: string
  durationMinutes: number | null
  rating: number | null
  note: string
  pillarIds: string[]
}

export type ActivityPeriod = '7' | '30' | '90' | 'all'
