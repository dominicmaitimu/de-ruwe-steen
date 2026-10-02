export type JourneySnapshot = {
  answers: Record<number, string>
  completedDays: number[]
  reflections: Reflection[]
  startedAt?: string | null
}

export type Reflection = {
  id: string
  text: string
  createdAt: string
}

const storageKey = 'de-ruwe-steen:journey'
const DAY_IN_MS = 24 * 60 * 60 * 1000

const emptySnapshot: JourneySnapshot = {
  answers: {},
  completedDays: [],
  reflections: [],
  startedAt: null,
}

function isSnapshot(value: unknown): value is JourneySnapshot {
  if (!value || typeof value !== 'object') return false

  const snapshot = value as Partial<JourneySnapshot>
  return Boolean(snapshot.answers && Array.isArray(snapshot.completedDays))
}

export function normalizeStartedAt(snapshot: JourneySnapshot): string {
  if (snapshot.startedAt && snapshot.startedAt.trim().length > 0) {
    return snapshot.startedAt
  }

  const answerDays = Object.keys(snapshot.answers)
    .map((day) => Number(day))
    .filter((day) => Number.isFinite(day) && day > 0)
    .sort((first, second) => first - second)

  if (answerDays.length > 0) {
    const firstAnswerDay = answerDays[0]
    const firstStart = new Date()
    firstStart.setHours(0, 0, 0, 0)
    firstStart.setDate(firstStart.getDate() - (firstAnswerDay - 1))
    return firstStart.toISOString()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
}

export function readJourneySnapshot(userId?: string): JourneySnapshot {
  const stored = localStorage.getItem(userId ? `${storageKey}:${userId}` : storageKey)
  if (!stored) return { ...emptySnapshot, startedAt: normalizeStartedAt(emptySnapshot) }

  try {
    const parsed: unknown = JSON.parse(stored)
    if (!isSnapshot(parsed)) return { ...emptySnapshot, startedAt: normalizeStartedAt(emptySnapshot) }

    return {
      ...parsed,
      answers: parsed.answers ?? {},
      completedDays: parsed.completedDays ?? [],
      reflections: parsed.reflections ?? [],
      startedAt: normalizeStartedAt({
        answers: parsed.answers ?? {},
        completedDays: parsed.completedDays ?? [],
        reflections: parsed.reflections ?? [],
        startedAt: parsed.startedAt ?? null,
      }),
    }
  } catch {
    return { ...emptySnapshot, startedAt: normalizeStartedAt(emptySnapshot) }
  }
}

export function writeJourneySnapshot(snapshot: JourneySnapshot, userId?: string) {
  const normalizedSnapshot: JourneySnapshot = {
    ...snapshot,
    startedAt: normalizeStartedAt(snapshot),
    completedDays: [...new Set(snapshot.completedDays)].sort((first, second) => first - second),
  }

  localStorage.setItem(userId ? `${storageKey}:${userId}` : storageKey, JSON.stringify(normalizedSnapshot))
  window.dispatchEvent(new Event('journey-state-change'))
}

export function getCurrentDay(_completedDays: number[], startedAt?: string | null) {
  const startDate = startedAt ? new Date(startedAt) : new Date()
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diffInDays = Math.floor((today.getTime() - start.getTime()) / DAY_IN_MS)
  return Math.min(Math.max(diffInDays + 1, 1), 365)
}

export function getJourneyProgress(completedDays: number[], startedAt?: string | null) {
  const completedCount = completedDays.length
  return {
    completedCount,
    currentDay: getCurrentDay(completedDays, startedAt),
    percentage: Math.round((completedCount / 365) * 10000) / 100,
    week: Math.min(Math.floor(completedCount / 7) + 1, 52),
  }
}