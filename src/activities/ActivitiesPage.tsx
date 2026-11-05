import { useEffect, useMemo, useState } from 'react'
import { checkInRepository } from '../check-in/check-in.repository'
import type { Pillar } from '../check-in/check-in.types'
import { useLocalDate } from '../hooks/useLocalDate'
import { toDateKey } from '../check-in/check-in.logic'
import { activityRepository } from './activity.repository'
import {
  createActivityDraft,
  draftFromActivity,
  filterActivities,
  formatActivityDuration,
  getActivityStats,
  isActivityDraftValid,
} from './activity.logic'
import type { Activity, ActivityDraft, ActivityPeriod } from './activity.types'
import { formatDateDisplay } from '../utils/format-date'

type ActivityScreen = 'list' | 'form' | 'detail'

interface ActivitiesPageProps {
  initialCreate: boolean
  initialPillarId: string | null
  onUnsavedChange: (dirty: boolean) => void
  onUpdated: () => void
}

const periodOptions: { value: ActivityPeriod; label: string }[] = [
  { value: '7', label: 'Laatste 7 dagen' },
  { value: '30', label: 'Laatste 30 dagen' },
  { value: '90', label: 'Laatste 90 dagen' },
  { value: 'all', label: 'Alles' },
]

function ActivityEditor({
  draft,
  pillars,
  isEditing,
  onDraftChange,
  onCancel,
  onSave,
}: {
  draft: ActivityDraft
  pillars: Pillar[]
  isEditing: boolean
  onDraftChange: (draft: ActivityDraft) => void
  onCancel: () => void
  onSave: () => void
}) {
  const togglePillar = (id: string) => onDraftChange({
    ...draft,
    pillarIds: draft.pillarIds.includes(id) ? draft.pillarIds.filter((pillarId) => pillarId !== id) : [...draft.pillarIds, id],
  })

  return (
    <form className="activity-form form-card" onSubmit={(event) => { event.preventDefault(); onSave() }}>
      <div className="form-intro"><p className="eyebrow">Een moment uit jouw leven</p><h2>{isEditing ? 'Activiteit aanpassen' : 'Iets vastleggen'}</h2><p>Activiteiten hoeven nergens aan te voldoen. Noteer wat voor jou betekenis heeft.</p></div>
      <label className="habit-field">Titel <span>Verplicht</span><input autoFocus maxLength={120} required value={draft.title} onChange={(event) => onDraftChange({ ...draft, title: event.currentTarget.value })} /></label>
      <label className="habit-field">Omschrijving <span>Optioneel</span><textarea rows={3} maxLength={2000} value={draft.description} onChange={(event) => onDraftChange({ ...draft, description: event.currentTarget.value })} /></label>
      <div className="habit-number-row">
        <label className="habit-field">Datum<input type="date" required value={draft.date} onChange={(event) => onDraftChange({ ...draft, date: event.currentTarget.value })} /></label>
        <label className="habit-field">Duur in minuten <span>Optioneel</span><input type="number" min={1} max={1440} inputMode="numeric" value={draft.durationMinutes ?? ''} onChange={(event) => onDraftChange({ ...draft, durationMinutes: event.currentTarget.value ? Number(event.currentTarget.value) : null })} /></label>
      </div>
      <fieldset className="habit-fieldset">
        <legend>Pijlers <span>Optioneel · meerdere mogelijk</span></legend>
        <div className="habit-pillar-options">
          {pillars.map((pillar) => (
            <button type="button" key={pillar.id} className={`habit-choice ${draft.pillarIds.includes(pillar.id) ? 'selected' : ''}`} aria-pressed={draft.pillarIds.includes(pillar.id)} onClick={() => togglePillar(pillar.id)}>
              <span className="pillar-icon" style={{ backgroundColor: pillar.color }} aria-hidden="true">{pillar.icon}</span>{pillar.name}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="habit-fieldset">
        <legend>Hoe voelde dit voor jou? <span>Optioneel</span></legend>
        <div className="activity-rating" role="group" aria-label="Persoonlijke waardering">
          <button type="button" className={!draft.rating ? 'selected' : ''} aria-pressed={!draft.rating} onClick={() => onDraftChange({ ...draft, rating: null })}>Overslaan</button>
          {([1, 2, 3, 4, 5] as const).map((rating) => (
            <button type="button" key={rating} className={draft.rating === rating ? 'selected' : ''} aria-label={`${rating} van 5`} aria-pressed={draft.rating === rating} onClick={() => onDraftChange({ ...draft, rating })}>{rating}</button>
          ))}
        </div>
      </fieldset>
      <label className="habit-field">Vrije notitie <span>Optioneel</span><textarea rows={3} maxLength={5000} value={draft.note} onChange={(event) => onDraftChange({ ...draft, note: event.currentTarget.value })} /></label>
      <div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Terug</button><button type="submit" className="primary-button" disabled={!isActivityDraftValid(draft)}>Activiteit bewaren</button></div>
    </form>
  )
}

export function ActivitiesPage({ initialCreate, initialPillarId, onUnsavedChange, onUpdated }: ActivitiesPageProps) {
  const today = toDateKey(useLocalDate())
  const [activities, setActivities] = useState<Activity[]>([])
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [screen, setScreen] = useState<ActivityScreen>(initialCreate ? 'form' : 'list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ActivityDraft>(createActivityDraft(today))
  const [originalDraft, setOriginalDraft] = useState<ActivityDraft>(createActivityDraft(today))
  const [period, setPeriod] = useState<ActivityPeriod>('30')
  const [pillarId, setPillarId] = useState(initialPillarId ?? '')
  const [search, setSearch] = useState('')
  const [direction, setDirection] = useState<'newest' | 'oldest'>('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const dirty = screen === 'form' && JSON.stringify(draft) !== JSON.stringify(originalDraft)
  const selectedActivity = activities.find((activity) => activity.id === selectedId) ?? null
  const filtered = useMemo(() => filterActivities(activities, { period, today, pillarId, search, direction }), [activities, direction, period, pillarId, search, today])
  const stats = useMemo(() => getActivityStats(filtered), [filtered])

  useEffect(() => onUnsavedChange(dirty), [dirty, onUnsavedChange])
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
  useEffect(() => {
    let active = true
    void Promise.all([activityRepository.list(), checkInRepository.getPillars()]).then(([nextActivities, nextPillars]) => {
      if (!active) return
      setActivities(nextActivities)
      setPillars(nextPillars)
      setError(null)
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : String(reason))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const startNew = () => {
    const nextDraft = createActivityDraft(today)
    setDraft(nextDraft)
    setOriginalDraft(nextDraft)
    setSelectedId(null)
    setScreen('form')
  }
  const confirmLeave = () => {
    if (dirty && !window.confirm('Je hebt wijzigingen die nog niet zijn bewaard. Wil je deze verlaten?')) return false
    onUnsavedChange(false)
    return true
  }
  const startEdit = (activity: Activity) => {
    const nextDraft = draftFromActivity(activity)
    setDraft(nextDraft)
    setOriginalDraft(nextDraft)
    setScreen('form')
  }
  const save = async () => {
    if (!isActivityDraftValid(draft)) return
    try {
      const saved = await activityRepository.save(draft, selectedId ?? undefined)
      setActivities((current) => [saved, ...current.filter((activity) => activity.id !== saved.id)].sort((a, b) => b.date.localeCompare(a.date)))
      setSelectedId(saved.id)
      setScreen('detail')
      onUnsavedChange(false)
      onUpdated()
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  const remove = async () => {
    if (!selectedActivity || !window.confirm('Wil je deze activiteit verwijderen?')) return
    try {
      await activityRepository.delete(selectedActivity.id)
      setActivities((current) => current.filter((activity) => activity.id !== selectedActivity.id))
      setSelectedId(null)
      setScreen('list')
      setError(null)
      onUpdated()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  return (
    <section className="screen-section activities-page">
      {error ? <div className="inline-error" role="alert">Activiteiten konden niet worden geladen of bijgewerkt: {error}</div> : null}
      {loading ? <div className="loading-card" role="status">Activiteiten laden…</div> : null}
      {!loading && screen === 'list' ? (
        <>
          <header className="activity-list-header"><div><p className="eyebrow">Ervaringen, op jouw manier</p><h2>Activiteiten</h2><p>Leg iets vast als je dat wilt. Er is niets dat je hoeft bij te houden.</p></div><button type="button" className="primary-button" onClick={startNew}>Iets vastleggen</button></header>
          <section className="activity-stats" aria-label="Activiteitenoverzicht">
            <article><span>Activiteiten in periode</span><strong>{stats.count}</strong></article>
            <article><span>Geregistreerde duur</span><strong>{formatActivityDuration(stats.totalMinutes)}</strong></article>
          </section>
          <section className="content-card activity-pillar-stats">
            <div className="section-heading compact"><div><p className="eyebrow">Terugblik</p><h3>Activiteiten per pijler</h3></div></div>
            {pillars.map((pillar) => {
              const count = stats.byPillar.get(pillar.id) ?? 0
              const maximum = Math.max(1, ...pillars.map((item) => stats.byPillar.get(item.id) ?? 0))
              return <div className="activity-pillar-row" key={pillar.id}><span>{pillar.icon} {pillar.name}</span><span className="activity-bar"><span style={{ width: `${count / maximum * 100}%`, backgroundColor: pillar.color }} /></span><strong>{count}</strong></div>
            })}
            <p className="muted-copy">Activiteiten zonder pijler staan niet in deze verdeling.</p>
          </section>
          <div className="activity-filters">
            <label className="habit-field">Periode<select value={period} onChange={(event) => setPeriod(event.currentTarget.value as ActivityPeriod)}>{periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="habit-field">Pijler<select value={pillarId} onChange={(event) => setPillarId(event.currentTarget.value)}><option value="">Alle pijlers</option>{pillars.map((pillar) => <option key={pillar.id} value={pillar.id}>{pillar.name}</option>)}</select></label>
            <label className="habit-field activity-search">Zoeken<input type="search" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Titel, omschrijving of notitie" /></label>
            <label className="habit-field">Volgorde<select value={direction} onChange={(event) => setDirection(event.currentTarget.value as 'newest' | 'oldest')}><option value="newest">Nieuwste eerst</option><option value="oldest">Oudste eerst</option></select></label>
          </div>
          {filtered.length ? <ul className="activity-list">{filtered.map((activity) => (
            <li key={activity.id}><button type="button" className="activity-list-card" onClick={() => { setSelectedId(activity.id); setScreen('detail') }}>
              <span className="activity-list-heading"><strong>{activity.title}</strong><time>              {formatDateDisplay(new Date(`${activity.date}T12:00:00`), { day: 'numeric', month: 'short', year: 'numeric' })}</time></span>
              <span className="activity-preview">{activity.description || activity.note || 'Geen omschrijving'}</span>
              <span className="activity-list-meta">{activity.pillarIds.map((id) => pillars.find((pillar) => pillar.id === id)?.name).filter(Boolean).join(' · ') || 'Geen gekoppelde pijlers'}{activity.durationMinutes ? ` · ${formatActivityDuration(activity.durationMinutes)}` : ''}{activity.rating ? ` · ${activity.rating}/5` : ''}</span>
            </button></li>
          ))}</ul> : <div className="empty-card"><span className="empty-summary-icon" aria-hidden="true">⌁</span><h2>Geen activiteiten in deze selectie</h2><p>Je kunt de filters aanpassen, of op elk moment iets vastleggen.</p></div>}
        </>
      ) : null}
      {!loading && screen === 'form' ? <ActivityEditor draft={draft} pillars={pillars} isEditing={Boolean(selectedId)} onDraftChange={setDraft} onCancel={() => { if (confirmLeave()) setScreen(selectedId ? 'detail' : 'list') }} onSave={() => void save()} /> : null}
      {!loading && screen === 'detail' && selectedActivity ? (
        <>
          <button type="button" className="text-button habit-back" onClick={() => { setSelectedId(null); setScreen('list') }}>‹ Alle activiteiten</button>
          <article className="content-card activity-detail-card">
            <p className="eyebrow">{formatDateDisplay(new Date(`${selectedActivity.date}T12:00:00`), { day: 'numeric', month: 'short', year: 'numeric' })}</p><h2>{selectedActivity.title}</h2>
            {selectedActivity.description ? <p>{selectedActivity.description}</p> : null}
            <div className="habit-pill-tags">{selectedActivity.pillarIds.map((id) => pillars.find((pillar) => pillar.id === id)).filter((pillar): pillar is Pillar => Boolean(pillar)).map((pillar) => <span key={pillar.id}>{pillar.icon} {pillar.name}</span>)}</div>
            <dl className="activity-detail-list">
              <div><dt>Duur</dt><dd>{formatActivityDuration(selectedActivity.durationMinutes)}</dd></div>
              <div><dt>Persoonlijke waardering</dt><dd>{selectedActivity.rating ? `${selectedActivity.rating} van 5` : 'Niet opgegeven'}</dd></div>
              {selectedActivity.note ? <div><dt>Vrije notitie</dt><dd className="preserve-lines">{selectedActivity.note}</dd></div> : null}
            </dl>
            <div className="habit-action-row"><button type="button" className="primary-button" onClick={() => startEdit(selectedActivity)}>Aanpassen</button><button type="button" className="text-button" onClick={() => void remove()}>Verwijderen</button></div>
          </article>
        </>
      ) : null}
    </section>
  )
}
