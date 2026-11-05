import { useEffect, useState } from 'react'
import { formatReflectionDate, getReflectionPreview, reflectionTypeLabels } from './reflection.logic'
import { reflectionRepository } from './reflection.repository'
import type { Reflection } from './reflection.types'

interface ReflectionDashboardSectionProps {
  refreshKey: number
  onOpenReflections: (create?: boolean) => void
}

export function ReflectionDashboardSection({ refreshKey, onOpenReflections }: ReflectionDashboardSectionProps) {
  const [reflections, setReflections] = useState<Reflection[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    void reflectionRepository.list().then((items) => {
      if (active) {
        setReflections(items.slice(0, 2))
        setError(false)
      }
    }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [refreshKey])

  return (
    <section className="reflection-dashboard">
      <div className="recent-header"><div><p className="eyebrow">Jouw woorden</p><h3>Recente reflecties</h3></div><button type="button" className="text-button" onClick={() => onOpenReflections()}>Alle reflecties</button></div>
      {error ? <p className="empty-copy" role="status">Reflecties zijn tijdelijk niet beschikbaar.</p> : reflections.length ? (
        <ul className="dashboard-recent-list">{reflections.map((reflection) => (
          <li key={reflection.id}><button type="button" onClick={() => onOpenReflections()}>
            <strong>{reflection.title || reflectionTypeLabels[reflection.type]}</strong><span>{formatReflectionDate(reflection.date)} · {getReflectionPreview(reflection.content, 90)}</span>
          </button></li>
        ))}</ul>
      ) : <p className="empty-copy">Je kunt schrijven wanneer en hoe het bij je past.</p>}
      <button type="button" className="secondary-button full-width" onClick={() => onOpenReflections(true)}>Iets opschrijven</button>
    </section>
  )
}
