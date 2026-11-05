import { useEffect, useState } from 'react'
import { formatGoalDate } from './goal.logic'
import { goalRepository } from './goal.repository'
import type { Goal } from './goal.types'

interface GoalDashboardSectionProps {
  refreshKey: number
  onOpenGoals: () => void
}

export function GoalDashboardSection({ refreshKey, onOpenGoals }: GoalDashboardSectionProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void goalRepository.list().then((items) => {
      if (active) {
        setGoals(items.filter((goal) => goal.status === 'active').slice(0, 3))
        setError(null)
      }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : String(reason))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refreshKey])

  return (
    <section className="goal-dashboard">
      <div className="recent-header">
        <div><p className="eyebrow">Jouw richting</p><h3>Persoonlijke doelen</h3></div>
        <button type="button" className="text-button" onClick={onOpenGoals}>Alle doelen</button>
      </div>
      {loading ? <p className="empty-copy" role="status">Doelen laden…</p> : null}
      {error ? <div className="inline-error" role="alert">Doelen konden niet worden geladen: {error}</div> : null}
      {!loading && !error && !goals.length ? (
        <div className="empty-summary">
          <span className="empty-summary-icon" aria-hidden="true">⌁</span>
          <div><strong>Ruimte voor wat belangrijk voor je is</strong><p>Je kunt een doel toevoegen wanneer dat voor jou goed voelt.</p></div>
        </div>
      ) : null}
      {!loading && !error && goals.length ? (
        <ul className="goal-dashboard-list">
          {goals.map((goal) => (
            <li key={goal.id}>
              <button type="button" onClick={onOpenGoals}>
                <span className="goal-dashboard-title">{goal.title}</span>
                <span className="goal-dashboard-meta">{goal.progress}%{goal.targetDate ? ` · Streefdatum ${formatGoalDate(goal.targetDate)}` : ''}</span>
                <span className="goal-progress-track" aria-label={`${goal.progress}% voortgang`}><span style={{ width: `${goal.progress}%` }} /></span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
