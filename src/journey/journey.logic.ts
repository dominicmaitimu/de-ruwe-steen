import type { JourneySnapshot } from './journey.repository'

const DAY_IN_MS = 24 * 60 * 60 * 1000

export function getCurrentDay(startedAt: string): number {
  const parsedStart = new Date(startedAt)
  if (Number.isNaN(parsedStart.getTime())) throw new Error('De startdatum van de reflectiereis is ongeldig.')
  parsedStart.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const elapsedDays = Math.floor((today.getTime() - parsedStart.getTime()) / DAY_IN_MS)
  return Math.min(Math.max(elapsedDays + 1, 1), 365)
}

export function getJourneyProgress(snapshot: JourneySnapshot) {
  const completedCount = snapshot.completedDays.length
  return {
    completedCount,
    currentDay: getCurrentDay(snapshot.startedAt),
    percentage: Math.round((completedCount / 365) * 10000) / 100,
    week: Math.min(Math.floor(completedCount / 7) + 1, 52),
  }
}
