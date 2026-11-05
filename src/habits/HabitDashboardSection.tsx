import { useEffect, useState } from 'react'
import { formatHabitFrequency, isHabitRelevantOnDate } from './habit.logic'
import { habitRepository } from './habit.repository'
import type { Habit, HabitEntry } from './habit.types'

interface HabitDashboardSectionProps {
  date: string
  refreshKey: number
  onOpenHabits: (pillarId?: string) => void
  onUpdated: () => void
}

export function HabitDashboardSection({ date, refreshKey, onOpenHabits, onUpdated }: HabitDashboardSectionProps) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [entries, setEntries] = useState<HabitEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingHabitId, setSavingHabitId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all([habitRepository.list(), habitRepository.entriesForDate(date)]).then(([nextHabits, nextEntries]) => {
      if (!active) return
      setHabits(nextHabits.filter((habit) => habit.status === 'active' && isHabitRelevantOnDate(habit, date)))
      setEntries(nextEntries)
      setError(null)
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : String(reason))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [date, refreshKey])

  const toggleEntry = async (habit: Habit) => {
    const entry = entries.find((item) => item.habitId === habit.id)
    setSavingHabitId(habit.id)
    setError(null)
    try {
      if (entry?.completed) {
        await habitRepository.removeEntry(habit.id, date)
        setEntries((current) => current.filter((item) => item.habitId !== habit.id))
      } else {
        const saved = await habitRepository.saveEntry(habit.id, date, {
          completed: true,
          durationMinutes: entry?.durationMinutes ?? null,
          note: entry?.note ?? '',
        })
        setEntries((current) => [...current.filter((item) => item.habitId !== habit.id), saved])
      }
      onUpdated()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setSavingHabitId(null)
    }
  }

  return (
    <section className="content-card habit-dashboard">
      <div className="recent-header">
        <div><p className="eyebrow">Jouw keuze</p><h2>Gewoontes voor vandaag</h2></div>
        <button type="button" className="text-button" onClick={() => onOpenHabits()}>Alle gewoontes</button>
      </div>
      <p className="habit-dashboard-intro">Alleen gewoontes die volgens jouw gekozen ritme vandaag relevant zijn. Je kiest zelf of je iets registreert.</p>
      {loading ? <p className="empty-copy" role="status">Gewoontes laden…</p> : null}
      {error ? <div className="inline-error" role="alert">Gewoontes konden niet worden geladen: {error}</div> : null}
      {!loading && !error && !habits.length ? (
        <div className="empty-summary">
          <span className="empty-summary-icon" aria-hidden="true">○</span>
          <div><strong>Geen gewoontes gepland voor vandaag</strong><p>Je kunt altijd je volledige overzicht bekijken of een gewoonte toevoegen.</p></div>
        </div>
      ) : null}
      {!loading && !error ? (
        <ul className="habit-today-list">
          {habits.map((habit) => {
            const entry = entries.find((item) => item.habitId === habit.id)
            return (
              <li key={habit.id}>
                <div>
                  <strong>{habit.name}</strong>
                  <span>{formatHabitFrequency(habit)}{habit.desiredDurationMinutes ? ` · ${habit.desiredDurationMinutes} min` : ''}</span>
                </div>
                <button type="button" className={`habit-log-button ${entry?.completed ? 'logged' : ''}`} disabled={savingHabitId === habit.id} onClick={() => void toggleEntry(habit)}>
                  {savingHabitId === habit.id ? '…' : entry?.completed ? 'Bewaard · ongedaan maken' : 'Uitgevoerd'}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
