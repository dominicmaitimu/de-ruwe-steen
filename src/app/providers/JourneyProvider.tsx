import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase/client'
import {
  getCurrentDay,
  getJourneyProgress,
  normalizeStartedAt,
  readJourneySnapshot,
  writeJourneySnapshot,
  type Reflection,
  type JourneySnapshot,
} from '@/lib/journey-state'

type JourneyContextValue = JourneySnapshot & {
  currentDay: number
  progress: ReturnType<typeof getJourneyProgress>
  saveAnswer: (day: number, answer: string) => void
  saveReflection: (text: string) => void
  supabaseError: string | null
  completeDay: (day: number, answer?: string) => void
}

const JourneyContext = createContext<JourneyContextValue | undefined>(undefined)

function createReflectionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const randomValue = Math.floor(Math.random() * 16)
    const value = character === 'x' ? randomValue : (randomValue & 0x3) | 0x8
    return value.toString(16)
  })
}

export function JourneyProvider({ children }: PropsWithChildren) {
  const { user } = useAuth()
  const [snapshot, setSnapshot] = useState<JourneySnapshot>(() => readJourneySnapshot(user?.id))
  const [supabaseError, setSupabaseError] = useState<string | null>(null)

  useEffect(() => {
    const syncSnapshot = () => setSnapshot(readJourneySnapshot(user?.id))
    window.addEventListener('storage', syncSnapshot)
    window.addEventListener('journey-state-change', syncSnapshot)
    return () => {
      window.removeEventListener('storage', syncSnapshot)
      window.removeEventListener('journey-state-change', syncSnapshot)
    }
  }, [user?.id])

  useEffect(() => {
    const client = supabase
    if (!user || !client) return

    const loadRemoteSnapshot = async () => {
      const [progressResult, answersResult, reflectionsResult] = await Promise.all([
        client.from('journey_progress').select('completed_days').eq('user_id', user.id).maybeSingle(),
        client.from('answers').select('journey_day, answer').eq('user_id', user.id),
        client.from('reflections').select('id, text, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      if (progressResult.error || answersResult.error || reflectionsResult.error) {
        const error = progressResult.error ?? answersResult.error ?? reflectionsResult.error
        setSupabaseError(error?.message ?? 'Supabase kon de journeygegevens niet laden.')
        console.error('Journey data could not be loaded from Supabase.', {
          progress: progressResult.error,
          answers: answersResult.error,
          reflections: reflectionsResult.error,
        })
        return
      }

      const remoteAnswers = Object.fromEntries(
        (answersResult.data ?? []).map((row) => [row.journey_day, row.answer]),
      )
      const remoteSnapshot = {
        answers: remoteAnswers,
        completedDays: progressResult.data?.completed_days ?? [],
        reflections: (reflectionsResult.data ?? []).map((reflection) => ({
          id: reflection.id,
          text: reflection.text,
          createdAt: reflection.created_at,
        })),
      }

      setSnapshot(remoteSnapshot)
      setSupabaseError(null)
      writeJourneySnapshot(remoteSnapshot, user.id)
    }

    void loadRemoteSnapshot()
  }, [user])

  const saveAnswer = (day: number, answer: string) => {
    const nextSnapshot = {
      ...snapshot,
      startedAt: normalizeStartedAt({
        ...snapshot,
        answers: { ...snapshot.answers, [day]: answer },
      }),
      answers: { ...snapshot.answers, [day]: answer },
    }
    setSnapshot(nextSnapshot)
    writeJourneySnapshot(nextSnapshot, user?.id)
    if (user && supabase) {
      setSupabaseError(null)
      void supabase.from('answers').upsert(
        { user_id: user.id, journey_day: day, answer },
        { onConflict: 'user_id,journey_day' },
      ).then(({ error }) => {
        if (error) {
          setSupabaseError(error.message)
          console.error('Answer could not be saved to Supabase.', error)
        }
      })
    }
  }

  const saveReflection = (text: string) => {
    const reflection: Reflection = {
      id: createReflectionId(),
      text: text.trim(),
      createdAt: new Date().toISOString(),
    }
    if (!reflection.text) return

    const nextSnapshot = {
      ...snapshot,
      reflections: [reflection, ...snapshot.reflections],
    }
    setSnapshot(nextSnapshot)
    writeJourneySnapshot(nextSnapshot, user?.id)
    if (user && supabase) {
      setSupabaseError(null)
      void supabase.from('reflections').insert({
        id: reflection.id,
        user_id: user.id,
        text: reflection.text,
        created_at: reflection.createdAt,
      }).then(({ error }) => {
        if (error) {
          setSupabaseError(error.message)
          console.error('Reflection could not be saved to Supabase.', error)
        }
      })
    }
  }

  const completeDay = (day: number, answer = snapshot.answers[day] ?? '') => {
    if (!answer.trim()) return

    const nextSnapshot = {
      ...snapshot,
      startedAt: normalizeStartedAt({
        ...snapshot,
        answers: { ...snapshot.answers, [day]: answer },
      }),
      answers: { ...snapshot.answers, [day]: answer },
      completedDays: [...new Set([...snapshot.completedDays, day])].sort((first, second) => first - second),
    }
    setSnapshot(nextSnapshot)
    writeJourneySnapshot(nextSnapshot, user?.id)
    if (user && supabase) {
      void Promise.all([
        supabase.from('answers').upsert(
          { user_id: user.id, journey_day: day, answer },
          { onConflict: 'user_id,journey_day' },
        ),
        supabase.from('journey_progress').upsert({
          user_id: user.id,
          current_day: getCurrentDay(nextSnapshot.completedDays, nextSnapshot.startedAt),
          completed_days: nextSnapshot.completedDays,
          updated_at: new Date().toISOString(),
        }),
      ])
    }
  }

  return (
    <JourneyContext.Provider
      value={{
        ...snapshot,
        currentDay: getCurrentDay(snapshot.completedDays, snapshot.startedAt),
        progress: getJourneyProgress(snapshot.completedDays, snapshot.startedAt),
        saveAnswer,
        saveReflection,
        supabaseError,
        completeDay,
      }}
    >
      {children}
    </JourneyContext.Provider>
  )
}

export function useJourney() {
  const context = useContext(JourneyContext)
  if (!context) throw new Error('useJourney must be used within JourneyProvider')
  return context
}