import { useEffect, useState } from 'react'
import { formatActivityDate, formatActivityDuration } from './activity.logic'
import { activityRepository } from './activity.repository'
import type { Activity } from './activity.types'

interface ActivityDashboardSectionProps {
  refreshKey: number
  onOpenActivities: (create?: boolean) => void
}

export function ActivityDashboardSection({ refreshKey, onOpenActivities }: ActivityDashboardSectionProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    void activityRepository.list().then((items) => {
      if (active) {
        setActivities(items.slice(0, 3))
        setError(false)
      }
    }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [refreshKey])

  return (
    <section className="activity-dashboard">
      <div className="recent-header"><div><p className="eyebrow">Jouw ervaringen</p><h3>Recente activiteiten</h3></div><button type="button" className="text-button" onClick={() => onOpenActivities()}>Alle activiteiten</button></div>
      {error ? <p className="empty-copy" role="status">Activiteiten zijn tijdelijk niet beschikbaar.</p> : activities.length ? (
        <ul className="dashboard-recent-list">{activities.map((activity) => (
          <li key={activity.id}><button type="button" onClick={() => onOpenActivities()}>
            <strong>{activity.title}</strong><span>{formatActivityDate(activity.date)}{activity.durationMinutes ? ` · ${formatActivityDuration(activity.durationMinutes)}` : ''}</span>
          </button></li>
        ))}</ul>
      ) : <p className="empty-copy">Je kunt iets vastleggen wanneer je daar behoefte aan hebt.</p>}
      <button type="button" className="secondary-button full-width" onClick={() => onOpenActivities(true)}>Iets vastleggen</button>
    </section>
  )
}
