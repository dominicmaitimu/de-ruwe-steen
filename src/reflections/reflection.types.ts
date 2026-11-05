export type ReflectionType = 'journal' | 'daily' | 'weekly' | 'monthly'

export interface Reflection {
  id: string
  title: string
  content: string
  date: string
  type: ReflectionType
  pillarIds: string[]
  createdAt: string
  updatedAt: string
}

export interface ReflectionDraft {
  title: string
  content: string
  date: string
  type: ReflectionType
  pillarIds: string[]
}

export type ReflectionPeriod = '7' | '30' | '90' | 'all'
