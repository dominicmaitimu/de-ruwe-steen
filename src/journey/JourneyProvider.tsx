import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { getCurrentDay, getJourneyProgress } from './journey.logic'
import { journeyRepository } from './journey.repository'
import { JourneyContext } from './journey.context'
import type { JourneySnapshot } from './journey.repository'

export function JourneyProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<JourneySnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const loaded = await journeyRepository.load()
      setSnapshot(loaded)
      setError(null)
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason)
      setError(message)
      throw reason
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void journeyRepository.load().then((loaded) => {
      if (!active) return
      setSnapshot(loaded)
      setLoading(false)
    }).catch((reason: unknown) => {
      if (!active) return
      setError(reason instanceof Error ? reason.message : String(reason))
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const saveAnswer = useCallback(async (day: number, answer: string) => {
    await journeyRepository.saveAnswer(day, answer)
    setSnapshot(await journeyRepository.load())
  }, [])

  const saveReflection = useCallback(async (text: string) => {
    await journeyRepository.saveReflection(text)
    setSnapshot(await journeyRepository.load())
  }, [])

  const value = useMemo(() => {
    if (!snapshot) return undefined
    return {
      ...snapshot,
      currentDay: getCurrentDay(snapshot.startedAt),
      progress: getJourneyProgress(snapshot),
      refresh,
      saveAnswer,
      saveReflection,
    }
  }, [refresh, saveAnswer, saveReflection, snapshot])

  if (loading) {
    return <p className="p-8 text-[var(--text-subtle)]" role="status">Je reflectiereis wordt geladen…</p>
  }
  if (error || !value) {
    return (
      <section className="mx-auto mt-8 max-w-xl rounded-2xl border border-red-400/40 bg-red-400/10 p-6 text-red-100" role="alert">
        <h1 className="font-serif text-2xl">Je reisgegevens konden niet worden geladen</h1>
        <p className="mt-2 text-sm">{error ?? 'De lokale database gaf geen reisgegevens terug.'}</p>
        <button type="button" className="mt-4 rounded-lg border border-red-200/50 px-4 py-2" onClick={() => {
          setLoading(true)
          setError(null)
          void refresh().catch(() => undefined)
        }}>
          Opnieuw proberen
        </button>
      </section>
    )
  }

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>
}
