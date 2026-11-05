import { createContext, useContext } from 'react'
import type { JourneySnapshot } from './journey.repository'
import type { getJourneyProgress } from './journey.logic'

export type JourneyContextValue = JourneySnapshot & {
  currentDay: number
  progress: ReturnType<typeof getJourneyProgress>
  refresh: () => Promise<void>
  saveAnswer: (day: number, answer: string) => Promise<void>
  saveReflection: (text: string) => Promise<void>
}

export const JourneyContext = createContext<JourneyContextValue | undefined>(undefined)

export function useJourney() {
  const context = useContext(JourneyContext)
  if (!context) throw new Error('useJourney must be used within JourneyProvider')
  return context
}
