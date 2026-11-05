import type { CheckIn, CheckInDraft, CheckInScoreField, DailyCheckInPoint } from './check-in.types'

export const dailyQuestions = [
  'Wat heb je vandaag gedaan omdat je het zelf wilde?',
  'Wat gaf je vandaag energie?',
  'Waar ben je vandaag tevreden over?',
  'Heb je voldoende aandacht aan jezelf besteed?',
  'Wat zou je morgen anders willen doen?',
] as const

export const scoreFields: CheckInScoreField[] = ['mood', 'energy', 'mentalCalm', 'satisfaction']

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getGreeting(hour: number): string {
  if (hour < 12) {
    return 'Goedemorgen'
  }
  if (hour < 18) {
    return 'Goedemiddag'
  }
  return 'Goedenavond'
}

export function getDailyQuestion(date: Date): string {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
  return dailyQuestions[dayNumber % dailyQuestions.length]
}

export function isCheckInDraftValid(draft: CheckInDraft): boolean {
  const hasDateFormat = /^\d{4}-\d{2}-\d{2}$/.test(draft.date)
  const [year, month, day] = draft.date.split('-').map(Number)
  const dateObject = new Date(year, month - 1, day)
  const dateIsReal = hasDateFormat && !Number.isNaN(dateObject.getTime()) && toDateKey(dateObject) === draft.date

  return (
    hasDateFormat &&
    dateIsReal &&
    scoreFields.every((field) => Number.isInteger(draft[field]) && draft[field] >= 1 && draft[field] <= 10) &&
    typeof draft.didSomethingForSelf === 'boolean' &&
    draft.reflection.length <= 2000
  )
}

export function createDailySeries(
  endDate: Date,
  period: 7 | 30,
  checkIns: CheckIn[],
): DailyCheckInPoint[] {
  const localEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  const byDate = new Map(checkIns.map((checkIn) => [checkIn.date, checkIn]))

  return Array.from({ length: period }, (_, index) => {
    const date = new Date(localEnd)
    date.setDate(localEnd.getDate() - (period - index - 1))
    const dateKey = toDateKey(date)

    return { date: dateKey, checkIn: byDate.get(dateKey) ?? null }
  })
}

export interface ChartPoint {
  date: string
  value: number
  x: number
  y: number
}

export function createLineSegments(
  points: DailyCheckInPoint[],
  field: CheckInScoreField,
): ChartPoint[][] {
  const segments: ChartPoint[][] = []
  let segment: ChartPoint[] = []

  points.forEach((point, index) => {
    const checkIn = point.checkIn
    if (!checkIn) {
      if (segment.length) segments.push(segment)
      segment = []
      return
    }

    segment.push({
      date: point.date,
      value: checkIn[field],
      x: points.length <= 1 ? 150 : 10 + (index / (points.length - 1)) * 280,
      y: 110 - ((checkIn[field] - 1) / 9) * 100,
    })
  })

  if (segment.length) segments.push(segment)
  return segments
}
